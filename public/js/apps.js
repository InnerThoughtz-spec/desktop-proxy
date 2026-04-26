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
    };
  })();

  // ---------- Preset brand shortcuts (resolved via simpleicons CDN) ----------
  const BRAND_PRESETS = [
    { slug: 'netflix',     name: 'Netflix',     url: 'https://www.netflix.com/',          color: 'E50914' },
    { slug: 'spotify',     name: 'Spotify',     url: 'https://open.spotify.com/',         color: '1DB954' },
    { slug: 'youtube',     name: 'YouTube',     url: 'https://www.youtube.com/',          color: 'FF0000' },
    { slug: 'discord',     name: 'Discord',     url: 'https://discord.com/app',           color: '5865F2' },
    { slug: 'playstation', name: 'PlayStation', url: 'https://www.playstation.com/',      color: 'FFFFFF' },
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
        const cfg = window.__uv$config;
        if (!cfg || !cfg.encodeUrl) { showError(t, 'UV config not loaded'); return; }
        const target = cfg.prefix + cfg.encodeUrl(url);

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
          const cfg = window.__uv$config;
          const prefix = location.origin + cfg.prefix;
          const loc = win.location.href;
          if (loc.startsWith(prefix)) {
            const encoded = loc.slice(prefix.length);
            try {
              const real = cfg.decodeUrl(encoded);
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
      btn.innerHTML = `
        <span class="brand-chip-ico"><img src="${brandIconURL(b.slug, b.color)}" alt="" referrerpolicy="no-referrer"></span>
        <span class="brand-chip-name">${escapeHtml(b.name)}</span>`;
      btn.addEventListener('click', () => {
        OS.addShortcut({ name: b.name, url: b.url, iconURL: brandIconURL(b.slug, b.color) });
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
    main.innerHTML = `
      <h2>Proxy</h2>
      <div class="settings-row">
        <div><div class="label">Service worker</div><div class="desc" id="sw-status">checking…</div></div>
        <div><button class="btn ghost" data-act="reg">Re-register</button></div>
      </div>
      <div class="settings-row">
        <div><div class="label">Clear proxy data</div><div class="desc">Unregister service worker and clear caches.</div></div>
        <div><button class="btn ghost" data-act="clear">Clear</button></div>
      </div>
      <h3>Config</h3>
      <pre style="background: var(--panel-hi); padding: 10px; border-radius: 8px; font-size: 12px; overflow:auto; max-height:180px;"></pre>`;
    const statusEl = main.querySelector('#sw-status');
    const pre = main.querySelector('pre');
    updateStatus();
    pre.textContent = JSON.stringify({
      prefix: window.__uv$config?.prefix,
      bare: window.__uv$config?.bare,
    }, null, 2);

    async function updateStatus() {
      if (!('serviceWorker' in navigator)) { statusEl.textContent = 'unsupported in this browser'; return; }
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) statusEl.textContent = 'not registered';
      else if (reg.active) statusEl.textContent = 'active';
      else if (reg.installing) statusEl.textContent = 'installing…';
      else statusEl.textContent = 'registered (pending)';
    }
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
        const cfgReady = !!window.__uv$config;
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
