import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://saeeedhany.github.io',
  markdown: {
    shikiConfig: {
      theme: 'plastic',
      wrap: true,
    },
  },
});
