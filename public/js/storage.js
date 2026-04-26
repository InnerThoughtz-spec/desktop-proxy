// storage.js — tiny IndexedDB wrapper for wallpaper blobs.
// Exposes window.WPStore with: put(blob) -> id, get(id) -> blob, list() -> [{id, kind, mime, size, created}], delete(id)
(function () {
  'use strict';

  const DB = 'desktop-os';
  const STORE = 'wallpapers';
  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('created', 'created');
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
    });
  }

  function kindFromMime(mime) {
    if (!mime) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'image/gif') return 'gif';
    if (mime.startsWith('image/')) return 'image';
    return 'image';
  }

  async function put(blob, meta = {}) {
    const db = await openDB();
    const id = 'wp_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const kind = kindFromMime(blob.type);
    const rec = {
      id,
      kind,
      mime: blob.type || 'application/octet-stream',
      size: blob.size,
      created: Date.now(),
      name: meta.name || null,
      blob,
    };
    await tx(db, 'readwrite', (s) => s.put(rec));
    return id;
  }

  async function get(id) {
    const db = await openDB();
    return txGet(db, 'readonly', (s) => s.get(id));
  }

  async function list() {
    const db = await openDB();
    const rows = await txGetAll(db, 'readonly');
    return rows
      .map(({ id, kind, mime, size, created, name }) => ({ id, kind, mime, size, created, name }))
      .sort((a, b) => b.created - a.created);
  }

  async function remove(id) {
    const db = await openDB();
    await tx(db, 'readwrite', (s) => s.delete(id));
  }

  // Helpers
  function tx(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
      fn(t.objectStore(STORE));
    });
  }
  function txGet(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function txGetAll(db, mode) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const r = t.objectStore(STORE).getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  // Cache of blob URLs so we don't re-create per render
  const urlCache = new Map();
  async function getURL(id) {
    if (urlCache.has(id)) return urlCache.get(id);
    const rec = await get(id);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    urlCache.set(id, url);
    return url;
  }
  function revokeURL(id) {
    const u = urlCache.get(id);
    if (u) { try { URL.revokeObjectURL(u); } catch {} ; urlCache.delete(id); }
  }

  window.WPStore = { put, get, getURL, revokeURL, list, remove };
})();

