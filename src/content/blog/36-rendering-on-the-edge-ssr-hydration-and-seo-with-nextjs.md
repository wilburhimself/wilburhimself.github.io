---
title: "Rendering on the Edge: SSR, Hydration, and SEO with Next.js"
date: "September 14, 2025"
excerpt: "Go beyond client-side rendering. This guide demystifies Next.js data fetching: getStaticProps, getServerSideProps, and Incremental Static Regeneration (ISR). Learn how to balance blazing-fast loads and SEO with the hidden costs of server load and hydration."
---

In our last post, we mastered client-side caching to make our app feel instant on subsequent visits. But what about the very first load? For public-facing content, a fast Time to First Byte (TTFB) and strong SEO are non-negotiable. This is where Server-Side Rendering (SSR) comes in, and Next.js provides a powerful spectrum of tools to handle it.

### Why Server-Render? SEO and Perceived Performance

A standard client-side rendered React app serves an almost empty HTML file. The user sees a blank screen while JavaScript loads, fetches data, and builds the page. Search engine crawlers may see the same emptiness, hurting your SEO.

Server rendering solves this by building the full HTML page on the server *before* sending it to the browser. The user gets meaningful content immediately, and so do search engines.

### The Next.js Rendering Spectrum

Next.js offers three primary data-fetching strategies. Choosing the right one is critical.

#### 1. `getStaticProps` (Static Site Generation - SSG)

With `getStaticProps`, data is fetched at **build time**. Next.js pre-renders the page into a static HTML file that can be hosted on a CDN.

-   **Use Case:** Blog posts, documentation, marketing pages; any content that doesn't change frequently.
-   **Pros:** Blazing fast (served from CDN edge), zero server load per request, highly secure.
-   **Cons:** Data can become stale. A full site rebuild is needed to update content.

```javascript
// pages/posts/[slug].js
export async function getStaticProps({ params }) {
  const { data } = await apolloClient.query({
    query: GET_POST,
    variables: { slug: params.slug },
  });

  return { props: { post: data.post } };
}
```

#### 2. `getServerSideProps` (Server-Side Rendering - SSR)

Here, data is fetched on **every single request**. The server renders the page with fresh data each time someone visits.

-   **Use Case:** User dashboards, account settings, e-commerce checkouts; anything with personalized or highly dynamic data.
-   **Pros:** Data is always up-to-date.
-   **Cons:** Slower than SSG because it involves server computation on every request. Higher server load.

```javascript
// pages/dashboard.js
export async function getServerSideProps(context) {
  const { data } = await apolloClient.query({
    query: GET_DASHBOARD_DATA,
    // Use context to get user session, etc.
  });

  return { props: { dashboard: data.dashboard } };
}
```

#### 3. Incremental Static Regeneration (ISR)

ISR is the hybrid hero. It allows you to get the speed of static generation with automatic updates. You use `getStaticProps` but add a `revalidate` key.

-   **Use Case:** A news site's homepage, a popular product page. Content that should be fresh but doesn't need to be real-time.
-   **How it works:** The page is served statically. If a request comes in after the `revalidate` period (e.g., 60 seconds), the user gets the stale page, but Next.js triggers a re-generation in the background. The *next* user gets the fresh page.

```javascript
export async function getStaticProps() {
  const { data } = await apolloClient.query({ query: GET_HOMEPAGE_ARTICLES });

  return {
    props: { articles: data.articles },
    revalidate: 60, // Re-generate the page at most once every 60 seconds
  };
}
```

### The Hidden Cost: Hydration

Server rendering isn't free. After the browser receives the static HTML, it must run the client-side JavaScript to make the page interactive. This process is called **hydration**. React walks the server-rendered DOM and attaches event listeners.

The trade-off is this: the more data and components your page has, the larger the JavaScript bundle and the longer hydration takes. This can lead to a page that *looks* ready but isn't actually interactive (a high Time to Interactive - TTI). A user might click a button, and nothing happens.

**The pattern to balance this is selective or lazy hydration.** Don't hydrate non-critical, below-the-fold components immediately. Use libraries like `react-lazy-hydration` or frameworks with advanced features like React Server Components to send less JavaScript to the client initially.

### Conclusion: Choose the Right Tool for the Job

There is no single best rendering strategy. A well architected Next.js application often uses a mix of all three:

-   **SSG** for static marketing and blog content.
-   **ISR** for important, frequently updated pages.
-   **SSR** for authenticated, user-specific views.

By understanding the trade-offs between initial load speed, data freshness, server cost, and hydration, you can make informed decisions that lead to a truly performant user experience.

In Part 5, we'll address the elephant in the room: **the JavaScript bundle itself**, and how to shrink it with bundle splitting and delivery techniques.
