// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: 'https://wilburhimself.github.io',
  base: '/',
  integrations: [tailwind(), sitemap()],
  markdown: {
    syntaxHighlight: 'prism'
  },
  compressHTML: true,
  vite: {
    build: {
      assetsInlineLimit: 0, // Prevent inlining assets to avoid issues with GitHub Pages
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
            warning.exporter === '@astrojs/internal-helpers/remote'
          ) {
            return;
          }
          warn(warning);
        }
      }
    }
  }
});
