import { getCollection, type CollectionEntry } from 'astro:content';
import { PLATE_POOL, sectionHref, slugOf, type Lang } from './site';

export type Talk = CollectionEntry<'talks'>;

export async function getTalks(): Promise<Talk[]> {
  const entries = await getCollection('talks', (e) => !e.data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const talkPlate = (t: Talk, rank: number) => t.data.plate ?? PLATE_POOL[rank % PLATE_POOL.length];

export const talkHref = (t: Talk, siteLang: Lang) => `${sectionHref(siteLang, 'talks')}${slugOf(t.id)}/`;

export const talkCanonical = (t: Talk) => talkHref(t, t.data.lang);

export async function talkPaths() {
  const talks = await getTalks();
  return talks.map((talk, rank) => ({
    params: { id: slugOf(talk.id) },
    props: { talk, rank, number: String(talks.length - rank).padStart(2, '0') },
  }));
}
