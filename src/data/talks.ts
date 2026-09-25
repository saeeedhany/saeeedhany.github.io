import { getCollection, type CollectionEntry } from 'astro:content';
import { baseFor, slugOf, type Lang } from './site';

export type Talk = CollectionEntry<'talks'>;

/** Every published talk, newest first. */
export async function getTalks(): Promise<Talk[]> {
  const entries = await getCollection('talks', (e) => !e.data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

const POOL = ['fixed-stars', 'pharmacy', 'astrolabe', 'optics', 'anatomy', 'elephant-clock'];
export const talkPlate = (t: Talk, rank: number) => t.data.plate ?? POOL[rank % POOL.length];

/** Served under both language prefixes; `siteLang` picks the chrome. */
export const talkHref = (t: Talk, siteLang: Lang) => `${baseFor(siteLang)}/talks/${slugOf(t.id)}`;

/** Canonical: the talk under its OWN language's chrome. */
export const talkCanonical = (t: Talk) => `${talkHref(t, t.data.lang)}/`;

export async function talkPaths() {
  const talks = await getTalks();
  return talks.map((talk, rank) => ({
    params: { id: slugOf(talk.id) },
    props: { talk, rank, number: String(talks.length - rank).padStart(2, '0') },
  }));
}
