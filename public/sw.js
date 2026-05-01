// --- Engine 1: Ultraviolet (mature, default) ---
importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts(__uv$config.sw || '/uv/uv.sw.js');

const uv = new UVServiceWorker();

// --- Engine 2: Scramjet (experimental successor) ---
// Optional — wrapped in try/catch so a missing scramjet install (e.g. on a
// stripped-down deploy) doesn't break the UV path. If anything below throws,
// `scram` stays null and the dispatcher just won't route to it.
let scram = null;
try {
  importScripts('/scramjet/scramjet.codecs.js');   // defines self.__scramjet$codecs
  importScripts('/scram.config.js');               // defines self.__scramjet$config
  importScripts('/scramjet/scramjet.bundle.js');   // page-side rewriters used by the SW too
  importScripts('/scramjet/scramjet.worker.js');   // exposes self.ScramjetServiceWorker
  scram = new self.ScramjetServiceWorker();
} catch (e) { console.warn('[sw] Scramjet engine unavailable:', e && e.message); }

// --- Instrument UV's bareClient so we can actually SEE errors that UV's
// internal catch-all would otherwise swallow into a blank Response(500). ---
// Rolling error buffer (also used by logSwError below).
const SW_ERRORS = [];
// Counters to confirm our SW path actually runs for every proxied request.
const SW_COUNTERS = { fetchEvents: 0, proxied: 0, directBareCalls: 0, directBareOk: 0, directBareFail: 0, htmlInjections: 0, nullBody: 0, notHtml: 0 };
const SW_LAST_PROXIED = [];  // rolling list of last N proxied requests w/ url + status + ct
function logSwError(label, err, extra) {
  try {
    SW_ERRORS.push({
      t: Date.now(), label, msg: String((err && err.message) || err),
      stack: err && err.stack ? String(err.stack).slice(0, 600) : null,
      extra: extra || null,
    });
    if (SW_ERRORS.length > 120) SW_ERRORS.splice(0, SW_ERRORS.length - 120);
  } catch(_){}
}
// --- Direct bare-server client ---
//
// Why we bypass bare-mux here:
//   bare-mux ships request bodies across a SharedWorker MessagePort as
//   ReadableStreams, and its internal ClientV3 then calls fetch() with
//   `duplex: 'half'`. Chrome (and current Firefox) only allow streaming
//   upload bodies over HTTP/2+, so against an HTTP/1.1 server like our
//   bare-server-node, POST requests blow up with `TypeError: Failed to
//   fetch`. UV's outer catch silently rewrites that into an empty 500
//   response, which YouTube's SPA interprets as "You're offline". Same
//   failure mode kills iframe games that POST auth / save-state payloads.
//
// We replace uv.bareClient.fetch with a lean, streaming-free direct call
// to the bare-server-node v3 endpoint: materialize the body to an
// ArrayBuffer, pack bare headers, fetch /bare/v3/ without `duplex:'half'`,
// and return a Response shaped exactly like UV expects.
const BARE_ENDPOINT = '/bare/v3/';

const BARE_FORBIDDEN_SEND = new Set(['connection', 'content-length', 'transfer-encoding']);
const BARE_FORBIDDEN_FORWARD = new Set(['connection', 'transfer-encoding', 'host', 'origin', 'referer']);

async function materializeBody(body) {
  if (body == null) return undefined;
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  if (typeof body === 'string') return new TextEncoder().encode(body).buffer;
  if (body instanceof Blob) return await body.arrayBuffer();
  if (body instanceof ReadableStream) return await new Response(body).arrayBuffer();
  if (body instanceof FormData || body instanceof URLSearchParams) {
    return await new Response(body).arrayBuffer();
  }
  try { return await new Response(body).arrayBuffer(); } catch (_) { return undefined; }
}

