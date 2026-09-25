import { onPage, once } from './lifecycle';
import { getLenis } from './scroll';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/** Shared by the menu and the search overlay (via site:lock / site:unlock). */
export function lock() {
  root.classList.add('menu-open');
  getLenis()?.stop();
}
export function unlock() {
  root.classList.remove('menu-open');
  getLenis()?.start();
}

once('lock', () => {
  document.addEventListener('site:lock', lock);
  document.addEventListener('site:unlock', unlock);
});

// Opening makes every OTHER top-level element inert, which contains focus in
// the dialog without a hand-written trap. Closing restores focus to whichever
// button opened it.
onPage('menu', (signal) => {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!menu) return;
  const openers = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-open]'));
  const closeBtn = menu.querySelector<HTMLElement>('[data-menu-close]');
  const rest = () =>
    Array.from(document.body.children).filter(
      (el): el is HTMLElement => el !== menu && el instanceof HTMLElement && el.tagName !== 'SCRIPT',
    );
  let returnTo: HTMLElement | null = null;
  let wasInert = new Set<HTMLElement>(); // e.g. the parked sticky bar stays inert

  const setExpanded = (v: boolean) => openers.forEach((b) => b.setAttribute('aria-expanded', String(v)));

  const open = (from: HTMLElement) => {
    returnTo = from;
    wasInert = new Set(rest().filter((el) => el.inert));
    menu.inert = false;
    menu.dataset.open = 'true';
    setExpanded(true);
    rest().forEach((el) => (el.inert = true));
    lock();
    setTimeout(() => closeBtn?.focus({ preventScroll: true }), reduce.matches ? 0 : 120);
  };

  const close = (restoreFocus = true) => {
    if (menu.dataset.open !== 'true') return;
    menu.dataset.open = 'false';
    menu.inert = true;
    setExpanded(false);
    rest().forEach((el) => (el.inert = wasInert.has(el)));
    unlock();
    if (restoreFocus) returnTo?.focus({ preventScroll: true });
  };

  openers.forEach((b) => b.addEventListener('click', () => open(b), { signal }));
  closeBtn?.addEventListener('click', () => close(), { signal });
  document.addEventListener('menu:close', () => close(false), { signal });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close(), { signal });
  // following a link from the menu: let navigation proceed, don't yank focus
  menu.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a')) close(false);
  }, { signal });
  matchMedia('(min-width: 961px)').addEventListener('change', (m) => m.matches && close(false), { signal });

  return () => close(false); // leaving the page with the menu open
});
