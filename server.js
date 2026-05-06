const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');

const PORT = process.env.PORT || 8080;
const BARE_PREFIX = '/bare/';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const WP_DIR = path.join(DATA_DIR, 'wallpapers');
const WP_MANIFEST = path.join(DATA_DIR, 'wallpapers.json');
fs.mkdirSync(WP_DIR, { recursive: true });

const MAX_UPLOAD = parseInt(process.env.MAX_UPLOAD_BYTES || String(50 * 1024 * 1024), 10); // 50 MB
const ALLOWED_MIME = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|quicktime))$/i;
const EXT_BY_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(WP_MANIFEST, 'utf8')); } catch { return { items: [] }; }
}
function saveManifest(m) { fs.writeFileSync(WP_MANIFEST, JSON.stringify(m, null, 2)); }

const uvDist = path.dirname(require.resolve('@titaniumnetwork-dev/ultraviolet/package.json'));
const uvPath = path.join(uvDist, 'dist');
const bareMuxDist = path.join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-mux', 'dist');
const bareModuleDist = path.join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-as-module3', 'dist');
// Optional second proxy engine. We mount it so users can A/B compare against UV
// at runtime via a Settings → Proxy → "engine" toggle. The npm package may not
// be present in older clones — guard the resolve so the server still boots.
let scramjetPath = null;
try {
  scramjetPath = path.join(
    path.dirname(require.resolve('@mercuryworkshop/scramjet/package.json')),
    'dist'
  );
} catch (_) { /* scramjet not installed, only UV will be available */ }

const bare = createBareServer(BARE_PREFIX, {
  logErrors: true,
  // Default is 10 — wildly low for a browser loading a real site with dozens of
  // subresources. Bump it so single-user dev doesn't immediately get 429'd.
  connectionLimiter: {
    maxConnectionsPerIP: parseInt(process.env.BARE_MAX_CONN_PER_IP || '2000', 10),
    windowDuration: 60,
    blockDuration: 10,
  },
});

const app = express();

// ---------- Music backend forwarding ----------
// When MUSIC_PROXY_URL is set, every /api/music/* request gets piped to
// that origin instead of being handled locally. Used to route YouTube
// calls through a residential-IP backend (typically a home PC reachable
// via Tailscale) — YouTube refuses streams to data-center IPs even
// with valid cookies, so the public site stays on the cloud VM but
// the YouTube-touching code runs at home. Falls through to local
// handlers if the upstream is unreachable.
//
// Format: MUSIC_PROXY_URL=http://100.x.y.z:3001 (no trailing slash)
const MUSIC_PROXY_URL = (process.env.MUSIC_PROXY_URL || '').replace(/\/$/, '');
if (MUSIC_PROXY_URL) {
  const http = require('node:http');
  const https = require('node:https');
  const { URL: URLClass } = require('node:url');
  const target = new URLClass(MUSIC_PROXY_URL);
  const lib = target.protocol === 'https:' ? https : http;
  console.log(`[music-proxy] forwarding /api/music/* to ${MUSIC_PROXY_URL}`);
  app.use('/api/music', (req, res) => {
    // Strip headers that would confuse the upstream (host, content-length
    // we'll let node recompute, connection-specific stuff).
    const fwdHeaders = { ...req.headers };
    delete fwdHeaders['host'];
    delete fwdHeaders['content-length'];
    delete fwdHeaders['connection'];
    // Differentiate timeouts by endpoint type. Audio /stream/* requests
    // hold a connection open while bytes flow (and googlevideo sometimes
    // throttles with multi-second pauses between bursts) — give them 5
    // minutes of socket-idle slack. Everything else (track, search,
    // home, playlist, status) is metadata that should respond in <5s; a
    // 30s timeout there means a dead home PC fails fast with a clear
    // 502 instead of an infinite "Loading..." in the UI.
    const isStream = req.url.startsWith('/stream/');
    const upstream = lib.request({
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      protocol: target.protocol,
      method: req.method,
      path: '/api/music' + req.url,
      headers: fwdHeaders,
      timeout: isStream ? 5 * 60 * 1000 : 30 * 1000,
    });
    // Tear down the upstream socket if the client (browser) disconnects
    // mid-stream — otherwise we'd leave a dangling fetch on the home PC.
    res.on('close', () => { try { upstream.destroy(); } catch (_) {} });
    upstream.on('response', (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    });
    upstream.on('error', (err) => {
      console.error('[music-proxy] upstream error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'music_proxy_failed',
          detail: err.message,
          hint: `Music backend at ${MUSIC_PROXY_URL} is unreachable. Check that the home PC is on, the music server is running on port ${target.port || 3001}, and Tailscale is connected on both ends.`,
        });
      } else {
        try { res.end(); } catch (_) {}
      }
    });
    upstream.on('timeout', () => {
      upstream.destroy(new Error(`upstream socket idle for ${isStream ? '5min' : '30s'}`));
    });
    req.pipe(upstream);
  });
}

app.get('/uv/uv.config.js', (_req, res) => {
  res.type('application/javascript').sendFile(path.join(__dirname, 'public', 'uv.config.js'));
});

