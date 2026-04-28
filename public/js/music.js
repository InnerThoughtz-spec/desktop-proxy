// music.js — global Inntify music player singleton.
//
// The audio element lives at body level (NOT inside the Inntify app's mount
// root) so playback continues when the user closes/minimizes the app. The
// Inntify app subscribes to state via subscribe() and renders its UI; the
// player itself is the source of truth.
//
// Subscribers self-clean: if their callback throws (e.g. because their root
// element was detached when its window closed), they're removed from the
// listener set automatically.
//
// Loaded BEFORE apps.js so the registry is ready when the app mounts.
(function () {
  'use strict';

  /** @type {HTMLAudioElement} */
  let audio = null;
  /** Tracks queued for sequential play. Each: { id, title, artist, cover, duration }. */
  let queue = [];
  /** Original (un-shuffled) order — kept so toggling shuffle off is reversible. */
  let baseQueue = [];
  let currentIdx = -1;
  /** 'off' | 'all' | 'one' */
  let repeat = 'off';
  let shuffle = false;
  /** localStorage key for persisting the user's volume across reloads. */
  const VOL_KEY = 'inntify.volume';
  const REPEAT_KEY = 'inntify.repeat';
  const SHUFFLE_KEY = 'inntify.shuffle';
  /** Subscribers receive a getState() snapshot whenever something changes. */
  const listeners = new Set();
  /** Lookup of in-flight track-load promises so a rapid-fire next/prev cancels cleanly. */
  let loadToken = 0;

  function getAudio() {
    if (audio) return audio;
    audio = document.getElementById('inner-tunes-audio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'inner-tunes-audio';
      audio.preload = 'metadata';
      document.body.appendChild(audio);
    }
    audio.addEventListener('ended', onEnded);
    // timeupdate fires ~4 times/sec; that's a lot of DOM work over the
    // life of a song on a slow Chromebook. Throttle progress emits to
    // ~2Hz in rich mode and ~1Hz in lite — visually we only need the
    // bar to advance every half-second or so. State-change events
    // (play/pause/loadedmetadata/ended) still emit immediately so the
    // play button glyph + duration update without lag.
    let lastTimeEmit = 0;
    audio.addEventListener('timeupdate', () => {
      const now = performance.now();
      const interval = document.documentElement.dataset.perf === 'lite' ? 950 : 480;
      if (now - lastTimeEmit < interval) return;
      lastTimeEmit = now;
      emit();
    });
    audio.addEventListener('play', emit);
    audio.addEventListener('pause', emit);
    audio.addEventListener('loadedmetadata', emit);
    audio.addEventListener('volumechange', () => {
      try { localStorage.setItem(VOL_KEY, String(audio.volume)); } catch {}
      emit();
    });
    audio.addEventListener('error', () => {
      console.warn('[Inntify] audio error', audio.error);
      emit();
    });
    // Restore persisted volume.
    try {
      const v = parseFloat(localStorage.getItem(VOL_KEY));
      if (!isNaN(v)) audio.volume = Math.max(0, Math.min(1, v));
    } catch {}
    try {
      const r = localStorage.getItem(REPEAT_KEY);
      if (['off', 'all', 'one'].includes(r)) repeat = r;
    } catch {}
    try { shuffle = localStorage.getItem(SHUFFLE_KEY) === '1'; } catch {}
    return audio;
  }

  /**
   * Fetches metadata from /api/music/track/:id (title, artist, cover,
   * duration) and points the <audio> element at /api/music/stream/:id so
   * the bytes flow through our origin — googlevideo's signed URLs don't
   * play directly in a third-party <audio> tag.
   * If a newer load() is fired before this resolves, the older one bails
   * (loadToken bookkeeping) so quick next-clicks don't overwrite each other.
   */
  let lastError = null;
  async function loadTrack(track) {
    if (!track || !track.id) return;
    const a = getAudio();
    const myToken = ++loadToken;
    lastError = null;
    a.removeAttribute('src');
    a.load();
    emit(); // show loading state immediately
    try {
      // Fetch metadata first so the now-playing UI can show title/artist/
      // cover/duration before the audio buffers in.
      const r = await fetch(`/api/music/track/${encodeURIComponent(track.id)}`);
      if (myToken !== loadToken) return; // user clicked something else
      if (!r.ok) {
        // Surface the server's JSON error if there is one.
        let detail = `HTTP ${r.status}`;
        try { const j = await r.json(); if (j.detail || j.error) detail = j.detail || j.error; } catch {}
        throw new Error(`metadata: ${detail}`);
      }
      const data = await r.json();
      if (myToken !== loadToken) return;
      track.title = data.title || track.title;
      track.artist = data.uploader || track.artist;
      track.cover = data.thumbnailUrl || track.cover;
      track.duration = data.duration || track.duration;
      // Point at the local stream proxy. The proxy forwards Range headers
      // so seeking works, refreshes the upstream URL on 403/410, and
      // adds the Origin/Referer that googlevideo requires.
      a.src = `/api/music/stream/${encodeURIComponent(track.id)}`;
      // If the audio element fails to load the stream URL, surface it.
      const onErr = () => {
        if (myToken !== loadToken) return;
        const code = a.error?.code;
        const msg = code === 4 ? 'audio format not supported by browser'
                  : code === 3 ? 'audio decode error'
                  : code === 2 ? 'network error fetching audio'
                  : 'audio failed to load';
        lastError = msg;
        console.warn('[Inntify] audio error:', msg, 'url:', a.src);
        emit();
        a.removeEventListener('error', onErr);
      };
      a.addEventListener('error', onErr);
      try { await a.play(); } catch (e) {
        // Autoplay may be blocked until first user gesture; expose state
        // anyway so the UI can show "click to play".
        console.warn('[Inntify] autoplay blocked', e.message);
      }
      emit();
    } catch (e) {
      if (myToken !== loadToken) return;
      lastError = e.message || String(e);
      console.error('[Inntify] loadTrack failed:', e);
      emit();
    }
  }

  function shuffleArray(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // ---- Public API ----

  function play(track) {
    if (track) {
      baseQueue = [track];
      queue = baseQueue.slice();
      currentIdx = 0;
      loadTrack(track);
    } else {
      const a = audio;
      if (a && a.paused) a.play().catch(() => {});
    }
  }

  /**
   * Replace the queue with a new list and start playing at startIdx. Honors
   * the current shuffle setting (the displayed queue is shuffled but
   * baseQueue keeps the original order).
   */
  function playQueue(tracks, startIdx = 0) {
    if (!Array.isArray(tracks) || !tracks.length) return;
    baseQueue = tracks.slice();
    if (shuffle) {
      const start = baseQueue[Math.max(0, Math.min(startIdx, baseQueue.length - 1))];
      const rest = baseQueue.filter((t) => t !== start);
      queue = [start, ...shuffleArray(rest)];
      currentIdx = 0;
    } else {
      queue = baseQueue.slice();
      currentIdx = Math.max(0, Math.min(startIdx, queue.length - 1));
    }
    loadTrack(queue[currentIdx]);
  }

  function pause() { audio?.pause(); }
  function toggle() {
    const a = getAudio();
    if (!a.src) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }

  function next() {
    if (currentIdx < 0 || !queue.length) return;
    if (repeat === 'one') { loadTrack(queue[currentIdx]); return; }
    if (currentIdx + 1 < queue.length) {
      currentIdx++;
      loadTrack(queue[currentIdx]);
    } else if (repeat === 'all') {
      currentIdx = 0;
      loadTrack(queue[0]);
    } else {
      // End of queue with no repeat — stop.
      audio?.pause();
      emit();
    }
  }

  function prev() {
    if (currentIdx < 0) return;
    // If we're more than 3 seconds into the track, restart it instead of
    // skipping back — matches Spotify/YT Music behavior.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (currentIdx > 0) {
      currentIdx--;
      loadTrack(queue[currentIdx]);
    } else if (repeat === 'all') {
      currentIdx = queue.length - 1;
      loadTrack(queue[currentIdx]);
    }
  }

  function seek(seconds) {
    if (audio && isFinite(seconds)) {
      audio.currentTime = Math.max(0, Math.min(audio.duration || seconds, seconds));
      emit();
    }
  }

  function setVolume(v) {
    const a = getAudio();
    a.volume = Math.max(0, Math.min(1, v));
  }

  function setShuffle(b) {
    shuffle = !!b;
    try { localStorage.setItem(SHUFFLE_KEY, shuffle ? '1' : '0'); } catch {}
    if (currentIdx < 0) { emit(); return; }
    const current = queue[currentIdx];
    if (shuffle) {
      // Keep current track at index 0, shuffle the rest.
      const rest = baseQueue.filter((t) => t !== current);
      queue = [current, ...shuffleArray(rest)];
      currentIdx = 0;
    } else {
      // Restore base order, place currentIdx on the same track.
      queue = baseQueue.slice();
      currentIdx = Math.max(0, queue.indexOf(current));
    }
    emit();
  }

  function setRepeat(mode) {
    if (!['off', 'all', 'one'].includes(mode)) return;
    repeat = mode;
    try { localStorage.setItem(REPEAT_KEY, mode); } catch {}
    emit();
  }

  function cycleRepeat() {
    setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off');
  }

  /** Add a track to the end of the active queue (and base queue) without
   *  interrupting current playback. */
  function enqueue(track) {
    baseQueue.push(track);
    queue.push(track);
    emit();
  }

  function clearQueue() {
    queue = [];
    baseQueue = [];
    currentIdx = -1;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    emit();
  }

  function subscribe(fn) {
    listeners.add(fn);
    // Push the current state immediately so the new subscriber paints.
    try { fn(getState()); } catch (_) { listeners.delete(fn); }
    return () => listeners.delete(fn);
  }

  function getState() {
    const a = audio;
    return {
      track: currentIdx >= 0 ? queue[currentIdx] : null,
      queue,
      currentIdx,
      isPlaying: !!a && !a.paused && !a.ended && a.readyState > 0,
      isLoading: !!a && a.networkState === 2 /* LOADING */,
      time: a?.currentTime || 0,
      duration: (a?.duration && isFinite(a.duration)) ? a.duration : 0,
      volume: a?.volume ?? 1,
      muted: !!a?.muted,
      shuffle,
      repeat,
      error: lastError,
    };
  }

  function emit() {
    const s = getState();
    for (const fn of listeners) {
      try { fn(s); } catch (e) {
        // Subscriber's DOM is gone — auto-cleanup.
        listeners.delete(fn);
      }
    }
  }

  function onEnded() {
    if (repeat === 'one' && currentIdx >= 0) {
      const a = getAudio();
      a.currentTime = 0;
      a.play().catch(() => {});
    } else {
      next();
    }
  }

  // Best-effort Media Session metadata so OS-level media keys (Play/Pause,
  // Next/Prev) work and the browser can show a now-playing chip.
  function syncMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const t = currentIdx >= 0 ? queue[currentIdx] : null;
    if (!t) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title || '',
      artist: t.artist || '',
      album: t.album || '',
      artwork: t.cover ? [{ src: t.cover, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => toggle());
    navigator.mediaSession.setActionHandler('pause', () => toggle());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) seek(d.seekTime); });
    // Re-sync metadata on every state change so the track chip stays current.
    listeners.add(() => syncMediaSession());
  }

  window.MusicPlayer = {
    play, playQueue, pause, toggle, next, prev,
    seek, setVolume, setShuffle, setRepeat, cycleRepeat,
    enqueue, clearQueue, subscribe, getState,
  };
})();
