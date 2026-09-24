/**
 * GitHub contribution calendar, fetched at BUILD time.
 *
 * Reads the public calendar fragment github.com serves for any user
 * (/users/<name>/contributions) — no token, no API rate limit. Each day is a
 * <td data-date data-level id>, and its exact count lives in a <tool-tip
 * for="<id>"> as "N contributions on …" / "No contributions on …".
 *
 * This is scraped markup, not a contract, so it degrades rather than breaks:
 * any failure returns null and the About page simply omits the section. The
 * build never fails because GitHub is slow or changed its HTML.
 *
 * Memoised per build: the English and Arabic About pages share one request.
 */

export interface Day {
  date: string; // YYYY-MM-DD
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
}

export interface Calendar {
  days: Day[];
  total: number;
  longestStreak: number;
  currentStreak: number;
  best: Day | null;
}

let pending: Promise<Calendar | null> | null = null;

export function getContributions(user: string): Promise<Calendar | null> {
  pending ??= load(user);
  return pending;
}

async function load(user: string): Promise<Calendar | null> {
  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
      headers: { 'User-Agent': 'saeeedhany.github.io build', Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const days = parse(await res.text());
    if (days.length < 300) throw new Error(`only ${days.length} days parsed — markup changed?`);
    return summarise(days);
  } catch (err) {
    console.warn(`[contributions] skipped: ${(err as Error).message}`);
    return null;
  }
}

function parse(html: string): Day[] {
  // id -> exact count, from the tooltips
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*(\d[\d,]*)\s+contribution/.exec(m[2]);
    counts.set(m[1], n ? Number(n[1].replace(/,/g, '')) : 0);
  }

  const days: Day[] = [];
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="[^"]+"[^>]*>/g)) {
    const tag = m[0];
    const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? 0);
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? '';
    if (!date) continue;
    days.push({
      date,
      level: Math.max(0, Math.min(4, level)) as Day['level'],
      count: counts.get(id) ?? (level > 0 ? 1 : 0),
    });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function summarise(days: Day[]): Calendar {
  let total = 0;
  let longest = 0;
  let run = 0;
  let best: Day | null = null;

  for (const d of days) {
    total += d.count;
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (d.count > 0 && (!best || d.count > best.count)) best = d;
  }

  // Current streak counts back from the last day. Today doesn't break it if
  // nothing has been pushed yet today.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }

  return { days, total, longestStreak: longest, currentStreak: current, best };
}