// ---------------------------------------------------------------
// Virtual filesystem — IndexedDB-backed, hierarchical.
// Exposes window.FS.
//   Root is the special id '/'. Every node has { id, parentId, name, kind }.
//   kind === 'folder' | 'file'
//   files additionally have { mime, size, blob }
// ---------------------------------------------------------------
(function () {
  'use strict';
  const DB = 'desktop-os-fs';
  const STORE = 'nodes';
  const ROOT_ID = '/';
  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('parentId', 'parentId');
        }
      };
      req.onsuccess = () => {
        _db = req.result;
        // seed default folders on first open
        ensureRoot().then(() => resolve(_db), reject);
      };
    });
  }

  function tx(mode) {
    return _db.transaction(STORE, mode).objectStore(STORE);
  }
  function reqP(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function ensureRoot() {
    const root = await reqP(_db.transaction(STORE, 'readonly').objectStore(STORE).get(ROOT_ID));
    if (root) return;
    const now = Date.now();
    const nodes = [
      { id: ROOT_ID, parentId: null, name: 'root', kind: 'folder', created: now, modified: now },
      { id: 'fld_documents', parentId: ROOT_ID, name: 'Documents', kind: 'folder', created: now, modified: now },
      { id: 'fld_downloads', parentId: ROOT_ID, name: 'Downloads', kind: 'folder', created: now, modified: now },
      { id: 'fld_pictures',  parentId: ROOT_ID, name: 'Pictures',  kind: 'folder', created: now, modified: now },
      { id: 'fld_music',     parentId: ROOT_ID, name: 'Music',     kind: 'folder', created: now, modified: now },
      { id: 'fld_videos',    parentId: ROOT_ID, name: 'Videos',    kind: 'folder', created: now, modified: now },
    ];
    const welcome = new Blob(
      [`Welcome to your Desktop Files app.

- Right-click anywhere in the list for actions.
- Drag files from your computer into this window to upload.
- Click a folder to enter. Use the breadcrumbs to go up.
- Pin folders as desktop shortcuts from Settings → Desktop.

This filesystem lives in your browser (IndexedDB). It's private to this device.
`],
      { type: 'text/plain' }
    );
    nodes.push({
      id: 'welcome_txt', parentId: 'fld_documents',
      name: 'Welcome.txt', kind: 'file',
      mime: 'text/plain', size: welcome.size,
      blob: welcome,
      created: now, modified: now,
    });
    const db = _db;
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const s = t.objectStore(STORE);
      for (const n of nodes) s.put(n);
      t.oncomplete = resolve; t.onerror = () => reject(t.error);
    });
  }

  function genId(prefix = 'n') {
    return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  async function list(parentId = ROOT_ID) {
    await openDB();
    const index = _db.transaction(STORE, 'readonly').objectStore(STORE).index('parentId');
    const rows = await reqP(index.getAll(parentId));
    return rows
      .map((r) => ({ ...r, hasBlob: !!r.blob }))
      .map(({ blob, ...r }) => r)
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1));
  }
  async function getNode(id) {
    await openDB();
    return reqP(_db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
  }
  async function pathOf(id) {
    await openDB();
    const chain = [];
    let cur = await getNode(id);
    while (cur) {
      chain.unshift(cur);
      if (!cur.parentId) break;
      cur = await getNode(cur.parentId);
    }
    return chain;
  }
  async function createFolder(parentId, name) {
    await openDB();
    const id = genId('fld');
    const now = Date.now();
    const node = { id, parentId, name: (name || 'New folder').slice(0, 120), kind: 'folder', created: now, modified: now };
    await reqP(_db.transaction(STORE, 'readwrite').objectStore(STORE).put(node));
    return node;
  }
  async function createFile(parentId, file) {
    await openDB();
    const id = genId('fil');
    const now = Date.now();
    const node = {
      id, parentId,
      name: file.name || 'untitled',
      kind: 'file',
      mime: file.type || 'application/octet-stream',
      size: file.size,
      blob: file,
      created: now, modified: now,
    };
    await reqP(_db.transaction(STORE, 'readwrite').objectStore(STORE).put(node));
    return { ...node, hasBlob: true, blob: undefined };
  }
  async function rename(id, name) {
    await openDB();
    const s = _db.transaction(STORE, 'readwrite').objectStore(STORE);
    const n = await reqP(s.get(id));
    if (!n) return null;
    n.name = String(name).slice(0, 120);
    n.modified = Date.now();
    await reqP(s.put(n));
    return n;
  }
  async function move(id, newParentId) {
    await openDB();
    const s = _db.transaction(STORE, 'readwrite').objectStore(STORE);
    const n = await reqP(s.get(id));
    if (!n) return null;
    // prevent moving a folder into itself or descendants
    if (n.kind === 'folder') {
      let cur = await reqP(s.get(newParentId));
      while (cur && cur.id !== ROOT_ID) {
        if (cur.id === n.id) throw new Error('cannot move a folder into itself');
        cur = cur.parentId ? await reqP(s.get(cur.parentId)) : null;
      }
    }
    n.parentId = newParentId;
    n.modified = Date.now();
    await reqP(s.put(n));
    return n;
  }
  async function remove(id) {
    await openDB();
    const s = _db.transaction(STORE, 'readwrite').objectStore(STORE);
    const n = await reqP(s.get(id));
    if (!n) return;
    if (n.kind === 'folder') {
      // recursive delete
      const index = _db.transaction(STORE, 'readonly').objectStore(STORE).index('parentId');
      const children = await reqP(index.getAll(id));
      for (const c of children) await remove(c.id);
    }
    await reqP(_db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  }
  async function readBlob(id) {
    await openDB();
    const n = await reqP(_db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
    return n?.blob || null;
  }

  // Keep a blob-URL cache so preview reuse is cheap
  const urlCache = new Map();
  async function urlOf(id) {
    if (urlCache.has(id)) return urlCache.get(id);
    const b = await readBlob(id);
    if (!b) return null;
    const u = URL.createObjectURL(b);
    urlCache.set(id, u);
    return u;
  }
  function revokeUrl(id) {
    const u = urlCache.get(id);
    if (u) { try { URL.revokeObjectURL(u); } catch {} urlCache.delete(id); }
  }

  window.FS = {
    ROOT_ID,
    list, get: getNode, pathOf,
    createFolder, createFile,
    rename, move, remove,
    readBlob, urlOf, revokeUrl,
  };
})();
