import type { APIRoute } from 'astro';
import { bookCanonical, getBooks } from '../data/books';
import { getPosts, postCanonical } from '../data/posts';
import { getTalks, talkCanonical } from '../data/talks';
import { homeHref, NAV, sectionHref, type Lang } from '../data/site';

const LANGS: Lang[] = ['en', 'ar'];
const STATIC_PATHS = LANGS.flatMap((lang) => [homeHref(lang), ...NAV.map((item) => sectionHref(lang, item.section))]);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? 'https://saeed.cool';
  const [posts, talks, books] = await Promise.all([getPosts(), getTalks(), getBooks()]);

  // Include only indexable canonical URLs. Alternate-language chrome copies
  // of essays, talks and books are intentionally omitted from this sitemap.
  const urls = new Set<string>([
    ...STATIC_PATHS.map((path) => new URL(path, origin).href),
    ...posts.map((post) => new URL(postCanonical(post), origin).href),
    ...talks.map((talk) => new URL(talkCanonical(talk), origin).href),
    ...books.map((book) => new URL(bookCanonical(book), origin).href),
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
