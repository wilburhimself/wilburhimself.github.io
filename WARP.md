# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
Personal blog built with Astro, migrated from Gatsby. Static site deployed to GitHub Pages featuring blog posts, projects page, and about page.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server at http://localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build and deploy to GitHub Pages via gh-pages

### Migration Utilities
- `node migrate.mjs` - Migrate blog posts from HTML (posts/) to Markdown (src/content/blog/)

## Architecture

### Content System
This project uses Astro's Content Collections API for blog management:
- **Blog posts** live in `src/content/blog/` as Markdown files with frontmatter
- Schema defined in `src/content/config.ts` requires `title` (string), `date` (string), and optional `excerpt` (string)
- Posts are numbered (e.g., `01-hello-world.md`) but slug is derived from filename
- Posts are sorted by date in descending order (newest first)

### Routing & Pages
- **Index page** (`src/pages/index.astro`) - Paginated blog listing (10 posts per page)
- **Blog post pages** (`src/pages/blog/[slug].astro`) - Dynamic routes generated via `getStaticPaths()` from content collection
- **Pagination** (`src/pages/blog/page/[page].astro`) - Additional paginated blog pages
- **Static pages** - `about.astro`, `projects.astro`, `404.astro`

### Layout System
Single layout component `src/layouts/BlogLayout.astro` provides:
- Google Analytics integration (gtag.js with tracking ID G-EJ3RHGXYJM)
- Navigation header with active state highlighting
- Footer with contact links
- Global CSS imports
- Mermaid diagram initialization script

### Styling Approach
- **Tailwind CSS** for utility classes with custom color palette and fonts
- Custom colors: base (#F7F6F4), near-black (#090909), gray variants
- Fonts: Signika (headings), Roboto (body text) loaded from Google Fonts
- Global styles in `src/styles/global.css` include:
  - Dracula theme for code blocks (Prism syntax highlighting)
  - Custom styling for markdown elements (tables, lists, code, images, strong)
  - Pink border-top on body (#f28ff9)

### Special Features
- **Mermaid diagrams**: `src/scripts/mermaid-init.js` converts `pre.language-mermaid` blocks to rendered diagrams
- **Syntax highlighting**: Prism with Dracula theme for code blocks
- **Sitemap**: Auto-generated via @astrojs/sitemap integration

### Deployment
GitHub Actions workflow (`.github/workflows/deploy-astro.yml`) automatically deploys to GitHub Pages on push to main:
- Node 20, npm cache enabled
- Builds with `npm run build`
- Creates `.nojekyll` file in dist/
- Site URL: https://wilburhimself.github.io

### Migration Context
The `migrate.mjs` script converts legacy Gatsby HTML posts to Astro markdown:
- Reads from `posts/[slug]/index.html`
- Extracts title, date, and content using JSDOM
- Converts HTML to Markdown using Turndown
- Outputs to `src/content/blog/[slug].md` with proper frontmatter
