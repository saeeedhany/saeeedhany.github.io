import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { postCanonical } from '../data/posts';
import { talkCanonical } from '../data/talks';
import { slugOf } from '../data/site';

const ORIGIN = 'https://saeed.cool';
const STATIC_PATHS = [
  '/',
  '/ar/',
  '/about/',
  '/ar/about/',
  '/writing/',
  '/ar/writing/',
  '/talks/',
  '/ar/talks/',
  '/books/',
  '/ar/books/',
  '/gallery/',
  '/ar/gallery/',
];

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async () => {
  const [posts, talks, books] = await Promise.all([
    getCollection('writing', (entry) => !entry.data.draft),
    getCollection('talks', (entry) => !entry.data.draft),
    getCollection('books', (entry) => !entry.data.draft),
  ]);

  // Include only indexable canonical URLs. Alternate-language chrome copies
  // of essays, talks and books are intentionally omitted from this sitemap.
  const urls = new Set<string>([
    ...STATIC_PATHS.map((path) => new URL(path, ORIGIN).href),
    ...posts.map((post) => new URL(postCanonical(post), ORIGIN).href),
    ...talks.map((talk) => new URL(talkCanonical(talk), ORIGIN).href),
    ...books.map((book) => new URL(`/books/${slugOf(book.id)}/`, ORIGIN).href),
  ]);

  const entries = [...urls]
    .sort()
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
};
