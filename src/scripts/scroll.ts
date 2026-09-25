import Lenis from 'lenis';
import { onPage, shared } from './lifecycle';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/** One Lenis for the whole visit. null under reduced motion. */
export const getLenis = (): Lenis | null =>
  shared('lenis', () => {
    if (reduce.matches) return null;
    // Lenis drives the real scroll position (it does not transform a wrapper),
    // so the fixed frame, grain, footer and player keep working.
    const lenis = new Lenis({
      duration: 1.05,
      easing: (x: number) => 1 - Math.pow(1 - x, 3),
      smoothWheel: true,
      // touch devices already have momentum scrolling
      syncTouch: false,
    });
    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    return lenis;
  });

getLenis();

// ---- scroll-driven custom properties, per page ------------------------------
// JS writes numbers into CSS variables; CSS owns every visual decision.
onPage('scroll', (signal) => {
  const root = document.documentElement;
  const plates = Array.from(document.querySelectorAll<HTMLElement>('.px'));
  const footer = document.querySelector<HTMLElement>('.footer--reveal');
  const navbar = document.querySelector<HTMLElement>('[data-navbar]');
  const lenis = getLenis();
  let navShown = false;

  const update = () => {
    const vh = innerHeight;

    if (navbar) {
      const show = scrollY > vh * 0.9;
      if (show !== navShown) {
        navShown = show;
        navbar.dataset.shown = String(show);
        navbar.inert = !show; // unreachable while parked above the viewport
      }
    }

    if (footer) {
      const fh = footer.getBoundingClientRect().height;
      const gapTop = document.documentElement.scrollHeight - fh;
      const p = fh > 0 ? Math.max(0, Math.min(1, (scrollY + vh - gapTop) / fh)) : 0;
      root.style.setProperty('--footer-progress', p.toFixed(4));
      footer.setAttribute('aria-hidden', p < 0.05 ? 'true' : 'false');
    }

    if (reduce.matches) return;
    for (const el of plates) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const progress = 1 - (r.top + r.height / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty('--py', `${(Math.max(-1, Math.min(1, progress)) * 34).toFixed(2)}px`);
    }
  };

  if (lenis) {
    const off = lenis.on('scroll', update); // drive off Lenis's loop
    signal.addEventListener('abort', off, { once: true });
    // in-page anchors must go through Lenis or they jump
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      a.addEventListener(
        'click',
        (e) => {
          const target = document.getElementById(a.getAttribute('href')!.slice(1));
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -24 });
        },
        { signal },
      );
    }
  } else {
    let queued = false;
    addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          update();
        });
      },
      { passive: true, signal },
    );
  }

  addEventListener('resize', update, { passive: true, signal });
  update();
});
