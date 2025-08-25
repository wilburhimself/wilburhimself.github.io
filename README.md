# Wilbur Suero's Blog - Astro Migration

This is the migration of Wilbur Suero's blog from Gatsby to Astro.

## 🚀 Project Structure

```
/
├── public/
├── src/
│   ├── layouts/
│   │   └── BlogLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   └── blog/
│   │       └── [slug].astro
│   └── utils/
│       └── posts.ts
├── .github/
│   └── workflows/
│       └── deploy.yml
├── astro.config.mjs
├── README.md
└── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:4321`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |

## 🚀 Deployment

This blog is automatically deployed to GitHub Pages using GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

## 🧑‍💻 Development

To run the development server:

```bash
npm run dev
```

Visit `http://localhost:4321` to view the site.

## 📝 Migration Status

- [x] Initialize Astro project
- [x] Create basic layout and pages
- [x] Set up dynamic blog post routing
- [x] Configure GitHub Actions deployment
- [ ] Migrate all existing blog content
- [ ] Improve styling and design
- [ ] Add RSS feed
- [ ] Add search functionality
