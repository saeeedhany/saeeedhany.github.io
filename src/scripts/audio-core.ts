/** Pure audio helpers. No DOM, no imports — unit-tested with `node --test`. */

export interface Track {
  src: string;
  title: string;
  href: string;
  lang: 'en' | 'ar';
  kind: 'post' | 'talk';
  duration?: number; // seconds
}

export const RATES = [1, 1.25, 1.5, 2] as const;

export function nextRate(r: number): number {
  const i = (RATES as readonly number[]).indexOf(r);
  return i < 0 ? 1 : RATES[(i + 1) % RATES.length];
}

/** "14:32" → 872, "1:02:05" → 3725. Anything else → undefined. */
export function parseDuration(s?: string): number | undefined {
  if (!s || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return undefined;
  return s.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const t = Math.floor(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export const posKey = (src: string) => `audio:pos:${src}`;
export const CURRENT_KEY = 'audio:current';

/** Where to resume: nowhere if barely started or already (nearly) finished. */
export function resumeFrom(saved: number | undefined, duration: number | undefined): number {
  if (!saved || saved < 5) return 0;
  if (duration && saved > duration - 10) return 0;
  return saved;
}

/** A track's identity is its file, never its page (a page exists in two languages). */
export function sameTrack(a?: { src: string } | null, b?: { src: string } | null): boolean {
  return !!a && !!b && a.src === b.src;
}

export function parseTrack(json: string | null | undefined): Track | null {
  if (!json) return null;
  try {
    const t = JSON.parse(json);
    const ok =
      typeof t?.src === 'string' && t.src.startsWith('https://') &&
      typeof t.title === 'string' && typeof t.href === 'string' &&
      (t.lang === 'en' || t.lang === 'ar') && (t.kind === 'post' || t.kind === 'talk') &&
      (t.duration === undefined || typeof t.duration === 'number');
    return ok ? (t as Track) : null;
  } catch {
    return null;
  }
}
