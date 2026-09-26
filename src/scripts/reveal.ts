import { onPage } from './lifecycle';

/**
 * Photos shown in the site's dither that turn to their real colours: gallery
 * tiles and the About portrait ([data-reveal]). Pointers get it on hover and
 * keyboard focus (CSS). Touch screens have no hover, so the photo crossing the
 * middle of the screen gets [data-lit] instead.
 */
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