async function directBareFetch(url, init = {}) {
  const u = typeof url === 'string' ? new URL(url) : url;
  const remote = u.toString();
  const method = (init.method || 'GET').toUpperCase();

  // Collect headers going to the remote.
  const sendHeaders = {};
  const rawHeaders = init.headers || {};
  const addH = (k, v) => {
    const lk = String(k).toLowerCase();
    if (BARE_FORBIDDEN_SEND.has(lk)) return;
    sendHeaders[k] = v;
  };
  if (rawHeaders instanceof Headers) rawHeaders.forEach((v, k) => addH(k, v));
  else if (Array.isArray(rawHeaders)) for (const [k, v] of rawHeaders) addH(k, v);
  else for (const k in rawHeaders) addH(k, rawHeaders[k]);

  sendHeaders.host = u.host;

  // Bare server forward list: let it copy client hints from our request.
  const forwardHeaders = ['accept-encoding', 'accept-language'];
  const passHeaders = ['content-encoding', 'content-length', 'last-modified', 'set-cookie'];
  const passStatus = [];

  // Optional cache-key (just to match bare-as-module3's behaviour).
  const cacheKey = await cacheKeyFor(remote);
  const endpoint = BARE_ENDPOINT + (cacheKey ? '?cache=' + cacheKey : '');

  const bareHeaders = new Headers();
  bareHeaders.set('x-bare-url', remote);
  bareHeaders.set('x-bare-headers', JSON.stringify(sendHeaders));
  for (const h of forwardHeaders) {
    if (!BARE_FORBIDDEN_FORWARD.has(h.toLowerCase())) bareHeaders.append('x-bare-forward-headers', h);
  }
  for (const h of passHeaders) bareHeaders.append('x-bare-pass-headers', h);
  for (const s of passStatus) bareHeaders.append('x-bare-pass-status', String(s));

  const bodyBuf = await materializeBody(init.body);

  const upstream = await fetch(endpoint, {
    method,
    headers: bareHeaders,
    body: bodyBuf,
    credentials: 'omit',
    // NO duplex:'half' — we never stream the upload. That's the whole point.
  });

  if (!upstream.ok) {
    // bare-server itself rejected the request; surface the error so UV can handle it.
    let detail = '';
    try { detail = await upstream.text(); } catch (_) {}
    const err = new Error('bare-server ' + upstream.status + ' ' + (upstream.statusText || ''));
    err.bareStatus = upstream.status;
    err.bareBody = detail.slice(0, 500);
    throw err;
  }

  // Unpack bare response headers.
  const remoteStatusRaw = upstream.headers.get('x-bare-status');
  const remoteStatus = remoteStatusRaw ? parseInt(remoteStatusRaw, 10) : upstream.status;
  const remoteStatusText = upstream.headers.get('x-bare-status-text') || upstream.statusText;

  // bare-server-node's V3 splits x-bare-headers into x-bare-headers-0, x-bare-headers-1, ...
  // whenever the JSON blob is > 3072 bytes (see splitHeaderUtil.splitHeaders). YouTube's
  // response headers trivially exceed that because of cookies + link + ... — so if we only
  // read the single `x-bare-headers`, it's null for any real site and we get an empty
  // headers object, which looks like "no content-type" to UV and skips HTML rewriting.
  // Rejoin per bare protocol: collect all x-bare-headers-N, strip leading ';', concat.
  let rawXBareHeaders = upstream.headers.get('x-bare-headers');
  if (!rawXBareHeaders) {
    const parts = [];
    upstream.headers.forEach((value, name) => {
      const m = /^x-bare-headers-(\d+)$/i.exec(name);
      if (!m) return;
      const id = parseInt(m[1], 10);
      if (typeof value !== 'string' || !value.startsWith(';')) return;
      parts[id] = value.slice(1);
    });
    if (parts.length) rawXBareHeaders = parts.join('');
  }
  let remoteHeaders = {};
  if (rawXBareHeaders) {
    try { remoteHeaders = JSON.parse(rawXBareHeaders); }
    catch (err) { logSwError('xBareHeaders.parse', err, { len: rawXBareHeaders.length, head: rawXBareHeaders.slice(0, 80) }); remoteHeaders = {}; }
  } else {
    logSwError('xBareHeaders.missing', null, { bareStatus: remoteStatus });
  }

  // UV's post-processing expects response.headers to be a plain object of
  // lower-case keys it can rewrite in place.
  const normHeaders = {};
  for (const k in remoteHeaders) {
    const v = remoteHeaders[k];
    normHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  // The fetch() we did to /bare/v3/ auto-decompressed the response body for us,
  // so `upstream.body` is *already* decoded bytes. If we leave content-encoding
  // in normHeaders, a downstream Response construction would claim the body is
  // still gzip/br and break .text() / byte length. Similarly the x-bare-headers
  // content-length is for the compressed bytes — drop it so the browser just
  // reads to EOS.
  delete normHeaders['content-encoding'];
  delete normHeaders['content-length'];

  // Response body: null for null-body statuses, else passthrough.
  const NULL_BODY_STATUS = [101, 204, 205, 304];
  const body = NULL_BODY_STATUS.includes(remoteStatus) ? null : upstream.body;

  // Headers constructor will reject any value with CRLF/control chars — build
  // it one key at a time so a single bad cookie doesn't lose every header.
  const safeHeaders = new Headers();
  for (const k in normHeaders) {
    const v = normHeaders[k];
    if (v == null) continue;
    try { safeHeaders.set(k, String(v)); }
    catch (err) { logSwError('headers.set', err, { key: k, valLen: String(v).length }); }
  }
  const wrapped = new Response(body, {
    status: remoteStatus,
    statusText: remoteStatusText,
    headers: safeHeaders,
  });
  // UV reads these extra fields.
  wrapped.rawHeaders = normHeaders;
  wrapped.rawResponse = { body, headers: normHeaders, status: remoteStatus, statusText: remoteStatusText };
  wrapped.finalURL = remote;
  return wrapped;
}

// md5 lite (using crypto.subtle SHA-1 would be overkill + async chain); just
// use URL hash as the cache-key. bare-server v3 accepts any opaque ?cache=...
async function cacheKeyFor(url) {
  try {
    const buf = new TextEncoder().encode(url);
    const dig = await crypto.subtle.digest('SHA-1', buf);
    const arr = new Uint8Array(dig);
    let h = '';
    for (let i = 0; i < 8; i++) h += arr[i].toString(16).padStart(2, '0');
    return h;
  } catch (_) { return ''; }
}

try {
  uv.bareClient.fetch = async function(url, init) {
    SW_COUNTERS.directBareCalls++;
    try {
      const r = await directBareFetch(url, init);
      SW_COUNTERS.directBareOk++;
      return r;
    } catch (err) {
      SW_COUNTERS.directBareFail++;
      logSwError('directBareFetch', err, { url: String(url), method: init && init.method });
      throw err;
    }
  };
} catch (err) { logSwError('install.directBareFetch', err); }

// Same bypass for Scramjet. Scramjet ships its own embedded bare-mux client
// that listens on a BroadcastChannel('bare-mux') for `set` messages — but
// our page-side bare-mux setup uses the SharedWorker transport API and
// never broadcasts on that channel. The result: scram.client.active stays
// null forever and every fetch throws "there are no bare clients", which
// reaches our wrapper as a 500 and looks to the user like Scramjet "doesn't
// load any websites." Replacing scram.client.fetch with directBareFetch
// (which talks straight to /bare/v3/) skips bare-mux entirely.
if (scram) {
  try {
    scram.client.fetch = async function(url, init) {
      SW_COUNTERS.directBareCalls++;
      try {
        const r = await directBareFetch(url, init);
        SW_COUNTERS.directBareOk++;
        return r;
      } catch (err) {
        SW_COUNTERS.directBareFail++;
        logSwError('scram.directBareFetch', err, { url: String(url), method: init && init.method });
        throw err;
      }
    };
  } catch (err) { logSwError('install.scram.directBareFetch', err); }
}

// --- In-page shim injected into every proxied HTML document ---
// Runs inside the proxied page (same-origin with our top frame) as the first
// script in <head>. Goals:
//
//   * Kill site-level service-worker registration so framed sites can't
//     install their own PWA shell (the root cause of YouTube's "You're
//     offline" splash).
//   * Force everything-is-online: onLine, connection, ping events.
//   * Swallow beforeunload so tab swaps never trigger "Leave site?" prompts.
//   * For YouTube specifically, watch for the offline / connect-to-internet
//     UI components and rip them out when they appear.
const PAGE_SHIM = String.raw`(function(){
  try {
    // --- online signal ---
    try { Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: function(){ return true; } }); } catch(_){}

    // --- NetworkInformation / navigator.connection ---
    try {
      var fake = {
        type: 'wifi', effectiveType: '4g', downlink: 10, downlinkMax: Infinity, rtt: 50, saveData: false,
        onchange: null,
        addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return false; },
      };
      ['connection','mozConnection','webkitConnection'].forEach(function(k){
        try { Object.defineProperty(Navigator.prototype, k, { configurable: true, get: function(){ return fake; } }); } catch(_){}
      });
    } catch(_){}

    // --- block site-installed service workers ---
    if (navigator.serviceWorker) {
      try {
        var blocked = function(){ return Promise.reject(new DOMException('blocked by host','SecurityError')); };
        navigator.serviceWorker.register = blocked;
        try { Object.defineProperty(navigator.serviceWorker, 'controller', { configurable: true, get: function(){ return null; } }); } catch(_){}
        navigator.serviceWorker.getRegistration = function(){ return Promise.resolve(undefined); };
        navigator.serviceWorker.getRegistrations = function(){ return Promise.resolve([]); };
      } catch(_){}
    }

    // --- silence beforeunload so closing tabs / swapping never prompts ---
    window.addEventListener('beforeunload', function(e){ e.stopImmediatePropagation(); }, true);

    // --- announce 'online' event once DOM is alive so reactive offline UIs flip ---
    function announceOnline() {
      try { window.dispatchEvent(new Event('online')); } catch(_){}
      try { document.dispatchEvent(new Event('online')); } catch(_){}
    }

    // --- YouTube offline-splash killer ---
    // When YT's SPA is uncertain about connectivity it renders components like
    // <yt-offlineui>, <ytd-alert-with-button-renderer>, a "You're offline" dialog,
    // or a full-page "Connect to the internet" art. We remove them as soon as
    // they hit the DOM and immediately trigger a re-fetch by dispatching an
    // 'online' event — which most of YouTube's reactive code listens for.
    var isYT = /(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$|(?:^|\.)youtube-nocookie\.com$/i.test((function(){
      try { return location.hostname; } catch(_) { return ''; }
    })());

    // --- Deep-DOM walker that also traverses open shadow roots. ---
    function collectAll(root, out) {
      try {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
        var n = walker.currentNode;
        while (n) {
          out.push(n);
          if (n.shadowRoot) collectAll(n.shadowRoot, out);
          n = walker.nextNode();
        }
      } catch(_){}
    }

    var OFFLINE_TAGS = [
      'yt-offlineui',
      'ytd-offline-upsell-renderer',
      'ytd-background-promo-renderer',
      'ytm-offline-slate-renderer',
      'yt-offline-slate-renderer',
    ];
    var OFFLINE_TEXT = /Connect to the internet|You're offline|Check your connection|No connection|couldn't connect/i;

    function killOfflineUI() {
      if (!isYT) return;
      try {
        // Light-DOM selector pass (fast).
        var sel = [
          'yt-offlineui',
          'ytd-offline-upsell-renderer',
          'ytd-background-promo-renderer',
          'ytd-popup-container yt-offlineui',
          'ytm-offline-slate-renderer',
          '[is="yt-offlineui"]',
        ].join(',');
        document.querySelectorAll(sel).forEach(function(el){ try { el.remove(); } catch(_){} });

        // Deep pass including shadow roots for text + tag name match.
        var all = [];
        collectAll(document, all);
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          var tag = (el.localName || '').toLowerCase();
          if (OFFLINE_TAGS.indexOf(tag) !== -1) { try { el.remove(); } catch(_){}; continue; }
          if (tag === 'tp-yt-paper-dialog' && el.getAttribute('role') === 'alertdialog') {
            try { el.remove(); } catch(_){}; continue;
          }
          var t = (el.textContent || '').trim();
          if (!t || t.length > 400) continue;
          if (OFFLINE_TEXT.test(t)) {
            var host = (el.closest && el.closest('tp-yt-paper-dialog, ytd-popup-container, yt-offlineui, ytd-background-promo-renderer, div[role="dialog"]')) || el;
            try { host.remove(); } catch(_){}
          }
        }
        announceOnline();
      } catch(_){}
    }

    function start() {
      announceOnline();
      if (!isYT) return;
      try {
        var mo = new MutationObserver(function(){ killOfflineUI(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      } catch(_){}
      // Poll as a belt-and-braces for cases where offline UI is inside shadow roots we can't observe.
      setInterval(killOfflineUI, 800);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }

    // ---- Runtime URL interceptor ----
    // The static rewriter (UV's HTML/JS pass + Scramjet's bundle) only
    // catches URLs that exist in HTML attributes / inline JS at fetch
    // time. Anything constructed at runtime — e.g. DDG's analytics
    // POSTs to improving.duckduckgo.com, Twitter's API calls, sites
    // that build URLs from JSON config — slips through and the browser
    // fires it at the real cross-origin host (CORS-blocked, fails).
    // We patch the dynamic APIs (fetch, XHR, WebSocket, EventSource,
    // sendBeacon) to detect cross-origin URLs and rewrite them to the
    // proxy prefix using whichever engine's encoder is present in the
    // page (Scramjet bundles its own; UV does not, so this is mostly
    // a Scramjet helper but works for both).
    function getEncoder() {
      try {
        if (self.__scramjet$bundle && self.__scramjet$bundle.rewriters && self.__scramjet$bundle.rewriters.url) {
          var enc = self.__scramjet$bundle.rewriters.url.encodeUrl;
          return function(absUrl) {
            try {
              var r = enc(absUrl, new URL(absUrl));
              // scramjet returns full URL — strip origin to keep it
              // same-origin so the SW intercepts on next request.
              if (typeof r === 'string' && r.indexOf(location.origin) === 0) {
                return r.slice(location.origin.length);
              }
              return r;
            } catch (_) { return null; }
          };
        }
        if (self.__uv$config && typeof self.__uv$config.encodeUrl === 'function') {
          var encUV = self.__uv$config.encodeUrl;
          var prefix = self.__uv$config.prefix || '/service/';
          return function(absUrl) {
            try { return prefix + encUV(absUrl); } catch (_) { return null; }
          };
        }
      } catch (_) {}
      return null;
    }

    function rewriteUrl(url) {
      if (!url) return url;
      var s = (typeof url === 'string') ? url : (url && url.toString ? url.toString() : '');
      if (!s) return url;
      // Skip non-http(s) / non-ws schemes — data:, blob:, javascript:,
      // about:, mailto:, tel:, chrome-extension:, etc. all pass through.
      if (/^(data|blob|javascript|about|mailto|tel|chrome|chrome-extension|file|moz-extension):/i.test(s)) return url;
      var abs;
      try { abs = new URL(s, location.href); } catch (_) { return url; }
      if (!/^(https?|wss?):/i.test(abs.protocol)) return url;
      // Already same origin — already proxied or local; don't double-encode.
      if (abs.origin === location.origin) return url;
      var enc = getEncoder();
      if (!enc) return url;
      var rewritten = enc(abs.href);
      return rewritten || url;
    }

    // --- fetch ---
    if (typeof self.fetch === 'function') {
      var origFetch = self.fetch.bind(self);
      self.fetch = function(input, init) {
        try {
          if (typeof input === 'string') {
            input = rewriteUrl(input);
          } else if (input && typeof input === 'object' && 'url' in input) {
            var nu = rewriteUrl(input.url);
            if (nu !== input.url) {
              try { input = new Request(nu, input); } catch (_) { /* opaque */ }
            }
          }
        } catch (_) {}
        return origFetch(input, init);
      };
    }

    // --- XMLHttpRequest ---
    if (self.XMLHttpRequest && self.XMLHttpRequest.prototype && self.XMLHttpRequest.prototype.open) {
      var origOpen = self.XMLHttpRequest.prototype.open;
      self.XMLHttpRequest.prototype.open = function(method, url) {
        var args = Array.prototype.slice.call(arguments);
        try { args[1] = rewriteUrl(args[1]); } catch (_) {}
        return origOpen.apply(this, args);
      };
    }

    // --- WebSocket --- scramjet bundles its own WS impl too, but only
    // when its client is loaded in the page. Patching the global makes
    // sure dynamic ws:// / wss:// URLs we missed at HTML-rewrite time
    // still get routed through the SW.
    if (typeof self.WebSocket === 'function') {
      var OrigWS = self.WebSocket;
      function PatchedWS(url, protocols) {
        try { url = rewriteUrl(url); } catch (_) {}
        return arguments.length > 1 ? new OrigWS(url, protocols) : new OrigWS(url);
      }
      try {
        PatchedWS.prototype = OrigWS.prototype;
        PatchedWS.CONNECTING = OrigWS.CONNECTING;
        PatchedWS.OPEN = OrigWS.OPEN;
        PatchedWS.CLOSING = OrigWS.CLOSING;
        PatchedWS.CLOSED = OrigWS.CLOSED;
        self.WebSocket = PatchedWS;
      } catch (_) {}
    }

    // --- EventSource ---
    if (typeof self.EventSource === 'function') {
      var OrigES = self.EventSource;
      function PatchedES(url, opts) {
        try { url = rewriteUrl(url); } catch (_) {}
        return arguments.length > 1 ? new OrigES(url, opts) : new OrigES(url);
      }
      try {
        PatchedES.prototype = OrigES.prototype;
        self.EventSource = PatchedES;
      } catch (_) {}
    }

    // --- sendBeacon (analytics-style POST that doesn't expect a response) ---
    if (navigator.sendBeacon) {
      try {
        var origBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function(url, data) {
          try { url = rewriteUrl(url); } catch (_) {}
          return origBeacon(url, data);
        };
      } catch (_) {}
    }
  } catch(e){}
})();`;

const SHIM_TAG = '<script>' + PAGE_SHIM + '</script>';

// Headers to strip from proxied responses so framed sites can't lock us out
// via CSP / XFO / COEP / Permissions-Policy etc. UV already tries, but belt-and-braces.
const STRIP_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-security-policy',
  'x-webkit-csp',
  'x-frame-options',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  'feature-policy',
  'timing-allow-origin',
];

