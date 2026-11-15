import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isAudioSrc } from './scripts/audio-core';

const audio = z.object({
  src: z.string().refine(isAudioSrc, 'audio src must be an https:// link or a site path like /audio/x.mp3'),
  duration: z
    .string()
    .regex(/^\d{1,2}:\d{2}(:\d{2})?$/)
    .optional(),
});

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
    audio: audio.optional(),
    draft: z.boolean().default(false),
  }),
});

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

const talks = defineCollection({
  // files starting with `_` (the template) are not content
  loader: glob({ base: './src/content/talks', pattern: '**/[^_]*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['ar', 'en']),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    audio,
    plate: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const gallery = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '**/[^_]*.md' }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      mask: image(),
      // what a screen reader says; the script's placeholder fails the build
      alt: z
        .string()
        .min(1)
        .refine((s) => s !== 'TODO', 'write the alt text for this photo'),
      date: z.coerce.date(),
      title: z.string().optional(),
      place: z.string().optional(),
      lang: z.enum(['ar', 'en']).default('en'),
      draft: z.boolean().default(false),
    }),
});

export const collections = { writing, books, talks, gallery };
