import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { defineHastPlugin } from 'satteri';

/**
 * Wrap local images in markdown with the `.duo` layer that colours them.
 *
 * Every image on the site is stored as a 1-bit mask and coloured live by CSS
 * (see .duo in src/styles/base.css). Components add that wrapper themselves,
 * but an image written in a post's markdown comes out as a bare <img>, which
 * would render as raw black and white. External images are left alone: they
 * aren't masks.
 *
 * Written against Sätteri, Astro 7's native markdown processor. It doesn't run
 * unified/rehype plugins, and switching back to unified just for this would
 * swap the markdown engine for every post.
 */
const hastDuoImages = defineHastPlugin({
  name: 'hast-duo-images',
  element: {
    filter: ['img'],
    visit(node, context) {
      const src = node.properties?.src;
      if (typeof src !== 'string' || !src.startsWith('/')) return;
      context.wrapNode(node, {
        type: 'element',
        tagName: 'span',
        properties: { className: ['duo', 'duo--inline'] },
        children: [],
      });
    },
  },
});

export default defineConfig({
  site: 'https://saeeedhany.github.io',
  markdown: {
    processor: satteri({
      hastPlugins: [hastDuoImages],
    }),
    shikiConfig: {
      theme: 'plastic',
      wrap: true,
    },
  },
});
