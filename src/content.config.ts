import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One `writing` collection with `lang` as a field, rather than separate ar/en
 * collections. Keeps "latest across both languages" a single query.
 *
 * `plate` is the dithered manuscript image; `plateSource` credits the manuscript
 * it came from and is rendered under every plate.
 */
const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['ar', 'en']),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    plate: z.string().optional(),
    plateSource: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/** Carried over from the old site, essentially unchanged. */
const books = defineCollection({
  loader: glob({ base: './src/content/books', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    year: z.number().optional(),
    status: z.enum(['read', 'reading', 'want']).default('read'),
    rating: z.number().min(1).max(5).optional(),
    category: z.enum(['technical', 'non-fiction', 'fiction', 'garbage']).default('technical'),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    recommended: z.boolean().default(false),
    recommendNote: z.string().optional(),
    relatedPosts: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, books };
