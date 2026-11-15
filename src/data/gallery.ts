import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'gallery'>;

export async function getPhotos(): Promise<Photo[]> {
  const entries = await getCollection('gallery', (e) => !e.data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const hasStory = (p: Photo) => (p.body ?? '').trim().length > 0;
