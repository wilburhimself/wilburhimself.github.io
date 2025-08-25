// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://wilburhimself.github.io',
  base: '/',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },
  compressHTML: true
});