function jsStatic(dir) {
  return express.static(dir, {
    index: false,
    setHeaders(res, file) {
      if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  });
}

app.use('/uv/', jsStatic(uvPath));
app.use('/baremux/', jsStatic(bareMuxDist));
app.use('/baremodule/', jsStatic(bareModuleDist));
// Static for the second engine. Routing prefix for Scramjet-proxied URLs is
// '/scram/' (set in public/scram.config.js) — kept distinct from this asset
// path so the SW dispatcher can tell asset fetches apart from proxy fetches.
if (scramjetPath) app.use('/scramjet/', jsStatic(scramjetPath));

// Useful for the Settings UI: report which engines the server can actually
// serve, so the page doesn't offer Scramjet if it isn't installed.
app.get('/api/engines', (_req, res) => {
  res.json({
    engines: [
      { id: 'uv', label: 'Ultraviolet', available: true },
      { id: 'scramjet', label: 'Scramjet', available: !!scramjetPath },
    ],
  });
});

// ---------- InnerStream cinema proxy (TMDB) ----------
// We proxy TMDB's v3 read-only API server-side so:
//   1) The TMDB API key never ships to the client (set TMDB_API_KEY in env to
//      override the public default), and
//   2) CORS / referrer quirks don't block the in-OS movie app.
// The actual *playback* uses vidking.net embeds, which the iframe loads
// directly — we only surface metadata + posters here.
const TMDB_API_KEY = process.env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const tmdbCache = new Map(); // key -> { ts, body }
const TMDB_TTL = 5 * 60 * 1000;

async function tmdb(pathAndQuery) {
  const cacheKey = pathAndQuery;
  const now = Date.now();
  const hit = tmdbCache.get(cacheKey);
  if (hit && (now - hit.ts) < TMDB_TTL) return hit.body;
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${pathAndQuery}${sep}api_key=${TMDB_API_KEY}`;
  // Hard 8s timeout so a slow TMDB response on fly.io's network doesn't
  // tie up the request indefinitely — surfaces as a clean 502 the user
  // can see + a logged error instead of a hung browser tab.
  let r;
  try {
    r = await fetch(url, {
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    const err = new Error(`tmdb fetch failed: ${e.name === 'TimeoutError' ? 'timeout after 8s' : e.message}`);
    err.status = 504;
    throw err;
  }
  if (!r.ok) {
    const err = new Error(`tmdb ${r.status}`);
    err.status = r.status;
    throw err;
  }
  const body = await r.json();
  tmdbCache.set(cacheKey, { ts: now, body });
  if (tmdbCache.size > 500) {
    const oldest = [...tmdbCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) tmdbCache.delete(oldest[0]);
  }
  return body;
}

function sendTmdb(res, fn) {
  fn().then(
    (body) => { res.setHeader('Cache-Control', 'public, max-age=300'); res.json(body); },
    (err) => res.status(err.status || 502).json({ error: 'tmdb_unavailable', detail: err.message })
  );
}

app.get('/api/cinema/trending', (_req, res) =>
  sendTmdb(res, () => tmdb('/trending/all/week?language=en-US')));

app.get('/api/cinema/popular/movie', (_req, res) =>
  sendTmdb(res, () => tmdb('/movie/popular?language=en-US&page=1')));

app.get('/api/cinema/popular/tv', (_req, res) =>
  sendTmdb(res, () => tmdb('/tv/popular?language=en-US&page=1')));

app.get('/api/cinema/top/movie', (_req, res) =>
  sendTmdb(res, () => tmdb('/movie/top_rated?language=en-US&page=1')));

app.get('/api/cinema/top/tv', (_req, res) =>
  sendTmdb(res, () => tmdb('/tv/top_rated?language=en-US&page=1')));

app.get('/api/cinema/details/:type/:id', (req, res) => {
  const type = req.params.type === 'tv' ? 'tv' : 'movie';
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  if (!id) return res.status(400).json({ error: 'bad_id' });
  sendTmdb(res, () => tmdb(`/${type}/${id}?language=en-US&append_to_response=credits,videos,recommendations`));
});

app.get('/api/cinema/season/:id/:season', (req, res) => {
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  const season = String(req.params.season || '').replace(/[^0-9]/g, '');
  if (!id || !season) return res.status(400).json({ error: 'bad_id' });
  sendTmdb(res, () => tmdb(`/tv/${id}/season/${season}?language=en-US`));
});

app.get('/api/cinema/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  sendTmdb(res, () => tmdb(`/search/multi?language=en-US&include_adult=false&query=${encodeURIComponent(q)}`));
});

// ---------- InnerArcade games manifest ----------
// Aggregates the public catalogs from gn-math, truffled, and selenite into
// one normalized list: { id, name, source, thumb, url }. The InnerArcade app
// fetches this once, then iframes each game's URL through the active proxy
// engine (UV/Scramjet) so X-Frame-Options doesn't block the iframe.
//
// We cache the merged result for 30 minutes — these manifests rarely change
// faster than that and we don't want to hammer github + selenite on every
// page load.
const ARCADE_TTL = 30 * 60 * 1000;
let arcadeCache = { ts: 0, data: null };

const ARCADE_SOURCES = {
  GN_MATH:  'https://raw.githubusercontent.com/gn-math/assets/main/zones.json',
  TRUFFLED: 'https://raw.githubusercontent.com/aukak/truffled/main/public/js/json/g.json',
  SELENITE: 'https://selenite.cc/resources/games.json',
  // 3kh0-lite catalog. Manifest lives in the GitHub repo; the actual
  // game assets are mirrored at multiple GH-Pages domains (1kh0, 3kho,
  // 2kh0). We pick 1kh0.github.io as the primary host since it's the
  // most stable as of May 2026 — if a school filter blocks one domain
  // the others typically still resolve via the proxy. ~145 games.
  THREEKH0: 'https://raw.githubusercontent.com/3kh0/3kh0-lite/main/config/games.json',
};

async function fetchJSONOrNull(url) {
  try {
    const r = await fetch(url, {
      headers: { 'accept': 'application/json', 'user-agent': 'desktop-proxy/0.1' },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
}

function safeStr(s) { return typeof s === 'string' ? s : ''; }
function joinUrl(base, suffix) {
  if (!suffix) return '';
  if (/^https?:\/\//i.test(suffix)) return suffix;
  return base.replace(/\/$/, '') + '/' + suffix.replace(/^\//, '');
}

function normalizeGNMath(data) {
  if (!Array.isArray(data)) return [];
  // Both placeholders point at our /api/arcade/gh/* proxy, which fetches
  // straight from the gn-math GitHub repos and re-streams with the right
  // content-type. Covers come from gn-math/covers, game wrappers from
  // gn-math/html, and the wrapper's embedded jsdelivr/githack references
  // are rewritten on the fly so dependent assets load too.
  const COVER_URL = '/api/arcade/gh/gn-math/covers/main';
  const HTML_URL  = '/api/arcade/gh/gn-math/html/main';
  return data
    .filter((g) => g && typeof g.id === 'number' && g.id >= 0 && g.url && g.name)
    // Drop sentinel/placeholder entries (e.g. "[!] COMMENTS") — they look
    // like real games in the source manifest but aren't.
    .filter((g) => !/^\[/.test(g.name))
    .map((g) => ({
      id: 'gn-' + g.id,
      name: safeStr(g.name),
      source: 'GN-Math',
      thumb: safeStr(g.cover).replace('{COVER_URL}', COVER_URL).replace('{HTML_URL}', HTML_URL),
      url: safeStr(g.url).replace('{HTML_URL}', HTML_URL).replace('{COVER_URL}', COVER_URL),
      author: safeStr(g.author) || undefined,
    }));
}

function normalizeTruffled(data) {
  const list = Array.isArray(data?.games) ? data.games : (Array.isArray(data) ? data : []);
  const BASE = 'https://truffled.lol';
  return list
    .filter((g) => g && g.name && g.url)
    .map((g, i) => {
      const url = joinUrl(BASE, g.url);
      return {
        id: 'tr-' + (g.url || '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60) + '-' + i,
        name: safeStr(g.name),
        source: 'Truffled',
        thumb: g.thumbnail ? joinUrl(BASE, g.thumbnail) : '',
        url,
        _probeUrl: url,
      };
    });
}

function normalize3kh0(data) {
  if (!Array.isArray(data)) return [];
  const BASE = 'https://1kh0.github.io';
  return data
    .filter((g) => g && g.title && g.link)
    .map((g) => {
      const link = safeStr(g.link);
      const slug = link.replace(/^projects\//, '').replace(/\/index\.html$/, '').replace(/[^a-z0-9]+/gi, '-');
      const url = joinUrl(BASE, link);
      return {
        id: '3k-' + slug,
        name: safeStr(g.title),
        source: '3kh0',
        thumb: g.imgSrc ? joinUrl(BASE, g.imgSrc) : '',
        url,
        _probeUrl: url,
      };
    });
}

function normalizeSelenite(data) {
  if (!Array.isArray(data)) return [];
  const BASE = 'https://selenite.cc';
  // Selenite reverses their resource directory names as light obfuscation:
  // `games` is served from `/resources/semag/`, `apps` from `/resources/sppa/`.
  // Their loader.html flips `type=g`/`type=a` to the right prefix client-side.
  // We have to mirror that mapping or every Selenite thumbnail 404s.
  const TYPE_TO_PREFIX = { g: 'semag', a: 'sppa' };
  return data
    .filter((g) => g && g.directory && g.name)
    .map((g) => {
      const dir = safeStr(g.directory);
      const img = safeStr(g.image);
      const type = 'g';
      const prefix = TYPE_TO_PREFIX[type];
      const params = new URLSearchParams({
        title: g.name,
        dir,
        img: img,
        type,
      });
      return {
        id: 'sel-' + dir,
        name: safeStr(g.name),
        source: 'Selenite',
        thumb: img ? `${BASE}/resources/${prefix}/${dir}/${img}` : '',
        url: `${BASE}/loader.html?${params.toString()}`,
        // The loader.html itself always returns 200; the actual game lives
        // at /resources/semag/{dir}/index.html. That underlying URL is
        // what the probe pass HEADs to decide whether the game is real or
        // just a stale manifest entry pointing at a removed directory.
        _probeUrl: `${BASE}/resources/${prefix}/${dir}/index.html`,
      };
    });
}

// HEAD-check a single URL with a short timeout. Returns true on 2xx/3xx,
// false on 4xx/5xx, network error, or timeout. Used by the background
// probe pass to drop manifest entries whose game URL is dead.
async function probeGameUrl(url, timeoutMs = 5000) {
  if (!url) return false;
  try {
    // Some hosts (selenite, truffled) reject HEAD with 405; fall back to
    // a tiny GET with a Range header so we don't pull whole files.
    let r = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html' },
      redirect: 'follow',
    });
    if (r.status === 405 || r.status === 501) {
      r = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html', 'range': 'bytes=0-0' },
        redirect: 'follow',
      });
      // We don't actually need the body — abort right after headers arrive.
      try { r.body?.cancel(); } catch (_) {}
    }
    return r.status >= 200 && r.status < 400;
  } catch (_) {
    return false;
  }
}

// Concurrent map with a worker pool. Each item runs through fn(); we cap
// the in-flight count at `concurrency` so we don't fork-bomb the upstream
// host (selenite + truffled are small static sites).
async function runConcurrent(items, concurrency, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { await fn(items[idx], idx); } catch (_) { /* swallow per-item errors */ }
    }
  }
  await Promise.all(Array(Math.min(concurrency, items.length)).fill(0).map(worker));
}

// Walk every game with a _probeUrl and HEAD-check it. Returns a new
// manifest object with dead games filtered out and source counts updated.
// Logs a single line summarizing how many were dropped per source.
async function probeManifest(manifest) {
  const t0 = Date.now();
  const games = manifest.games;
  const probable = games.filter((g) => g._probeUrl);
  const liveIds = new Set();
  // Mark all games that don't need probing (no _probeUrl, e.g. GN-Math
  // local routes) as live by default.
  for (const g of games) if (!g._probeUrl) liveIds.add(g.id);
  // Probe in parallel — concurrency 24 keeps each individual host
  // (selenite.cc, truffled.lol, 1kh0.github.io) at a polite RPS.
  await runConcurrent(probable, 24, async (g) => {
    if (await probeGameUrl(g._probeUrl, 5000)) liveIds.add(g.id);
  });
  const filtered = games.filter((g) => liveIds.has(g.id));
  // Strip _probeUrl from the response shape — internal field only.
  const cleanGames = filtered.map((g) => {
    const { _probeUrl, ...rest } = g;
    return rest;
  });
  // Recompute source counts.
  const sources = {};
  for (const k of Object.keys(manifest.sources || {})) {
    sources[k] = { ...manifest.sources[k], count: cleanGames.filter((x) => x.source === k).length };
  }
  const dropped = games.length - filtered.length;
  console.log(`[arcade-probe] dropped ${dropped}/${games.length} dead games in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { ...manifest, games: cleanGames, sources, probed: true, probeTs: Date.now() };
}

async function buildArcadeManifest() {
  const [gn, tr, sel, k3] = await Promise.all([
    fetchJSONOrNull(ARCADE_SOURCES.GN_MATH),
    fetchJSONOrNull(ARCADE_SOURCES.TRUFFLED),
    fetchJSONOrNull(ARCADE_SOURCES.SELENITE),
    fetchJSONOrNull(ARCADE_SOURCES.THREEKH0),
  ]);
  const games = [
    ...normalizeGNMath(gn),
    ...normalizeTruffled(tr),
    ...normalizeSelenite(sel),
    ...normalize3kh0(k3),
  ];
  // Sort each source alphabetically; mix happens client-side via grouping.
  games.sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.name.localeCompare(b.name);
  });
  return {
    games,
    sources: {
      'GN-Math':  { count: games.filter((x) => x.source === 'GN-Math').length,  available: !!gn },
      'Truffled': { count: games.filter((x) => x.source === 'Truffled').length, available: !!tr },
      'Selenite': { count: games.filter((x) => x.source === 'Selenite').length, available: !!sel },
      '3kh0':     { count: games.filter((x) => x.source === '3kh0').length,     available: !!k3 },
    },
    ts: Date.now(),
  };
}

