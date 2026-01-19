---
title: "The Technical Blogging Playbook: A System for Learning in Public"
date: "January 18, 2026"
excerpt: "No platitudes, no theory. Just the exact system, templates, and tools I use to turn daily development work into a searchable knowledge base and high-quality blog posts."
---

Your blog isn't a stage; it's a workbench.

This reframe changed everything for me. I stopped asking, "Is this impressive enough to publish?" and started asking, "Will my future self need to remember this in six months?" The goal shifted from performance to utility.

Over 50+ posts and three years, I've refined a system that turns my daily work into evergreen content. This isn't theory—these are the actual templates, checklists, and tools I use every week. This is a tactical playbook for turning your development work into a personal knowledge base that also happens to be a public blog.

### Part 1: My Guiding Philosophy (Or, How I Choose My Tools)

Every tool in my stack must meet three criteria:

1.  **Plain Text First:** If I can't `grep` it, search it, or version control it, I don't use it. This is why I use Markdown in Obsidian, not a proprietary format in a cloud-only notes app.
2.  **Low Friction:** If it takes more than 10 seconds to capture an idea, I won't do it. This is why my capture tool (Obsidian) is always open.
3.  **Portable:** I never want to be locked into a platform. My content is a folder of Markdown files. I can move my entire blog and knowledge base in an afternoon.

### Part 2: The Toolchain & Workflow

This is the assembly line, from fleeting idea to published post.

#### Capture & Knowledge Management: Obsidian
Obsidian is the core of my system. It's where ideas are born, linked, and developed.

**My Obsidian Vault Structure:**
```
blog-workspace/
├── 00-inbox/           # Quick, unstructured notes and brain dumps
├── 01-tils/            # Daily "Today I Learned" entries
├── 02-drafts/          # Blog posts in progress
├── 03-published/       # An archive of published Markdown
└── templates/
    ├── til-template.md
    └── blog-post-template.md
```

**My TIL Template (`templates/til-template.md`):**
```markdown
---
date: {{date}}
tags: #til, #{{topic}}
status: captured
---

### Problem
[What was broken, confusing, or non-obvious?]

### Solution
[The code snippet, command, or architectural pattern that worked.]

### Why It Matters
[Will I encounter this again? Does this solve a common pattern?]

### Related
- [[Link to other relevant notes]]

### Blog Post Potential: ⭐ / ⭐⭐ / ⭐⭐⭐
```
I rate the blog potential from 1 (niche, probably just for me) to 3 (broadly useful, high-priority).

#### Writing & Visuals
*   **VS Code:** Once a draft is ready for serious writing, I move from Obsidian to VS Code for its superior developer ergonomics. My custom snippet for code blocks:
    ```json
    {
      "Code Block": {
        "prefix": "code",
        "body": [ "```${1:language}", "$0", "```" ],
        "description": "Inserts a Markdown code block."
      }
    }
    ```
*   **Mermaid.js:** For diagrams-as-code. It's version-controllable and easy to edit.
    **Example Mermaid diagram (paste this into any Mermaid renderer):**
    ```mermaid
    graph LR
        A[Idea in Obsidian Inbox] --> B{Blog Potential > ⭐⭐?};
        B -- Yes --> C[Flesh out in 02-drafts/];
        B -- No --> D[Archive in 01-tils/];
        C --> E[Write in VS Code];
        E --> F[Publish];
    ```
*   **Excalidraw:** For more complex or free-form diagrams that need a hand-drawn feel.

#### The AI Copy Editor
I use AI for exactly one thing: polishing prose I've already written. My process: I write the entire draft in my own words, then ask AI to tighten specific paragraphs. I never feed AI a topic and ask it to write a post—that produces generic slop.

**Before AI:**
> "It's important to make sure your outbox processor is idempotent. This means that if it processes the same event more than once, it doesn't cause any problems. For example, it shouldn't send the same email twice. This is a key part of making the system reliable."

**After Prompting AI to "make this more concise and impactful":**
> "Idempotency is non-negotiable for a reliable outbox processor. Re-processing the same event must not yield duplicate side effects, like sending a second email. This guarantee is the foundation of a resilient event-driven architecture."

### Part 3: From Annoyance to Article (A Real Example)

My "Is It a Blog Post?" filter is simple:
1. Did it take >30 minutes to solve?
2. Was the solution non-obvious?
3. Will others face this problem?

**Example:** I recently spent 90 minutes debugging a TypeScript issue where `zod` schemas were failing validation in a production Next.js build, but not in development. The solution involved a subtle interaction with build-time environment variables. It wasn't in the docs or top search results. It passed the filter, became the post "Solving Environment-Specific Zod Schemas in Next.js", and now gets ~500 views a month from organic search.

### Part 4: What This System Has Actually Produced

**By the numbers:**
-   **~200** TIL entries captured
-   **~50** published posts (a 25% conversion rate)
-   **2-3 hours** average writing time per post (across multiple sessions)
-   **5,000+** views on my top post (a "mundane" Postgres indexing guide)
-   **3** consulting offers directly from blog posts
-   **Dozens** of posts now used as team reference material

My average post takes 2-3 hours of *actual writing time*, spread across a few 30-minute sessions. This doesn't include the original problem-solving time—that's already sunk cost from my normal work.

**The takeaway:** Small, practical posts consistently outperform "thought leadership" pieces.

### Part 5: Hard-Won Lessons

1.  **Mistake: Writing for "The Community."** I used to agonize over whether a post was "important enough" for Hacker News. This paralyzed me.
    **Lesson:** Write for yourself six months from now. If you serve that person well, you'll serve everyone else as a side effect.

2.  **Mistake: Chasing Pageviews.** I used to obsess over analytics, mistaking traffic for impact.
    **Lesson:** The "right person" is better than a crowd. A single hiring manager or potential client reading your post is worth more than 10,000 vanity views.

3.  **Mistake: Trying to Sound Like an "Expert."** My early posts were full of jargon because I thought that's what made them credible.
    **Lesson:** Authenticity is your authority. Documenting what you did, what went wrong, and how you fixed it is more valuable than any academic treatise.

### Part 6: What I Don't Use (And Why)
*   **Medium/Dev.to:** You don't own the platform, the URL, or your content. Paywalls and pop-ups can appear at any time. My blog is my turf.
*   **Substack:** Fantastic for newsletters, but the wrong tool for creating a permanent, searchable knowledge base. It's optimized for chronological delivery, not for evergreen reference material.
*   **WordPress:** Too heavy, too complex, and too insecure for a simple technical blog. A static site generated from Markdown is faster, safer, and infinitely simpler to manage.

### Build Your Workbench

You already have the source material. You solved a problem today. You learned something this week. The only question is: will you capture it, or let it evaporate?

Build your workbench.