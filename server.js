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
