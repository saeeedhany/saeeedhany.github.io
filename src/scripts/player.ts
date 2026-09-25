import { CURRENT_KEY, nextRate, parseTrack, posKey, resumeFrom, sameTrack, type Track } from './audio-core';
import { shared } from './lifecycle';

export interface PlayerState {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  error: boolean;
  time: number;
  duration: number;
  rate: number;
}

/**
 * The one audio engine for the whole visit. It drives the single
 * `<audio data-audio>` element in Base.astro, which the router carries into
 * every new page (transition:persist) — so playback survives navigation.
 * Stored with `shared` so every script that imports this module reaches the
 * same instance. Never creates its own element: a second, detached <audio>
 * would keep playing invisibly and hide a broken persist.
 */
function create() {
  const audio = document.querySelector<HTMLAudioElement>('audio[data-audio]');
  if (!audio) throw new Error('player: <audio data-audio> missing from Base.astro');
  audio.preload = 'none';
  const listeners = new Set<(s: PlayerState) => void>();
  const s: PlayerState = { track: null, playing: false, loading: false, error: false, time: 0, duration: 0, rate: 1 };
  let pendingSeek = 0;
  let lastSave = 0;

  const store = {
    get: (k: string, session = false) => { try { return (session ? sessionStorage : localStorage).getItem(k); } catch { return null; } },
    set: (k: string, v: string, session = false) => { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch { /* ignore */ } },
    del: (k: string, session = false) => { try { (session ? sessionStorage : localStorage).removeItem(k); } catch { /* ignore */ } },
  };

  const emit = () => listeners.forEach((fn) => fn({ ...s }));
  const savePos = () => s.track && store.set(posKey(s.track.src), String(Math.floor(audio.currentTime || s.time)));

  function load(track: Track) {
    if (s.track) savePos();
    s.track = track;
    s.error = false;
    s.playing = false;
    s.duration = track.duration ?? 0;
    const saved = Number(store.get(posKey(track.src)) ?? '');
    pendingSeek = resumeFrom(Number.isFinite(saved) ? saved : undefined, track.duration);
    s.time = pendingSeek;
    audio.src = track.src;
    audio.playbackRate = s.rate;
    store.set(CURRENT_KEY, JSON.stringify(track), true);
    setMediaSession(track);
    emit();
  }

  function setMediaSession(track: Track) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Saeed Hany',
      artwork: [{ src: '/plates/optics-diagram.png', sizes: '1024x1024', type: 'image/png' }],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => void api.play());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('seekbackward', () => api.skip(-15));
    ms.setActionHandler('seekforward', () => api.skip(15));
    ms.setActionHandler('seekto', (d) => d.seekTime !== undefined && api.seek(d.seekTime));
  }

  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration)) s.duration = audio.duration;
    if (pendingSeek) {
      audio.currentTime = pendingSeek;
      pendingSeek = 0;
    }
    emit();
  });
  audio.addEventListener('waiting', () => { s.loading = true; emit(); });
  audio.addEventListener('playing', () => { s.loading = false; s.playing = true; emit(); });
  audio.addEventListener('pause', () => { s.playing = false; s.loading = false; savePos(); emit(); });
  audio.addEventListener('ended', () => {
    s.playing = false;
    if (s.track) store.del(posKey(s.track.src)); // finished: next time starts over
    emit();
  });
  audio.addEventListener('error', () => { s.error = true; s.loading = false; s.playing = false; emit(); });
  audio.addEventListener('timeupdate', () => {
    s.time = audio.currentTime;
    const now = performance.now();
    if (now - lastSave > 2000) { lastSave = now; savePos(); }
    emit();
  });
  addEventListener('pagehide', savePos);
  // views re-read state after a page swap (e.g. the mini bar re-checks
  // whether the new page is the playing track's own page)
  addEventListener('player:refresh', emit);

  const api = {
    async play(track?: Track) {
      if (track && !sameTrack(track, s.track)) load(track);
      if (!s.track) return;
      s.loading = true;
      s.error = false;
      emit();
      try {
        await audio.play();
      } catch (err) {
        s.loading = false;
        // NotAllowedError = autoplay blocked (e.g. after reload): stay paused, not an error
        if ((err as DOMException)?.name !== 'NotAllowedError' && (err as DOMException)?.name !== 'AbortError') s.error = true;
        emit();
      }
    },
    toggle(track?: Track) {
      if (track && !sameTrack(track, s.track)) return void api.play(track);
      if (audio.paused) void api.play();
      else audio.pause();
    },
    seek(sec: number) {
      const max = s.duration || audio.duration || sec;
      const t = Math.max(0, Math.min(max, sec));
      if (audio.readyState >= 1) audio.currentTime = t;
      else pendingSeek = t;
      s.time = t;
      emit();
    },
    skip(delta: number) {
      api.seek((audio.readyState >= 1 ? audio.currentTime : s.time) + delta);
    },
    cycleRate() {
      s.rate = nextRate(s.rate);
      audio.playbackRate = s.rate;
      emit();
    },
    stop() {
      savePos();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      s.track = null;
      s.playing = s.loading = s.error = false;
      store.del(CURRENT_KEY, true);
      emit();
    },
    element: audio,
    getState: (): PlayerState => ({ ...s }),
    subscribe(fn: (st: PlayerState) => void) {
      listeners.add(fn);
      fn({ ...s });
      return () => void listeners.delete(fn);
    },
  };

  // after a full reload: bring the last track back, paused at its position
  const restored = parseTrack(store.get(CURRENT_KEY, true));
  if (restored) load(restored);

  return api;
}

const player = shared('player', create);
export const { play, toggle, seek, skip, cycleRate, stop, getState, subscribe, element } = player;