// ---------- Inntify music backend (YouTube Music via youtubei.js) ----------
// We use youtubei.js — the canonical JS implementation of YouTube's
// internal API (the Node-native equivalent of Python's ytmusicapi). It
// exposes a `yt.music` namespace that returns *YouTube Music* data
// (curated playlists, charts, song-typed search) rather than generic
// YouTube videos, so the catalog the Inntify UI shows is real music.
//
// Decipher requires a JS interpreter to run a small chunk of YouTube's
// player JS (signature transform). We wire Node's built-in vm module
// for this via Platform.shim.eval — the script is a function body that
// uses `return`, so we wrap it in an IIFE.
const vm = require('node:vm');
let ytPromise = null;
let ytInitTs = 0;
let ytInitError = null;
const YT_INIT_TIMEOUT = parseInt(process.env.MUSIC_INIT_TIMEOUT || '25000', 10);
// Cloud-provider IPs (Oracle, Fly, AWS, GCP...) are flagged by YouTube's
// bot heuristics — every client returns metadata-only with empty
// streaming_data. The fix is a session cookie from a real browser,
// which makes our requests look like a logged-in user. The user pastes
// the value into the YT_COOKIE env var (and optionally YT_VISITOR_DATA)
// and we feed it to Innertube.create. See server.js banner / README for
// extraction instructions.
const YT_COOKIE = process.env.YT_COOKIE || '';
const YT_VISITOR_DATA = process.env.YT_VISITOR_DATA || '';
function ytAuthSummary() {
  return {
    hasCookie: !!YT_COOKIE,
    cookieLen: YT_COOKIE ? YT_COOKIE.length : 0,
    hasVisitorData: !!YT_VISITOR_DATA,
  };
}

// ---------- Piped / Invidious backend chain ----------
// YouTube refuses to issue stream URLs to data-center IPs (Oracle, Fly, etc.)
// even with valid cookie auth — they require a po_token from BotGuard JS
// challenges that data-center IPs can't generate. The workaround:
// public Piped/Invidious instances run on residential-friendly IPs and
// expose REST APIs that return ready-to-stream googlevideo URLs.
//
// We try a list of Piped instances first (their API is more uniform),
// fall back to Invidious instances, and finally fall back to youtubei.js
// (which runs locally — preserves the code path for users running on a
// residential IP). On each request we cycle through instances until one
// returns valid audio formats.
//
// Instance lists are overridable via env vars so the user can curate
// their own list as instances die / new ones come online.
const DEFAULT_PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.smnz.de',
  'https://pipedapi.tokhmi.xyz',
  'https://piped-api.privacy.com.de',
  'https://piped-api.lunar.icu',
  'https://api.piped.yt',
];
const DEFAULT_INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://yewtu.be',
  'https://invidious.privacyredirect.com',
];
function parseList(s, fallback) {
  if (!s) return fallback;
  return String(s).split(',').map((x) => x.trim()).filter(Boolean);
}
const PIPED_INSTANCES     = parseList(process.env.PIPED_INSTANCES,     DEFAULT_PIPED);
const INVIDIOUS_INSTANCES = parseList(process.env.INVIDIOUS_INSTANCES, DEFAULT_INVIDIOUS);
// Per-instance health tracking — penalize instances that just failed so we
// don't keep hammering a dead one for every request. After ~30s of cooldown
// we give it another chance.
const INSTANCE_HEALTH_TTL = 30 * 1000;
const instanceHealth = new Map(); // base -> { failedAt }
function isInstanceUnhealthy(base) {
  const h = instanceHealth.get(base);
  return h && (Date.now() - h.failedAt) < INSTANCE_HEALTH_TTL;
}
function markInstance(base, ok) {
  if (ok) instanceHealth.delete(base);
  else instanceHealth.set(base, { failedAt: Date.now() });
}
async function fetchJSONInstance(base, path, timeoutMs = 8000) {
  if (isInstanceUnhealthy(base)) throw new Error(`${base}: unhealthy (cooldown)`);
  const url = `${base}${path}`;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'application/json' },
  });
  if (!r.ok) throw new Error(`${base}: HTTP ${r.status}`);
  return r.json();
}

