// apps.js — Browser, Settings, Files, About
(function () {
  'use strict';

  const OS = window.DesktopOS;
  if (!OS) return;

  // ---------- SVG glyphs for built-ins (flat, line-art, non-brand) ----------
  const SVG = (() => {
    const stroke = `stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
    return {
      globe: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>`,
      gear: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
      folder: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".5" fill="currentColor"/></svg>`,
      // InnerMovies: rounded screen frame with a tiny "i" (dot+stem) on the
      // left and a filled play triangle on the right. Reads as "i ▶".
      movies: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="8.6" r=".7" fill="currentColor" stroke="none"/><path d="M8 11v5.5"/><path d="M13 9.2l5.4 2.8L13 14.8z" fill="currentColor"/></svg>`,
      // Inntify: classic Lucide-style music note. Two filled noteheads
      // beamed by a stem that arcs across the top — perfectly centered in
      // the 24×24 viewbox (note heads at x=6 and x=18, both r=3, stem
      // running from x=9 to x=21 across the top).
      music: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>`,
      // InnerArcade: gamepad controller — body with shoulder buttons, d-pad
      // on the left, four face buttons on the right. Sized to fill the icon
      // viewbox (top of shoulder triggers at y=5, bottom of grips at y=18).
      arcade: `<svg viewBox="0 0 24 24" fill="none" ${stroke}><path d="M7 5.5v2M17 5.5v2"/><path d="M3 12a5 5 0 015-5h8a5 5 0 015 5v3a3 3 0 01-5.5 1.7l-1-1.7h-5l-1 1.7A3 3 0 013 15z"/><path d="M6 12h3M7.5 10.5v3"/><circle cx="15" cy="10.5" r=".8" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="13.5" r=".8" fill="currentColor" stroke="none"/></svg>`,
    };
  })();

  // ---------- Preset brand shortcuts (resolved via simpleicons CDN) ----------
  // The first entry is *not* a real brand — it's our self-hosted streaming app.
  // Setting `appId` instead of `url` tells the click handler to pin/open the
  // built-in app rather than create a URL-based browser shortcut.
  const INNER_MOVIES_DATA_URI =
    "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#7df9ff"/>
            <stop offset="1" stop-color="#ff5be7"/>
          </linearGradient>
          <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#0b0d12"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#g)" stroke-width="2" filter="url(#b)" opacity=".85"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#g)" stroke-width="1.4"/>
        <circle cx="20" cy="22" r="2.4" fill="url(#g)"/>
        <rect x="18.5" y="28" width="3" height="18" rx="1.5" fill="url(#g)"/>
        <path d="M30 22 L48 32 L30 42 Z" fill="url(#g)" filter="url(#b)" opacity=".9"/>
        <path d="M30 22 L48 32 L30 42 Z" fill="url(#g)"/>
      </svg>`);
  const INNER_ARCADE_DATA_URI =
    "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="ag" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#ffd166"/>
            <stop offset="1" stop-color="#ff5be7"/>
          </linearGradient>
          <filter id="ab" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#0b0d12"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#ag)" stroke-width="2" filter="url(#ab)" opacity=".85"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#ag)" stroke-width="1.4"/>
        <path d="M14 22h36a8 8 0 018 8v6a10 10 0 01-18 6l-2-2H26l-2 2a10 10 0 01-18-6v-6a8 8 0 018-8z" fill="none" stroke="url(#ag)" stroke-width="2.4" filter="url(#ab)" opacity=".9"/>
        <path d="M14 22h36a8 8 0 018 8v6a10 10 0 01-18 6l-2-2H26l-2 2a10 10 0 01-18-6v-6a8 8 0 018-8z" fill="none" stroke="url(#ag)" stroke-width="1.6"/>
        <path d="M18 32h8M22 28v8" stroke="url(#ag)" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="44" cy="30" r="1.6" fill="url(#ag)"/>
        <circle cx="50" cy="34" r="1.6" fill="url(#ag)"/>
        <circle cx="38" cy="34" r="1.6" fill="url(#ag)"/>
        <circle cx="44" cy="38" r="1.6" fill="url(#ag)"/>
      </svg>`);
  const INNTIFY_DATA_URI =
    "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="tg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#a8ffd8"/>
            <stop offset="1" stop-color="#7df9ff"/>
          </linearGradient>
          <filter id="tb" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#0b0d12"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#tg)" stroke-width="2" filter="url(#tb)" opacity=".85"/>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="url(#tg)" stroke-width="1.4"/>
        <ellipse cx="22" cy="42" rx="6" ry="5" fill="url(#tg)" filter="url(#tb)" opacity=".85"/>
        <ellipse cx="22" cy="42" rx="6" ry="5" fill="url(#tg)"/>
        <ellipse cx="44" cy="36" rx="5" ry="4.2" fill="url(#tg)"/>
        <path d="M28 42 V18 L49 14 V36" fill="none" stroke="url(#tg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`);
  const BRAND_PRESETS = [
    { slug: 'inner-movies', name: 'InnerMovies', appId: 'inner-movies', iconURL: INNER_MOVIES_DATA_URI },
    { slug: 'inner-arcade', name: 'InnerArcade', appId: 'inner-arcade', iconURL: INNER_ARCADE_DATA_URI },
    { slug: 'inntify',      name: 'Inntify',     appId: 'inntify',      iconURL: INNTIFY_DATA_URI },
    { slug: 'youtube',     name: 'YouTube',     url: 'https://www.youtube.com/',          color: 'FF0000' },
    { slug: 'discord',     name: 'Discord',     url: 'https://discord.com/app',           color: '5865F2' },
    { slug: 'nvidia',      name: 'GeForce NOW', url: 'https://play.geforcenow.com/',      color: '76B900' },
    { slug: 'github',      name: 'GitHub',      url: 'https://github.com/',               color: 'FFFFFF' },
    { slug: 'google',      name: 'Google',      url: 'https://www.google.com/',           color: '4285F4' },
    { slug: 'wikipedia',   name: 'Wikipedia',   url: 'https://www.wikipedia.org/',        color: 'FFFFFF' },
    { slug: 'googledrive', name: 'Drive',       url: 'https://drive.google.com/',         color: '4285F4' },
    { slug: 'twitch',      name: 'Twitch',      url: 'https://www.twitch.tv/',            color: '9146FF' },
    { slug: 'reddit',      name: 'Reddit',      url: 'https://www.reddit.com/',           color: 'FF4500' },
    { slug: 'x',           name: 'X',           url: 'https://x.com/',                    color: 'FFFFFF' },
    { slug: 'instagram',   name: 'Instagram',   url: 'https://www.instagram.com/',        color: 'E4405F' },
    { slug: 'gmail',       name: 'Gmail',       url: 'https://mail.google.com/',          color: 'EA4335' },
    { slug: 'whatsapp',    name: 'WhatsApp',    url: 'https://web.whatsapp.com/',         color: '25D366' },
    { slug: 'tiktok',      name: 'TikTok',      url: 'https://www.tiktok.com/',           color: 'FFFFFF' },
    { slug: 'steam',       name: 'Steam',       url: 'https://store.steampowered.com/',   color: 'FFFFFF' },
  ];
  function brandIconURL(slug, color) {
    return `https://cdn.simpleicons.org/${encodeURIComponent(slug)}/${encodeURIComponent(color || 'FFFFFF')}`;
  }

  // ---------- Browser ----------
  // Tabbed browser with background-playback (iframes kept alive across tab
  // switches), customizable settings (home, search engine, UI chrome), and
  // stealth helpers (cloak, panic key, about:blank launch) for restricted
  // networks.
  const CLOAK_PRESETS = {
    classroom: { title: 'Classroom', favicon: 'https://www.gstatic.com/classroom/favicon.png' },
    docs:      { title: 'Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico' },
    drive:     { title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
    khan:      { title: 'Khan Academy', favicon: 'https://cdn.kastatic.org/images/favicon.ico?logo' },
    wikipedia: { title: 'Wikipedia', favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
  };
  const SEARCH_ENGINES = [
    { name: 'DuckDuckGo',   url: 'https://duckduckgo.com/?q=%s' },
    { name: 'Google',       url: 'https://www.google.com/search?q=%s' },
    { name: 'Bing',         url: 'https://www.bing.com/search?q=%s' },
    { name: 'Brave',        url: 'https://search.brave.com/search?q=%s' },
    { name: 'Startpage',    url: 'https://www.startpage.com/do/search?q=%s' },
  ];
  const QUICK_LINKS = [
    { slug: 'youtube',  name: 'YouTube',   url: 'https://www.youtube.com/',          color: 'FF0000' },
    { slug: 'google',   name: 'Google',    url: 'https://www.google.com/',           color: '4285F4' },
    { slug: 'reddit',   name: 'Reddit',    url: 'https://www.reddit.com/',           color: 'FF4500' },
    { slug: 'github',   name: 'GitHub',    url: 'https://github.com/',               color: 'FFFFFF' },
    { slug: 'wikipedia',name: 'Wikipedia', url: 'https://www.wikipedia.org/',        color: 'FFFFFF' },
    { slug: 'twitch',   name: 'Twitch',    url: 'https://www.twitch.tv/',            color: '9146FF' },
  ];

  OS.registerApp('browser', {
    title: 'Browser',
    glyphSVG: SVG.globe,
    defaultW: 1120,
    defaultH: 740,
    mount(root, api, opts) {
      root.innerHTML = `
        <div class="browser">
          <div class="browser-tabs" data-role="tabs">
            <div class="tab-list" data-role="tab-list"></div>
            <button class="tab-new" data-act="new-tab" title="New tab (Ctrl+T)">+</button>
            <div class="tab-spacer"></div>
            <button class="browser-btn ic" data-act="settings" title="Settings">⚙</button>
          </div>
          <div class="browser-bar">
            <button class="browser-btn" data-act="back" title="Back (Alt+←)" disabled>‹</button>
            <button class="browser-btn" data-act="fwd" title="Forward (Alt+→)" disabled>›</button>
            <button class="browser-btn" data-act="reload" title="Reload (F5)">↻</button>
            <button class="browser-btn" data-act="home" title="Home">⌂</button>
            <input class="browser-url" placeholder="Enter URL or search" spellcheck="false" autocomplete="off">
            <button class="browser-btn" data-act="go" title="Go">→</button>
          </div>
          <div class="browser-frame-wrap" data-role="frames">
            <div class="browser-home" data-role="home">
              <div class="bh-inner">
                <h1 class="bh-title">New Tab</h1>
                <div class="bh-search">
                  <input data-role="bh-search-input" placeholder="Search or enter a URL" spellcheck="false" autocomplete="off">
                  <button data-act="bh-go">Go</button>
                </div>
                <div class="bh-quick" data-role="bh-quick"></div>
                <p class="bh-note">Traffic routes through this server's proxy. Change the search engine, home page, or enable stealth from the <b>⚙</b> menu.</p>
              </div>
            </div>
          </div>
          <div class="browser-settings" data-role="settings" hidden></div>
        </div>`;

      const elTabs      = root.querySelector('[data-role="tab-list"]');
      const elBar       = root.querySelector('.browser-bar');
      const elUrl       = root.querySelector('.browser-url');
      const elFrames    = root.querySelector('[data-role="frames"]');
      const elHome      = root.querySelector('[data-role="home"]');
      const elBHQuick   = root.querySelector('[data-role="bh-quick"]');
      const elBHInput   = root.querySelector('[data-role="bh-search-input"]');
      const elSettings  = root.querySelector('[data-role="settings"]');
      const elTabStrip  = root.querySelector('.browser-tabs');
      const browserEl   = root.querySelector('.browser');

      const ready = waitForUV();
      const tabs = new Map(); // id -> tab
      let activeId = null;

      const b = () => OS.state.browser || {};
      const SAVE = (patch) => OS.setState({ browser: { ...b(), ...patch } });

      // ---- UI chrome preferences ----
      function applyChromePrefs() {
        const s = b();
        elTabStrip.style.display = s.showTabs === false ? 'none' : '';
        elBar.style.display = s.showUrlBar === false ? 'none' : '';
        browserEl.classList.toggle('is-compact', !!s.compactTabs);
      }

      // ---- Home page ----
      function renderHome() {
        elBHQuick.innerHTML = '';
        for (const q of QUICK_LINKS) {
          const btn = document.createElement('button');
          btn.className = 'bh-q';
          btn.dataset.url = q.url;
          btn.title = q.name;
          const ico = document.createElement('span');
          ico.className = 'bh-q-ico';
          ico.style.background = '#' + q.color;
          const img = document.createElement('img');
          img.src = brandIconURL(q.slug, q.color === 'FFFFFF' ? '000000' : 'FFFFFF');
          img.alt = '';
          ico.appendChild(img);
          const name = document.createElement('span');
          name.className = 'bh-q-name';
          name.textContent = q.name;
          btn.append(ico, name);
          btn.addEventListener('click', () => navigateActive(q.url));
          elBHQuick.appendChild(btn);
        }
      }
      renderHome();

      elHome.addEventListener('click', (e) => {
        const t = e.target.closest('[data-url]');
        if (t) navigateActive(t.dataset.url);
        if (e.target.dataset?.act === 'bh-go') navigateActive(elBHInput.value);
      });
      elBHInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigateActive(elBHInput.value);
      });

      // ---- URL normalization ----
      function normalizeInput(v) {
        v = (v || '').trim();
        if (!v) return null;
        if (v === 'about:home' || v === 'about:newtab') return 'about:home';
        const looksLikeUrl = /^(https?:\/\/|\/\/)/.test(v) || /^[^\s]+\.[a-z]{2,}(\/|$|\?)/i.test(v);
        if (looksLikeUrl) {
          if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/\//, '');
          return v;
        }
        const tpl = b().searchTemplate || 'https://duckduckgo.com/?q=%s';
        return tpl.replace('%s', encodeURIComponent(v));
      }
      function shortHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }

      // ---- Tabs ----
      function newTabId() { return 'tab_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36); }
      function createTab({ url = null, activate = true } = {}) {
        const id = newTabId();
        const tab = {
          id,
          url: null,          // real URL
          title: 'New Tab',
          favicon: null,
          iframe: null,       // created lazily on first navigate
          isHome: true,
          loading: false,
        };
        tabs.set(id, tab);
        renderTabStrip();
        if (activate) activateTab(id);
        if (url && url !== 'about:home' && url !== b().home) navigateTab(id, url);
        else if (url && url === b().home && url !== 'about:home') navigateTab(id, url);
        return tab;
      }
      function closeTab(id) {
        const t = tabs.get(id);
        if (!t) return;
        if (t.iframe) t.iframe.remove();
        tabs.delete(id);
        if (activeId === id) {
          const next = [...tabs.keys()].pop();
          if (next) activateTab(next);
          else createTab({ activate: true });
        }
        renderTabStrip();
      }
      function activateTab(id) {
        const t = tabs.get(id);
        if (!t) return;
        activeId = id;
        // Hide home + all iframes, show the right one.
        elHome.hidden = !t.isHome;
        for (const x of tabs.values()) {
          if (x.iframe) x.iframe.classList.toggle('is-active', x.id === id && !x.isHome);
        }
        elUrl.value = t.url || '';
        api.setTitle('Browser' + (t.title && t.title !== 'New Tab' ? ' — ' + t.title : ''));
        updateNav();
        renderTabStrip();
        applyCloakToOuter();
      }
      function navigateActive(u) { if (activeId) navigateTab(activeId, u); }
      async function navigateTab(id, u) {
        const t = tabs.get(id);
        if (!t) return;
        const url = normalizeInput(u);
        if (!url) return;
        if (url === 'about:home') {
          if (t.iframe) { t.iframe.remove(); t.iframe = null; }
          t.isHome = true; t.url = null; t.title = 'New Tab'; t.favicon = null;
          if (activeId === id) activateTab(id);
          else renderTabStrip();
          return;
        }
        try { await ready; } catch (e) { showError(t, 'Proxy worker failed to start: ' + e.message); return; }
        // Resolve the active engine *at navigation time* — the user can flip
        // engines while the browser is open and the next nav should pick it up.
        const eng = OS.proxy.engineFor(OS.proxy.getEngine());
        if (!eng.available()) { showError(t, eng.label + ' engine not loaded'); return; }
        const target = eng.prefix() + eng.encodeUrl(url);
        t._engineId = eng.id;  // remember which engine this iframe lives in
        t._enginePrefix = eng.prefix();

        if (!t.iframe) {
          const f = document.createElement('iframe');
          f.className = 'browser-frame';
          f.dataset.tab = id;
          f.referrerPolicy = 'no-referrer';
          f.setAttribute('allow', 'autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; accelerometer; gyroscope');
          f.addEventListener('load', () => onIframeLoad(t));
          elFrames.appendChild(f);
          t.iframe = f;
        }
        t.isHome = false;
        t.loading = true;
        t.url = url;
        t.title = shortHost(url);
        t.favicon = faviconFor(url);
        t.iframe.src = target;
        if (activeId === id) {
          elHome.hidden = true;
          for (const x of tabs.values()) if (x.iframe) x.iframe.classList.toggle('is-active', x.id === id);
          elUrl.value = url;
          api.setTitle('Browser — ' + t.title);
          applyCloakToOuter();
        }
        renderTabStrip();
      }
      function onIframeLoad(t) {
        t.loading = false;
        try {
          const win = t.iframe.contentWindow;
          const doc = t.iframe.contentDocument;
          if (!win || !doc) { renderTabStrip(); return; }
          // Decode through whichever engine this tab was launched under, not
          // whichever is currently selected — otherwise flipping the engine
          // mid-session would break URL parsing on already-open tabs.
          const eng = OS.proxy.engineFor(t._engineId || OS.proxy.getEngine());
          const prefix = location.origin + (t._enginePrefix || eng.prefix());
          const loc = win.location.href;
          if (loc.startsWith(prefix)) {
            const encoded = loc.slice(prefix.length);
            try {
              const real = eng.decodeUrl(encoded);
              t.url = real;
              t.title = (doc.title && doc.title.trim()) || shortHost(real);
              t.favicon = realPageFavicon(doc, real) || faviconFor(real);
            } catch {}
          }
          // Watch for in-page navigations (SPAs) by re-reading title.
          try {
            const mo = new MutationObserver(() => {
              try {
                t.title = (doc.title && doc.title.trim()) || shortHost(t.url || '');
                if (activeId === t.id) api.setTitle('Browser — ' + t.title);
                renderTabStrip();
                applyCloakToOuter();
              } catch {}
            });
            const titleEl = doc.querySelector('title');
            if (titleEl) mo.observe(titleEl, { childList: true });
            t._titleObs = mo;
          } catch {}
        } catch {}
        if (activeId === t.id) {
          elUrl.value = t.url || '';
          api.setTitle('Browser — ' + t.title);
          applyCloakToOuter();
        }
        renderTabStrip();
      }
      function faviconFor(url) {
        try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
        catch { return null; }
      }
      function realPageFavicon(doc, real) {
        try {
          const link = doc.querySelector('link[rel~="icon"],link[rel="shortcut icon"]');
          const href = link?.getAttribute('href');
          if (!href) return null;
          // rewrite proxied URL back to real site URL
          return new URL(href, real).href;
        } catch { return null; }
      }
      function showError(t, msg) {
        t.isHome = true; t.title = 'Error';
        elHome.hidden = false;
        elHome.querySelector('.bh-inner h1').textContent = "Couldn't load";
        elHome.querySelector('.bh-note').textContent = msg;
        if (activeId === t.id) renderTabStrip();
      }

      function updateNav() {
        const t = tabs.get(activeId);
        const canBack = !!(t && t.iframe && !t.isHome);
        elBar.querySelector('[data-act="back"]').disabled = !canBack;
        elBar.querySelector('[data-act="fwd"]').disabled  = !canBack;
      }

      function renderTabStrip() {
        elTabs.innerHTML = '';
        for (const t of tabs.values()) {
          const el = document.createElement('div');
          el.className = 'tab' + (t.id === activeId ? ' is-active' : '') + (t.loading ? ' is-loading' : '');
          el.dataset.id = t.id;
          el.title = t.title || 'New Tab';
          const fav = document.createElement('span');
          fav.className = 'tab-fav';
          if (t.favicon) {
            const img = document.createElement('img');
            img.src = t.favicon; img.alt = '';
            img.addEventListener('error', () => { img.style.display = 'none'; });
            fav.appendChild(img);
          } else {
            fav.textContent = t.isHome ? '⌂' : '◌';
          }
          const tl = document.createElement('span');
          tl.className = 'tab-title';
          tl.textContent = t.title || 'New Tab';
          const cls = document.createElement('button');
          cls.className = 'tab-close';
          cls.textContent = '×';
          cls.title = 'Close tab';
          cls.addEventListener('click', (e) => { e.stopPropagation(); closeTab(t.id); });
          el.append(fav, tl, cls);
          el.addEventListener('click', () => activateTab(t.id));
          el.addEventListener('auxclick', (e) => { if (e.button === 1) closeTab(t.id); });
          el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            OS.showContextMenu(e.clientX, e.clientY, [
              { label: 'Reload', onClick: () => reloadTab(t.id) },
              { label: 'Duplicate', onClick: () => createTab({ url: t.url || b().home || 'about:home' }) },
              { separator: true },
              { label: 'Close tab', onClick: () => closeTab(t.id), danger: true },
              { label: 'Close other tabs', disabled: tabs.size < 2, onClick: () => {
                for (const id of [...tabs.keys()]) if (id !== t.id) closeTab(id);
              } },
            ]);
          });
          elTabs.appendChild(el);
        }
      }

      // ---- Tab actions ----
      function reloadTab(id) {
        const t = tabs.get(id);
        if (!t || !t.iframe || !t.url) return;
        t.loading = true;
        t.iframe.src = t.iframe.src;
        renderTabStrip();
      }
      function goBackTab() {
        const t = tabs.get(activeId);
        if (t?.iframe?.contentWindow) { try { t.iframe.contentWindow.history.back(); } catch {} }
      }
      function goFwdTab() {
        const t = tabs.get(activeId);
        if (t?.iframe?.contentWindow) { try { t.iframe.contentWindow.history.forward(); } catch {} }
      }
      function goHomeTab() {
        const home = b().home || 'about:home';
        if (activeId) navigateTab(activeId, home);
      }

      // ---- URL bar ----
      elBar.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]'); if (!t) return;
        const act = t.dataset.act;
        if (act === 'go') navigateActive(elUrl.value);
        else if (act === 'back') goBackTab();
        else if (act === 'fwd')  goFwdTab();
        else if (act === 'reload') reloadTab(activeId);
        else if (act === 'home') goHomeTab();
      });
      elUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigateActive(elUrl.value);
      });

      // ---- Tab strip actions ----
      elTabStrip.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]'); if (!t) return;
        if (t.dataset.act === 'new-tab') createTab({ url: defaultNewTabUrl() });
        else if (t.dataset.act === 'settings') toggleSettings();
      });
      function defaultNewTabUrl() {
        const s = b();
        if (s.newTabPage === 'blank') return null;
        if (s.home && s.home !== 'about:home') return s.home;
        return null; // show home page
      }

      // ---- Keyboard shortcuts scoped to this window ----
      root.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 't') { e.preventDefault(); createTab({ url: defaultNewTabUrl() }); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'w') { e.preventDefault(); if (activeId) closeTab(activeId); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); elUrl.focus(); elUrl.select(); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'r') { e.preventDefault(); reloadTab(activeId); }
        else if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          const id = [...tabs.keys()][idx];
          if (id) activateTab(id);
        }
        else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBackTab(); }
        else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goFwdTab(); }
      });

      // ---- Panic key (document-level so it fires regardless of focus) ----
      function onPanic(e) {
        const key = (b().panicKey || '').toLowerCase();
        if (!key) return;
        if (e.key.toLowerCase() === key) {
          e.preventDefault();
          const url = b().panicUrl || 'https://classroom.google.com/';
          window.top.location.replace(url);
        }
      }
      document.addEventListener('keydown', onPanic, true);

      // ---- Cloak (outer window title + favicon) ----
      function applyCloakToOuter() {
        const s = b();
        const preset = s.cloakPreset && CLOAK_PRESETS[s.cloakPreset];
        const title = s.cloakTitle || (preset && preset.title) || null;
        const favicon = s.cloakFavicon || (preset && preset.favicon) || null;
        if (title) document.title = title;
        if (favicon) {
          let link = document.querySelector('link[rel~="icon"]');
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          link.href = favicon;
        }
      }
      applyCloakToOuter();

      // ---- Settings popover ----
      let settingsOpen = false;
      function toggleSettings() { settingsOpen ? closeSettings() : openSettings(); }
      function closeSettings() { settingsOpen = false; elSettings.hidden = true; }
      function openSettings() {
        settingsOpen = true;
        elSettings.hidden = false;
        elSettings.innerHTML = renderSettingsHTML();
        wireSettings();
      }
      function renderSettingsHTML() {
        const s = b();
        const checked = (v) => v ? 'checked' : '';
        const selected = (cur, val) => cur === val ? 'selected' : '';
        const engineOpts = SEARCH_ENGINES.map(se =>
          `<option value="${escapeHtml(se.url)}" ${selected(s.searchTemplate, se.url)}>${escapeHtml(se.name)}</option>`).join('');
        const cloakOpts = [
          ['', 'Off'],
          ['classroom', 'Google Classroom'],
          ['docs', 'Google Docs'],
          ['drive', 'Google Drive'],
          ['khan', 'Khan Academy'],
          ['wikipedia', 'Wikipedia'],
          ['custom', 'Custom…'],
        ].map(([v, l]) => `<option value="${v}" ${selected(s.cloakPreset || '', v)}>${l}</option>`).join('');
        return `
          <div class="bs-head">
            <h3>Browser settings</h3>
            <button class="browser-btn ic" data-act="bs-close" title="Close">✕</button>
          </div>
          <div class="bs-body">
            <section class="bs-sec">
              <h4>General</h4>
              <label class="bs-row"><span>Home page</span>
                <input data-prop="home" value="${escapeHtml(s.home || '')}" placeholder="about:home or https://…">
              </label>
              <label class="bs-row"><span>Search engine</span>
                <select data-prop="searchTemplate">${engineOpts}<option value="__custom" ${selected('', '__always_off')}>Custom…</option></select>
              </label>
              <label class="bs-row" data-only="custom-search" style="display:none"><span>Custom search URL (%s = query)</span>
                <input data-prop="searchTemplateCustom" value="${escapeHtml(s.searchTemplate || '')}" placeholder="https://example.com/search?q=%s">
              </label>
              <label class="bs-row"><span>New tab opens</span>
                <select data-prop="newTabPage">
                  <option value="home" ${selected(s.newTabPage, 'home')}>Home page</option>
                  <option value="blank" ${selected(s.newTabPage, 'blank')}>Blank</option>
                </select>
              </label>
              <label class="bs-row"><span>Show URL bar</span><input type="checkbox" data-prop="showUrlBar" ${checked(s.showUrlBar !== false)}></label>
              <label class="bs-row"><span>Show tab strip</span><input type="checkbox" data-prop="showTabs" ${checked(s.showTabs !== false)}></label>
              <label class="bs-row"><span>Compact tabs</span><input type="checkbox" data-prop="compactTabs" ${checked(s.compactTabs)}></label>
            </section>

            <section class="bs-sec">
              <h4>Unblock & Stealth</h4>
              <p class="bs-hint">These keep this browser low-profile on restricted networks. The proxy already hides your real destination from school DNS — these extras hide it from a glance at your tab strip.</p>
              <label class="bs-row"><span>Tab cloak</span>
                <select data-prop="cloakPreset">${cloakOpts}</select>
              </label>
              <label class="bs-row" data-only="custom-cloak" style="${s.cloakPreset === 'custom' ? '' : 'display:none'}"><span>Custom title</span>
                <input data-prop="cloakTitle" value="${escapeHtml(s.cloakTitle || '')}" placeholder="Google Slides — My report">
              </label>
              <label class="bs-row" data-only="custom-cloak" style="${s.cloakPreset === 'custom' ? '' : 'display:none'}"><span>Custom favicon URL</span>
                <input data-prop="cloakFavicon" value="${escapeHtml(s.cloakFavicon || '')}" placeholder="https://…/favicon.ico">
              </label>
              <label class="bs-row"><span>Panic key</span>
                <input data-prop="panicKey" value="${escapeHtml(s.panicKey || '`')}" maxlength="1" style="width:60px">
              </label>
              <label class="bs-row"><span>Panic URL</span>
                <input data-prop="panicUrl" value="${escapeHtml(s.panicUrl || '')}" placeholder="https://classroom.google.com/">
              </label>
              <label class="bs-row"><span>Block proxied-site service workers</span>
                <input type="checkbox" data-prop="blockSiteWorkers" ${checked(s.blockSiteWorkers !== false)}>
              </label>
              <div class="bs-row" style="justify-content:flex-start; gap:8px;">
                <button class="btn" data-act="bs-blank">Open this site in about:blank</button>
                <button class="btn ghost" data-act="bs-clear">Close all tabs</button>
              </div>
            </section>
          </div>`;
      }
      function wireSettings() {
        elSettings.querySelector('[data-act="bs-close"]').addEventListener('click', closeSettings);
        const customCloakRows = elSettings.querySelectorAll('[data-only="custom-cloak"]');
        const customSearchRow = elSettings.querySelector('[data-only="custom-search"]');

        elSettings.addEventListener('change', (e) => {
          const el = e.target;
          const prop = el.dataset.prop;
          if (!prop) return;
          let val;
          if (el.type === 'checkbox') val = el.checked;
          else val = el.value;
          if (prop === 'searchTemplate') {
            if (val === '__custom') {
              customSearchRow.style.display = '';
              return; // wait for the custom input
            }
            customSearchRow.style.display = 'none';
            SAVE({ searchTemplate: val });
          } else if (prop === 'searchTemplateCustom') {
            if (val && val.includes('%s')) SAVE({ searchTemplate: val });
          } else if (prop === 'cloakPreset') {
            SAVE({ cloakPreset: val });
            customCloakRows.forEach(r => r.style.display = val === 'custom' ? '' : 'none');
            applyCloakToOuter();
          } else {
            SAVE({ [prop]: val });
            applyChromePrefs();
            applyCloakToOuter();
          }
        });
        elSettings.addEventListener('click', (e) => {
          const a = e.target.closest('[data-act]'); if (!a) return;
          if (a.dataset.act === 'bs-blank') openInAboutBlank();
          if (a.dataset.act === 'bs-clear') { for (const id of [...tabs.keys()]) closeTab(id); closeSettings(); }
        });
      }

      // ---- About:blank stealth launcher ----
      // Spawns a new real-browser window at about:blank and injects an iframe
      // to this proxy. The school computer's network monitor sees only
      // `about:blank`; the URL bar stays empty.
      function openInAboutBlank() {
        const w = window.open('about:blank', '_blank');
        if (!w) { alert('Popup was blocked by your browser. Allow popups for this site and try again.'); return; }
        const s = b();
        const title = s.cloakTitle || (s.cloakPreset && CLOAK_PRESETS[s.cloakPreset]?.title) || 'New Tab';
        const favicon = s.cloakFavicon || (s.cloakPreset && CLOAK_PRESETS[s.cloakPreset]?.favicon) || '';
        const here = location.href;
        w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
${favicon ? `<link rel="icon" href="${escapeHtml(favicon)}">` : ''}
<style>html,body{margin:0;padding:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style>
</head><body><iframe src="${escapeHtml(here)}" allow="autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"></iframe></body></html>`);
        w.document.close();
      }

      // ---- Cross-app API: open a URL in a new tab ----
      api.window.navigate = (u) => {
        // If no tabs yet, create one.
        if (!tabs.size) createTab({ url: u });
        else {
          const active = tabs.get(activeId);
          if (active && active.isHome) navigateTab(activeId, u);
          else createTab({ url: u });
        }
      };

      // ---- Cleanup ----
      api.window.onClose = () => {
        document.removeEventListener('keydown', onPanic, true);
        for (const t of tabs.values()) {
          try { t._titleObs?.disconnect(); } catch {}
        }
      };

      // ---- Initial state ----
      applyChromePrefs();
      // React to live changes of browser state (e.g. from cloak presets etc.)
      const unsub = OS.subscribe(() => { applyChromePrefs(); applyCloakToOuter(); });
      const prevOnClose = api.window.onClose;
      api.window.onClose = () => { try { unsub(); } catch {} prevOnClose?.(); };

      // Open either the URL the app was opened with, or a fresh home tab.
      const initial = opts?.url || null;
      createTab({ url: initial });
    },
  });

  // ---------- Settings ----------
  OS.registerApp('settings', {
    title: 'Settings',
    glyphSVG: SVG.gear,
    singleInstance: true,
    defaultW: 880,
    defaultH: 600,
    mount(root, api, opts) {
      root.innerHTML = `
        <div class="settings">
          <nav class="settings-nav">
            <button data-tab="appearance" class="is-active">Appearance</button>
            <button data-tab="wallpaper">Wallpaper</button>
            <button data-tab="shortcuts">Shortcuts</button>
            <button data-tab="desktop">Desktop</button>
            <button data-tab="proxy">Proxy</button>
            <button data-tab="about">About</button>
          </nav>
          <div class="settings-main"></div>
        </div>`;
      const nav = root.querySelector('.settings-nav');
      const main = root.querySelector('.settings-main');
      const tabs = {
        appearance: renderAppearance,
        wallpaper: renderWallpaper,
        shortcuts: renderShortcuts,
        desktop: renderDesktop,
        proxy: renderProxy,
        about: renderAbout,
      };
      function select(tab) {
        nav.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
        main.innerHTML = '';
        tabs[tab](main);
      }
      nav.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]'); if (!t) return;
        select(t.dataset.tab);
      });
      select(opts?.tab && tabs[opts.tab] ? opts.tab : 'appearance');

      const unsub = OS.subscribe(() => {
        const active = nav.querySelector('button.is-active')?.dataset.tab;
        if (active) { main.innerHTML = ''; tabs[active](main); }
      });
      api.window.onClose = unsub;
    },
  });

  function renderAppearance(main) {
    const s = OS.state;
    main.innerHTML = `
      <h2>Appearance</h2>
      <h3>Theme</h3>
      <div class="settings-row">
        <div><div class="label">Color mode</div><div class="desc">Dark or light interface chrome.</div></div>
        <div><button class="btn ghost" data-act="theme">${s.theme === 'dark' ? 'Dark' : 'Light'}</button></div>
      </div>
      <h3>Accent</h3>
      <div class="settings-row">
        <div><div class="label">Gradient</div><div class="desc">Used across windows, dock, buttons.</div></div>
        <div class="swatches"></div>
      </div>
      <h3>Overlay</h3>
      <div class="settings-row">
        <div><div class="label">Show FPS counter</div><div class="desc">Tiny performance indicator in the corner.</div></div>
        <div><button class="btn ${s.fpsVisible ? '' : 'ghost'}" data-act="fps">${s.fpsVisible ? 'On' : 'Off'}</button></div>
      </div>
      <div class="settings-row">
        <div><div class="label">Lock screen</div><div class="desc">Show the lockscreen now.</div></div>
        <div><button class="btn ghost" data-act="lock">Lock</button></div>
      </div>`;

    const sw = main.querySelector('.swatches');
    OS.ACCENT_SWATCHES.forEach((sw2) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = `linear-gradient(135deg, ${sw2.a}, ${sw2.b})`;
      if (s.accent === sw2.a && s.accent2 === sw2.b) b.classList.add('is-sel');
      b.addEventListener('click', () => OS.setState({ accent: sw2.a, accent2: sw2.b }));
      sw.appendChild(b);
    });

    main.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      if (t.dataset.act === 'theme') OS.setState({ theme: OS.state.theme === 'dark' ? 'light' : 'dark' });
      if (t.dataset.act === 'fps') OS.setFpsVisible(!OS.state.fpsVisible);
      if (t.dataset.act === 'lock') OS.showLock();
    });
  }

  async function renderWallpaper(main) {
    main.innerHTML = `
      <h2>Wallpaper</h2>
      <p class="desc" style="font-size:13px; color:var(--fg-dim); margin:0 0 12px;">
        Use a preset, upload locally, paste a URL, or pick from the shared library. Animated images + videos loop silently.
      </p>

      <h3>Upload (this browser)</h3>
      <div class="wp-dropzone" tabindex="0">
        <div style="font-weight:600;">Drop an image, GIF, or video here</div>
        <div style="margin-top:6px; font-size:12px;">…or click to pick a file</div>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden multiple>
      </div>

      <h3>Paste URL</h3>
      <div class="settings-row">
        <div style="flex:1; display:flex; gap:8px; align-items:center;">
          <input class="browser-url" data-role="urlInput" placeholder="https://example.com/rain.gif or .mp4" style="flex:1;">
          <button class="btn" data-act="use-url">Use</button>
        </div>
      </div>

      <h3>Shared library</h3>
      <div class="settings-row">
        <div><div class="label">Publish your last upload</div><div class="desc">Makes it available to every visitor, streamed from the server.</div></div>
        <div style="display:flex; gap:8px;">
          <input type="file" hidden data-role="serverUpload" accept="image/*,video/mp4,video/webm,video/quicktime">
          <button class="btn ghost" data-act="publish">Upload &amp; publish</button>
        </div>
      </div>
      <div class="wp-library" data-role="shared"></div>

      <h3>Your library (local)</h3>
      <div class="wp-library" data-role="library"></div>

      <h3>Presets</h3>
      <div class="wp-library" data-role="presets"></div>`;

    // --- Upload (local, IDB) ---
    const dz = main.querySelector('.wp-dropzone');
    const input = main.querySelector('input[type="file"]');
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
    dz.addEventListener('drop', async (e) => {
      e.preventDefault(); dz.classList.remove('is-over');
      const files = [...(e.dataTransfer?.files || [])];
      if (files.length) await ingestLocalFiles(files);
    });
    input.addEventListener('change', async () => {
      const files = [...(input.files || [])];
      if (files.length) await ingestLocalFiles(files);
      input.value = '';
    });

    async function ingestLocalFiles(files) {
      let lastId = null, lastKind = null;
      for (const f of files) {
        if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) continue;
        const id = await window.WPStore.put(f, { name: f.name });
        lastId = id;
        lastKind = f.type.startsWith('video/') ? 'video' : (f.type === 'image/gif' ? 'gif' : 'image');
      }
      if (lastId) OS.setState({ wallpaper: { kind: lastKind, value: lastId } });
      await renderLocalTiles();
    }

    // --- URL ---
    main.querySelector('[data-act="use-url"]').addEventListener('click', () => {
      const v = main.querySelector('[data-role="urlInput"]').value.trim();
      if (v) OS.setState({ wallpaper: { kind: 'url', value: v } });
    });
    main.querySelector('[data-role="urlInput"]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') main.querySelector('[data-act="use-url"]').click();
    });

    // --- Publish to shared library ---
    const serverInput = main.querySelector('[data-role="serverUpload"]');
    main.querySelector('[data-act="publish"]').addEventListener('click', () => serverInput.click());
    serverInput.addEventListener('change', async () => {
      const f = serverInput.files?.[0]; serverInput.value = '';
      if (!f) return;
      try {
        const r = await fetch('/api/wallpapers', {
          method: 'POST',
          headers: { 'Content-Type': f.type, 'x-filename': encodeURIComponent(f.name) },
          body: f,
        });
        if (!r.ok) throw new Error(await r.text());
        const { item } = await r.json();
        OS.setState({ wallpaper: { kind: 'server', value: item.id, meta: { kind: item.kind, mime: item.mime } } });
        await renderSharedTiles();
      } catch (e) { alert('Upload failed: ' + (e.message || e)); }
    });

    // --- Presets ---
    const presetRoot = main.querySelector('[data-role="presets"]');
    Object.entries(OS.PRESET_WALLPAPERS).forEach(([key, def]) => {
      const tile = document.createElement('div');
      tile.className = 'wp-tile';
      tile.title = def.name;
      tile.style.backgroundImage = def.css;
      const isSel = OS.state.wallpaper?.kind === 'preset' && OS.state.wallpaper.value === key;
      if (isSel) tile.classList.add('is-sel');
      const tag = document.createElement('span');
      tag.className = 'wp-tag';
      tag.textContent = def.name;
      tile.appendChild(tag);
      tile.addEventListener('click', () => OS.setState({ wallpaper: { kind: 'preset', value: key } }));
      presetRoot.appendChild(tile);
    });

    await renderLocalTiles();
    await renderSharedTiles();

    async function renderLocalTiles() {
      const root = main.querySelector('[data-role="library"]');
      if (!root) return;
      root.innerHTML = '';
      const items = await window.WPStore.list();
      if (!items.length) {
        root.appendChild(emptyNote('No local uploads yet.'));
        return;
      }
      for (const it of items) {
        const tile = document.createElement('div');
        tile.className = 'wp-tile';
        tile.title = it.name || it.kind;
        const isSel = OS.state.wallpaper?.kind === it.kind && OS.state.wallpaper.value === it.id;
        if (isSel) tile.classList.add('is-sel');
        const url = await window.WPStore.getURL(it.id);
        if (it.kind === 'video') {
          const v = document.createElement('video');
          v.src = url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
          tile.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = url; img.alt = '';
          tile.appendChild(img);
        }
        const tag = document.createElement('span'); tag.className = 'wp-tag'; tag.textContent = it.kind;
        tile.appendChild(tag);
        const del = document.createElement('button');
        del.className = 'wp-del'; del.title = 'Delete'; del.textContent = '✕';
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.WPStore.remove(it.id);
          window.WPStore.revokeURL(it.id);
          if (OS.state.wallpaper?.value === it.id) OS.setState({ wallpaper: { kind: 'preset', value: 'rainDusk' } });
          renderLocalTiles();
        });
        tile.appendChild(del);
        tile.addEventListener('click', () => OS.setState({ wallpaper: { kind: it.kind, value: it.id } }));
        root.appendChild(tile);
      }
    }

    async function renderSharedTiles() {
      const root = main.querySelector('[data-role="shared"]');
      if (!root) return;
      root.innerHTML = '';
      try {
        const r = await fetch('/api/wallpapers');
        if (!r.ok) throw new Error('fetch failed');
        const { items } = await r.json();
        if (!items.length) {
          root.appendChild(emptyNote('No shared wallpapers yet — be the first!'));
          return;
        }
        for (const it of items) {
          const tile = document.createElement('div');
          tile.className = 'wp-tile';
          tile.title = it.name || it.kind;
          const isSel = OS.state.wallpaper?.kind === 'server' && OS.state.wallpaper.value === it.id;
          if (isSel) tile.classList.add('is-sel');
          const url = `/api/wallpapers/${encodeURIComponent(it.id)}/file`;
          if (it.kind === 'video') {
            const v = document.createElement('video');
            v.src = url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
            tile.appendChild(v);
          } else {
            const img = document.createElement('img');
            img.src = url; img.alt = '';
            tile.appendChild(img);
          }
          const tag = document.createElement('span'); tag.className = 'wp-tag'; tag.textContent = it.kind;
          tile.appendChild(tag);
          tile.addEventListener('click', () => OS.setState({
            wallpaper: { kind: 'server', value: it.id, meta: { kind: it.kind, mime: it.mime } },
          }));
          root.appendChild(tile);
        }
      } catch (e) {
        root.appendChild(emptyNote('Shared library unavailable.'));
      }
    }

    function emptyNote(text) {
      const el = document.createElement('div');
      el.style.cssText = 'color:var(--fg-dim); font-size:13px; padding:8px 0;';
      el.textContent = text;
      return el;
    }
  }

  function renderShortcuts(main) {
    main.innerHTML = `
      <h2>Shortcuts</h2>
      <p style="font-size:13px; color:var(--fg-dim); margin:0 0 12px;">
        Add any site as a dock shortcut. Pick from brand presets or build your own. Icons come from the public simpleicons CDN unless you upload a custom one.
      </p>

      <h3>Quick add</h3>
      <div class="brand-grid" data-role="brands"></div>

      <h3>Add custom</h3>
      <div class="settings-row" style="flex-wrap:wrap; gap:8px;">
        <input class="browser-url" data-role="sc-name" placeholder="Name (e.g. Archive)" style="flex:1; min-width:140px;">
        <input class="browser-url" data-role="sc-url" placeholder="https://…" style="flex:2; min-width:180px;">
        <input type="file" accept="image/*" hidden data-role="sc-icon">
        <button class="btn ghost" data-act="pick-icon">Upload icon</button>
        <button class="btn" data-act="add-custom">Add</button>
      </div>
      <div class="desc" data-role="icon-name" style="font-size:12px; color:var(--fg-dim);"></div>

      <h3>Your shortcuts</h3>
      <div class="sc-list" data-role="sc-list"></div>`;

    // Brand grid
    const brandsRoot = main.querySelector('[data-role="brands"]');
    for (const b of BRAND_PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'brand-chip';
      btn.title = b.name;
      // Built-in app entries supply `iconURL` directly (data: URI). Real brand
      // entries fall back to the public simpleicons CDN.
      const iconSrc = b.iconURL || brandIconURL(b.slug, b.color);
      btn.innerHTML = `
        <span class="brand-chip-ico"><img src="${iconSrc}" alt="" referrerpolicy="no-referrer"></span>
        <span class="brand-chip-name">${escapeHtml(b.name)}</span>`;
      btn.addEventListener('click', () => {
        if (b.appId) {
          // Built-in: pin to the dock and open it. We don't create a URL
          // shortcut because the app is already part of the registry.
          if (!(OS.state.pinned || []).includes(b.appId)) OS.togglePinned(b.appId);
          OS.openApp(b.appId);
        } else {
          OS.addShortcut({ name: b.name, url: b.url, iconURL: iconSrc });
        }
        renderSCList();
      });
      brandsRoot.appendChild(btn);
    }

    // Custom add
    let pickedIconBlob = null;
    const iconInput = main.querySelector('[data-role="sc-icon"]');
    main.querySelector('[data-act="pick-icon"]').addEventListener('click', () => iconInput.click());
    iconInput.addEventListener('change', () => {
      pickedIconBlob = iconInput.files?.[0] || null;
      main.querySelector('[data-role="icon-name"]').textContent =
        pickedIconBlob ? `Icon: ${pickedIconBlob.name}` : '';
    });
    main.querySelector('[data-act="add-custom"]').addEventListener('click', async () => {
      const name = main.querySelector('[data-role="sc-name"]').value.trim();
      const url = main.querySelector('[data-role="sc-url"]').value.trim();
      if (!name || !url) return;
      let iconBlobId = null;
      if (pickedIconBlob) {
        iconBlobId = await window.WPStore.put(pickedIconBlob, { name: pickedIconBlob.name });
      }
      OS.addShortcut({ name, url, iconBlobId });
      main.querySelector('[data-role="sc-name"]').value = '';
      main.querySelector('[data-role="sc-url"]').value = '';
      main.querySelector('[data-role="icon-name"]').textContent = '';
      pickedIconBlob = null;
      renderSCList();
    });

    renderSCList();
    function renderSCList() {
      const root = main.querySelector('[data-role="sc-list"]');
      root.innerHTML = '';
      const list = OS.state.shortcuts || [];
      if (!list.length) {
        const e = document.createElement('div');
        e.style.cssText = 'color:var(--fg-dim); font-size:13px; padding:6px 0;';
        e.textContent = 'No custom shortcuts yet.';
        root.appendChild(e);
        return;
      }
      for (const s of list) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="sc-ico" data-role="ico"></span>
            <div>
              <div class="label">${escapeHtml(s.name)}</div>
              <div class="desc">${escapeHtml(s.url)}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ghost" data-act="pin">${OS.state.pinned.includes('sc:'+s.id) ? 'Unpin' : 'Pin'}</button>
            <button class="btn ghost" data-act="desk">${OS.hasDesktopIcon('sc:'+s.id) ? 'On Desktop' : 'To Desktop'}</button>
            <button class="btn danger" data-act="del">Delete</button>
          </div>`;
        const icoEl = row.querySelector('[data-role="ico"]');
        if (s.iconBlobId && window.WPStore) {
          window.WPStore.getURL(s.iconBlobId).then((u) => {
            if (u) icoEl.innerHTML = `<img src="${u}" alt="">`;
          });
        } else if (s.iconURL) {
          icoEl.innerHTML = `<img src="${s.iconURL}" alt="" referrerpolicy="no-referrer">`;
        } else {
          icoEl.textContent = (s.name || '?').charAt(0).toUpperCase();
        }
        row.querySelector('[data-act="pin"]').addEventListener('click', () => {
          OS.togglePinned('sc:' + s.id);
          renderSCList();
        });
        row.querySelector('[data-act="desk"]').addEventListener('click', () => {
          const appId = 'sc:' + s.id;
          if (OS.hasDesktopIcon(appId)) OS.removeDesktopIcon(appId);
          else OS.addDesktopIcon(appId);
          renderSCList();
        });
        row.querySelector('[data-act="del"]').addEventListener('click', () => {
          OS.removeShortcut(s.id);
          renderSCList();
        });
        root.appendChild(row);
      }
    }
  }

  function renderDesktop(main) {
    main.innerHTML = `
      <h2>Desktop</h2>
      <p style="font-size:13px; color:var(--fg-dim); margin:0 0 12px;">
        Pin apps to the dock, drop them on the wallpaper as desktop shortcuts, or right-click the desktop for a context menu. Drag desktop icons anywhere; double-click to open.
      </p>
      <h3>Apps</h3>
      <div class="pin-list"></div>`;
    const list = main.querySelector('.pin-list');
    const render = () => {
      list.innerHTML = '';
      for (const app of Object.values(OS.apps)) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        const pinned = OS.state.pinned.includes(app.id);
        const onDesk = OS.hasDesktopIcon(app.id);
        row.innerHTML = `
          <div><div class="label">${escapeHtml(app.title)}</div>
               <div class="desc" style="font-size:11px;">${app.id}</div></div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ${pinned ? '' : 'ghost'}" data-act="pin">${pinned ? 'Pinned' : 'Pin'}</button>
            <button class="btn ${onDesk ? '' : 'ghost'}" data-act="desk">${onDesk ? 'On Desktop' : 'To Desktop'}</button>
          </div>`;
        row.querySelector('[data-act="pin"]').addEventListener('click', () => {
          OS.togglePinned(app.id); render();
        });
        row.querySelector('[data-act="desk"]').addEventListener('click', () => {
          if (onDesk) OS.removeDesktopIcon(app.id);
          else OS.addDesktopIcon(app.id);
          render();
        });
        list.appendChild(row);
      }
    };
    render();
  }

  function renderProxy(main) {
    const engines = OS.proxy.list();
    const active = OS.proxy.getEngine();
    const radios = engines.map((e) => `
      <label class="settings-radio" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--panel-hi);margin-bottom:6px;${e.available ? '' : 'opacity:0.5;'}">
        <input type="radio" name="engine" value="${e.id}" ${e.id === active ? 'checked' : ''} ${e.available ? '' : 'disabled'}>
        <span style="flex:1">
          <div style="font-weight:600">${e.label}</div>
          <div style="font-size:11px;color:var(--fg-dim)">
            ${e.id === 'uv' ? 'Mature, stock — runs through bare-server-node v3.' : ''}
            ${e.id === 'scramjet' ? 'Experimental successor by MercuryWorkshop. Faster rewriting in some cases.' : ''}
            ${!e.available ? ' · not loaded' : ''}
          </div>
        </span>
      </label>`).join('');
    main.innerHTML = `
      <h2>Proxy</h2>
      <h3>Engine</h3>
      <div class="settings-row" style="display:block">
        <div class="desc" style="margin-bottom:8px">
          Pick the proxy engine used for new browser tabs. Already-open tabs stay
          on whichever engine launched them. Changes take effect immediately —
          open a new tab to try it out.
        </div>
        <div data-role="engines">${radios}</div>
      </div>
      <h3>Service worker</h3>
      <div class="settings-row">
        <div><div class="label">Status</div><div class="desc" id="sw-status">checking…</div></div>
        <div><button class="btn ghost" data-act="reg">Re-register</button></div>
      </div>
      <div class="settings-row">
        <div><div class="label">Clear proxy data</div><div class="desc">Unregister service worker and clear caches.</div></div>
        <div><button class="btn ghost" data-act="clear">Clear</button></div>
      </div>
      <h3>Active engine config</h3>
      <pre data-role="cfg" style="background: var(--panel-hi); padding: 10px; border-radius: 8px; font-size: 12px; overflow:auto; max-height:180px;"></pre>`;
    const statusEl = main.querySelector('#sw-status');
    const pre = main.querySelector('[data-role="cfg"]');
    updateStatus();
    refreshCfg();

    function refreshCfg() {
      const eng = OS.proxy.engineFor(OS.proxy.getEngine());
      const cfg = eng.config();
      pre.textContent = JSON.stringify({
        engine: eng.id,
        prefix: cfg && cfg.prefix,
        bundle: cfg && cfg.bundle,
        codec: cfg && cfg.codec ? '<binding present>' : undefined,
        bare: cfg && cfg.bare,
      }, null, 2);
    }

    async function updateStatus() {
      if (!('serviceWorker' in navigator)) { statusEl.textContent = 'unsupported in this browser'; return; }
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) statusEl.textContent = 'not registered';
      else if (reg.active) statusEl.textContent = 'active';
      else if (reg.installing) statusEl.textContent = 'installing…';
      else statusEl.textContent = 'registered (pending)';
    }
    main.addEventListener('change', (e) => {
      const r = e.target.closest('input[name="engine"]'); if (!r) return;
      OS.proxy.setEngine(r.value);
      refreshCfg();
    });
    main.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      if (t.dataset.act === 'reg') {
        try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch (err) { console.error(err); }
        updateStatus();
      }
      if (t.dataset.act === 'clear') {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
        if (window.caches) { const keys = await caches.keys(); for (const k of keys) await caches.delete(k); }
        updateStatus();
      }
    });
  }

  function renderAbout(main) {
    main.innerHTML = `
      <h2>About</h2>
      <div class="about">
        <div class="logo"></div>
        <dl>
          <dt>Name</dt><dd>Desktop</dd>
          <dt>Build</dt><dd>0.3 · dev</dd>
          <dt>Proxy</dt><dd>Ultraviolet</dd>
          <dt>Runtime</dt><dd>Node · Express · bare-server-node</dd>
        </dl>
        <p style="color: var(--fg-dim); font-size: 12px; margin: 8px 0 0;">
          Desktop-OS pattern with customizable window manager, lockscreen, animated wallpapers (local, URL, or server-shared), and bring-your-own-logo shortcuts.
        </p>
      </div>`;
  }

  // ---------- Files ----------
  OS.registerApp('files', {
    title: 'Files',
    glyphSVG: SVG.folder,
    defaultW: 940, defaultH: 620,
    mount(root, api, opts) {
      root.innerHTML = `
        <div class="files-app">
          <aside class="files-side">
            <div class="files-side-label">Places</div>
            <div class="files-sidelist" data-role="places"></div>
          </aside>
          <div class="files-main">
            <div class="files-bar">
              <button class="files-nav" data-act="up" title="Up">↑</button>
              <div class="files-crumbs" data-role="crumbs"></div>
              <div style="flex:1"></div>
              <button class="btn ghost" data-act="newfolder">New folder</button>
              <button class="btn ghost" data-act="upload">Upload</button>
              <input type="file" data-role="uploader" hidden multiple>
            </div>
            <div class="files-list" data-role="list" tabindex="0"></div>
            <div class="files-preview" data-role="preview" hidden></div>
          </div>
        </div>`;

      const FS = window.FS;
      if (!FS) {
        root.innerHTML = '<p style="padding:20px;">Filesystem unavailable.</p>';
        return;
      }

      let cwd = (opts && opts.folderId) || FS.ROOT_ID;
      let selection = new Set();

      const listEl = root.querySelector('[data-role="list"]');
      const crumbsEl = root.querySelector('[data-role="crumbs"]');
      const placesEl = root.querySelector('[data-role="places"]');
      const previewEl = root.querySelector('[data-role="preview"]');
      const uploader = root.querySelector('[data-role="uploader"]');
      const bar = root.querySelector('.files-bar');

      async function render() {
        // crumbs
        crumbsEl.innerHTML = '';
        const chain = await FS.pathOf(cwd);
        for (let i = 0; i < chain.length; i++) {
          const n = chain[i];
          const btn = document.createElement('button');
          btn.className = 'crumb';
          btn.textContent = n.id === FS.ROOT_ID ? 'This Device' : n.name;
          btn.addEventListener('click', () => { cwd = n.id; selection.clear(); render(); });
          crumbsEl.appendChild(btn);
          if (i < chain.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'crumb-sep';
            sep.textContent = '›';
            crumbsEl.appendChild(sep);
          }
        }

        // places (root folders)
        const roots = await FS.list(FS.ROOT_ID);
        placesEl.innerHTML = '';
        const home = document.createElement('button');
        home.className = 'files-side-item' + (cwd === FS.ROOT_ID ? ' is-sel' : '');
        home.innerHTML = `<span class="i">⌂</span><span class="t">This Device</span>`;
        home.addEventListener('click', () => { cwd = FS.ROOT_ID; selection.clear(); render(); });
        placesEl.appendChild(home);
        for (const r of roots.filter((x) => x.kind === 'folder')) {
          const b = document.createElement('button');
          b.className = 'files-side-item' + (cwd === r.id ? ' is-sel' : '');
          b.innerHTML = `<span class="i">▤</span><span class="t">${escapeHtml(r.name)}</span>`;
          b.addEventListener('click', () => { cwd = r.id; selection.clear(); render(); });
          placesEl.appendChild(b);
        }

        // list
        listEl.innerHTML = '';
        const rows = await FS.list(cwd);
        if (!rows.length) {
          const e = document.createElement('div');
          e.className = 'files-empty';
          e.innerHTML = 'This folder is empty.<br><span style="font-size:12px; color:var(--fg-dim);">Drop files here or click Upload.</span>';
          listEl.appendChild(e);
        }
        for (const n of rows) {
          const tile = document.createElement('button');
          tile.className = 'file-item';
          tile.dataset.id = n.id;
          tile.dataset.kind = n.kind;
          tile.title = n.name;
          if (selection.has(n.id)) tile.classList.add('is-sel');
          const ico = document.createElement('span');
          ico.className = 'file-ico';
          ico.innerHTML = iconFor(n);
          const label = document.createElement('span');
          label.className = 'file-label';
          label.textContent = n.name;
          const sub = document.createElement('span');
          sub.className = 'file-sub';
          sub.textContent = n.kind === 'folder' ? 'Folder' : formatBytes(n.size || 0);
          tile.append(ico, label, sub);
          bindItem(tile, n);
          listEl.appendChild(tile);
        }
        // clear preview
        previewEl.hidden = true;
      }

      function bindItem(tile, n) {
        tile.addEventListener('click', (e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            if (selection.has(n.id)) selection.delete(n.id); else selection.add(n.id);
          } else {
            selection.clear();
            selection.add(n.id);
          }
          listEl.querySelectorAll('.file-item').forEach((el) => {
            el.classList.toggle('is-sel', selection.has(el.dataset.id));
          });
          if (n.kind === 'file') showPreview(n);
          else previewEl.hidden = true;
        });
        tile.addEventListener('dblclick', () => {
          if (n.kind === 'folder') { cwd = n.id; selection.clear(); render(); }
          else openFile(n);
        });
        tile.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          OS.showContextMenu(e.clientX, e.clientY, itemMenu(n));
        });
      }

      function itemMenu(n) {
        const items = [];
        if (n.kind === 'folder') {
          items.push({ label: 'Open', onClick: () => { cwd = n.id; selection.clear(); render(); } });
        } else {
          items.push({ label: 'Open', onClick: () => openFile(n) });
          items.push({ label: 'Download', onClick: () => downloadFile(n) });
          if (/^image\//.test(n.mime || '') || /^video\//.test(n.mime || '')) {
            items.push({ label: 'Set as wallpaper', onClick: () => setAsWallpaper(n) });
          }
        }
        items.push({ label: 'Rename', onClick: () => renameNode(n) });
        items.push({ separator: true });
        items.push({ label: 'Delete', danger: true, onClick: () => deleteNode(n) });
        return items;
      }

      async function showPreview(n) {
        previewEl.hidden = false;
        previewEl.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'files-preview-title';
        title.textContent = n.name + ' · ' + formatBytes(n.size || 0) + ' · ' + (n.mime || 'unknown');
        previewEl.appendChild(title);
        if (/^image\//.test(n.mime || '')) {
          const img = document.createElement('img');
          img.src = await FS.urlOf(n.id);
          previewEl.appendChild(img);
        } else if (/^video\//.test(n.mime || '')) {
          const v = document.createElement('video');
          v.src = await FS.urlOf(n.id); v.controls = true;
          previewEl.appendChild(v);
        } else if (/^audio\//.test(n.mime || '')) {
          const a = document.createElement('audio');
          a.src = await FS.urlOf(n.id); a.controls = true;
          previewEl.appendChild(a);
        } else if (/^text\//.test(n.mime || '') || /json|javascript|xml|html|css|markdown/.test(n.mime || '')) {
          const blob = await FS.readBlob(n.id);
          const text = await blob.text();
          const pre = document.createElement('pre');
          pre.textContent = text.slice(0, 20000);
          previewEl.appendChild(pre);
        } else {
          const p = document.createElement('div');
          p.style.cssText = 'padding:10px; color:var(--fg-dim); font-size:13px;';
          p.textContent = 'No inline preview for this type.';
          previewEl.appendChild(p);
        }
      }

      async function openFile(n) {
        if (/^text\//.test(n.mime || '') || /json|javascript|xml|html|css|markdown/.test(n.mime || '')) {
          await showPreview(n);
          return;
        }
        downloadFile(n);
      }
      async function downloadFile(n) {
        const b = await FS.readBlob(n.id);
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u; a.download = n.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 2000);
      }
      async function renameNode(n) {
        const next = prompt('Rename to:', n.name);
        if (!next || next === n.name) return;
        await FS.rename(n.id, next);
        render();
      }
      async function deleteNode(n) {
        const ok = confirm(`Delete ${n.kind === 'folder' ? 'folder' : 'file'} "${n.name}"?${n.kind === 'folder' ? ' Everything inside will be removed.' : ''}`);
        if (!ok) return;
        await FS.remove(n.id);
        selection.delete(n.id);
        render();
      }
      async function setAsWallpaper(n) {
        // Copy the blob to wallpaper storage (WPStore) so it survives even if file is deleted
        const blob = await FS.readBlob(n.id);
        const wpId = await window.WPStore.put(blob, { name: n.name });
        const kind = /^video\//.test(n.mime) ? 'video' : (n.mime === 'image/gif' ? 'gif' : 'image');
        OS.setState({ wallpaper: { kind, value: wpId } });
      }

      // bar actions
      bar.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-act]'); if (!t) return;
        if (t.dataset.act === 'up') {
          const chain = await FS.pathOf(cwd);
          if (chain.length > 1) { cwd = chain[chain.length - 2].id; selection.clear(); render(); }
        }
        if (t.dataset.act === 'newfolder') {
          const name = prompt('New folder name:', 'New folder');
          if (!name) return;
          await FS.createFolder(cwd, name);
          render();
        }
        if (t.dataset.act === 'upload') uploader.click();
      });
      uploader.addEventListener('change', async () => {
        const files = [...(uploader.files || [])];
        for (const f of files) await FS.createFile(cwd, f);
        uploader.value = '';
        render();
      });

      // drag-and-drop from OS
      listEl.addEventListener('dragover', (e) => { e.preventDefault(); listEl.classList.add('is-drop'); });
      listEl.addEventListener('dragleave', () => listEl.classList.remove('is-drop'));
      listEl.addEventListener('drop', async (e) => {
        e.preventDefault(); listEl.classList.remove('is-drop');
        const files = [...(e.dataTransfer?.files || [])];
        for (const f of files) await FS.createFile(cwd, f);
        render();
      });

      // right-click on empty space in list
      listEl.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.file-item')) return;
        e.preventDefault();
        OS.showContextMenu(e.clientX, e.clientY, [
          { label: 'New folder', onClick: async () => {
              const name = prompt('New folder name:', 'New folder');
              if (name) { await FS.createFolder(cwd, name); render(); }
            } },
          { label: 'Upload files…', onClick: () => uploader.click() },
          { separator: true },
          { label: 'Refresh', onClick: render },
        ]);
      });

      // keyboard: Delete to remove selection, F2 to rename
      listEl.addEventListener('keydown', async (e) => {
        if (e.key === 'Delete' && selection.size) {
          const ok = confirm(`Delete ${selection.size} item(s)?`);
          if (!ok) return;
          for (const id of selection) await FS.remove(id);
          selection.clear();
          render();
        } else if (e.key === 'F2' && selection.size === 1) {
          const id = [...selection][0];
          const n = await FS.get(id);
          if (n) renameNode(n);
        }
      });

      render();
    },
  });

  function iconFor(n) {
    if (n.kind === 'folder') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>`;
    }
    const m = n.mime || '';
    if (m.startsWith('image/')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-5 5 5 3-3 5 5"/></svg>`;
    }
    if (m.startsWith('video/')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="15" height="14" rx="2"/><path d="M18 9l4-2v10l-4-2z"/></svg>`;
    }
    if (m.startsWith('audio/')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    }
    if (m.startsWith('text/') || /json|javascript|xml|html|css|markdown/.test(m)) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>`;
    }
    // generic
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M14 2v6h6"/></svg>`;
  }

  function formatBytes(n) {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
  }

  // ---------- InnerMovies (custom in-OS streaming app) ----------
  // Metadata and posters come from TMDB (proxied through /api/cinema/* so we
  // don't ship the API key client-side). Actual *playback* uses vidking.net
  // embed URLs:
  //   https://www.vidking.net/embed/movie/{tmdb_id}
  //   https://www.vidking.net/embed/tv/{tmdb_id}/{season}/{episode}
  // The first paint is a black, neon-glow splash that says the app's name.
  OS.registerApp('inner-movies', {
    title: 'InnerMovies',
    glyphSVG: SVG.movies,
    singleInstance: true,
    defaultW: 1180, defaultH: 760,
    mount(root) {
      root.innerHTML = `
        <div class="is-app">
          <div class="is-splash" data-role="splash">
            <div class="is-splash-glow"></div>
            <div class="is-splash-name" data-role="splash-letters"></div>
            <div class="is-splash-tag">your private cinema</div>
          </div>
          <div class="is-main" data-role="main" hidden>
            <div class="is-topbar" data-drag-handle>
              <button class="is-iconbtn" data-act="back" hidden title="Back">‹</button>
              <div class="is-wordmark">Inner<b>Movies</b></div>
              <div class="is-search">
                <input data-role="search" placeholder="Search movies, shows…" spellcheck="false" autocomplete="off">
              </div>
              <button class="is-iconbtn" data-act="reload" title="Reload">↻</button>
              <button class="is-iconbtn" data-act="fullscreen" title="Fullscreen (F11)">⛶</button>
            </div>
            <div class="is-stage" data-role="stage"></div>
          </div>
        </div>`;

      const splashEl   = root.querySelector('[data-role="splash"]');
      const mainEl     = root.querySelector('[data-role="main"]');
      const stageEl    = root.querySelector('[data-role="stage"]');
      const searchEl   = root.querySelector('[data-role="search"]');
      const backBtn    = root.querySelector('[data-act="back"]');
      const reloadBtn  = root.querySelector('[data-act="reload"]');
      const fullscreenBtn = root.querySelector('[data-act="fullscreen"]');

      // Splash letters — render each glyph as its own span so we can drive
      // the per-letter neon flicker animation.
      const NAME = 'InnerMovies';
      const lettersEl = root.querySelector('[data-role="splash-letters"]');
      lettersEl.innerHTML = '';
      [...NAME].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'is-letter';
        s.style.animationDelay = (i * 0.07) + 's';
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        lettersEl.appendChild(s);
      });

      // Splash plays once per window-instance. After ~2.4s it fades out and
      // the main UI takes over.
      setTimeout(() => {
        splashEl.classList.add('is-out');
        mainEl.hidden = false;
      }, 2400);
      setTimeout(() => { splashEl.style.display = 'none'; }, 3200);

      // ---------- TMDB helpers ----------
      const cache = Object.create(null);
      function imgURL(path, size = 'w500') {
        if (!path) return '';
        return `https://image.tmdb.org/t/p/${size}${path}`;
      }
      async function fetchJSON(endpoint) {
        if (cache[endpoint]) return cache[endpoint];
        const r = await fetch(endpoint);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        cache[endpoint] = j;
        return j;
      }

      // ---------- Views ----------
      let currentView = null;

      async function showHome() {
        currentView = 'home';
        backBtn.hidden = true;
        stageEl.innerHTML = `<div class="is-loading">Loading…</div>`;
        try {
          const [trending, popMovies, popTV, topMovies] = await Promise.all([
            fetchJSON('/api/cinema/trending'),
            fetchJSON('/api/cinema/popular/movie'),
            fetchJSON('/api/cinema/popular/tv'),
            fetchJSON('/api/cinema/top/movie'),
          ]);
          const tList = (trending.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv');
          const featured = tList.find((x) => x.backdrop_path && x.overview) || tList[0] || (popMovies.results || [])[0];
          stageEl.innerHTML = `
            ${heroHTML(featured)}
            ${rowHTML('Trending This Week', tList)}
            ${rowHTML('Popular Movies', popMovies.results || [], 'movie')}
            ${rowHTML('Popular TV', popTV.results || [], 'tv')}
            ${rowHTML('Top Rated Movies', topMovies.results || [], 'movie')}
          `;
          bindStage();
        } catch (e) {
          stageEl.innerHTML = `
            <div class="is-empty">
              <div class="is-empty-title">Couldn't load InnerMovies</div>
              <div class="is-empty-sub">${escapeHtml(String(e.message || e))}</div>
              <button class="is-btn is-btn-primary" data-act="retry">Try again</button>
            </div>`;
          stageEl.querySelector('[data-act="retry"]')?.addEventListener('click', showHome);
        }
      }

      function heroHTML(item) {
        if (!item) return '';
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const title = item.title || item.name || '';
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const back = imgURL(item.backdrop_path, 'w1280');
        return `
          <div class="is-hero" ${back ? `style="background-image:url('${back}')"` : ''}>
            <div class="is-hero-fade"></div>
            <div class="is-hero-body">
              <div class="is-hero-tag">Featured · ${type === 'tv' ? 'Series' : 'Movie'}${year ? ' · ' + year : ''}</div>
              <h1 class="is-hero-title">${escapeHtml(title)}</h1>
              <div class="is-hero-overview">${escapeHtml((item.overview || '').slice(0, 300))}</div>
              <div class="is-hero-actions">
                <button class="is-btn is-btn-primary" data-open-details="${type}:${item.id}">▶ Play</button>
                <button class="is-btn is-btn-ghost" data-open-details="${type}:${item.id}">More info</button>
              </div>
            </div>
          </div>`;
      }

      function cardHTML(it, forceType) {
        const t = forceType || it.media_type || (it.first_air_date ? 'tv' : 'movie');
        const tt = it.title || it.name || '';
        const poster = imgURL(it.poster_path, 'w342');
        const initial = (tt.charAt(0) || '?').toUpperCase();
        return `
          <button class="is-card" data-open-details="${t}:${it.id}" title="${escapeHtml(tt)}">
            ${poster
              ? `<img class="is-card-poster" src="${poster}" alt="" referrerpolicy="no-referrer" loading="lazy">`
              : `<div class="is-card-poster is-card-blank">${escapeHtml(initial)}</div>`}
            <div class="is-card-name">${escapeHtml(tt)}</div>
          </button>`;
      }

      function rowHTML(label, items, forceType) {
        const list = (items || []).filter((x) => x && (x.id != null));
        if (!list.length) return '';
        return `
          <section class="is-row">
            <div class="is-row-head"><h2>${escapeHtml(label)}</h2></div>
            <div class="is-row-track">${list.slice(0, 18).map((it) => cardHTML(it, forceType)).join('')}</div>
          </section>`;
      }

      function bindStage() {
        stageEl.querySelectorAll('[data-open-details]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const [type, id] = btn.dataset.openDetails.split(':');
            showDetails(type, id);
          });
        });
      }

      async function showDetails(type, id) {
        currentView = 'details';
        backBtn.hidden = false;
        stageEl.innerHTML = `<div class="is-loading">Loading…</div>`;
        let detail;
        try {
          detail = await fetchJSON(`/api/cinema/details/${type}/${id}`);
        } catch (e) {
          stageEl.innerHTML = `<div class="is-empty"><div class="is-empty-title">Couldn't load.</div></div>`;
          return;
        }
        const title = detail.title || detail.name || '';
        const year = (detail.release_date || detail.first_air_date || '').slice(0, 4);
        const runtime = detail.runtime
          ? `${detail.runtime} min`
          : (Array.isArray(detail.episode_run_time) && detail.episode_run_time[0] ? `${detail.episode_run_time[0]} min` : '');
        const rating = detail.vote_average ? Number(detail.vote_average).toFixed(1) : '';
        const genres = (detail.genres || []).map((g) => g.name).join(' · ');
        const seasons = type === 'tv' ? (detail.seasons || []).filter((s) => s.season_number > 0) : [];
        const back = imgURL(detail.backdrop_path, 'w1280');

        stageEl.innerHTML = `
          <div class="is-detail">
            <div class="is-detail-back" ${back ? `style="background-image:url('${back}')"` : ''}></div>
            <div class="is-detail-fade"></div>
            <div class="is-detail-body">
              <div class="is-detail-grid">
                <div class="is-detail-poster">
                  ${detail.poster_path ? `<img src="${imgURL(detail.poster_path, 'w500')}" alt="">` : ''}
                </div>
                <div class="is-detail-meta">
                  <h1 class="is-detail-title">${escapeHtml(title)}</h1>
                  <div class="is-detail-sub">
                    ${year ? `<span>${year}</span>` : ''}
                    ${runtime ? `<span>${runtime}</span>` : ''}
                    ${rating ? `<span class="is-rating">★ ${rating}</span>` : ''}
                    ${type === 'tv' ? `<span>${seasons.length} Season${seasons.length === 1 ? '' : 's'}</span>` : ''}
                  </div>
                  ${genres ? `<div class="is-detail-genres">${escapeHtml(genres)}</div>` : ''}
                  <p class="is-detail-overview">${escapeHtml(detail.overview || '')}</p>
                  ${type === 'tv'
                    ? renderTVPicker(seasons)
                    : `<div class="is-detail-actions">
                         <button class="is-btn is-btn-primary" data-play-movie="${detail.id}">▶ Play movie</button>
                       </div>`}
                </div>
              </div>
              ${detail.recommendations?.results?.length
                ? rowHTML('More like this', detail.recommendations.results.slice(0, 14))
                : ''}
            </div>
          </div>`;

        bindStage(); // for the "more like this" row

        stageEl.querySelector('[data-play-movie]')?.addEventListener('click', (e) => {
          playMovie(e.currentTarget.dataset.playMovie);
        });

        if (type === 'tv') wireTVPicker(detail.id, seasons);
      }

      function renderTVPicker(seasons) {
        if (!seasons.length) {
          return `<div class="is-detail-actions" style="opacity:.7;">No episodes available.</div>`;
        }
        return `
          <div class="is-tv-picker">
            <div class="is-tv-row">
              <label>Season</label>
              <select data-role="season">
                ${seasons.map((s) => `<option value="${s.season_number}">${escapeHtml(s.name || ('Season ' + s.season_number))}</option>`).join('')}
              </select>
            </div>
            <div class="is-tv-row">
              <label>Episode</label>
              <select data-role="episode"><option>—</option></select>
            </div>
            <div class="is-detail-actions">
              <button class="is-btn is-btn-primary" data-role="tv-play">▶ Play episode</button>
            </div>
          </div>`;
      }

      async function wireTVPicker(tvId, seasons) {
        if (!seasons.length) return;
        const seasonSel = stageEl.querySelector('[data-role="season"]');
        const epSel     = stageEl.querySelector('[data-role="episode"]');
        const playBtn   = stageEl.querySelector('[data-role="tv-play"]');
        if (!seasonSel || !epSel || !playBtn) return;

        async function reloadEpisodes() {
          epSel.innerHTML = '<option>Loading…</option>';
          try {
            const data = await fetchJSON(`/api/cinema/season/${tvId}/${seasonSel.value}`);
            const eps = data.episodes || [];
            if (!eps.length) { epSel.innerHTML = '<option>No episodes</option>'; return; }
            epSel.innerHTML = eps.map((e) => `<option value="${e.episode_number}">E${e.episode_number} · ${escapeHtml(e.name || '')}</option>`).join('');
          } catch {
            epSel.innerHTML = '<option>Failed</option>';
          }
        }

        seasonSel.addEventListener('change', reloadEpisodes);
        reloadEpisodes();
        playBtn.addEventListener('click', () => {
          const s = seasonSel.value, e = epSel.value;
          if (!s || !e || isNaN(parseInt(e, 10))) return;
          playEpisode(tvId, s, e);
        });
      }

      function renderPlayer(title, subtitle, url) {
        currentView = 'player';
        backBtn.hidden = false;
        stageEl.innerHTML = `
          <div class="is-player">
            <div class="is-player-bar">
              <div class="is-player-title">${escapeHtml(title)}</div>
              <div class="is-player-source">${escapeHtml(subtitle)}</div>
              <div style="flex:1"></div>
              <button class="is-iconbtn" data-act="player-fs" title="Fullscreen (Esc twice to exit)">⛶</button>
              <button class="is-iconbtn" data-act="player-min" title="Minimize">—</button>
              <button class="is-iconbtn" data-act="player-close" title="Close">✕</button>
            </div>
            <iframe class="is-player-frame"
                    src="${url}"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowfullscreen referrerpolicy="no-referrer" loading="eager"></iframe>
          </div>`;
        const winEl = root.closest('.win');
        stageEl.querySelector('[data-act="player-min"]')?.addEventListener('click', () => {
          winEl?.querySelector('.win-min')?.click();
        });
        stageEl.querySelector('[data-act="player-close"]')?.addEventListener('click', () => {
          winEl?.querySelector('.win-close')?.click();
        });
        stageEl.querySelector('[data-act="player-fs"]')?.addEventListener('click', () => {
          const iframe = stageEl.querySelector('.is-player-frame');
          if (iframe && OS.enterGameFullscreen) OS.enterGameFullscreen(iframe);
        });
      }

      function playMovie(id) {
        const item = (cache[`/api/cinema/details/movie/${id}`]) || null;
        const title = item?.title || 'Movie';
        const year = (item?.release_date || '').slice(0, 4);
        renderPlayer(title, year ? `Movie · ${year}` : 'Movie',
          `https://www.vidking.net/embed/movie/${encodeURIComponent(id)}`);
      }
      function playEpisode(tvId, season, ep) {
        const item = (cache[`/api/cinema/details/tv/${tvId}`]) || null;
        const title = item?.name || 'TV';
        renderPlayer(title, `S${season} · E${ep}`,
          `https://www.vidking.net/embed/tv/${encodeURIComponent(tvId)}/${encodeURIComponent(season)}/${encodeURIComponent(ep)}`);
      }

      // ---------- Search ----------
      let searchTimer = null;
      searchEl.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchEl.value.trim();
        if (!q) { showHome(); return; }
        searchTimer = setTimeout(() => doSearch(q), 280);
      });

      async function doSearch(q) {
        currentView = 'search';
        backBtn.hidden = false;
        stageEl.innerHTML = `<div class="is-loading">Searching for "${escapeHtml(q)}"…</div>`;
        try {
          const r = await fetch('/api/cinema/search?q=' + encodeURIComponent(q));
          const data = await r.json();
          const results = (data.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv');
          if (!results.length) {
            stageEl.innerHTML = `<div class="is-empty"><div class="is-empty-title">No results for "${escapeHtml(q)}".</div></div>`;
            return;
          }
          stageEl.innerHTML = `
            <div class="is-search-head"><h2>Results for "${escapeHtml(q)}"</h2></div>
            <div class="is-search-grid">
              ${results.map((it) => cardHTML(it)).join('')}
            </div>`;
          bindStage();
        } catch (e) {
          stageEl.innerHTML = `<div class="is-empty"><div class="is-empty-title">Search failed.</div></div>`;
        }
      }

      backBtn.addEventListener('click', () => {
        searchEl.value = '';
        showHome();
      });
      reloadBtn.addEventListener('click', () => {
        for (const k of Object.keys(cache)) delete cache[k];
        showHome();
      });

      // Fullscreen toggle: prefers the parent .win element so the OS chrome
      // disappears too. Falls back to document if the API rejects it.
      fullscreenBtn?.addEventListener('click', () => {
        const winEl = root.closest('.win') || document.documentElement;
        if (!document.fullscreenElement) {
          (winEl.requestFullscreen?.call(winEl) ||
           winEl.webkitRequestFullscreen?.call(winEl) ||
           Promise.reject(new Error('no fullscreen api')))
            ?.catch?.(() => document.documentElement.requestFullscreen?.());
        } else {
          document.exitFullscreen?.();
        }
      });

      // Cmd/Ctrl+K to focus search (parity with InnerArcade).
      root.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          searchEl.focus();
          searchEl.select();
        }
      });

      // Kick off
      showHome();
    },
  });

  // ---------- InnerArcade (custom in-OS games hub) ----------
  // Aggregates the public game catalogs from gn-math, truffled, and selenite
  // (fetched + normalized by /api/arcade/games on the server side) and runs
  // each game through the active web proxy so X-Frame-Options / mixed-origin
  // restrictions don't block the iframe.
  // Same neon-splash effect as InnerStream, different name + accent.
  OS.registerApp('inner-arcade', {
    title: 'InnerArcade',
    glyphSVG: SVG.arcade,
    singleInstance: true,
    defaultW: 1180, defaultH: 760,
    mount(root) {
      root.innerHTML = `
        <div class="is-app ia-app">
          <div class="is-splash ia-splash" data-role="splash">
            <div class="is-splash-glow"></div>
            <div class="is-splash-name" data-role="splash-letters"></div>
            <div class="is-splash-tag">your private arcade</div>
          </div>
          <div class="is-main" data-role="main" hidden>
            <div class="is-topbar" data-drag-handle>
              <button class="is-iconbtn" data-act="back" hidden title="Back">‹</button>
              <div class="is-wordmark">Inner<b>Arcade</b></div>
              <div class="is-search">
                <input data-role="search" placeholder="Search games (${'⌘/Ctrl+K'})…" spellcheck="false" autocomplete="off">
              </div>
              <select class="ia-source" data-role="source" title="Filter by source">
                <option value="">All sources</option>
                <option value="GN-Math">GN-Math</option>
                <option value="Truffled">Truffled</option>
                <option value="Selenite">Selenite</option>
              </select>
              <button class="is-iconbtn" data-act="reload" title="Reload">↻</button>
              <button class="is-iconbtn" data-act="fullscreen" title="Fullscreen">⛶</button>
            </div>
            <div class="is-stage" data-role="stage"></div>
          </div>
        </div>`;

      const splashEl       = root.querySelector('[data-role="splash"]');
      const mainEl         = root.querySelector('[data-role="main"]');
      const stageEl        = root.querySelector('[data-role="stage"]');
      const searchEl       = root.querySelector('[data-role="search"]');
      const sourceEl       = root.querySelector('[data-role="source"]');
      const backBtn        = root.querySelector('[data-act="back"]');
      const reloadBtn      = root.querySelector('[data-act="reload"]');
      const fullscreenBtn  = root.querySelector('[data-act="fullscreen"]');

      // Splash letters (same effect as InnerStream — different name).
      const NAME = 'InnerArcade';
      const lettersEl = root.querySelector('[data-role="splash-letters"]');
      lettersEl.innerHTML = '';
      [...NAME].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'is-letter';
        s.style.animationDelay = (i * 0.07) + 's';
        s.textContent = ch === ' ' ? ' ' : ch;
        lettersEl.appendChild(s);
      });
      setTimeout(() => { splashEl.classList.add('is-out'); mainEl.hidden = false; }, 2400);
      setTimeout(() => { splashEl.style.display = 'none'; }, 3200);

      // ---------- State ----------
      let allGames = [];
      let currentView = 'grid'; // 'grid' | 'player'
      let manifestPromise = null;

      // Persistent prefs (localStorage). Stored as plain arrays of game IDs.
      const FAV_KEY = 'inner.arcade.favs';
      const REC_KEY = 'inner.arcade.recent';
      const REC_MAX = 12;
      function readList(key) {
        try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
        catch { return []; }
      }
      function writeList(key, list) {
        try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
      }
      let favs = new Set(readList(FAV_KEY));
      let recent = readList(REC_KEY); // most-recent first

      function toggleFav(id) {
        if (favs.has(id)) favs.delete(id); else favs.add(id);
        writeList(FAV_KEY, [...favs]);
      }
      function pushRecent(id) {
        recent = [id, ...recent.filter((x) => x !== id)].slice(0, REC_MAX);
        writeList(REC_KEY, recent);
      }

      function loadManifest() {
        if (manifestPromise) return manifestPromise;
        manifestPromise = fetch('/api/arcade/games')
          .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
          .then((j) => {
            allGames = Array.isArray(j.games) ? j.games : [];
            return allGames;
          });
        return manifestPromise;
      }

      // ---------- Views ----------
      async function showGrid() {
        currentView = 'grid';
        backBtn.hidden = true;
        stageEl.innerHTML = `<div class="is-loading">Loading library…</div>`;
        try {
          await loadManifest();
        } catch (e) {
          stageEl.innerHTML = `
            <div class="is-empty">
              <div class="is-empty-title">Couldn't load games library</div>
              <div class="is-empty-sub">${escapeHtml(String(e.message || e))}</div>
              <button class="is-btn is-btn-primary" data-act="retry">Try again</button>
            </div>`;
          stageEl.querySelector('[data-act="retry"]')?.addEventListener('click', () => {
            manifestPromise = null;
            showGrid();
          });
          return;
        }
        renderGrid();
      }

      function renderGrid() {
        if (currentView !== 'grid') return;
        const q = searchEl.value.trim().toLowerCase();
        const src = sourceEl.value;
        const filtered = allGames.filter((g) => {
          if (src && g.source !== src) return false;
          if (q && !(g.name || '').toLowerCase().includes(q)) return false;
          return true;
        });
        const total = allGames.length;

        if (!total) {
          stageEl.innerHTML = `<div class="is-empty"><div class="is-empty-title">No games available.</div></div>`;
          return;
        }
        if (!filtered.length) {
          stageEl.innerHTML = `
            <div class="ia-stats">${total.toLocaleString()} games loaded · 0 match the filter</div>
            <div class="is-empty"><div class="is-empty-title">No matches.</div></div>`;
          return;
        }

        // Build "Favorites" + "Recently Played" lists from the same filter set
        // so they hide automatically when the user is searching for something
        // specific that doesn't include them.
        const filteredById = new Map(filtered.map((g) => [g.id, g]));
        const favList = [...favs].map((id) => filteredById.get(id)).filter(Boolean);
        const recentList = recent.map((id) => filteredById.get(id)).filter(Boolean);

        // When no search/filter is active we show everything grouped by source.
        // When the user IS filtering, collapse to a single "Search" list.
        const sourceGroups = q || src
          ? [{ source: src || 'Search', list: filtered }]
          : groupBySource(filtered);

        const sections = [];
        if (favList.length) sections.push({ source: '★ Favorites', list: favList, klass: 'ia-row-fav' });
        if (recentList.length) sections.push({ source: 'Recently Played', list: recentList });
        sections.push(...sourceGroups);

        stageEl.innerHTML = `
          <div class="ia-stats">
            ${total.toLocaleString()} games · GN-Math · Truffled · Selenite
            ${q ? ` · matching "<b>${escapeHtml(q)}</b>"` : ''}
          </div>
          ${sections.map((g) => `
            <section class="ia-row ${g.klass || ''}">
              <div class="ia-row-head">
                <h2>${escapeHtml(g.source)}</h2>
                <span class="ia-row-count">${g.list.length}</span>
              </div>
              <div class="ia-grid">
                ${g.list.slice(0, 200).map(gameCardHTML).join('')}
              </div>
            </section>`).join('')}
        `;
        bindCards();
      }

      function groupBySource(games) {
        const order = ['GN-Math', 'Truffled', 'Selenite', 'Other'];
        const map = {};
        for (const g of games) {
          const k = g.source || 'Other';
          (map[k] = map[k] || []).push(g);
        }
        return order.filter((k) => map[k]).map((k) => ({ source: k, list: map[k] }));
      }

      function gameCardHTML(g) {
        const initial = (g.name || '?').charAt(0).toUpperCase();
        const thumb = g.thumb ? escapeHtml(g.thumb) : '';
        const fav = favs.has(g.id);
        return `
          <div class="ia-card" data-play="${escapeHtml(g.id)}" title="${escapeHtml(g.name)}" tabindex="0">
            <button class="ia-fav ${fav ? 'is-on' : ''}" data-fav="${escapeHtml(g.id)}"
                    title="${fav ? 'Unfavorite' : 'Add to favorites'}" aria-label="Toggle favorite">
              ${fav ? '★' : '☆'}
            </button>
            ${thumb
              ? `<img class="ia-card-thumb" src="${thumb}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ia-card-thumb ia-card-blank',textContent:'${escapeHtml(initial)}'}))">`
              : `<div class="ia-card-thumb ia-card-blank">${escapeHtml(initial)}</div>`}
            <div class="ia-card-name">${escapeHtml(g.name)}</div>
            <div class="ia-card-source">${escapeHtml(g.source || 'Other')}</div>
          </div>`;
      }

      function bindCards() {
        // Star toggle — bubbles first so the inner click doesn't launch the
        // game. Re-renders the grid in place to update the star + Favorites
        // section without losing scroll position.
        stageEl.querySelectorAll('[data-fav]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFav(btn.dataset.fav);
            const scrollY = stageEl.scrollTop;
            renderGrid();
            stageEl.scrollTop = scrollY;
          });
        });
        // Card click → play. Use [data-play] not <button> so the inner star
        // button doesn't conflict with HTML's nested-button rule.
        stageEl.querySelectorAll('[data-play]').forEach((card) => {
          const launch = () => {
            const g = allGames.find((x) => x.id === card.dataset.play);
            if (g) playGame(g);
          };
          card.addEventListener('click', launch);
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
          });
        });
      }

      // ---------- Play ----------
      async function playGame(g) {
        currentView = 'player';
        backBtn.hidden = false;
        pushRecent(g.id);
        stageEl.innerHTML = `<div class="is-loading">Starting "${escapeHtml(g.name)}"…</div>`;
        let frameUrl;
        // Server-relative URLs (e.g. /api/arcade/gh/...) are served by *us*
        // with the correct content-type — no proxy needed and no
        // X-Frame-Options to dodge. Skipping the proxy here makes GN-Math
        // games load even if the user's bare-server upstream is flaky.
        // External URLs (Truffled, Selenite) still go through UV/Scramjet
        // because their hosts set X-Frame-Options: deny.
        const isLocal = typeof g.url === 'string' && g.url.startsWith('/');
        if (isLocal) {
          frameUrl = g.url;
        } else {
          try {
            await waitForUV(15000);
            const eng = OS.proxy.engineFor(OS.proxy.getEngine());
            if (!eng || typeof eng.encodeUrl !== 'function' || typeof eng.prefix !== 'function') {
              throw new Error('proxy engine not available');
            }
            if (typeof eng.available === 'function' && !eng.available()) {
              throw new Error(`${eng.label || 'Proxy'} engine not loaded yet — try again in a moment, or switch engines in Settings → Proxy.`);
            }
            // CRITICAL: encodeUrl returns the *encoded* part only (e.g. base64).
            // The SW only intercepts URLs that begin with the engine's prefix
            // (e.g. /service/ for UV, /scram/ for Scramjet) — without it the
            // request hits Express directly and serves our 404 page.
            frameUrl = eng.prefix() + eng.encodeUrl(g.url);
          } catch (e) {
            stageEl.innerHTML = `
              <div class="is-empty">
                <div class="is-empty-title">Couldn't start game</div>
                <div class="is-empty-sub">${escapeHtml(String(e.message || e))}</div>
                <button class="is-btn is-btn-primary" data-act="back-to-grid">Back to library</button>
              </div>`;
            stageEl.querySelector('[data-act="back-to-grid"]')?.addEventListener('click', showGrid);
            return;
          }
        }
        // The "Open original" link only makes sense for external URLs —
        // hide it for the local-proxied GN-Math games (the original would
        // just be the same /api/... path).
        const openOriginalBtn = isLocal
          ? ''
          : `<a class="is-btn is-btn-ghost is-btn-sm" href="${escapeHtml(g.url)}" target="_blank" rel="noopener">Open original</a>`;
        stageEl.innerHTML = `
          <div class="ia-player">
            <div class="ia-player-bar">
              <div class="ia-player-title">${escapeHtml(g.name)}</div>
              <div class="ia-player-source">${escapeHtml(g.source || '')}${isLocal ? ' · github' : ''}</div>
              <div style="flex:1"></div>
              ${openOriginalBtn}
              <button class="is-iconbtn" data-act="player-fs" title="Fullscreen game (Esc twice to exit)">⛶</button>
              <button class="is-iconbtn" data-act="player-min" title="Minimize">—</button>
              <button class="is-iconbtn" data-act="player-close" title="Close">✕</button>
            </div>
            <iframe class="ia-player-frame"
                    src="${frameUrl}"
                    allow="autoplay; fullscreen; gamepad; pointer-lock; clipboard-read; clipboard-write"
                    allowfullscreen
                    referrerpolicy="no-referrer"></iframe>
          </div>`;
        wirePlayerControls(g.name);
      }

      // Reusable wiring for the in-player chrome buttons. The min/close
      // buttons just trigger the standard window-chrome handlers (so
      // behaviour stays consistent with the OS title bar). Fullscreen
      // calls into OS.enterGameFullscreen — see core.js.
      function wirePlayerControls() {
        const winEl = root.closest('.win');
        stageEl.querySelector('[data-act="player-min"]')?.addEventListener('click', () => {
          winEl?.querySelector('.win-min')?.click();
        });
        stageEl.querySelector('[data-act="player-close"]')?.addEventListener('click', () => {
          winEl?.querySelector('.win-close')?.click();
        });
        stageEl.querySelector('[data-act="player-fs"]')?.addEventListener('click', () => {
          const iframe = stageEl.querySelector('.ia-player-frame');
          if (iframe && OS.enterGameFullscreen) OS.enterGameFullscreen(iframe);
        });
      }

      // ---------- Wiring ----------
      let typingTimer = null;
      searchEl.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => { if (currentView === 'grid') renderGrid(); }, 180);
      });
      sourceEl.addEventListener('change', () => { if (currentView === 'grid') renderGrid(); });

      backBtn.addEventListener('click', () => {
        searchEl.value = '';
        sourceEl.value = '';
        showGrid();
      });
      reloadBtn.addEventListener('click', () => {
        manifestPromise = null;
        showGrid();
      });

      fullscreenBtn?.addEventListener('click', () => {
        const winEl = root.closest('.win') || document.documentElement;
        if (!document.fullscreenElement) {
          (winEl.requestFullscreen?.call(winEl) ||
           winEl.webkitRequestFullscreen?.call(winEl) ||
           Promise.reject(new Error('no fullscreen api')))
            ?.catch?.(() => document.documentElement.requestFullscreen?.());
        } else {
          document.exitFullscreen?.();
        }
      });

      // Cmd/Ctrl+K to focus search.
      root.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          searchEl.focus();
          searchEl.select();
        }
      });

      // Kick off
      showGrid();
    },
  });

  // ---------- Inntify (custom in-OS music app) ----------
  // Monochrome SVG transport icons. Using SVGs (not emoji) so they render
  // as a single uniform foreground color across platforms — the user
  // explicitly asked for the shuffle/repeat icons to be plain white, not
  // the colored emoji that Windows substitutes for 🔀/🔁.
  const SVG_ICONS = (() => {
    const lineAttrs = `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    return {
      play:    `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>`,
      pause:   `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`,
      prev:    `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M6 5h2v14H6zM20 5L9 12l11 7z"/></svg>`,
      next:    `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5l11 7-11 7z"/></svg>`,
      // Lucide-style shuffle: two crossing arrows.
      shuffle: `<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
      // Lucide-style loop arrow.
      repeat:  `<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
      // Same loop arrow + a "1" overlay for repeat-one mode.
      repeat1: `<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/><text x="12" y="15" font-size="7" stroke="none" fill="currentColor" text-anchor="middle" font-weight="bold" font-family="ui-sans-serif, system-ui">1</text></svg>`,
      volume:  `<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/></svg>`,
      close:   `<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      minimize:`<svg viewBox="0 0 24 24" ${lineAttrs} aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    };
  })();

  // Spotify-style UI for browsing, searching, and playing music. The actual
  // audio engine (window.MusicPlayer, public/js/music.js) lives at body
  // level so playback continues when this app is minimized or closed —
  // re-opening shows the still-playing track in the now-playing bar.
  // Search + metadata + audio streams come from the Piped API (see
  // /api/music/* in server.js).
  OS.registerApp('inntify', {
    title: 'Inntify',
    glyphSVG: SVG.music,
    singleInstance: true,
    defaultW: 1120, defaultH: 720,
    mount(root) {
      root.innerHTML = `
        <div class="is-app it-app">
          <div class="is-splash it-splash" data-role="splash">
            <div class="is-splash-glow"></div>
            <div class="is-splash-name" data-role="splash-letters"></div>
            <div class="is-splash-tag">your private soundstage</div>
          </div>
          <div class="is-main" data-role="main" hidden>
            <div class="is-topbar" data-drag-handle>
              <button class="is-iconbtn" data-act="back" hidden title="Back">‹</button>
              <div class="is-wordmark">Inn<b>tify</b></div>
              <div class="is-search">
                <input data-role="search" placeholder="Search songs, artists, albums…" spellcheck="false" autocomplete="off">
              </div>
              <button class="is-iconbtn" data-act="player-min" title="Minimize">—</button>
              <button class="is-iconbtn" data-act="player-close" title="Close">✕</button>
            </div>
            <div class="it-body">
              <aside class="it-sidebar">
                <button class="it-side-item is-active" data-view="home"><span>Home</span></button>
                <button class="it-side-item" data-view="library"><span>Your Library</span></button>
                <div class="it-side-label">Recent searches</div>
                <div class="it-side-list" data-role="recent-searches"></div>
              </aside>
              <div class="it-stage" data-role="stage"></div>
            </div>
            <div class="it-now" data-role="nowplaying">
              ${nowPlayingHTML(MusicPlayer.getState())}
            </div>
          </div>
        </div>`;

      const splashEl  = root.querySelector('[data-role="splash"]');
      const mainEl    = root.querySelector('[data-role="main"]');
      const stageEl   = root.querySelector('[data-role="stage"]');
      const searchEl  = root.querySelector('[data-role="search"]');
      const sidebarEl = root.querySelector('.it-sidebar');
      const nowEl     = root.querySelector('[data-role="nowplaying"]');
      const recentEl  = root.querySelector('[data-role="recent-searches"]');
      const winEl     = root.closest('.win');

      // Splash with neon flicker.
      const NAME = 'Inntify';
      const lettersEl = root.querySelector('[data-role="splash-letters"]');
      lettersEl.innerHTML = '';
      [...NAME].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'is-letter';
        s.style.animationDelay = (i * 0.07) + 's';
        s.textContent = ch === ' ' ? ' ' : ch;
        lettersEl.appendChild(s);
      });
      setTimeout(() => { splashEl.classList.add('is-out'); mainEl.hidden = false; }, 2200);
      setTimeout(() => { splashEl.style.display = 'none'; }, 3000);

      // Recent searches in localStorage.
      const RECENT_KEY = 'inntify.recent';
      function readRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
      }
      function pushRecent(q) {
        const cur = readRecent().filter((x) => x !== q);
        cur.unshift(q);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 8))); } catch {}
        renderRecent();
      }
      function renderRecent() {
        const list = readRecent();
        recentEl.innerHTML = list.length
          ? list.map((q) => `<button class="it-side-recent" data-recent="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')
          : `<div class="it-side-empty">No recent searches.</div>`;
        recentEl.querySelectorAll('[data-recent]').forEach((btn) => {
          btn.addEventListener('click', () => {
            searchEl.value = btn.dataset.recent;
            doSearch(btn.dataset.recent);
          });
        });
      }
      renderRecent();

      // Sidebar nav.
      sidebarEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-view]');
        if (!t) return;
        sidebarEl.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b === t));
        if (t.dataset.view === 'home') showHome();
        else if (t.dataset.view === 'library') showLibrary();
      });

      // Min/close (no fullscreen for music — doesn't make sense).
      root.querySelector('[data-act="player-min"]')?.addEventListener('click', () => {
        winEl?.querySelector('.win-min')?.click();
      });
      root.querySelector('[data-act="player-close"]')?.addEventListener('click', () => {
        winEl?.querySelector('.win-close')?.click();
      });

      // ---------- API helpers ----------
      const cache = Object.create(null);
      async function api(endpoint) {
        if (cache[endpoint]) return cache[endpoint];
        const r = await fetch(endpoint);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        cache[endpoint] = j;
        return j;
      }

      // The server now returns a normalized shape per item:
      //   { type: 'track'|'playlist'|'album'|'artist', id, title, artist|author, cover, duration, ... }
      // No URL parsing needed client-side anymore.

      // ---------- Views ----------
      let currentView = 'home';

      async function showHome() {
        currentView = 'home';
        stageEl.innerHTML = `<div class="is-loading">Loading…</div>`;
        try {
          // Real YT Music home — multiple curated sections (Quick picks,
          // Trending, mood playlists, charts, etc.) instead of Piped's
          // generic YouTube trending feed.
          const home = await api('/api/music/home');
          const sections = (home.sections || []).filter((s) => (s.items || []).length);
          if (!sections.length) {
            stageEl.innerHTML = `<div class="is-empty"><div class="is-empty-title">Couldn't load home feed</div></div>`;
            return;
          }
          stageEl.innerHTML = sections.map((sec) => `
            <div class="it-section">
              <h1 class="it-section-title">${escapeHtml(sec.title || 'For you')}</h1>
              <div class="it-grid">
                ${sec.items.map(itemTileHTML).join('')}
              </div>
            </div>
          `).join('');
          bindItemTiles();
        } catch (e) {
          showError(e);
        }
      }

      function showLibrary() {
        currentView = 'library';
        const state = MusicPlayer.getState();
        const q = state.queue || [];
        stageEl.innerHTML = `
          <div class="it-section">
            <h1 class="it-section-title">Now in queue</h1>
            ${q.length
              ? `<div class="it-tracklist">
                  ${q.map((t, i) => trackRowHTML(t, i, i === state.currentIdx)).join('')}
                 </div>`
              : `<div class="is-empty"><div class="is-empty-title">Queue is empty</div>
                 <div class="is-empty-sub">Search for a song and hit play.</div></div>`}
          </div>`;
        bindTrackRows();
      }

      let typingTimer = null;
      searchEl.addEventListener('input', () => {
        clearTimeout(typingTimer);
        const q = searchEl.value.trim();
        if (!q) { showHome(); return; }
        typingTimer = setTimeout(() => doSearch(q), 280);
      });

      async function doSearch(q) {
        currentView = 'search';
        sidebarEl.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('is-active'));
        stageEl.innerHTML = `<div class="is-loading">Searching for "${escapeHtml(q)}"…</div>`;
        try {
          // Three parallel fetches against the YT Music search filters.
          // Songs is the primary list; albums + playlists fill in below.
          const [songs, albums, playlists] = await Promise.all([
            api(`/api/music/search?q=${encodeURIComponent(q)}&filter=song`),
            api(`/api/music/search?q=${encodeURIComponent(q)}&filter=album`).catch(() => ({ items: [] })),
            api(`/api/music/search?q=${encodeURIComponent(q)}&filter=playlist`).catch(() => ({ items: [] })),
          ]);
          const songItems = (songs.items || []);
          const albumItems = (albums.items || []).slice(0, 12);
          const plItems = (playlists.items || []).slice(0, 12);
          stageEl.innerHTML = `
            ${songItems.length ? `
              <div class="it-section">
                <div class="it-section-head">
                  <h1 class="it-section-title">Songs</h1>
                  <button class="is-btn is-btn-primary is-btn-sm" data-act="play-all">▶ Play all</button>
                </div>
                <div class="it-tracklist">
                  ${songItems.map((t, i) => trackRowHTML(t, i, false)).join('')}
                </div>
              </div>` : ''}
            ${albumItems.length ? `
              <div class="it-section">
                <h1 class="it-section-title">Albums</h1>
                <div class="it-grid">
                  ${albumItems.map(itemTileHTML).join('')}
                </div>
              </div>` : ''}
            ${plItems.length ? `
              <div class="it-section">
                <h1 class="it-section-title">Playlists</h1>
                <div class="it-grid">
                  ${plItems.map(itemTileHTML).join('')}
                </div>
              </div>` : ''}
            ${(!songItems.length && !albumItems.length && !plItems.length)
              ? `<div class="is-empty"><div class="is-empty-title">No results for "${escapeHtml(q)}".</div></div>` : ''}
          `;
          stageEl.querySelector('[data-act="play-all"]')?.addEventListener('click', () => {
            if (songItems.length) MusicPlayer.playQueue(songItems, 0);
          });
          bindTrackRowsExplicit(songItems);
          bindItemTiles();
          pushRecent(q);
        } catch (e) {
          showError(e);
        }
      }

      async function showPlaylist(id, name) {
        currentView = 'playlist';
        stageEl.innerHTML = `<div class="is-loading">Loading playlist…</div>`;
        try {
          const data = await api(`/api/music/playlist/${encodeURIComponent(id)}`);
          // Server already normalized — relatedStreams is { id, title, artist, ... }.
          const tracks = data.relatedStreams || [];
          stageEl.innerHTML = `
            <div class="it-section it-pl-hero">
              <div class="it-pl-cover">
                ${data.thumbnailUrl ? `<img src="${escapeHtml(data.thumbnailUrl)}" alt="" referrerpolicy="no-referrer">` : ''}
              </div>
              <div class="it-pl-meta">
                <div class="it-pl-kind">Playlist</div>
                <h1 class="it-pl-title">${escapeHtml(data.name || name || 'Playlist')}</h1>
                <div class="it-pl-sub">${escapeHtml(data.uploader || '')} · ${tracks.length} song${tracks.length === 1 ? '' : 's'}</div>
                <div class="it-pl-actions">
                  <button class="is-btn is-btn-primary" data-act="pl-play">▶ Play</button>
                  <button class="is-btn is-btn-ghost" data-act="pl-shuffle">🔀 Shuffle</button>
                </div>
              </div>
            </div>
            <div class="it-section">
              <div class="it-tracklist">
                ${tracks.map((t, i) => trackRowHTML(t, i, false)).join('')}
              </div>
            </div>`;
          stageEl.querySelector('[data-act="pl-play"]')?.addEventListener('click', () => {
            MusicPlayer.setShuffle(false);
            MusicPlayer.playQueue(tracks, 0);
          });
          stageEl.querySelector('[data-act="pl-shuffle"]')?.addEventListener('click', () => {
            MusicPlayer.setShuffle(true);
            MusicPlayer.playQueue(tracks, Math.floor(Math.random() * tracks.length));
          });
          bindTrackRowsExplicit(tracks);
        } catch (e) {
          showError(e);
        }
      }

      function showError(e) {
        stageEl.innerHTML = `
          <div class="is-empty">
            <div class="is-empty-title">Couldn't load Inntify</div>
            <div class="is-empty-sub">${escapeHtml(String(e.message || e))}</div>
            <button class="is-btn is-btn-primary" data-act="retry">Try again</button>
          </div>`;
        stageEl.querySelector('[data-act="retry"]')?.addEventListener('click', showHome);
      }

      // ---------- Card / row HTML ----------
      // One tile renderer for the whole catalog — switches the data-* hook
      // by item.type so binders can dispatch correctly.
      function itemTileHTML(it) {
        const cover = it.cover || '';
        const title = it.title || '';
        const sub = it.type === 'track'
          ? (it.artist || '')
          : it.type === 'album'
            ? (it.artist || it.year || 'Album')
            : it.type === 'artist'
              ? 'Artist'
              : (it.author || 'Playlist');
        const dataAttr = it.type === 'playlist' || it.type === 'album'
          ? `data-playlist="${escapeHtml(it.id)}"`
          : it.type === 'track'
            ? `data-track="${escapeHtml(it.id)}"`
            : `data-artist="${escapeHtml(it.id)}"`;
        const fallbackGlyph = it.type === 'playlist' || it.type === 'album' ? '♫' : '♪';
        const showPlay = it.type === 'track' || it.type === 'playlist' || it.type === 'album';
        return `
          <button class="it-tile ${it.type === 'playlist' || it.type === 'album' ? 'it-tile-pl' : ''}" ${dataAttr} data-name="${escapeHtml(title)}">
            ${cover
              ? `<img class="it-tile-cover" src="${escapeHtml(cover)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
              : `<div class="it-tile-cover it-tile-blank">${fallbackGlyph}</div>`}
            <div class="it-tile-title">${escapeHtml(title)}</div>
            <div class="it-tile-sub">${escapeHtml(sub)}</div>
            ${showPlay ? `<span class="it-tile-play">${SVG_ICONS.play}</span>` : ''}
          </button>`;
      }
      function trackRowHTML(t, i, isCurrent) {
        const dur = formatDuration(t.duration || 0);
        return `
          <div class="it-row${isCurrent ? ' is-current' : ''}" data-row="${i}">
            <div class="it-row-num">${i + 1}</div>
            <div class="it-row-cover">
              ${t.cover
                ? `<img src="${escapeHtml(t.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
                : '♪'}
            </div>
            <div class="it-row-meta">
              <div class="it-row-title">${escapeHtml(t.title || '')}</div>
              <div class="it-row-artist">${escapeHtml(t.artist || '')}</div>
            </div>
            <div class="it-row-dur">${dur}</div>
            <button class="it-row-play" data-act="row-play" title="Play">${SVG_ICONS.play}</button>
          </div>`;
      }

      // One binder for all tiles. Tracks → play-as-single; playlists/albums
      // → drill-in; artists currently no-op (TODO: artist page).
      function bindItemTiles() {
        stageEl.querySelectorAll('[data-track]').forEach((btn) => {
          btn.addEventListener('click', () => {
            // Walk the current grid section to find sibling tracks for the queue.
            const section = btn.closest('.it-grid');
            const ids = section
              ? [...section.querySelectorAll('[data-track]')].map((b) => b.dataset.track)
              : [btn.dataset.track];
            // Build minimal track stubs from the visible tile attributes; the
            // player will fill in title/artist/cover from /api/music/track.
            const tracks = ids.map((id) => ({ id, title: '', artist: '', cover: '' }));
            const idx = Math.max(0, ids.indexOf(btn.dataset.track));
            MusicPlayer.playQueue(tracks, idx);
          });
        });
        stageEl.querySelectorAll('[data-playlist]').forEach((btn) => {
          btn.addEventListener('click', () => showPlaylist(btn.dataset.playlist, btn.dataset.name));
        });
      }
      function bindTrackRows() {
        // Library/queue view — play the row's index in the current queue.
        stageEl.querySelectorAll('[data-row]').forEach((row) => {
          row.addEventListener('click', () => {
            const idx = parseInt(row.dataset.row, 10);
            const state = MusicPlayer.getState();
            if (state.queue[idx]) MusicPlayer.playQueue(state.queue, idx);
          });
        });
      }
      function bindTrackRowsExplicit(tracks) {
        stageEl.querySelectorAll('[data-row]').forEach((row) => {
          row.addEventListener('click', () => {
            const idx = parseInt(row.dataset.row, 10);
            if (tracks[idx]) MusicPlayer.playQueue(tracks, idx);
          });
        });
      }

      // ---------- Now-playing bar ----------
      function nowPlayingHTML(state) {
        const t = state.track;
        const playGlyph = state.isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
        const repeatGlyph = state.repeat === 'one' ? SVG_ICONS.repeat1 : SVG_ICONS.repeat;
        return `
          <div class="it-now-track">
            ${t && t.cover
              ? `<img class="it-now-cover" src="${escapeHtml(t.cover)}" alt="" referrerpolicy="no-referrer">`
              : `<div class="it-now-cover it-now-blank">♪</div>`}
            <div class="it-now-meta">
              <div class="it-now-title">${escapeHtml(t?.title || 'Nothing playing')}</div>
              <div class="it-now-artist">${escapeHtml(t?.artist || '')}</div>
            </div>
          </div>
          <div class="it-now-controls">
            <div class="it-now-buttons">
              <button class="it-tx ${state.shuffle ? 'is-on' : ''}" data-act="shuffle" title="Shuffle">${SVG_ICONS.shuffle}</button>
              <button class="it-tx" data-act="prev" title="Previous">${SVG_ICONS.prev}</button>
              <button class="it-tx it-tx-play" data-act="toggle" title="Play/Pause">${playGlyph}</button>
              <button class="it-tx" data-act="next" title="Next">${SVG_ICONS.next}</button>
              <button class="it-tx ${state.repeat !== 'off' ? 'is-on' : ''}" data-act="repeat" title="Repeat: ${state.repeat}">${repeatGlyph}</button>
            </div>
            <div class="it-now-progress">
              <span class="it-now-time">${formatDuration(state.time)}</span>
              <div class="it-now-bar" data-act="seek">
                <div class="it-now-bar-fill" style="width:${state.duration ? (state.time / state.duration * 100) : 0}%"></div>
              </div>
              <span class="it-now-time">${formatDuration(state.duration)}</span>
            </div>
          </div>
          <div class="it-now-extras">
            <span class="it-now-vol">${SVG_ICONS.volume}</span>
            <input class="it-now-vol-slider" type="range" min="0" max="100"
                   value="${Math.round(state.volume * 100)}" data-act="volume"
                   title="Volume">
          </div>`;
      }

      // Cache: query the now-playing DOM nodes ONCE and update them in place
      // on every state emit. The previous implementation did 6+ separate
      // querySelector walks every ~250ms — measurable lag on Chromebooks.
      // Also remember last values per field so we skip touching nodes whose
      // value didn't change (avoids redundant style writes / text nodes).
      let nowRefs = null;
      let lastTrackId = null;
      let lastTimeText = null;
      let lastDurText = null;
      let lastFillPct = null;
      let lastIsPlaying = null;
      let lastShuffle = null;
      let lastRepeat = null;
      let lastError = null;

      function buildNowRefs() {
        const times = nowEl.querySelectorAll('.it-now-time');
        nowRefs = {
          fill:       nowEl.querySelector('.it-now-bar-fill'),
          timeStart:  times[0] || null,
          timeEnd:    times[1] || null,
          playBtn:    nowEl.querySelector('[data-act="toggle"]'),
          titleEl:    nowEl.querySelector('.it-now-title'),
          artistEl:   nowEl.querySelector('.it-now-artist'),
          coverEl:    nowEl.querySelector('.it-now-cover'),
          shuffleBtn: nowEl.querySelector('[data-act="shuffle"]'),
          repeatBtn:  nowEl.querySelector('[data-act="repeat"]'),
        };
      }

      function renderNowPlaying(state) {
        // First call (or after innerHTML was wiped): stamp + snapshot refs.
        if (!nowRefs || !nowEl.querySelector('.it-now-bar-fill')) {
          nowEl.innerHTML = nowPlayingHTML(state);
          buildNowRefs();
          // Reset caches so the first real diff pass writes everything once.
          lastTrackId = null;
          lastTimeText = null;
          lastDurText = null;
          lastFillPct = null;
          lastIsPlaying = null;
          lastShuffle = null;
          lastRepeat = null;
        }
        const r = nowRefs;
        const t = state.track;

        // Per-frame: progress bar + time texts (the only fast-moving bits).
        if (r.fill && state.duration) {
          const pct = (state.time / state.duration * 100);
          // Skip writing style if the visible width wouldn't change anyway.
          if (lastFillPct === null || Math.abs(pct - lastFillPct) > 0.2) {
            r.fill.style.width = pct + '%';
            lastFillPct = pct;
          }
        }
        if (r.timeStart) {
          const txt = formatDuration(state.time);
          if (txt !== lastTimeText) { r.timeStart.textContent = txt; lastTimeText = txt; }
        }
        if (r.timeEnd) {
          const txt = formatDuration(state.duration);
          if (txt !== lastDurText) { r.timeEnd.textContent = txt; lastDurText = txt; }
        }

        // Play/pause glyph — repaint only on transition.
        if (r.playBtn && state.isPlaying !== lastIsPlaying) {
          r.playBtn.innerHTML = state.isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
          lastIsPlaying = state.isPlaying;
        }
        if (r.shuffleBtn && state.shuffle !== lastShuffle) {
          r.shuffleBtn.classList.toggle('is-on', state.shuffle);
          lastShuffle = state.shuffle;
        }
        if (r.repeatBtn && state.repeat !== lastRepeat) {
          r.repeatBtn.innerHTML = state.repeat === 'one' ? SVG_ICONS.repeat1 : SVG_ICONS.repeat;
          r.repeatBtn.classList.toggle('is-on', state.repeat !== 'off');
          r.repeatBtn.title = `Repeat: ${state.repeat}`;
          lastRepeat = state.repeat;
        }

        // Error surface — overrides the artist line when present, so the
        // user can tell a "music not playing" symptom apart from
        // "googlevideo is unreachable from this Codespace's network."
        if (state.error !== lastError) {
          lastError = state.error;
          if (r.artistEl) {
            if (state.error) {
              r.artistEl.textContent = `⚠ ${state.error}`;
              r.artistEl.style.color = '#ff8a8a';
            } else {
              r.artistEl.textContent = t?.artist || '';
              r.artistEl.style.color = '';
            }
          }
        }

        // Track-change-only updates: cover/title/artist.
        const trackId = t?.id || null;
        if (trackId !== lastTrackId) {
          lastTrackId = trackId;
          if (r.titleEl) r.titleEl.textContent = t?.title || 'Nothing playing';
          if (r.artistEl && !state.error) r.artistEl.textContent = t?.artist || '';
          // Cover swap: only replace the element when img↔div needs to flip.
          const wantImg = !!t?.cover;
          const isImg = r.coverEl?.tagName === 'IMG';
          if (wantImg && !isImg && r.coverEl) {
            const img = document.createElement('img');
            img.className = 'it-now-cover';
            img.src = t.cover;
            img.referrerPolicy = 'no-referrer';
            img.alt = '';
            r.coverEl.replaceWith(img);
            r.coverEl = img;
          } else if (wantImg && isImg && r.coverEl.src !== t.cover) {
            r.coverEl.src = t.cover;
          } else if (!wantImg && isImg) {
            const div = document.createElement('div');
            div.className = 'it-now-cover it-now-blank';
            div.textContent = '♪';
            r.coverEl.replaceWith(div);
            r.coverEl = div;
          }
        }
      }

      // Subscribe to global player. Auto-cleans when this app unmounts
      // (the listener throws when nowEl is detached and music.js drops it).
      const unsubscribe = MusicPlayer.subscribe((state) => {
        if (!nowEl.isConnected) {
          unsubscribe();
          throw new Error('detached');
        }
        renderNowPlaying(state);
      });

      // Now-playing transport buttons + seek/volume.
      nowEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]');
        if (!t) return;
        const act = t.dataset.act;
        if (act === 'toggle') MusicPlayer.toggle();
        else if (act === 'next') MusicPlayer.next();
        else if (act === 'prev') MusicPlayer.prev();
        else if (act === 'shuffle') MusicPlayer.setShuffle(!MusicPlayer.getState().shuffle);
        else if (act === 'repeat') MusicPlayer.cycleRepeat();
        else if (act === 'seek') {
          const bar = e.currentTarget.querySelector('.it-now-bar');
          if (!bar) return;
          const rect = bar.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const dur = MusicPlayer.getState().duration;
          if (dur) MusicPlayer.seek(pct * dur);
        }
      });
      nowEl.addEventListener('input', (e) => {
        if (e.target.dataset?.act === 'volume') {
          MusicPlayer.setVolume(parseInt(e.target.value, 10) / 100);
        }
      });

      // Cmd/Ctrl+K → search; Space → play/pause (when not focused on input).
      root.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          searchEl.focus();
          searchEl.select();
        } else if (e.key === ' ' && document.activeElement !== searchEl) {
          e.preventDefault();
          MusicPlayer.toggle();
        }
      });

      // Kick off
      showHome();
    },
  });

  function formatDuration(s) {
    s = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
  }

  // ---------- About ----------
  OS.registerApp('about', {
    title: 'About',
    glyphSVG: SVG.info,
    singleInstance: true,
    defaultW: 520, defaultH: 360,
    mount(root) { renderAbout(root); },
  });

  // Load any saved shortcuts into the registry
  OS.reloadShortcuts();

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function waitForUV(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      (function tick() {
        // Wait for whichever engine is selected. UV is always available;
        // Scramjet is conditional on the npm install having shipped.
        const id = OS.proxy.getEngine();
        const eng = OS.proxy.engineFor(id);
        const cfgReady = !!eng && !!eng.config();
        const swReady = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        const proxyReady = window.__proxyReady === true;
        if (cfgReady && swReady && proxyReady) return resolve();
        if (cfgReady && !swReady && navigator.serviceWorker?.ready) {
          navigator.serviceWorker.ready.then(() => {
            if (window.__proxyReady) resolve();
            else setTimeout(tick, 100);
          }, reject);
          return;
        }
        if (Date.now() - started > timeoutMs) return reject(new Error('timeout waiting for proxy'));
        setTimeout(tick, 100);
      })();
    });
  }
})();
