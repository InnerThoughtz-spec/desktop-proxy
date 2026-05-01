// core.js — state, lockscreen, window manager, dock, widgets, FPS, wallpaper
(function () {
  'use strict';

  const STORE_KEY = 'desktop.state.v2';

  const DEFAULT_STATE = {
    theme: 'dark',
    accent: '#6aa8ff',
    accent2: '#b28aff',
    // wallpaper: { kind: 'preset'|'image'|'gif'|'video'|'url'|'server', value: <key|wpId|url|serverId>, meta? }
    wallpaper: { kind: 'preset', value: 'rainDusk' },
    pinned: ['browser', 'inner-movies', 'inner-arcade', 'inntify', 'files', 'settings', 'about'],
    // Desktop icons: [{ id, appId, x, y }]
    desktopIcons: [
      { id: 'di_browser', appId: 'browser',      x: 24, y: 88 },
      { id: 'di_movies',  appId: 'inner-movies', x: 24, y: 200 },
      { id: 'di_arcade',  appId: 'inner-arcade', x: 24, y: 312 },
      { id: 'di_inntify', appId: 'inntify',      x: 24, y: 424 },
      { id: 'di_files',   appId: 'files',        x: 24, y: 536 },
    ],
    locked: true,
    fpsVisible: true,
    // Browser preferences — customizable from the gear in the Browser app.
    browser: {
      home: 'about:home',
      searchTemplate: 'https://duckduckgo.com/?q=%s',
      newTabPage: 'home', // 'home' | 'blank'
      showUrlBar: true,
      showTabs: true,
      compactTabs: false,
      // Unblock / stealth
      cloakPreset: '',   // '' | 'classroom' | 'docs' | 'drive' | 'khan' | 'wikipedia' | 'custom'
      cloakTitle: '',
      cloakFavicon: '',
      panicKey: '`',
      panicUrl: 'https://classroom.google.com/',
      blockSiteWorkers: true,
    },
  };

  const PRESET_WALLPAPERS = {
    rainDusk: {
      name: 'Rain at Dusk',
      css: `radial-gradient(70% 90% at 30% 20%, rgba(110,140,180,.18), transparent 60%),
            radial-gradient(60% 80% at 80% 80%, rgba(60,80,110,.28), transparent 60%),
            linear-gradient(170deg, #0a0e14 0%, #131a26 50%, #060a10 100%)`,
    },
    monsoon: {
      name: 'Monsoon',
      css: `radial-gradient(70% 90% at 30% 10%, rgba(60,120,100,.25), transparent 60%),
            radial-gradient(60% 60% at 80% 85%, rgba(30,60,50,.5), transparent 60%),
            linear-gradient(170deg, #060d0a 0%, #0b1812 50%, #040806 100%)`,
    },
    petrichor: {
      name: 'Petrichor',
      css: `radial-gradient(70% 90% at 30% 20%, rgba(140,120,80,.18), transparent 60%),
            radial-gradient(60% 80% at 85% 85%, rgba(60,80,50,.32), transparent 60%),
            linear-gradient(170deg, #0e0d08 0%, #1a1810 50%, #070603 100%)`,
    },
    rainforest: {
      name: 'Rainforest',
      css: `radial-gradient(70% 90% at 25% 25%, rgba(90,200,140,.2), transparent 60%),
            radial-gradient(60% 70% at 90% 90%, rgba(20,80,60,.5), transparent 60%),
            linear-gradient(170deg, #040a06 0%, #0a1610 50%, #02060a 100%)`,
    },
    storm: {
      name: 'Storm',
      css: `radial-gradient(70% 90% at 50% 20%, rgba(150,160,180,.12), transparent 60%),
            radial-gradient(60% 80% at 10% 90%, rgba(30,40,55,.5), transparent 60%),
            linear-gradient(170deg, #06080c 0%, #10151c 50%, #04060a 100%)`,
    },
    ocean: {
      name: 'Ocean',
      css: `radial-gradient(70% 90% at 20% 15%, rgba(110,180,220,.22), transparent 60%),
            radial-gradient(60% 80% at 85% 90%, rgba(40,80,140,.4), transparent 60%),
            linear-gradient(170deg, #050a12 0%, #0a162a 50%, #04070d 100%)`,
    },
    creek: {
      name: 'Creek',
      css: `radial-gradient(70% 90% at 30% 20%, rgba(120,160,120,.22), transparent 60%),
            radial-gradient(60% 80% at 85% 80%, rgba(80,100,60,.3), transparent 60%),
            linear-gradient(170deg, #0a0f0a 0%, #121a12 50%, #060906 100%)`,
    },
    moss: {
      name: 'Moss',
      css: `radial-gradient(60% 70% at 20% 20%, rgba(140,200,110,.2), transparent 60%),
            radial-gradient(70% 80% at 90% 90%, rgba(50,90,40,.4), transparent 60%),
            linear-gradient(170deg, #070a06 0%, #0d140a 50%, #030604 100%)`,
    },
    meadow: {
      name: 'Meadow',
      css: `radial-gradient(70% 80% at 30% 20%, rgba(220,200,120,.18), transparent 60%),
            radial-gradient(60% 70% at 85% 85%, rgba(110,160,90,.3), transparent 60%),
            linear-gradient(170deg, #0b0d08 0%, #141810 50%, #06070a 100%)`,
    },
    sakura: {
      name: 'Sakura',
      css: `radial-gradient(70% 80% at 25% 25%, rgba(255,170,200,.2), transparent 60%),
            radial-gradient(60% 70% at 85% 85%, rgba(180,80,120,.3), transparent 60%),
            linear-gradient(170deg, #0d080a 0%, #180f14 50%, #060408 100%)`,
    },
    aurora: {
      name: 'Aurora',
      css: `radial-gradient(60% 80% at 20% 10%, rgba(106,168,255,.25), transparent 60%),
            radial-gradient(60% 80% at 90% 90%, rgba(178,138,255,.25), transparent 60%),
            linear-gradient(160deg, #07090d 0%, #0f1528 50%, #07090d 100%)`,
    },
    noir: {
      name: 'Noir',
      css: `radial-gradient(60% 70% at 50% 0%, rgba(120,120,140,.12), transparent 60%),
            linear-gradient(160deg, #0a0b0f 0%, #141518 50%, #090a0c 100%)`,
    },
  };

  const ACCENT_SWATCHES = [
    { a: '#6aa8ff', b: '#b28aff' },
    { a: '#ff7aa8', b: '#ff9b6a' },
    { a: '#5ce2a0', b: '#6ad2ff' },
    { a: '#ffb454', b: '#ff7a5a' },
    { a: '#c08cff', b: '#6aa8ff' },
    { a: '#e8e8e8', b: '#a0a0a0' },
  ];

  // ---- State ----
  const state = loadState();
  const listeners = new Set();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      const merged = { ...structuredClone(DEFAULT_STATE), ...parsed };
      // Re-lock on each fresh load (don't persist unlocked across reloads)
      merged.locked = true;
      // ---- Migrations ----
      // Ensure the default pinned set includes apps added after a user's
      // first visit. Only adds; never removes a user-removed pin.
      if (!Array.isArray(merged.pinned)) merged.pinned = [];
      // Rename: 'inner-stream' → 'inner-movies' (preserves position).
      const sIdx = merged.pinned.indexOf('inner-stream');
      if (sIdx >= 0) merged.pinned[sIdx] = 'inner-movies';
      for (const id of ['inner-movies', 'inner-arcade', 'inntify']) {
        if (!merged.pinned.includes(id)) merged.pinned.push(id);
      }
      // Same rename in desktopIcons for users that pinned the old icon.
      if (Array.isArray(merged.desktopIcons)) {
        for (const it of merged.desktopIcons) {
          if (it.appId === 'inner-stream') it.appId = 'inner-movies';
        }
      }
      return merged;
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }
  function saveState() {
    try {
      // Persist everything except transient `locked`
      const { locked, ...rest } = state;
      localStorage.setItem(STORE_KEY, JSON.stringify(rest));
    } catch {}
  }
  function setState(patch) {
    Object.assign(state, patch);
    saveState();
    applyTheme();
    applyWallpaper();
    renderDockPinned();
    renderStartMenu();
    renderDesktopIcons();
    renderClock();
    for (const fn of listeners) fn(state);
  }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // ---- Theme + wallpaper ----
  function applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', state.theme);
    root.style.setProperty('--accent', state.accent);
    root.style.setProperty('--accent-2', state.accent2);
  }

  async function applyWallpaper() {
    const img = document.getElementById('wallpaper');
    const vid = document.getElementById('wallpaper-video');
    if (!img || !vid) return;

    const wp = state.wallpaper || { kind: 'preset', value: 'aurora' };

    // Reset video element
    if (vid.src) { try { URL.revokeObjectURL(vid.src); } catch {} }
    vid.removeAttribute('src');
    vid.load();
    vid.classList.remove('is-on');

    // Reset background image
    img.style.backgroundImage = '';

    if (wp.kind === 'preset') {
      const def = PRESET_WALLPAPERS[wp.value] || PRESET_WALLPAPERS.rainDusk;
      img.style.backgroundImage = def.css;
      return;
    }
    if (wp.kind === 'url') {
      // Pasted URL (image/gif/video). Best-effort: detect video by extension.
      const u = String(wp.value || '');
      if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) {
        vid.src = u;
        vid.classList.add('is-on');
        vid.play().catch(() => {});
      } else {
        img.style.backgroundImage = `url("${u}")`;
      }
      return;
    }
    if (wp.kind === 'server') {
      // Server-shared wallpaper — stream directly
      const meta = wp.meta || {};
      const url = `/api/wallpapers/${encodeURIComponent(wp.value)}/file`;
      if (meta.kind === 'video' || /^video\//.test(meta.mime || '')) {
        vid.src = url;
        vid.classList.add('is-on');
        vid.play().catch(() => {});
      } else {
        img.style.backgroundImage = `url("${url}")`;
      }
      return;
    }
    if (!window.WPStore) return;
    try {
      const rec = await window.WPStore.get(wp.value);
      if (!rec) { img.style.backgroundImage = PRESET_WALLPAPERS.rainDusk.css; return; }
      if (wp.kind === 'video') {
        vid.src = URL.createObjectURL(rec.blob);
        vid.classList.add('is-on');
        vid.play().catch(() => {});
      } else {
        const url = URL.createObjectURL(rec.blob);
        img.style.backgroundImage = `url("${url}")`;
      }
    } catch (e) {
      console.error('wallpaper load failed', e);
      img.style.backgroundImage = PRESET_WALLPAPERS.rainDusk.css;
    }
  }

  // ---- Lockscreen ----
  function pad2(n) { return String(n).padStart(2, '0'); }
  function updateLockText() {
    const d = new Date();
    const day = d.toLocaleDateString([], { weekday: 'long' }).toUpperCase();
    const date = d.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() + '.';
    const time = `- ${pad2(d.getHours())}:${pad2(d.getMinutes())} -`;
    const dayEl = document.getElementById('lock-day');
    const dateEl = document.getElementById('lock-date');
    const timeEl = document.getElementById('lock-time');
    const osDayEl = document.getElementById('os-day');
    if (dayEl) dayEl.textContent = day;
    if (dateEl) dateEl.textContent = date;
    if (timeEl) timeEl.textContent = time;
    if (osDayEl) osDayEl.textContent = day;
  }
  function showLock() {
    state.locked = true;
    const lock = document.getElementById('lock');
    const desktop = document.getElementById('desktop');
    if (desktop) desktop.hidden = true;
    if (lock) {
      lock.hidden = false;
      lock.classList.remove('is-leaving');
    }
    updateLockText();
  }
  function unlock() {
    if (!state.locked) return;
    const lock = document.getElementById('lock');
    const desktop = document.getElementById('desktop');
    if (lock) {
      lock.classList.add('is-leaving');
      setTimeout(() => { lock.hidden = true; }, 380);
    }
    if (desktop) desktop.hidden = false;
    state.locked = false;
  }

  // ---- App registry ----
  const apps = Object.create(null);
  function registerApp(id, def) {
    apps[id] = { id, ...def };
    renderDockPinned();
    renderStartMenu();
    renderDesktopIcons();
  }
  function unregisterApp(id) {
    delete apps[id];
    const i = state.pinned.indexOf(id);
    if (i >= 0) { state.pinned.splice(i, 1); saveState(); }
    renderDockPinned();
    renderStartMenu();
    renderDesktopIcons();
  }

  // ---- Glyphs ----
  function applyGlyph(el, app) {
    el.innerHTML = '';
    el.style.background = '';
    if (app.glyphSVG) { el.innerHTML = app.glyphSVG; return; }
    if (app.glyphURL) {
      const img = document.createElement('img');
      img.src = app.glyphURL; img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { img.replaceWith(fallbackLetter(app.title)); };
      el.appendChild(img); return;
    }
    if (app.glyphText) { el.textContent = app.glyphText; return; }
    el.appendChild(fallbackLetter(app.title));
  }
  function fallbackLetter(title) {
    const s = document.createElement('span');
    s.textContent = (title || '?').trim().charAt(0).toUpperCase();
    return s;
  }

  // ---- Custom shortcuts (user-defined apps that open the Browser) ----
  function reloadShortcuts() {
    // unregister previous shortcuts
    for (const id of Object.keys(apps)) if (id.startsWith('sc:')) unregisterApp(id);
    const shortcuts = Array.isArray(state.shortcuts) ? state.shortcuts : [];
    for (const s of shortcuts) registerShortcutApp(s);
  }
  function registerShortcutApp(s) {
    const appId = 'sc:' + s.id;
    let glyphURL = null;
    if (s.iconBlobId && window.WPStore) {
      // resolve blob URL async; update in place
      window.WPStore.getURL(s.iconBlobId).then((u) => {
        if (u && apps[appId]) { apps[appId].glyphURL = u; renderDockPinned(); renderStartMenu(); }
      });
    } else if (s.iconURL) {
      // Hardcoded brand / user-supplied remote icon
      glyphURL = s.iconURL;
    } else if (s.url) {
      try {
        const host = new URL(s.url).hostname;
        glyphURL = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
      } catch {}
    }
    registerApp(appId, {
      title: s.name || 'Shortcut',
      glyphURL,
      singleInstance: false,
      defaultW: 1060, defaultH: 680,
      mount(root, api) {
        // open browser as a compact surface and navigate
        apps.browser?.mount?.(root, api);
        // prime the URL
        setTimeout(() => {
          const input = root.querySelector('.browser-url');
          if (input && s.url) {
            input.value = s.url;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }, 30);
      },
    });
  }
  function addShortcut({ name, url, iconBlobId = null, iconURL = null }) {
    const id = 'shc_' + Math.random().toString(36).slice(2, 9);
    const list = Array.isArray(state.shortcuts) ? state.shortcuts.slice() : [];
    list.push({ id, name, url, iconBlobId, iconURL });
    setState({ shortcuts: list });
    reloadShortcuts();
    return id;
  }
  function updateShortcut(id, patch) {
    const list = (state.shortcuts || []).map((s) => s.id === id ? { ...s, ...patch } : s);
    setState({ shortcuts: list });
    reloadShortcuts();
  }
  function removeShortcut(id) {
    const list = (state.shortcuts || []).filter((s) => s.id !== id);
    setState({ shortcuts: list });
    unregisterApp('sc:' + id);
  }

  // ---- Window manager ----
  const windows = [];
  let nextWinId = 1;
  let zTop = 100;

  function openApp(appId, opts = {}) {
    const app = apps[appId];
    if (!app) { console.warn('unknown app', appId); return; }
    if (app.singleInstance) {
      const existing = windows.find((w) => w.appId === appId);
      if (existing) {
        if (existing.isMin) restoreWindow(existing);
        focusWindow(existing);
        return existing;
      }
    }
    return createWindow(app, opts);
  }

  function createWindow(app, opts) {
    const tpl = document.getElementById('tpl-window');
    const el = tpl.content.firstElementChild.cloneNode(true);
    const id = nextWinId++;
    el.dataset.winId = String(id);
    el.querySelector('.win-name').textContent = app.title;
    const winIcon = el.querySelector('.win-icon');
    applyGlyph(winIcon, app);
    const body = el.querySelector('.win-body');
    const win = {
      id, appId: app.id, el, body,
      title: app.title,
      bounds: pickInitialBounds(app),
      isMin: false, isMax: false,
      onClose: null,
    };
    applyBounds(win);
    document.getElementById('windows').appendChild(el);

    const api = {
      window: win,
      setTitle(t) { win.title = t; el.querySelector('.win-name').textContent = t; renderDockPinned(); },
      close() { closeWindow(win); },
    };
    try {
      if (typeof app.mount === 'function') app.mount(body, api, opts);
    } catch (e) { console.error('app mount error', e); }

    bindWindowInteractions(win);
    focusWindow(win);
    windows.push(win);
    renderDockPinned();
    return win;
  }

  function pickInitialBounds(app) {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 60;
    const w = Math.min(app.defaultW || 900, vw - 80);
    const h = Math.min(app.defaultH || 560, vh - 80);
    const x = Math.round((vw - w) / 2 + (Math.random() * 40 - 20));
    const y = Math.round((vh - h) / 2 + (Math.random() * 40 - 20));
    return { x: Math.max(10, x), y: Math.max(40, y), w, h };
  }
  function applyBounds(win) {
    const { x, y, w, h } = win.bounds;
    win.el.style.left = x + 'px';
    win.el.style.top = y + 'px';
    win.el.style.width = w + 'px';
    win.el.style.height = h + 'px';
  }

  function focusWindow(win) {
    zTop += 1;
    win.el.style.zIndex = zTop;
    windows.forEach((w) => w.el.classList.toggle('is-active', w === win));
    renderDockPinned();
  }
  function closeWindow(win) {
    if (win.onClose) try { win.onClose(); } catch {}
    win.el.remove();
    const idx = windows.indexOf(win);
    if (idx >= 0) windows.splice(idx, 1);
    renderDockPinned();
  }
  function minimizeWindow(win) {
    win.isMin = true;
    win.el.classList.add('is-min');
    renderDockPinned();
  }
  function restoreWindow(win) {
    win.isMin = false;
    win.el.classList.remove('is-min');
    focusWindow(win);
  }
  function toggleMaxWindow(win) {
    if (win.isMax) {
      win.isMax = false;
      win.el.classList.remove('is-max');
      applyBounds(win);
    } else {
      win.prevBounds = { ...win.bounds };
      win.isMax = true;
      win.el.classList.add('is-max');
      Object.assign(win.el.style, { left: 0, top: 0, width: '100%', height: 'calc(100% - 60px)' });
    }
  }

  function bindWindowInteractions(win) {
    const { el } = win;
    el.addEventListener('mousedown', () => focusWindow(win));
    el.querySelector('.win-close').addEventListener('click', (e) => { e.stopPropagation(); closeWindow(win); });
    el.querySelector('.win-min').addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(win); });
    el.querySelector('.win-max').addEventListener('click', (e) => { e.stopPropagation(); toggleMaxWindow(win); });

    const titlebar = el.querySelector('.win-titlebar');
    // Apps that mount a full-bleed UI (InnerMovies, InnerArcade, Inntify)
    // cover the .win-titlebar. They mark their own header with
    // [data-drag-handle] so it acts as a drag region too — without this,
    // those windows can't be moved by the user.
    function startDrag(e) {
      if (e.target.closest('.win-actions, button, input, select, a, textarea, [data-no-drag]')) return;
      if (win.isMax) return;
      // Only primary mouse button.
      if (e.button !== undefined && e.button !== 0) return;
      const start = { x: e.clientX, y: e.clientY, bx: win.bounds.x, by: win.bounds.y };
      const move = (ev) => {
        win.bounds.x = Math.max(-40, start.bx + (ev.clientX - start.x));
        win.bounds.y = Math.max(0, start.by + (ev.clientY - start.y));
        applyBounds(win);
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.userSelect = '';
      };
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }
    titlebar.addEventListener('mousedown', startDrag);
    titlebar.addEventListener('dblclick', () => toggleMaxWindow(win));
    // Delegate to any element marked draggable inside the window body.
    el.addEventListener('mousedown', (e) => {
      if (!e.target.closest('[data-drag-handle]')) return;
      // Don't double-fire if the click was already on the standard titlebar.
      if (e.target.closest('.win-titlebar')) return;
      startDrag(e);
    });
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('[data-drag-handle]') && !e.target.closest('button, input, select')) {
        toggleMaxWindow(win);
      }
    });

    const handles = el.querySelectorAll('.win-resize');
    handles.forEach((h) => {
      h.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (win.isMax) return;
        const cls = h.className;
        const start = { x: e.clientX, y: e.clientY, ...win.bounds };
        const move = (ev) => {
          const dx = ev.clientX - start.x;
          const dy = ev.clientY - start.y;
          let { x, y, w, h: hh } = start;
          if (cls.includes('-e') || cls.includes('-ne') || cls.includes('-se')) w = Math.max(280, start.w + dx);
          if (cls.includes('-s') || cls.includes('-se') || cls.includes('-sw')) hh = Math.max(180, start.h + dy);
          if (cls.includes('-w') || cls.includes('-nw') || cls.includes('-sw')) { w = Math.max(280, start.w - dx); x = start.x + (start.w - w); }
          if (cls.includes('-n') || cls.includes('-ne') || cls.includes('-nw')) { hh = Math.max(180, start.h - dy); y = start.y + (start.h - hh); }
          win.bounds = { x, y, w, h: hh };
          applyBounds(win);
        };
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          document.body.style.userSelect = '';
        };
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });
    });
  }

  // ---- Dock ----
  function renderDockPinned() {
    const root = document.getElementById('dock-pinned');
    if (!root) return;
    const ids = new Set(state.pinned);
    for (const w of windows) ids.add(w.appId);
    const list = [...ids].filter((id) => apps[id]);
    root.innerHTML = '';
    for (const id of list) {
      const app = apps[id];
      const btn = document.createElement('button');
      btn.className = 'dock-app';
      btn.title = app.title;
      const glyph = document.createElement('span');
      glyph.className = 'dock-app-glyph';
      applyGlyph(glyph, app);
      btn.appendChild(glyph);
      const open = windows.filter((w) => w.appId === id);
      if (open.length) btn.classList.add('is-open');
      const topZ = Math.max(0, ...open.map((w) => parseInt(w.el.style.zIndex || 0, 10)));
      if (open.some((w) => parseInt(w.el.style.zIndex || 0, 10) === topZ && !w.isMin)) btn.classList.add('is-active');
      btn.addEventListener('click', () => {
        const openWins = windows.filter((w) => w.appId === id);
        if (openWins.length === 0) {
          openApp(id);
        } else {
          const top = openWins.reduce((a, b) => (parseInt(a.el.style.zIndex || 0, 10) > parseInt(b.el.style.zIndex || 0, 10) ? a : b));
          if (top.isMin) restoreWindow(top);
          else if (top.el.classList.contains('is-active')) minimizeWindow(top);
          else focusWindow(top);
        }
      });
      btn.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePinned(id); });
      root.appendChild(btn);
    }
  }
  function togglePinned(id) {
    const i = state.pinned.indexOf(id);
    if (i >= 0) state.pinned.splice(i, 1);
    else state.pinned.push(id);
    setState({ pinned: state.pinned });
  }

  // ---- Start menu ----
  const startMenu = () => document.getElementById('start-menu');
  function toggleStart() { const sm = startMenu(); if (sm.hidden) openStart(); else closeStart(); }
  function openStart() {
    const sm = startMenu();
    sm.hidden = false;
    document.getElementById('desktop').classList.add('blurred');
    document.getElementById('start-search').focus();
    renderStartMenu();
  }
  function closeStart() {
    const sm = startMenu();
    sm.hidden = true;
    document.getElementById('desktop').classList.remove('blurred');
    const s = document.getElementById('start-search'); if (s) s.value = '';
  }
  function renderStartMenu() {
    const pinnedRoot = document.getElementById('start-pinned');
    const allRoot = document.getElementById('start-all');
    if (!pinnedRoot || !allRoot) return;
    const search = (document.getElementById('start-search')?.value || '').toLowerCase().trim();
    const all = Object.values(apps).filter((a) => !search || a.title.toLowerCase().includes(search));
    const pinned = state.pinned.map((id) => apps[id]).filter(Boolean);
    pinnedRoot.innerHTML = '';
    for (const a of pinned) pinnedRoot.appendChild(renderStartApp(a));
    allRoot.innerHTML = '';
    for (const a of all) allRoot.appendChild(renderStartApp(a));
  }
  function renderStartApp(app) {
    const btn = document.createElement('button');
    btn.className = 'start-app';
    btn.title = app.title;
    const g = document.createElement('span');
    g.className = 'glyph';
    applyGlyph(g, app);
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = app.title;
    btn.append(g, l);
    btn.addEventListener('click', () => { openApp(app.id); closeStart(); });
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePinned(app.id); });
    return btn;
  }

  // ---- Desktop icons ----
  const GRID = 8; // snap step, px
  function _findDesktopIcon(appId) {
    return (state.desktopIcons || []).find((i) => i.appId === appId) || null;
  }
  function _hasDesktopIcon(appId) { return !!_findDesktopIcon(appId); }
  function _nextIconSlot() {
    const used = new Set((state.desktopIcons || []).map((i) => `${i.x},${i.y}`));
    const topPad = 88;
    const leftPad = 24;
    const stepX = 112;
    const stepY = 112;
    const cols = 6;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 10; r++) {
        const x = leftPad + c * stepX;
        const y = topPad + r * stepY;
        if (!used.has(`${x},${y}`)) return { x, y };
      }
    }
    return { x: leftPad, y: topPad };
  }
  function addDesktopIcon(appId) {
    if (!apps[appId]) return null;
    if (_hasDesktopIcon(appId)) return _findDesktopIcon(appId);
    const { x, y } = _nextIconSlot();
    const icon = { id: 'di_' + Math.random().toString(36).slice(2, 9), appId, x, y };
    const list = [...(state.desktopIcons || []), icon];
    setState({ desktopIcons: list });
    return icon;
  }
  function removeDesktopIcon(appId) {
    const list = (state.desktopIcons || []).filter((i) => i.appId !== appId);
    setState({ desktopIcons: list });
  }
  function moveDesktopIcon(id, x, y) {
    const list = (state.desktopIcons || []).map((i) => i.id === id ? { ...i, x, y } : i);
    // write directly and re-render only the affected element to avoid a full setState flush each drag tick
    state.desktopIcons = list;
    const el = document.querySelector(`.di-tile[data-icon-id="${id}"]`);
    if (el) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
  }
  function _persistDesktopIcons() {
    saveState();
  }

  function renderDesktopIcons() {
    const root = document.getElementById('desktop-icons');
    if (!root) return;
    root.innerHTML = '';
    for (const it of state.desktopIcons || []) {
      const app = apps[it.appId];
      if (!app) continue; // skip unknown apps (e.g. shortcut that was removed)
      const el = document.createElement('button');
      el.className = 'di-tile';
      el.type = 'button';
      el.dataset.iconId = it.id;
      el.dataset.appId = it.appId;
      el.style.left = it.x + 'px';
      el.style.top = it.y + 'px';
      el.title = app.title;
      const glyph = document.createElement('span');
      glyph.className = 'di-glyph';
      applyGlyph(glyph, app);
      const label = document.createElement('span');
      label.className = 'di-label';
      label.textContent = app.title;
      el.append(glyph, label);
      bindDesktopIcon(el, it);
      root.appendChild(el);
    }
  }

  function bindDesktopIcon(el, it) {
    let dragState = null;
    const DRAG_THRESHOLD = 4;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      // clear selection on peers
      document.querySelectorAll('.di-tile.is-sel').forEach((n) => n.classList.remove('is-sel'));
      el.classList.add('is-sel');

      const startX = e.clientX, startY = e.clientY;
      const baseX = it.x, baseY = it.y;
      let moved = false;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        moved = true;
        el.classList.add('is-drag');
        const vw = window.innerWidth - 80;
        const vh = window.innerHeight - 140;
        const nx = Math.max(0, Math.min(vw, Math.round((baseX + dx) / GRID) * GRID));
        const ny = Math.max(60, Math.min(vh, Math.round((baseY + dy) / GRID) * GRID));
        it.x = nx; it.y = ny;
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        el.classList.remove('is-drag');
        if (moved) {
          moveDesktopIcon(it.id, it.x, it.y);
          _persistDesktopIcons();
        }
      };
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    el.addEventListener('dblclick', () => openApp(it.appId));

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Open', onClick: () => openApp(it.appId) },
        { label: (state.pinned.includes(it.appId) ? 'Unpin from dock' : 'Pin to dock'),
          onClick: () => togglePinned(it.appId) },
        { label: 'Remove from desktop', onClick: () => removeDesktopIcon(it.appId), danger: true },
      ]);
    });
  }

  // Empty-desktop context menu
  function bindDesktopEmptySpace() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    desktop.addEventListener('contextmenu', (e) => {
      // only when clicking on the raw desktop / icon-layer background
      const t = e.target;
      if (t.closest('.di-tile')) return;
      if (t.closest('#dock')) return;
      if (t.closest('#widget-rail')) return;
      if (t.closest('#side-rail')) return;
      if (t.closest('.win')) return;
      if (t.closest('#start-menu')) return;
      e.preventDefault();
      // Build a submenu of apps not already on the desktop
      const candidates = Object.values(apps).filter((a) => !_hasDesktopIcon(a.id));
      const items = candidates.slice(0, 14).map((a) => ({
        label: 'Add ' + a.title,
        onClick: () => addDesktopIcon(a.id),
      }));
      if (!items.length) items.push({ label: '— no apps to add —', disabled: true });
      items.unshift({ label: 'Refresh icons', onClick: renderDesktopIcons });
      items.push({ separator: true });
      items.push({ label: 'Open Settings', onClick: () => openApp('settings') });
      showContextMenu(e.clientX, e.clientY, items);
    });
    // click-to-deselect icons
    desktop.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.di-tile')) {
        document.querySelectorAll('.di-tile.is-sel').forEach((n) => n.classList.remove('is-sel'));
      }
    });
  }

  // ---- Context menu ----
  function showContextMenu(x, y, items) {
    const el = document.getElementById('ctx-menu');
    if (!el) return;
    el.innerHTML = '';
    for (const it of items) {
      if (it.separator) {
        const s = document.createElement('div');
        s.className = 'ctx-sep';
        el.appendChild(s);
        continue;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ctx-item' + (it.danger ? ' danger' : '');
      b.textContent = it.label;
      if (it.disabled) b.disabled = true;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        try { it.onClick && it.onClick(); } catch (err) { console.error(err); }
      });
      el.appendChild(b);
    }
    el.hidden = false;
    // clamp to viewport
    const w = Math.min(260, window.innerWidth - 16);
    el.style.left = Math.max(4, Math.min(x, window.innerWidth - w - 4)) + 'px';
    el.style.top = Math.max(4, Math.min(y, window.innerHeight - 8 - el.offsetHeight)) + 'px';
    // Defer close binding until after the triggering click bubbles out
    setTimeout(() => {
      const onDoc = (ev) => {
        if (!ev.target.closest('#ctx-menu')) hideContextMenu();
      };
      const onKey = (ev) => { if (ev.key === 'Escape') hideContextMenu(); };
      document.addEventListener('mousedown', onDoc, { once: true });
      document.addEventListener('keydown', onKey, { once: true });
    }, 0);
  }
  function hideContextMenu() {
    const el = document.getElementById('ctx-menu');
    if (el) { el.hidden = true; el.innerHTML = ''; }
  }

  // ---- Clock ----
  function renderClock() {
    const el = document.getElementById('dock-clock');
    if (!el) return;
    const d = new Date();
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dd = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    el.innerHTML = `<span class="t">${t}</span><span class="d">${dd}</span>`;
  }

  // ---- Performance mode ----
  // Cheap school Chromebooks (2GB RAM, dual-core Celeron) can't afford
  // backdrop-filter blurs on every window + the looping splash glow
  // animation + 6-layer text-shadows on neon letters. Detect them and
  // strip the expensive effects via a CSS hook on <html>.
  // Three modes:
  //   'auto' (default) — sniff the device, pick lite or rich
  //   'lite'           — force lite (user override)
  //   'rich'           — force rich (user override)
  function detectPerfMode() {
    const setting = state.perfMode || 'auto';
    if (setting === 'lite' || setting === 'rich') return setting;
    const memory = navigator.deviceMemory || 8;       // Chromium only
    const cores = navigator.hardwareConcurrency || 8;
    const isCrOS = /CrOS/i.test(navigator.userAgent);
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (isCrOS || memory <= 2 || cores <= 2 || reduced) return 'lite';
    return 'rich';
  }
  function applyPerfMode() {
    const mode = detectPerfMode();
    document.documentElement.dataset.perf = mode;
    return mode;
  }
  function setPerfMode(mode) {
    if (!['auto', 'lite', 'rich'].includes(mode)) return;
    setState({ perfMode: mode });
    applyPerfMode();
  }

  // ---- FPS ----
  let fpsRaf = 0;
  function startFps() {
    if (fpsRaf) return;
    // Skip the rAF loop entirely in lite mode — every frame of FPS
    // measurement is wasted CPU on an already-stretched device.
    if (document.documentElement.dataset.perf === 'lite') return;
    const el = document.querySelector('.fps .fps-n');
    let frames = 0, last = performance.now();
    const loop = (now) => {
      frames++;
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last));
        if (el) el.textContent = String(fps);
        frames = 0; last = now;
      }
      fpsRaf = requestAnimationFrame(loop);
    };
    fpsRaf = requestAnimationFrame(loop);
  }
  function setFpsVisible(v) {
    const el = document.getElementById('fps');
    if (el) el.style.display = v ? '' : 'none';
    state.fpsVisible = v;
    saveState();
  }

  // ---- Boot ----
  function boot() {
    applyPerfMode();
    applyTheme();
    applyWallpaper();
    setFpsVisible(state.fpsVisible !== false);
    startFps();

    // show lock first; desktop renders behind it hidden until unlock
    showLock();

    // Let the Windows-logo flash run at least one full cycle before fading out.
    setTimeout(() => {
      const b = document.getElementById('boot');
      if (!b) return;
      b.style.animation = 'fadeOut .4s var(--ease) forwards';
      setTimeout(() => b.remove(), 420);
    }, 1400);

    // Lockscreen dismissal
    const lockEl = document.getElementById('lock');
    lockEl.addEventListener('click', unlock);
    document.addEventListener('keydown', (e) => {
      if (state.locked && !['Shift','Control','Alt','Meta'].includes(e.key)) unlock();
      if (e.key === 'Escape' && !startMenu().hidden) closeStart();
    });

    // Dock buttons
    document.getElementById('start-btn').addEventListener('click', toggleStart);
    // 'grid-btn' was retired (the secondary "All apps" button next to Start —
    // its function fully overlapped with the Start button). Guard the lookup
    // so older HTML clones (or future re-additions) still work.
    document.getElementById('grid-btn')?.addEventListener('click', toggleStart);
    document.getElementById('dock-theme').addEventListener('click', () => {
      setState({ theme: state.theme === 'dark' ? 'light' : 'dark' });
    });
    document.getElementById('dock-settings').addEventListener('click', () => openApp('settings'));
    document.getElementById('dock-clock').addEventListener('click', () => openApp('settings', { tab: 'appearance' }));

    // Widget cards
    document.querySelectorAll('#widget-rail .widget-card').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.widget;
        if (id === 'resume') openApp('browser');
        else if (id === 'quick') openApp('settings', { tab: 'appearance' });
        else if (id === 'status') openApp('about');
      });
    });
    document.querySelectorAll('#side-rail .srail-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.side;
        if (id === 'palette') openApp('settings', { tab: 'appearance' });
        if (id === 'notes') openApp('files');
      });
    });

    // Start search + outside click to close
    document.getElementById('start-search').addEventListener('input', renderStartMenu);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#start-menu') || e.target.closest('#start-btn') || e.target.closest('#grid-btn')) return;
      if (!startMenu().hidden) closeStart();
    });
    document.getElementById('start-menu').addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      if (t.dataset.action === 'about') { openApp('about'); closeStart(); }
      if (t.dataset.action === 'lock') { closeStart(); showLock(); }
    });

    renderClock();
    setInterval(() => { renderClock(); updateLockText(); }, 20 * 1000);
    updateLockText();
    renderDockPinned();
    renderStartMenu();
    renderDesktopIcons();
    bindDesktopEmptySpace();
  }

  // ---- Proxy engine selection ----
  // Two engines are available: 'uv' (Ultraviolet, mature, default) and
  // 'scramjet' (experimental successor). The user can flip between them at
  // runtime via Settings → Proxy → Engine. This is the single source of
  // truth that the browser app, the SW dispatcher, and the wait-for-ready
  // helper all consult.
  //
  // We persist the choice to localStorage (not the IDB-backed app state)
  // because it needs to survive a hard reload AND be readable synchronously
  // when the browser app is mounting its first iframe.
  const PROXY_KEY = 'desktop.proxy.engine';
  const PROXY_ENGINES = {
    uv: {
      id: 'uv',
      label: 'Ultraviolet',
      // All four read at call time so we don't capture undefined globals
      // before the bundles have finished loading.
      config:    () => self.__uv$config || null,
      prefix:    () => (self.__uv$config && self.__uv$config.prefix) || '/service/',
      encodeUrl: (u) => self.__uv$config.encodeUrl(u),
      decodeUrl: (u) => self.__uv$config.decodeUrl(u),
      available: () => !!(self.__uv$config && self.__uv$config.encodeUrl),
    },
    scramjet: {
      id: 'scramjet',
      label: 'Scramjet',
      config:    () => self.__scramjet$config || null,
      prefix:    () => (self.__scramjet$config && self.__scramjet$config.prefix) || '/scram/',
      // Two impedance mismatches between scramjet's encoder and what we
      // want from this wrapper:
      //
      //   1) When called without a base URL, scramjet tries to derive
      //      one from `location.href` assuming the page is itself
      //      already proxied (e.g. served at /scram/<encoded>). On the
      //      Inner-OS page that's not the case, so it ends up calling
      //      `new URL("")` and throws "Failed to construct 'URL'".
      //      Fix: explicitly pass `new URL(u)` as the base. If `u` is
      //      already absolute (the only case we hit from navigateTab),
      //      this short-circuits cleanly.
      //
      //   2) Scramjet's encoder returns the FULL proxied URL,
      //      `https://<origin>/scram/<encoded>`. UV's encoder returns
      //      ONLY the encoded bit. The browser app prepends prefix()
      //      itself, expecting UV's contract — without this, the
      //      iframe src ends up doubled-up like
      //        /scram/https://inneros.dpdns.org/scram/<encoded>.
      //      Strip the origin+prefix here so both engines match.
      encodeUrl: (u) => {
        const enc = self.__scramjet$bundle.rewriters.url.encodeUrl(u, new URL(u));
        const expected = location.origin + (self.__scramjet$config?.prefix || '/scram/');
        return typeof enc === 'string' && enc.startsWith(expected) ? enc.slice(expected.length) : enc;
      },
      // Symmetric to encodeUrl: callers pass the encoded *suffix*
      // (everything after /scram/), but scramjet's own decodeUrl expects
      // a full origin-rooted URL so it can slice the prefix off itself.
      // Skip that and call the codec directly. Without this, the browser
      // app's URL bar displays the encoded blob instead of the readable
      // URL after every navigation.
      decodeUrl: (u) => {
        try { return self.__scramjet$config.codec.decode(u); }
        catch (_) { return u; }
      },
      available: () => !!(self.__scramjet$bundle && self.__scramjet$bundle.rewriters),
    },
  };
  function getEngineId() {
    try {
      const v = localStorage.getItem(PROXY_KEY);
      if (v && PROXY_ENGINES[v]) return v;
    } catch (_) {}
    return 'uv';
  }
  function setEngineId(id) {
    if (!PROXY_ENGINES[id]) return false;
    try { localStorage.setItem(PROXY_KEY, id); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('proxyenginechange', { detail: { id } })); } catch (_) {}
    return true;
  }

  // ---- Immersive ("game") fullscreen ----
  // For games + movies: moves a given iframe into a viewport-covering overlay
  // that hides EVERYTHING — dock, titlebar, app chrome — and intercepts Esc.
  // First Esc shows a toast for ~1.5s ("Press Esc again to exit"); second
  // Esc inside that window restores the iframe to its original parent.
  // Returns a cleanup function for programmatic exit. The overlay can hold
  // only one iframe at a time; calling this while one is active swaps it.
  function enterGameFullscreen(iframe, opts = {}) {
    const root = document.getElementById('game-fullscreen');
    if (!root || !iframe) return null;
    const content = root.querySelector('.game-fs-content');
    const toast = root.querySelector('.game-fs-toast');

    // If we were already in fullscreen with another iframe, exit cleanly first.
    if (root._exit) try { root._exit(); } catch {}

    // Remember where the iframe came from so we can restore it on exit.
    const placeholder = document.createComment('game-fs-placeholder');
    iframe.parentNode.insertBefore(placeholder, iframe);
    content.innerHTML = '';
    content.appendChild(iframe);

    // Add a visible "Exit" button — backup for users who don't know about
    // Esc, and the only reliable exit if the browser blocks fullscreen
    // re-entry on the first Esc.
    let exitBtn = root.querySelector('.game-fs-exit');
    if (!exitBtn) {
      exitBtn = document.createElement('button');
      exitBtn.className = 'game-fs-exit';
      exitBtn.title = 'Exit fullscreen';
      exitBtn.setAttribute('aria-label', 'Exit fullscreen');
      exitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      root.appendChild(exitBtn);
    }
    exitBtn.onclick = () => cleanup();

    root.hidden = false;
    showToast(`Press <kbd>Esc</kbd> twice to exit`, 2400);

    // ---- The bug: cross-origin iframes (vidking, gn-math) capture
    // keydown events when focused, so a document-level keydown listener
    // for Esc never fires once the user clicks into the game. The
    // browser's Fullscreen API IS reliable here — Esc always exits
    // browser fullscreen regardless of focus, and we get a
    // `fullscreenchange` event we can intercept.
    //
    // First Esc: browser exits FS → fullscreenchange fires → we
    // re-enter FS and arm the exit toast for 1.5s.
    // Second Esc within window: same path, but escArmed=true so we
    // actually clean up. After 1.5s with no second tap, the gesture
    // resets and the next Esc triggers the toast again.
    let escArmed = false;
    let escTimer = null;
    let userExited = false;
    let listening = false;

    function showToast(text, dur) {
      toast.innerHTML = text;
      toast.hidden = false;
      toast.classList.remove('is-flash');
      void toast.offsetWidth;
      toast.classList.add('is-flash');
      if (toast._t) clearTimeout(toast._t);
      toast._t = setTimeout(() => { toast.hidden = true; }, dur);
    }

    // Best-effort browser fullscreen — falls back to CSS-only overlay.
    const reqFS = () => {
      const fn = root.requestFullscreen
              || root.webkitRequestFullscreen
              || root.mozRequestFullScreen
              || root.msRequestFullscreen;
      if (!fn) return Promise.reject(new Error('fullscreen unsupported'));
      return fn.call(root).catch((e) => { throw e; });
    };
    const exitFS = () => {
      const fn = document.exitFullscreen
              || document.webkitExitFullscreen
              || document.mozCancelFullScreen
              || document.msExitFullscreen;
      if (fn && fsElement()) try { fn.call(document); } catch {}
    };
    const fsElement = () => document.fullscreenElement
                         || document.webkitFullscreenElement
                         || document.mozFullScreenElement
                         || document.msFullscreenElement
                         || null;

    reqFS().catch(() => { /* CSS overlay still covers everything */ });

    function onFullscreenChange() {
      if (fsElement() === root) return; // entering — ignore
      // Exited fullscreen.
      if (userExited) return;
      if (escArmed) {
        // Second Esc inside window — actually exit.
        cleanup();
        return;
      }
      // First Esc — arm and re-enter.
      escArmed = true;
      showToast(`Press <kbd>Esc</kbd> again to exit`, 1500);
      if (escTimer) clearTimeout(escTimer);
      escTimer = setTimeout(() => { escArmed = false; }, 1500);
      reqFS().catch(() => {
        // Re-entry was denied (browser policy or user interrupted) —
        // honor the exit instead of trapping the user. This also
        // handles the case where browser FS was never granted in the
        // first place.
        cleanup();
      });
    }

    // Belt-and-suspenders: also listen for keydown when the parent
    // document has focus (e.g. user hasn't clicked into the iframe yet).
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (escArmed) cleanup();
      else {
        escArmed = true;
        showToast(`Press <kbd>Esc</kbd> again to exit`, 1500);
        if (escTimer) clearTimeout(escTimer);
        escTimer = setTimeout(() => { escArmed = false; }, 1500);
      }
    }

    function cleanup() {
      if (userExited) return;
      userExited = true;
      if (escTimer) clearTimeout(escTimer);
      if (toast._t) clearTimeout(toast._t);
      if (listening) {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('keydown', onKey, true);
        listening = false;
      }
      toast.hidden = true;
      exitFS();
      try { placeholder.parentNode.replaceChild(iframe, placeholder); }
      catch { /* iframe already detached */ }
      root.hidden = true;
      root._exit = null;
      try { opts.onExit?.(); } catch {}
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKey, true);
    listening = true;
    root._exit = cleanup;
    return cleanup;
  }

  // ---- Expose ----
  window.DesktopOS = {
    state, setState, subscribe,
    apps, registerApp, unregisterApp,
    openApp, closeWindow, focusWindow,
    PRESET_WALLPAPERS, ACCENT_SWATCHES,
    togglePinned,
    showLock, unlock,
    setFpsVisible,
    setPerfMode,
    getPerfMode: () => document.documentElement.dataset.perf || 'rich',
    applyWallpaper,
    addShortcut, updateShortcut, removeShortcut, reloadShortcuts,
    addDesktopIcon, removeDesktopIcon, moveDesktopIcon, hasDesktopIcon: _hasDesktopIcon,
    showContextMenu, hideContextMenu,
    enterGameFullscreen,
    proxy: {
      engines: PROXY_ENGINES,
      engineFor: (id) => PROXY_ENGINES[id] || PROXY_ENGINES.uv,
      getEngine: getEngineId,
      setEngine: setEngineId,
      list: () => Object.values(PROXY_ENGINES).map((e) => ({ id: e.id, label: e.label, available: e.available() })),
    },
  };
  // Shorter alias used by apps.js
  window.OS = window.DesktopOS;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
