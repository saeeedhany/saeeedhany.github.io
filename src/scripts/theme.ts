import { onPage, once } from './lifecycle';

const root = document.documentElement;

const savedTheme = (): string | null => {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
};

/** Mark the active swatch in every switch on the page. */
function sync() {
  const current =
    root.dataset.theme ?? document.querySelector<HTMLElement>('[data-theme-set]')?.dataset.themeSet;
  for (const b of document.querySelectorAll<HTMLElement>('[data-theme-set]')) {
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === current));
  }
}

// One delegated listener for the whole visit.
once('theme:click', () => {
  document.addEventListener('click', (e) => {
    const t = e.target;
    const btn = t instanceof Element ? t.closest<HTMLElement>('[data-theme-set]') : null;
    if (!btn) return;
    const id = btn.dataset.themeSet!;
    root.dataset.theme = id;
    if (btn.dataset.ink) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', btn.dataset.ink);
    try {
      localStorage.setItem('theme', id);
    } catch {
      /* private mode: the change still applies */
    }
    sync();
  });
});

onPage('theme', () => {
  sync();
  // Allow --ink to transition only after this page has painted with the saved
  // theme; otherwise it would animate in from the default.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('theme-ready')));
});

export { savedTheme };
