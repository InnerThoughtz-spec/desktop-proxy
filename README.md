# Desktop Proxy

A desktop-OS-in-the-browser with a built-in Ultraviolet web proxy. Think "Cine-OS" vibe — a
lockscreen, a centered glass dock, a right-hand widget rail, a draggable/resizable window
manager, and a customizable wallpaper system (images, GIFs, videos — local or server-shared).

## Features

- **Lockscreen** — giant day-of-week, date, time. Click or press any key to unlock.
- **Centered pill dock** — built-in apps (Browser, Settings, Files, About) plus any shortcuts
  you pin. Right-click a dock icon to toggle pin.
- **Widget rail** — Jump Back In / Quick Play / System Status cards on the right.
- **Window manager** — drag, double-click-to-maximize, 8-way resize, minimize/restore from dock.
- **Web proxy (Ultraviolet)** — the Browser app routes through Ultraviolet with a
  `@tomphttp/bare-server-node` backend.
- **Wallpapers**
  - 12 built-in nature/rain gradient presets.
  - Upload local files (stored in IndexedDB — images, GIFs, videos).
  - Paste any image/video URL.
  - **Shared server library** — upload once, everyone who visits your deployment sees it.
- **Shortcuts**
  - Quick-add 18 hardcoded brand presets (Netflix, Spotify, YouTube, Discord, PlayStation,
    GeForce NOW, GitHub, Google, Wikipedia, Drive, Twitch, Reddit, X, Instagram, Gmail,
    WhatsApp, TikTok, Steam). Icons fetched from `cdn.simpleicons.org` — no trademarked
    vectors bundled.
  - Custom shortcuts with your own uploaded PNG/SVG icon.
- **FPS counter** — toggle in Settings → Appearance.

## Running locally

```bash
npm install
npm start
# open http://localhost:8080
```

Node 18+ required.

Environment variables:
- `PORT` — default `8080`.
- `DATA_DIR` — where shared wallpapers are stored. Default: `./data/`.
- `MAX_UPLOAD_BYTES` — per-file cap for shared wallpaper uploads. Default: `50 * 1024 * 1024`.

## Deploying

The bare server needs **WebSocket upgrades**, so pick a host that supports them out of the box.

### Docker (one command)

```bash
docker compose up -d
# open http://localhost:8080
```

A `Dockerfile`, `docker-compose.yml`, and `.dockerignore` are included. The compose file
uses a named volume `wallpapers` for `/app/data` — swap to `./data:/app/data` for a host
bind mount. The image is multi-stage, runs as non-root, uses tini for signal handling, and
ships a `/healthz` healthcheck.

To build / push by hand:

```bash
docker build -t YOUR_USER/desktop-proxy:latest .
docker run --rm -p 8080:8080 -v desktop-proxy-data:/app/data YOUR_USER/desktop-proxy:latest
```

### Render / Railway / Fly.io / Heroku

- Start command: `node server.js`
- Port: `$PORT` (the app reads `process.env.PORT`)
- Persist a volume at `DATA_DIR` if you want the shared wallpaper library to survive
  restarts.

A `Procfile` is included for Heroku-style platforms. Fly.io users can `fly launch` and
accept the auto-detected Node + Dockerfile defaults, then `fly volumes create wallpapers
--size 1` and mount it at `/app/data`.

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port. |
| `DATA_DIR` | `./data` | Where shared wallpapers and the manifest live. |
| `MAX_UPLOAD_BYTES` | `52428800` (50 MB) | Per-file cap for shared wallpaper uploads. |
| `BARE_MAX_CONN_PER_IP` | `2000` | Bare-server keep-alive rate-limit budget. |

## API (shared wallpapers)

- `GET /api/wallpapers` → `{ items: [...] }`
- `GET /api/wallpapers/:id/file` → streams the file with immutable cache headers
- `POST /api/wallpapers` — raw body upload. Headers:
  - `Content-Type: image/png|jpeg|gif|webp|avif | video/mp4|webm|quicktime`
  - `x-filename` *(optional)* — display name, URI-encoded
  - `x-upload-by` *(optional)* — freeform credit string
- `DELETE /api/wallpapers/:id`

## Project layout

```
server.js                   # Express + bare-server-node + wallpaper API
public/
  index.html                # Shell (lockscreen, desktop, start menu, window template)
  uv.config.js              # Ultraviolet config served at /uv/uv.config.js
  sw.js                     # Service worker registering UV handlers
  css/main.css              # Glass theme + layout
  js/
    storage.js              # IndexedDB wrapper for local wallpaper/icon blobs
    core.js                 # State, lockscreen, window manager, dock, FPS, shortcuts
    apps.js                 # Browser, Settings (Appearance/Wallpaper/Shortcuts/Desktop/Proxy/About),
                            # Files, About; brand-preset list & simpleicons URL builder
data/
  wallpapers/               # Uploaded shared wallpapers (created at runtime)
  wallpapers.json           # Manifest for shared wallpapers
```

## Notes on brand icons

Brand logos (Netflix red N, Spotify green, etc.) are **not** bundled as SVG files — the
Shortcuts tab generates URLs against `https://cdn.simpleicons.org/{slug}/{hex}` so that
trademarked vectors stay on the CDN. If you fork this and want offline/air-gapped use, swap
`brandIconURL()` in `public/js/apps.js` for a local resolver and drop the SVGs under
`public/icons/brands/` yourself.

## License

MIT for the shell code here. Ultraviolet and bare-server-node retain their own licenses;
brand marks and logos are the property of their respective owners.
