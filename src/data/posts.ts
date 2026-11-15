import { getCollection, type CollectionEntry } from 'astro:content';
import { PLATE_POOL, sectionHref, slugOf, type Lang } from './site';

export type Post = CollectionEntry<'writing'>;

export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection('writing', (e) => !e.data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * A post's plate, from its rank in newest-first order (0 = newest). The home
 * card and the post page must agree, so both call this. They used to compute
 * it separately — the card from its grid position, the page from a count-down
 * number — and only the newest post happened to match.
 */
export function plateFor(post: Post, rank: number): string {
  return post.data.plate ?? PLATE_POOL[rank % PLATE_POOL.length];
}

export function postHref(post: Post, siteLang: Lang): string {
  return `${sectionHref(siteLang, 'writing')}${slugOf(post.id)}/`;
}

/**
 * The canonical URL is the post under its OWN language's chrome: the other
 * copy shows identical text and must not compete with it in search.
 */
export function postCanonical(post: Post): string {
  return postHref(post, post.data.lang);
}

export async function postPaths() {
  const posts = await getPosts();
  return posts.map((post, rank) => ({
    params: { id: slugOf(post.id) },
    props: { post, rank, number: String(posts.length - rank).padStart(2, '0') },
  }));
}
