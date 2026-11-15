import { onPage } from './lifecycle';

onPage('reveal:lit', () => {
  if (!matchMedia('(hover: none)').matches) return;
  const photos = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!photos.length) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.toggleAttribute('data-lit', e.isIntersecting)),
    { rootMargin: '-45% 0px -45% 0px' },
  );
  photos.forEach((p) => io.observe(p));
  return () => io.disconnect();
});
