import { getCollection, type CollectionEntry } from 'astro:content';
import { sectionHref, slugOf, type Lang } from './site';

export type Book = CollectionEntry<'books'>;

export async function getBooks(): Promise<Book[]> {
  const entries = await getCollection('books', (e) => !e.data.draft);
  return entries.sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export const bookHref = (book: Book, siteLang: Lang) => `${sectionHref(siteLang, 'books')}${slugOf(book.id)}/`;

export const bookCanonical = (book: Book) => bookHref(book, 'en');

export const stars = (rating: number) => '▪'.repeat(rating) + '▫'.repeat(5 - rating);

export async function bookPaths() {
  const books = await getBooks();
  return books.map((book) => ({ params: { id: slugOf(book.id) }, props: { book } }));
}
