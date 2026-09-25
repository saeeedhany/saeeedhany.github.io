import { getCollection } from 'astro:content';
import { getPosts } from '../data/posts';
import { getTalks } from '../data/talks';
import { getPhotos, hasStory } from '../data/gallery';
import { slugOf } from '../data/site';

/**
 * The search index, emitted once at build time as /search.json.
 *
 * Language-neutral on purpose: it stores slugs, not URLs, and the search UI
 * builds each link under whichever language the reader has the site in. So an
 * Arabic post found from the English site opens with English navigation.
 *
 * Bodies are included as plain text for full-text search. The whole corpus is
 * ~60 KB of text; it is fetched only when search is first opened, never on
 * page load.
 */
export const prerender = true;

/** Markdown -> readable plain text. Good enough for matching and snippets. */
function plain(md = ''): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/<[^>]+>/g, ' ') // html
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // block markers
    .replace(/[*_~]{1,3}/g, '') // emphasis
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const posts = (await getPosts()).map((p) => ({
    type: 'post' as const,
    slug: slugOf(p.id),
    lang: p.data.lang,
    title: p.data.title,
    description: p.data.description ?? '',
    tags: p.data.tags,
    date: p.data.date.toISOString().slice(0, 10),
    body: plain(p.body),
  }));

  const books = (await getCollection('books', (e) => !e.data.draft)).map((b) => ({
    type: 'book' as const,
    slug: slugOf(b.id),
    title: b.data.title,
    author: b.data.author,
    category: b.data.category,
    status: b.data.status,
    year: b.data.year ?? null,
    description: b.data.description ?? '',
    tags: b.data.tags,
    body: plain(b.body),
  }));

  const talks = (await getTalks()).map((k) => ({
    type: 'talk' as const,
    slug: slugOf(k.id),
    lang: k.data.lang,
    title: k.data.title,
    description: k.data.description ?? '',
    tags: k.data.tags,
    date: k.data.date.toISOString().slice(0, 10),
    body: plain(k.body),
  }));

  // photos with something to find: a title or a story
  const photos = (await getPhotos())
    .filter((p) => p.data.title || hasStory(p))
    .map((p) => ({
      type: 'photo' as const,
      slug: slugOf(p.id),
      lang: p.data.lang,
      title: p.data.title ?? p.data.alt,
      description: p.data.place ?? '',
      tags: [] as string[],
      date: p.data.date.toISOString().slice(0, 10),
      body: plain(p.body),
    }));

  return new Response(JSON.stringify({ posts, talks, books, photos }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