async function pipedGetTrack(id) {
  let lastErr = null;
  for (const base of PIPED_INSTANCES) {
    try {
      const data = await fetchJSONInstance(base, `/streams/${encodeURIComponent(id)}`);
      const audio = (data.audioStreams || [])
        .filter((s) => s.url && /audio\//.test(s.mimeType || ''))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!audio) throw new Error(`${base}: no audio`);
      markInstance(base, true);
      return {
        backend: 'piped',
        instance: base,
        title: data.title || '',
        uploader: data.uploader || data.uploaderName || '',
        duration: data.duration || 0,
        thumbnailUrl: data.thumbnailUrl || '',
        url: audio.url,
        mime: (audio.mimeType || 'audio/mp4').split(';')[0].trim(),
        contentLength: audio.contentLength ? parseInt(audio.contentLength, 10) : 0,
        // Surface the alternative audio streams so /api/music/track has
        // something to put in `audioStreams` — keeps API shape stable.
        audioStreams: (data.audioStreams || []).map((s) => ({
          url: s.url, mimeType: s.mimeType, bitrate: s.bitrate || 0, itag: s.itag,
        })),
      };
    } catch (e) {
      markInstance(base, false);
      lastErr = e;
    }
  }
  throw lastErr || new Error('all piped instances failed');
}

async function invidiousGetTrack(id) {
  let lastErr = null;
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const data = await fetchJSONInstance(base, `/api/v1/videos/${encodeURIComponent(id)}`);
      const audio = (data.adaptiveFormats || [])
        .filter((f) => f.url && /audio/i.test(f.type || ''))
        .sort((a, b) => parseInt(b.bitrate || '0', 10) - parseInt(a.bitrate || '0', 10))[0];
      if (!audio) throw new Error(`${base}: no audio`);
      markInstance(base, true);
      return {
        backend: 'invidious',
        instance: base,
        title: data.title || '',
        uploader: data.author || '',
        duration: data.lengthSeconds || 0,
        thumbnailUrl: (data.videoThumbnails || []).find((t) => t.quality === 'maxres' || t.quality === 'high')?.url
                   || (data.videoThumbnails || [])[0]?.url || '',
        url: audio.url,
        mime: (audio.type || 'audio/mp4').split(';')[0].trim(),
        contentLength: audio.contentLength ? parseInt(audio.contentLength, 10) : 0,
        audioStreams: (data.adaptiveFormats || []).filter((f) => /audio/i.test(f.type || '')).map((f) => ({
          url: f.url, mimeType: f.type, bitrate: parseInt(f.bitrate || '0', 10), itag: f.itag,
        })),
      };
    } catch (e) {
      markInstance(base, false);
      lastErr = e;
    }
  }
  throw lastErr || new Error('all invidious instances failed');
}

async function youtubeiGetTrack(id) {
  const yt = await getYT();
  const { info, formats, client } = await getInfoWithFormats(yt, id);
  const m4a = formats.filter((f) => /audio\/mp4/.test(f.mime_type));
  const pick = (m4a.length ? m4a : formats).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  const url = pick.url || await pick.decipher(yt.session.player);
  const audioStreams = [];
  for (const f of formats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))) {
    try {
      const u = f.url || await f.decipher(yt.session.player);
      audioStreams.push({ url: u, mimeType: f.mime_type, bitrate: f.bitrate || 0, itag: f.itag });
    } catch { /* skip */ }
  }
  return {
    backend: 'youtubei',
    instance: client,
    title: info?.basic_info?.title || '',
    uploader: info?.basic_info?.author || '',
    duration: info?.basic_info?.duration || 0,
    thumbnailUrl: info?.basic_info?.thumbnail?.[0]?.url || '',
    url,
    mime: pick.mime_type || 'audio/mp4',
    contentLength: pick.content_length ? parseInt(pick.content_length, 10) : 0,
    audioStreams,
  };
}

// Try Piped → Invidious → youtubei.js. Returns a unified track object.
// Throws an Error whose message lists which backends failed (with a sample
// of which instance was tried last) — surfaced through /api/music/* JSON
// errors so the user can see what's broken.
async function resolveTrack(id) {
  const errs = [];
  for (const fn of [pipedGetTrack, invidiousGetTrack, youtubeiGetTrack]) {
    try {
      return await fn(id);
    } catch (e) {
      errs.push(`${fn.name}: ${String(e.message || e).slice(0, 100)}`);
    }
  }
  throw new Error(errs.join(' | '));
}

async function pipedSearch(q, filter = 'music_songs') {
  let lastErr = null;
  // Piped's filter values: music_songs, music_videos, music_albums,
  // music_artists, music_playlists, videos, channels, playlists, all.
  const PIPED_FILTERS = {
    song: 'music_songs', video: 'music_videos', album: 'music_albums',
    artist: 'music_artists', playlist: 'music_playlists',
  };
  const f = PIPED_FILTERS[filter] || 'music_songs';
  for (const base of PIPED_INSTANCES) {
    try {
      const data = await fetchJSONInstance(base, `/search?q=${encodeURIComponent(q)}&filter=${f}`);
      markInstance(base, true);
      return { items: data.items || [], instance: base };
    } catch (e) { markInstance(base, false); lastErr = e; }
  }
  throw lastErr || new Error('all piped instances failed');
}

async function pipedGetPlaylist(id) {
  let lastErr = null;
  for (const base of PIPED_INSTANCES) {
    try {
      const data = await fetchJSONInstance(base, `/playlists/${encodeURIComponent(id)}`);
      markInstance(base, true);
      return { data, instance: base };
    } catch (e) { markInstance(base, false); lastErr = e; }
  }
  throw lastErr || new Error('all piped instances failed');
}

