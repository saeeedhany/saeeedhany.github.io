/**
 * Page lifecycle for Astro's ClientRouter.
 *
 * With in-page navigation a script no longer simply "runs on page load":
 *  - an external module script runs ONCE per visit (the browser caches it);
 *  - an inline script (Vite inlines small ones) runs AGAIN on every
 *    navigation, because the router re-executes inline <script>s.
 * `onPage(key, setup)` makes both behave the same: `setup` runs on every page,
 * and a re-run script re-registering the same key replaces its entry instead
 * of adding a second one.
 *
 * `setup` receives an AbortSignal that aborts just before the page is swapped
 * out. Pass it to every addEventListener ({ signal }) on document/window, and
 * return a function for any other teardown.
 *
 * State lives on `window` so it is shared even if this module is bundled into
 * more than one script chunk.
 */
type Setup = (signal: AbortSignal) => void | (() => void);

interface Registry {
  setups: Map<string, Setup>;
  controller: AbortController | null; // current page's; null between swap and load
  onceKeys: Set<string>;
  store: Map<string, unknown>;
  runs: Record<string, number>; // debug: setup runs per key (read by tests)
  bound: boolean;
}

const w = window as unknown as { __page?: Registry };
const reg: Registry = (w.__page ??= {
  setups: new Map(),
  controller: null,
  onceKeys: new Set(),
  store: new Map(),
  runs: {},
  bound: false,
});

function run(key: string, setup: Setup, signal: AbortSignal) {
  reg.runs[key] = (reg.runs[key] ?? 0) + 1;
  try {
    const cleanup = setup(signal);
    if (typeof cleanup === 'function') signal.addEventListener('abort', cleanup, { once: true });
  } catch (err) {
    console.error(`[onPage:${key}]`, err);
  }
}

function pageLoaded() {
  reg.controller?.abort();
  reg.controller = new AbortController();
  for (const [key, setup] of reg.setups) run(key, setup, reg.controller.signal);
}

if (!reg.bound) {
  reg.bound = true;
  // astro:page-load fires on the first load too, once ClientRouter is on the
  // page. Until then (full page loads), DOMContentLoaded stands in for it.
  document.addEventListener('astro:page-load', pageLoaded);
  document.addEventListener('astro:before-swap', () => {
    reg.controller?.abort();
    reg.controller = null;
  });
  if (!document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageLoaded, { once: true });
    else queueMicrotask(pageLoaded);
  }
}

export function onPage(key: string, setup: Setup): void {
  const known = reg.setups.has(key);
  reg.setups.set(key, setup);
  // A script evaluated after this page already loaded must still run for it.
  if (reg.controller && !known) run(key, setup, reg.controller.signal);
}

export function once(key: string, fn: () => void): void {
  if (reg.onceKeys.has(key)) return;
  reg.onceKeys.add(key);
  fn();
}

/** A value created once per visit and shared by every script. */
export function shared<T>(key: string, create: () => T): T {
  if (!reg.store.has(key)) reg.store.set(key, create());
  return reg.store.get(key) as T;
}
