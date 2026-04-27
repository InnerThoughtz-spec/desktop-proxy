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
  const r = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!r.ok) {
    const err = new Error(`tmdb ${r.status}`);
    err.status = r.status;
    throw err;
  }
  const body = await r.json();
  tmdbCache.set(cacheKey, { ts: now, body });
  // soft cap on cache size
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
    .map((g, i) => ({
      id: 'tr-' + (g.url || '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60) + '-' + i,
      name: safeStr(g.name),
      source: 'Truffled',
      thumb: g.thumbnail ? joinUrl(BASE, g.thumbnail) : '',
      url: joinUrl(BASE, g.url),
    }));
}

function normalizeSelenite(data) {
  if (!Array.isArray(data)) return [];
  const BASE = 'https://selenite.cc';
  return data
    .filter((g) => g && g.directory && g.name)
    .map((g) => {
      const dir = safeStr(g.directory);
      const img = safeStr(g.image);
      const params = new URLSearchParams({
        title: g.name,
        dir,
        img: img,
        type: 'g',
      });
      return {
        id: 'sel-' + dir,
        name: safeStr(g.name),
        source: 'Selenite',
        thumb: img ? `${BASE}/resources/games/${dir}/${img}` : '',
        url: `${BASE}/loader.html?${params.toString()}`,
      };
    });
}

async function buildArcadeManifest() {
  const [gn, tr, sel] = await Promise.all([
    fetchJSONOrNull(ARCADE_SOURCES.GN_MATH),
    fetchJSONOrNull(ARCADE_SOURCES.TRUFFLED),
    fetchJSONOrNull(ARCADE_SOURCES.SELENITE),
  ]);
  const games = [
    ...normalizeGNMath(gn),
    ...normalizeTruffled(tr),
    ...normalizeSelenite(sel),
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
    },
    ts: Date.now(),
  };
}

// ---------- Inntify music proxy (Piped) ----------
// Inntify is our Spotify-clone music app. We don't ship a YouTube Music API
// key (there's no official one) — instead we proxy a public Piped instance.
// Piped is an open-source YouTube frontend with a clean JSON API and a
// CORS-friendly stream proxy, so its audio URLs play directly in <audio>.
//
// Public Piped instances rotate frequently — kavin.rocks (the historical
// default) is currently down. We try the configured instance first, then
// fall back through a small list of known-alive hosts. Set PIPED_API to
// pin a single instance (e.g. your self-hosted one) and skip the fallback.
const PIPED_API = process.env.PIPED_API || '';
const PIPED_FALLBACKS = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.reallyaweso.me',
];
const PIPED_HOSTS = PIPED_API ? [PIPED_API] : PIPED_FALLBACKS;

const MUSIC_TTL = 5 * 60 * 1000;
const musicCache = new Map();
// Index of the upstream that worked last — bias toward it so we don't
// re-pay the timeout cost on every cold request.
let pipedHostIdx = 0;

async function piped(pathAndQuery) {
  const cacheKey = pathAndQuery;
  const now = Date.now();
  const hit = musicCache.get(cacheKey);
  if (hit && (now - hit.ts) < MUSIC_TTL) return hit.body;

  // Try hosts in order, starting with the most-recently-successful one.
  const hosts = [
    PIPED_HOSTS[pipedHostIdx],
    ...PIPED_HOSTS.filter((_, i) => i !== pipedHostIdx),
  ];
  let lastErr = null;
  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    try {
      const r = await fetch(`${host}${pathAndQuery}`, {
        headers: { 'accept': 'application/json', 'user-agent': 'desktop-proxy/0.1' },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) { lastErr = new Error(`piped ${r.status} from ${host}`); continue; }
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) { lastErr = new Error(`non-json from ${host}`); continue; }
      const body = await r.json();
      // Some instances 200 with "Service has been shutdown" plain text or
      // an empty stub — treat empty {items:[]}/empty arrays as success
      // (real "no results") only when the request was a search. For
      // /streams we expect audioStreams; if not present, try the next host.
      if (pathAndQuery.startsWith('/streams/') && (!body || !Array.isArray(body.audioStreams))) {
        lastErr = new Error(`no audio streams from ${host}`); continue;
      }
      musicCache.set(cacheKey, { ts: now, body });
      pipedHostIdx = PIPED_HOSTS.indexOf(host);
      if (pipedHostIdx < 0) pipedHostIdx = 0;
      // Soft-cap cache size.
      if (musicCache.size > 500) {
        const oldest = [...musicCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) musicCache.delete(oldest[0]);
      }
      return body;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  const err = lastErr || new Error('all piped instances failed');
  err.status = 502;
  throw err;
}

function sendPiped(res, fn) {
  fn().then(
    (body) => { res.setHeader('Cache-Control', 'public, max-age=120'); res.json(body); },
    (err) => res.status(err.status || 502).json({ error: 'piped_unavailable', detail: err.message })
  );
}

const safeYTId = (s) => /^[a-zA-Z0-9_-]{4,40}$/.test(s);
const safePlaylistId = (s) => /^[a-zA-Z0-9_-]{4,80}$/.test(s);

app.get('/api/music/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = ['music_songs', 'music_albums', 'music_playlists', 'music_artists', 'all']
    .includes(req.query.filter) ? req.query.filter : 'music_songs';
  if (!q) return res.json({ items: [] });
  sendPiped(res, () => piped(`/search?q=${encodeURIComponent(q)}&filter=${filter}`));
});

app.get('/api/music/track/:id', (req, res) => {
  const id = String(req.params.id || '');
  if (!safeYTId(id)) return res.status(400).json({ error: 'bad_id' });
  sendPiped(res, () => piped(`/streams/${id}`));
});

app.get('/api/music/playlist/:id', (req, res) => {
  const id = String(req.params.id || '');
  if (!safePlaylistId(id)) return res.status(400).json({ error: 'bad_id' });
  sendPiped(res, () => piped(`/playlists/${id}`));
});

app.get('/api/music/trending', (_req, res) => {
  const region = String(_req.query.region || 'US').replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase() || 'US';
  sendPiped(res, () => piped(`/trending?region=${region}`));
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

app.get('/api/arcade/games', async (_req, res) => {
  const now = Date.now();
  if (arcadeCache.data && (now - arcadeCache.ts) < ARCADE_TTL) {
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.json(arcadeCache.data);
  }
  try {
    const data = await buildArcadeManifest();
    arcadeCache = { ts: now, data };
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