// Convert a Piped search/playlist item to our normalized song shape.
function pipedItemToSong(it) {
  if (!it) return null;
  // Piped streams have url like "/watch?v=ID" — extract the videoId.
  const vmatch = /[?&]v=([a-zA-Z0-9_-]{11})/.exec(it.url || '');
  const id = vmatch ? vmatch[1] : null;
  if (!id) return null;
  return {
    type: 'track',
    id,
    title: it.title || '',
    artist: it.uploaderName || it.uploader || '',
    cover: it.thumbnail || '',
    duration: it.duration || 0,
  };
}
function pipedItemToPlaylist(it) {
  if (!it) return null;
  const pmatch = /[?&]list=([a-zA-Z0-9_-]+)/.exec(it.url || '');
  const id = pmatch ? pmatch[1] : null;
  if (!id) return null;
  return {
    type: 'playlist',
    id,
    title: it.name || it.title || '',
    cover: it.thumbnail || '',
    artist: it.uploaderName || '',
  };
}
function getYT() {
  if (ytPromise) return ytPromise;
  ytInitError = null;
  const t0 = Date.now();
  ytPromise = Promise.race([
    (async () => {
      const yt = require('youtubei.js');
      const { Innertube, Platform } = yt;
      Platform.shim.eval = (data, env = {}) => {
        const ctx = { ...env, console, URL };
        vm.createContext(ctx);
        return vm.runInContext('(function() { ' + data.output + ' })()', ctx, {
          timeout: 5000,
        });
      };
      const opts = { retrieve_player: true };
      if (YT_COOKIE) opts.cookie = YT_COOKIE;
      if (YT_VISITOR_DATA) opts.visitor_data = YT_VISITOR_DATA;
      const inst = await Innertube.create(opts);
      ytInitTs = Date.now();
      console.log(`[music] youtubei.js ready in ${ytInitTs - t0}ms${YT_COOKIE ? ' (with cookie auth)' : ''}`);
      return inst;
    })(),
    new Promise((_, rej) => setTimeout(() => {
      rej(new Error(`youtubei.js init timed out after ${YT_INIT_TIMEOUT}ms — likely OOM on a 256MB machine or YouTube blocking this host's IP. Bump memory or set MUSIC_INIT_TIMEOUT=60000.`));
    }, YT_INIT_TIMEOUT)),
  ]).catch((e) => {
    ytInitError = e;
    console.error(`[music] youtubei.js init failed:`, e.message);
    ytPromise = null;
    throw e;
  });
  return ytPromise;
}

// Optional pre-warm. Disabled by default because youtubei.js loads the
// YouTube player script (a few MB of JS) and evaluates it in a vm
// context — on small fly.io machines (256 MB shared) with a 200 MB
// heap cap, that can OOM the process at boot before /healthz is
// reachable, putting the app into a restart loop.
// Set MUSIC_PREWARM=1 in env to opt back in (recommended once you're
// on a 512 MB+ machine).
if (process.env.MUSIC_PREWARM === '1') {
  setTimeout(() => {
    getYT().catch(() => { /* logged inside getYT */ });
  }, 1000);
}

// Belt-and-suspenders: no matter what goes wrong inside youtubei.js
// or any other lazy-loaded module, keep the HTTP server alive. The
// per-endpoint try/catch already returns a 502 to the client; this
// catches the cases that escape that net (e.g. a timer callback
// inside youtubei.js throwing on its own schedule).
process.on('uncaughtException', (e) => {
  console.error('[server] uncaughtException:', e.stack || e.message);
});
process.on('unhandledRejection', (e) => {
  console.error('[server] unhandledRejection:', e?.stack || e?.message || e);
});

// Diagnostic endpoint — pinpoints which leg of the music chain is
// broken when "music doesn't work" (e.g. on Codespaces). Hit
// /api/music/status from the browser to see what the server can reach.
app.get('/api/music/status', async (_req, res) => {
  const out = {
    youtubei: {
      ready: !!ytInitTs && !ytInitError,
      lastError: ytInitError?.message || null,
      readyAt: ytInitTs || null,
    },
    auth: ytAuthSummary(),
    cache: { entries: musicCache.size },
    streamCache: { entries: typeof streamUrlCache !== 'undefined' ? streamUrlCache.size : 0 },
  };
  // Active probe: walk Piped + Invidious instances and report which
  // ones serve a known-good track (Blinding Lights) at this moment.
  // Also tests the local youtubei.js fallback for residential-IP setups.
  // Result tells the user which backend is healthy right now and which
  // instances to drop/swap if half are down.
  if (_req.query.probe === '1') {
    const id = 'J7p4bzqLvCw'; // Blinding Lights
    out.probe = { piped: {}, invidious: {}, youtubei: null };
    // Piped instances
    for (const base of PIPED_INSTANCES) {
      try {
        const data = await fetchJSONInstance(base, `/streams/${id}`, 6000);
        const audio = (data.audioStreams || []).filter((s) => s.url && /audio/.test(s.mimeType || ''))[0];
        out.probe.piped[base] = audio ? { ok: true, formats: data.audioStreams?.length || 0 } : { ok: false, reason: 'no_audio' };
      } catch (e) {
        out.probe.piped[base] = { ok: false, error: e.message.slice(0, 120) };
      }
    }
    // Invidious instances
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const data = await fetchJSONInstance(base, `/api/v1/videos/${id}`, 6000);
        const audio = (data.adaptiveFormats || []).filter((f) => f.url && /audio/i.test(f.type || ''))[0];
        out.probe.invidious[base] = audio ? { ok: true, formats: data.adaptiveFormats?.length || 0 } : { ok: false, reason: 'no_audio' };
      } catch (e) {
        out.probe.invidious[base] = { ok: false, error: e.message.slice(0, 120) };
      }
    }
    // youtubei.js (only useful if running on a residential IP)
    try {
      const yt = await getYT();
      const r = await getInfoWithFormats(yt, id);
      out.probe.youtubei = { ok: true, client: r.client, formats: r.formats.length };
    } catch (e) {
      out.probe.youtubei = { ok: false, error: e.message.slice(0, 120) };
    }
    const pipedOk     = Object.values(out.probe.piped).some((v) => v.ok);
    const invOk       = Object.values(out.probe.invidious).some((v) => v.ok);
    const ytOk        = !!out.probe.youtubei?.ok;
    out.probe.ok      = pipedOk || invOk || ytOk;
    out.probe.summary = `piped:${pipedOk ? 'OK' : 'FAIL'} invidious:${invOk ? 'OK' : 'FAIL'} youtubei:${ytOk ? 'OK' : 'FAIL'}`;
  }
  res.json(out);
});

const MUSIC_TTL = 5 * 60 * 1000;
const musicCache = new Map();
function cacheGet(key) {
  const hit = musicCache.get(key);
  if (hit && (Date.now() - hit.ts) < MUSIC_TTL) return hit.body;
  return null;
}
function cacheSet(key, body) {
  musicCache.set(key, { ts: Date.now(), body });
  if (musicCache.size > 500) {
    const oldest = [...musicCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) musicCache.delete(oldest[0]);
  }
}

const safeYTId = (s) => /^[a-zA-Z0-9_-]{4,40}$/.test(s);

// ----- Normalizers: turn youtubei.js's typed result objects into the flat
// shape the client uses: { type, id, title, artist, album, cover, duration }.
function pickThumb(thumbs) {
  if (!Array.isArray(thumbs) || !thumbs.length) return '';
  const sorted = [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || '';
}
function txt(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v.text === 'string') return v.text;
  if (typeof v.toString === 'function') return v.toString();
  return '';
}
function normalizeSong(item) {
  if (!item) return null;
  const id = item.id || item.video_id || item.endpoint?.payload?.videoId;
  if (!id) return null;
  return {
    type: 'track',
    id,
    title: txt(item.title) || txt(item.name) || '',
    artist: (item.artists || []).map((a) => txt(a.name)).filter(Boolean).join(', ') ||
            txt(item.author) || txt(item.subtitle) || '',
    album: txt(item.album?.name) || '',
    cover: pickThumb(item.thumbnails || item.thumbnail?.contents || []),
    duration: typeof item.duration?.seconds === 'number' ? item.duration.seconds
            : typeof item.duration === 'number' ? item.duration : 0,
  };
}
function normalizePlaylist(item) {
  if (!item) return null;
  const id = item.id || item.endpoint?.payload?.browseId || item.endpoint?.payload?.playlistId;
  if (!id) return null;
  return {
    type: 'playlist',
    id: String(id).replace(/^VL/, ''),
    title: txt(item.title) || txt(item.name) || '',
    author: (item.author && txt(item.author.name)) || txt(item.subtitle) || '',
    cover: pickThumb(item.thumbnails || item.thumbnail?.contents || []),
    trackCount: item.item_count || item.song_count || 0,
  };
}
function normalizeAlbum(item) {
  if (!item) return null;
  const id = item.id || item.endpoint?.payload?.browseId;
  if (!id) return null;
  return {
    type: 'album',
    id,
    title: txt(item.title) || txt(item.name) || '',
    artist: (item.artists || []).map((a) => txt(a.name)).filter(Boolean).join(', ') ||
            txt(item.author) || txt(item.subtitle) || '',
    cover: pickThumb(item.thumbnails || []),
    year: item.year || '',
  };
}
function normalizeArtist(item) {
  if (!item) return null;
  const id = item.id || item.endpoint?.payload?.browseId;
  if (!id) return null;
  return {
    type: 'artist',
    id,
    title: txt(item.name) || txt(item.title) || '',
    cover: pickThumb(item.thumbnails || []),
  };
}

