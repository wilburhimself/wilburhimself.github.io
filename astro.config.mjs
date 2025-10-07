// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://wilburhimself.github.io',
  base: '/',
  integrations: [tailwind(), sitemap()],
  markdown: {
    syntaxHighlight: 'prism',
    rehypePlugins: [
      [rehypeMermaid, { strategy: 'inline-svg' }]
    ]
  },
  compressHTML: true,
  vite: {
    build: {
      assetsInlineLimit: 0 // Prevent inlining assets to avoid issues with GitHub Pages
    }
  }
});
