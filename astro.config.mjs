// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://wilburhimself.github.io',
  base: '/',
  integrations: [tailwind()],
  markdown: {
    syntaxHighlight: 'prism'
  },
  compressHTML: true,
  vite: {
    build: {
      assetsInlineLimit: 0 // Prevent inlining assets to avoid issues with GitHub Pages
    }
  }
});