// ----- Endpoints -----

app.get('/api/music/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const allowed = ['song', 'video', 'album', 'artist', 'playlist'];
    const filter = allowed.includes(req.query.filter) ? req.query.filter : 'song';
    if (!q) return res.json({ items: [] });
    const cacheKey = `search:${filter}:${q.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }
    let body = null;
    let lastErr = null;
    // Piped first — handles all filter types and runs on residential IPs.
    try {
      const { items: rawItems, instance } = await pipedSearch(q, filter);
      const norm = (filter === 'playlist' || filter === 'album') ? pipedItemToPlaylist : pipedItemToSong;
      const items = [];
      for (const it of rawItems) { const n = norm(it); if (n) items.push(n); }
      body = { items, backend: 'piped', instance };
    } catch (e) { lastErr = e; }
    // Fall back to youtubei.js (works on residential IP only).
    if (!body) {
      try {
        const yt = await getYT();
        const results = await yt.music.search(q, { type: filter });
        const sectionByType = {
          song: results.songs?.contents,
          video: results.videos?.contents,
          album: results.albums?.contents,
          artist: results.artists?.contents,
          playlist: results.playlists?.contents,
        };
        const raw = sectionByType[filter] || results.contents?.[0]?.contents || [];
        const norm = filter === 'playlist' ? normalizePlaylist
                  : filter === 'album'    ? normalizeAlbum
                  : filter === 'artist'   ? normalizeArtist
                  :                          normalizeSong;
        const items = [];
        for (const it of raw) { const n = norm(it); if (n) items.push(n); }
        body = { items, backend: 'youtubei' };
      } catch (e2) {
        console.error('[music/search] piped+yt failed:', lastErr?.message, '|', e2.message);
        return res.status(502).json({ error: 'yt_unavailable', detail: `${lastErr?.message || ''} | ${e2.message}` });
      }
    }
    cacheSet(cacheKey, body);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(body);
  } catch (e) {
    console.error('[music/search]', e.message);
    res.status(502).json({ error: 'yt_unavailable', detail: e.message });
  }
});

app.get('/api/music/track/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!safeYTId(id)) return res.status(400).json({ error: 'bad_id' });
    const cached = cacheGet(`track:${id}`);
    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=60');
      return res.json(cached);
    }
    // resolveTrack walks Piped → Invidious → youtubei.js. The client only
    // reads title/uploader/duration/thumbnailUrl from this endpoint;
    // audioStreams is included for completeness but the actual byte
    // stream comes from /api/music/stream/:id (which also resolves via
    // the same chain).
    const t = await resolveTrack(id);
    const body = {
      title: t.title,
      uploader: t.uploader,
      duration: t.duration,
      thumbnailUrl: t.thumbnailUrl,
      audioStreams: t.audioStreams || [],
      backend: t.backend,
      instance: t.instance,
    };
    cacheSet(`track:${id}`, body);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(body);
  } catch (e) {
    console.error('[music/track]', e.message);
    res.status(502).json({ error: 'yt_unavailable', detail: e.message });
  }
});

// Audio stream proxy. The googlevideo URLs that decipher() returns are
// signed for YouTube's own client and don't play directly in a third-party
// <audio> tag (CORS, range-handshake quirks, sometimes 403 without the
// right Origin). We pipe the bytes through our own origin instead — same
// approach Piped's `pipedproxy-*` host uses. Forwards the Range header so
// HTML5 audio seeking still works.
const Stream = require('node:stream');
const { pipeline } = require('node:stream/promises');
const streamUrlCache = new Map(); // id -> { url, mime, ts }
const STREAM_URL_TTL = 4 * 60 * 1000; // googlevideo URLs typically stay valid ~5min

// Walk a list of clients until one returns audio-only adaptive_formats.
// On cloud IPs (Oracle, Fly, etc.) YouTube's bot-heuristics serve
// metadata-only or empty streaming_data to common clients; ANDROID_VR
// is the most reliable but isn't always granted, so fall through to a
// few alternatives before giving up. Returns { info, formats, client }.
const STREAM_CLIENTS = ['ANDROID_VR', 'IOS', 'ANDROID', 'TV_EMBEDDED', 'WEB', 'MWEB', 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', 'WEB_EMBEDDED_PLAYER'];
async function getInfoWithFormats(yt, id, clients = STREAM_CLIENTS) {
  let lastErr = null;
  for (const client of clients) {
    try {
      const info = await yt.getInfo(id, { client });
      const formats = (info.streaming_data?.adaptive_formats || [])
        .filter((f) => f.has_audio && !f.has_video);
      if (formats.length) {
        return { info, formats, client };
      }
      lastErr = new Error(`${client}: empty streaming_data`);
    } catch (e) {
      lastErr = new Error(`${client}: ${e.message}`);
    }
  }
  throw lastErr || new Error('all clients exhausted');
}

async function resolveStream(id) {
  const hit = streamUrlCache.get(id);
  if (hit && (Date.now() - hit.ts) < STREAM_URL_TTL) return hit;
  // Try the Piped → Invidious → youtubei.js chain. The first successful
  // backend wins; we cache its googlevideo URL until STREAM_URL_TTL
  // (signed URLs typically last ~5 min before requiring a re-resolve).
  const info = await resolveTrack(id);
  console.log(`[music] stream ${id} resolved via ${info.backend}/${info.instance}`);
  const out = { ...info, ts: Date.now() };
  streamUrlCache.set(id, out);
  return out;
}

app.get('/api/music/stream/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!safeYTId(id)) return res.status(400).end();

    const { url, mime } = await resolveStream(id);
    // googlevideo's audio CDN now caps single-request ranges to ~512KB
    // and refuses both open-ended Ranges (`bytes=0-`) and oversized
    // closed Ranges. Translate whatever the client sent into a 512KB
    // closed window starting at the requested byte. The browser's
    // <audio> element handles 206 partial responses natively — after
    // buffering this chunk it'll request the next range automatically.
    const CHUNK = 512 * 1024;
    const reqRange = req.headers.range || 'bytes=0-';
    const m = /^bytes=(\d+)-(\d*)$/.exec(reqRange);
    let start = m ? parseInt(m[1], 10) : 0;
    let endHint = m && m[2] ? parseInt(m[2], 10) : Infinity;
    let effectiveEnd = Math.min(start + CHUNK - 1, endHint);
    if (!isFinite(effectiveEnd)) effectiveEnd = start + CHUNK - 1;
    const range = `bytes=${start}-${effectiveEnd}`;

    const upstream = await fetch(url, {
      headers: {
        'range': range,
        // googlevideo gates on these — without them you can get 403.
        'origin': 'https://www.youtube.com',
        'referer': 'https://www.youtube.com/',
        'user-agent': 'Mozilla/5.0',
      },
    });

    if (upstream.status === 403 || upstream.status === 410) {
      // Signed URL expired — bust the cache and try once more.
      streamUrlCache.delete(id);
      const fresh = await resolveStream(id);
      const retry = await fetch(fresh.url, {
        headers: {
          'range': range,
          'origin': 'https://www.youtube.com',
          'referer': 'https://www.youtube.com/',
          'user-agent': 'Mozilla/5.0',
        },
      });
      return pipeUpstream(retry, res, fresh.mime);
    }
    return pipeUpstream(upstream, res, mime);
  } catch (e) {
    console.error('[music/stream]', e.message);
    if (!res.headersSent) {
      // Surface the real error to the browser so DevTools shows what's
      // wrong instead of a silent 502. The most common root cause is
      // YouTube refusing cloud IPs without cookie auth — detect that
      // pattern and add a hint to the response so the user knows what
      // to fix.
      const msg = String(e.message || '');
      const isAuthIssue = /empty_streaming_data|This video is unavailable|all clients exhausted/i.test(msg);
      res.status(502).json({
        error: 'stream_unavailable',
        detail: msg.slice(0, 240),
        hint: isAuthIssue
          ? 'YouTube is refusing this server\'s IP. Set YT_COOKIE (and optionally YT_VISITOR_DATA) env vars on the host. See /api/music/status?probe=1 for per-client diagnostics.'
          : null,
        authStatus: ytAuthSummary(),
      });
    }
  }
});

async function pipeUpstream(upstream, res, mime) {
  res.status(upstream.status);
  res.setHeader('Content-Type', mime);
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  // Don't let the browser cache aggressively — the source URL rotates.
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  if (!upstream.body) { res.end(); return; }
  const node = Stream.Readable.fromWeb(upstream.body);
  res.on('close', () => { try { node.destroy(); } catch {} });
  try {
    await pipeline(node, res);
  } catch (e) {
    // Client disconnect mid-stream is normal; only log unexpected errors.
    if (e.code !== 'ERR_STREAM_PREMATURE_CLOSE' && e.code !== 'ECONNRESET') {
      console.warn('[music/stream] pipeline:', e.code || e.message);
    }
  }
}

app.get('/api/music/playlist/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(id)) return res.status(400).json({ error: 'bad_id' });
    const cached = cacheGet(`playlist:${id}`);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }
    let body = null;
    let lastErr = null;
    // Piped first.
    try {
      const { data, instance } = await pipedGetPlaylist(id);
      const tracks = (data.relatedStreams || []).map(pipedItemToSong).filter(Boolean);
      body = {
        id,
        name: data.name || 'Playlist',
        description: data.description || '',
        thumbnailUrl: data.thumbnailUrl || '',
        uploader: data.uploader || '',
        relatedStreams: tracks,
        backend: 'piped',
        instance,
      };
    } catch (e) { lastErr = e; }
    // Fall back to youtubei.js.
    if (!body) {
      try {
        const yt = await getYT();
        const pl = await yt.music.getPlaylist(id);
        const rawTracks = pl.items || pl.contents || [];
        const tracks = rawTracks.map(normalizeSong).filter(Boolean);
        body = {
          id,
          name: txt(pl.header?.title) || txt(pl.title) || 'Playlist',
          description: txt(pl.header?.description) || txt(pl.description) || '',
          thumbnailUrl: pickThumb(pl.header?.thumbnails || pl.thumbnails || []),
          uploader: txt(pl.header?.author?.name) || txt(pl.author) || '',
          relatedStreams: tracks,
          backend: 'youtubei',
        };
      } catch (e2) {
        console.error('[music/playlist] piped+yt failed:', lastErr?.message, '|', e2.message);
        return res.status(502).json({ error: 'yt_unavailable', detail: `${lastErr?.message || ''} | ${e2.message}` });
      }
    }
    cacheSet(`playlist:${id}`, body);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(body);
  } catch (e) {
    console.error('[music/playlist]', e.message);
    res.status(502).json({ error: 'yt_unavailable', detail: e.message });
  }
});

app.get('/api/music/home', async (_req, res) => {
  try {
    const cached = cacheGet('home');
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=600');
      return res.json(cached);
    }
    const yt = await getYT();
    const home = await yt.music.getHomeFeed();
    const sections = [];
    for (const sec of (home.sections || []).slice(0, 8)) {
      const title = txt(sec.header?.title) || txt(sec.title) || '';
      const items = [];
      for (const it of (sec.contents || [])) {
        // Dispatch by what the item's endpoint actually points at —
        // youtubei.js MusicTwoRowItem can be track/playlist/album/artist
        // depending on the payload. Checking endpoint type first avoids
        // the bug where a playlist row gets normalized as a track because
        // it happens to have an `id` field.
        const ep = it.endpoint?.payload || {};
        let n = null;
        if (ep.videoId) n = normalizeSong(it);
        else if (ep.playlistId) n = normalizePlaylist(it);
        else if (ep.browseId) {
          const b = String(ep.browseId);
          if (b.startsWith('MPRE') || b.startsWith('MPLA')) n = normalizeAlbum(it);
          else if (b.startsWith('UC') || b.startsWith('FEmusic_artist')) n = normalizeArtist(it);
          else if (b.startsWith('VL') || b.startsWith('PL') || b.startsWith('RD')) n = normalizePlaylist(it);
          else n = normalizePlaylist(it); // safe default for unknown browseIds
        } else {
          // No endpoint info — last-ditch attempt.
          n = normalizeSong(it) || normalizePlaylist(it);
        }
        if (n) items.push(n);
      }
      if (items.length) sections.push({ title, items });
    }
    const body = { sections };
    cacheSet('home', body);
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(body);
  } catch (e) {
    console.error('[music/home]', e.message);
    res.status(502).json({ error: 'yt_unavailable', detail: e.message });
  }
});

// ----- GitHub raw proxy for InnerArcade -----
// raw.githubusercontent.com serves all the gn-math game files (covers, html
// wrappers, assets), but it ships HTML/JS/CSS as `text/plain` for security
// — which means iframes won't render HTML, and <script> tags refuse to
// execute. This endpoint re-streams the same bytes with the correct
// content-type by file extension, and rewrites embedded jsdelivr/githack
// URLs in HTML responses to point back at this same proxy (so the game's
// dependent assets load from working hosts even when jsdelivr DMCA-blocks
// the original org).
//
// Path format: /api/arcade/gh/:org/:repo/:branch/<...path>
const GH_CT_BY_EXT = {
  html: 'text/html; charset=utf-8',  htm: 'text/html; charset=utf-8',
  js:   'application/javascript; charset=utf-8',
  mjs:  'application/javascript; charset=utf-8',
  cjs:  'application/javascript; charset=utf-8',
  css:  'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml:  'application/xml; charset=utf-8',
  svg:  'image/svg+xml',
  png:  'image/png',  jpg: 'image/jpeg',  jpeg: 'image/jpeg',
  gif:  'image/gif',  webp: 'image/webp', avif: 'image/avif',
  ico:  'image/x-icon',
  woff: 'font/woff',  woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  wasm: 'application/wasm',
  mp3:  'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac',
  mp4:  'video/mp4',  webm: 'video/webm', mov: 'video/quicktime',
  swf:  'application/x-shockwave-flash',
  txt:  'text/plain; charset=utf-8',
  pdf:  'application/pdf',
};
function ghPathSafe(s) { return /^[a-zA-Z0-9._-]+$/.test(s); }

app.get(/^\/api\/arcade\/gh\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/, async (req, res) => {
  const [org, repo, branch, subPath] = [req.params[0], req.params[1], req.params[2], req.params[3] || ''];
  if (!ghPathSafe(org) || !ghPathSafe(repo) || !ghPathSafe(branch)) {
    return res.status(400).send('bad path');
  }
  // Reject path traversal — subPath segments must each be safe-looking.
  if (subPath.split('/').some((seg) => seg === '..' || /[<>?]/.test(seg))) {
    return res.status(400).send('bad subpath');
  }
  const upstream = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${subPath}`;
  try {
    const r = await fetch(upstream, { headers: { 'user-agent': 'desktop-proxy/0.1' } });
    if (!r.ok) {
      res.status(r.status);
      return res.type('text/plain').send(`upstream ${r.status} for ${org}/${repo}@${branch}/${subPath}`);
    }
    const ext = (subPath.split('.').pop() || '').toLowerCase();
    const ct = GH_CT_BY_EXT[ext] || r.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // Some games expect the page to be cross-origin-isolated for SharedArrayBuffer.
    // Letting the iframe send no referrer keeps strict hosts (cdn.jsdelivr) happy.
    res.setHeader('Referrer-Policy', 'no-referrer');

    const buf = Buffer.from(await r.arrayBuffer());

    // For HTML, rewrite embedded CDN URLs to the same proxy so dependent
    // assets resolve. We map jsdelivr's gh form, raw.githack, statically.io,
    // and direct raw.githubusercontent links — anything else is left alone.
    if (/^text\/html/.test(ct)) {
      let html = buf.toString('utf-8');
      // jsdelivr: https://cdn.jsdelivr.net/gh/<org>/<repo>@<branch>/<path>
      html = html.replace(
        /https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@"'\s]+)\/([^/@"'\s]+)@([^/"'\s]+)\//g,
        '/api/arcade/gh/$1/$2/$3/'
      );
      // jsdelivr without explicit version (defaults to main):
      html = html.replace(
        /https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@"'\s]+)\/([^/@"'\s]+)\/(?!@)/g,
        '/api/arcade/gh/$1/$2/main/'
      );
      // raw.githack / rawcdn.githack: https://(raw|rawcdn).githack.com/<org>/<repo>/<branch>/<path>
      html = html.replace(
        /https?:\/\/(?:raw|rawcdn)\.githack\.com\/([^/"'\s]+)\/([^/"'\s]+)\/([^/"'\s]+)\//g,
        '/api/arcade/gh/$1/$2/$3/'
      );
      // statically.io: https://cdn.statically.io/gh/<org>/<repo>/<branch>/<path>
      html = html.replace(
        /https?:\/\/cdn\.statically\.io\/gh\/([^/"'\s]+)\/([^/"'\s]+)\/([^/"'\s]+)\//g,
        '/api/arcade/gh/$1/$2/$3/'
      );
      // raw.githubusercontent direct (already same host as ours, but route
      // through the proxy so content-type is correct):
      html = html.replace(
        /https?:\/\/raw\.githubusercontent\.com\/([^/"'\s]+)\/([^/"'\s]+)\/([^/"'\s]+)\//g,
        '/api/arcade/gh/$1/$2/$3/'
      );
      return res.send(html);
    }

    res.send(buf);
  } catch (e) {
    res.status(502).type('text/plain').send('proxy failed: ' + e.message);
  }
});