// Statuses that MUST have null body per the Fetch spec — constructing a
// Response with any body for these throws. Cf. 'null body status' in WHATWG.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// Active engine identifiers and their routing prefixes. Adding a new engine
// here is a 4-step ritual: importScripts at top, ENGINES.<id> route here,
// ENGINES + the toggle UI in apps.js. Keep these aligned.
function uvPrefix() { return (self.__uv$config && self.__uv$config.prefix) || '/service/'; }
function scramPrefix() { return (self.__scramjet$config && self.__scramjet$config.prefix) || '/scram/'; }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  SW_COUNTERS.fetchEvents++;

  // Diagnostic endpoint so page can read recent SW errors + counters.
  if (req.url === location.origin + '/__sw_diag') {
    event.respondWith(new Response(JSON.stringify({
      errors: SW_ERRORS,
      counters: SW_COUNTERS,
      lastProxied: SW_LAST_PROXIED,
      engines: { uv: !!uv, scramjet: !!scram },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    return;
  }

  // --- Engine dispatch by URL prefix ---
  // Decide BEFORE awaiting anything (FetchEvent.respondWith() must be called
  // synchronously in the listener turn, otherwise the browser falls back to
  // the network).
  const url = req.url;
  const isUV = url.startsWith(location.origin + uvPrefix());
  const isScram = !isUV && scram && url.startsWith(location.origin + scramPrefix());

  // Scramjet path — same post-processing pipeline as UV: scramjet's own
  // HTML/JS rewriter handles the static URL pass, then we layer our
  // PAGE_SHIM (runtime fetch/XHR/WebSocket interceptor for dynamically-
  // constructed URLs that scramjet's static rewriter misses) and strip
  // the same headers (CSP / XFO / COEP / etc.) that block iframing.
  // Without this, scramjet works for static sites but breaks on SPAs
  // that build URLs from JSON config or analytics SDKs at runtime.
  if (isScram) {
    event.respondWith((async () => {
      let resp;
      try { resp = await scram.fetch(event); }
      catch (err) {
        logSwError('scram.fetch', err, { url: req.url, method: req.method });
        return new Response(JSON.stringify({ error: 'scramjet_failed', detail: String(err && err.message || err) }), {
          status: 502, statusText: 'Bad Gateway',
          headers: { 'content-type': 'application/json' },
        });
      }

      const headers = new Headers();
      try {
        resp.headers.forEach((v, k) => {
          if (!STRIP_HEADERS.includes(k.toLowerCase())) headers.set(k, v);
        });
      } catch (err) { logSwError('scram.headers.forEach', err); }

      const nullBody = NULL_BODY_STATUSES.has(resp.status);
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      try {
        SW_LAST_PROXIED.push({ url: req.url.slice(0, 140), method: req.method, status: resp.status, ct: ct.slice(0, 60), engine: 'scram' });
        if (SW_LAST_PROXIED.length > 20) SW_LAST_PROXIED.splice(0, SW_LAST_PROXIED.length - 20);
      } catch (_) {}

      if (nullBody || !ct.includes('text/html')) {
        return new Response(nullBody ? null : resp.body, {
          status: resp.status, statusText: resp.statusText, headers,
        });
      }

      try {
        const html = await resp.text();
        const injected = injectShim(html);
        headers.delete('content-length');
        headers.delete('content-encoding');
        SW_COUNTERS.htmlInjections++;
        return new Response(injected, { status: resp.status, statusText: resp.statusText, headers });
      } catch (err) {
        logSwError('scram.injectShim', err, { url: req.url, status: resp.status });
        return new Response(nullBody ? null : resp.body, {
          status: resp.status, statusText: resp.statusText, headers,
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    if (!isUV) {
      return fetch(req);
    }
    SW_COUNTERS.proxied++;

    let resp;
    try {
      resp = await uv.fetch(event);
    } catch (err) {
      logSwError('uv.fetch', err, { url: req.url, method: req.method });
      return new Response(JSON.stringify({ error: 'proxy_failed', detail: String(err && err.message || err) }), {
        status: 502, statusText: 'Bad Gateway',
        headers: { 'content-type': 'application/json' },
      });
    }

    // Copy headers, strip the heavy ones.
    const headers = new Headers();
    try {
      resp.headers.forEach((v, k) => {
        if (!STRIP_HEADERS.includes(k.toLowerCase())) headers.set(k, v);
      });
    } catch (err) {
      logSwError('headers.forEach', err);
    }

    // Null-body statuses (204/205/304/101) can't have a body.
    const nullBody = NULL_BODY_STATUSES.has(resp.status);

    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    try {
      SW_LAST_PROXIED.push({ url: req.url.slice(0, 140), method: req.method, status: resp.status, ct: ct.slice(0, 60) });
      if (SW_LAST_PROXIED.length > 20) SW_LAST_PROXIED.splice(0, SW_LAST_PROXIED.length - 20);
    } catch (_) {}
    if (nullBody) SW_COUNTERS.nullBody++;
    if (!nullBody && !ct.includes('text/html')) SW_COUNTERS.notHtml++;
    if (nullBody || !ct.includes('text/html')) {
      return new Response(nullBody ? null : resp.body, {
        status: resp.status, statusText: resp.statusText, headers,
      });
    }

    // HTML: decode, inject shim, return.
    try {
      const html = await resp.text();
      const injected = injectShim(html);
      headers.delete('content-length');
      headers.delete('content-encoding'); // body already decoded by resp.text()
      SW_COUNTERS.htmlInjections++;
      return new Response(injected, { status: resp.status, statusText: resp.statusText, headers });
    } catch (err) {
      logSwError('injectShim', err, { url: req.url, status: resp.status });
      return new Response(nullBody ? null : resp.body, {
        status: resp.status, statusText: resp.statusText, headers,
      });
    }
  })());
});

function injectShim(html) {
  // Put it as the very first thing inside <head> so it runs before site scripts.
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => m + SHIM_TAG);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => m + '<head>' + SHIM_TAG + '</head>');
  }
  return SHIM_TAG + html;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
