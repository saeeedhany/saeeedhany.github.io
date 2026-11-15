import { NAV, sectionHref, type Lang } from './site';
import { getTalks } from './talks';
import { getPhotos } from './gallery';

function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const bare = href.replace(/\/$/, '');
  return path === bare || path.startsWith(`${bare}/`);
}

export async function getNav(lang: Lang, pathname: string) {
  const [talks, photos] = await Promise.all([getTalks(), getPhotos()]);
  const empty = new Set([talks.length === 0 && 'talks', photos.length === 0 && 'gallery']);
  return NAV.filter((item) => !empty.has(item.section)).map((item) => {
    const href = sectionHref(lang, item.section);
    return { href, label: item.label[lang], current: isCurrent(pathname, href) };
  });
}
