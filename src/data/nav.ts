import { NAV } from './site';
import { getTalks } from './talks';
import { getPhotos } from './gallery';

export type NavItem = (typeof NAV)[number];

/** NAV, minus sections that are still empty (so nobody lands on an empty page). */
export async function getNav(): Promise<NavItem[]> {
  const [talks, photos] = await Promise.all([getTalks(), getPhotos()]);
  return NAV.filter(
    (item) =>
      (item.href.en !== '/talks' || talks.length > 0) && (item.href.en !== '/gallery' || photos.length > 0),
  );
}