// Background probe runs in parallel with serving; only one at a time.
let arcadeProbeInFlight = false;
function kickArcadeProbe(unprobed) {
  if (arcadeProbeInFlight) return;
  if (unprobed.probed) return; // already filtered, nothing to do
  arcadeProbeInFlight = true;
  probeManifest(unprobed)
    .then((probed) => {
      // Only commit the probe result if the cache hasn't been replaced by
      // a newer build in the meantime (e.g. TTL flip during the probe).
      if (arcadeCache.data === unprobed) {
        arcadeCache = { ts: arcadeCache.ts, data: probed };
      }
    })
    .catch((e) => console.error('[arcade-probe]', e.message))
    .finally(() => { arcadeProbeInFlight = false; });
}

app.get('/api/arcade/games', async (_req, res) => {
  const now = Date.now();
  if (arcadeCache.data && (now - arcadeCache.ts) < ARCADE_TTL) {
    // Cache hit. If the entry hasn't been probed yet, kick a background
    // probe so the next request gets the filtered version. Doesn't block
    // the response.
    kickArcadeProbe(arcadeCache.data);
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.json(arcadeCache.data);
  }
  try {
    const data = await buildArcadeManifest();
    arcadeCache = { ts: now, data };
    // Serve unprobed list immediately for snappy first load. Probe runs
    // in the background and replaces cache when done (~30-60s).
    kickArcadeProbe(data);
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(data);
  } catch (e) {
    // If we have a stale cached version, serve it rather than 502.
    if (arcadeCache.data) return res.json(arcadeCache.data);
    res.status(502).json({ error: 'arcade_unavailable', detail: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---------- Shared wallpaper library ----------
app.get('/api/wallpapers', (_req, res) => {
  const m = loadManifest();
  res.json({ items: m.items });
});

app.get('/api/wallpapers/:id/file', (req, res) => {
  const m = loadManifest();
  const it = m.items.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).send('not found');
  const file = path.join(WP_DIR, it.file);
  if (!file.startsWith(WP_DIR)) return res.status(400).send('bad path');
  res.setHeader('Content-Type', it.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(file)
    .on('error', () => res.status(500).end())
    .pipe(res);
});

// Upload: raw body with headers x-filename (opt), x-upload-by (opt), content-type = mime
app.post('/api/wallpapers', (req, res) => {
  const mime = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.test(mime)) return res.status(415).json({ error: 'unsupported media type' });
  const ext = EXT_BY_MIME[mime] || 'bin';
  const name = String(req.headers['x-filename'] || '').slice(0, 120) || null;
  const uploader = String(req.headers['x-upload-by'] || '').slice(0, 60) || null;
  const id = 'sw_' + crypto.randomBytes(7).toString('hex');
  const fname = `${id}.${ext}`;
  const fpath = path.join(WP_DIR, fname);

  let size = 0;
  let aborted = false;
  const out = fs.createWriteStream(fpath);
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_UPLOAD) {
      aborted = true;
      req.destroy();
      out.destroy();
      try { fs.unlinkSync(fpath); } catch {}
      if (!res.headersSent) res.status(413).json({ error: 'too large' });
    }
  });
  req.on('error', () => {
    try { fs.unlinkSync(fpath); } catch {}
    if (!res.headersSent) res.status(500).end();
  });
  req.pipe(out);
  out.on('finish', () => {
    if (aborted) return;
    const kind = mime.startsWith('video/') ? 'video' : (mime === 'image/gif' ? 'gif' : 'image');
    const item = { id, file: fname, mime, kind, size, name, uploader, created: Date.now() };
    const m = loadManifest();
    m.items.unshift(item);
    saveManifest(m);
    res.json({ ok: true, item });
  });
  out.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'write failed' });
  });
});

app.delete('/api/wallpapers/:id', (req, res) => {
  const m = loadManifest();
  const idx = m.items.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return res.status(404).send('not found');
  const [it] = m.items.splice(idx, 1);
  try { fs.unlinkSync(path.join(WP_DIR, it.file)); } catch {}
  saveManifest(m);
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) res.type('txt').send('Not found');
  });
});

const server = http.createServer();

server.on('request', (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

server.on('listening', () => {
  console.log(`desktop-proxy listening on :${PORT}`);
});

server.listen(PORT);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    bare.close();
    server.close();
    process.exit(0);
  });
}
