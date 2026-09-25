import { NAV } from './site';
import { getTalks } from './talks';

export type NavItem = (typeof NAV)[number];

/** NAV, minus Talks while there are none (so nobody lands on an empty page). */
export async function getNav(): Promise<NavItem[]> {
  const hasTalks = (await getTalks()).length > 0;
  return NAV.filter((item) => hasTalks || item.href.en !== '/talks');
}
