import { getCollection, type CollectionEntry } from 'astro:content';
import { baseFor, slugOf, type Lang } from './site';

export type Post = CollectionEntry<'writing'>;

/** Every published post, newest first. The one ordering the site uses. */
export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection('writing', (e) => !e.data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

const POOL = ['fixed-stars', 'pharmacy', 'astrolabe', 'optics', 'anatomy', 'elephant-clock'];

/**
 * A post's plate, from its rank in newest-first order (0 = newest). The home
 * card and the post page must agree, so both call this. They used to compute
 * it separately — the card from its grid position, the page from a count-down
 * number — and only the newest post happened to match.
 */
export function plateFor(post: Post, rank: number): string {
  return post.data.plate ?? POOL[rank % POOL.length];
}

/** Posts are served under BOTH language prefixes; `siteLang` picks the chrome. */
export function postHref(post: Post, siteLang: Lang): string {
  return `${baseFor(siteLang)}/writing/${slugOf(post.id)}`;
}

/**
 * The canonical URL is the post under its OWN language's chrome: the other
 * copy shows identical text and must not compete with it in search.
 */
export function postCanonical(post: Post): string {
  return `${postHref(post, post.data.lang)}/`;
}

/** getStaticPaths for either language prefix — same posts, same slugs. */
export async function postPaths() {
  const posts = await getPosts();
  return posts.map((post, rank) => ({
    params: { id: slugOf(post.id) },
    props: { post, rank, number: String(posts.length - rank).padStart(2, '0') },
  }));
}
