---
title: "How I approach a slow SQL query"
date: "2025-07-28"
excerpt: "SQL query optimization requires diagnostic thinking rather than checklist application. Effective performance tuning involves distinguishing between design issues and scaling problems through EXPLAIN analysis, indexing evaluation, filtering optimization, and concurrency assessment."
---

When a SQL query is slow, I don't jump straight to indexing or rewriting.
First, I step back and ask:

📌 Is this query always slow?
📌 Or does it degrade under load?

That tells me whether I'm chasing a design issue or a scaling issue.
From there, here's the process I follow 👇

----------------------------------------

1. **Run EXPLAIN (ANALYZE)**
   This is home base. I'm looking for full table scans, nested loops, row misestimates, and I/O-heavy operations. It tells me where the real cost lives.

2. **If it's scanning too much, check indexing**
   Missing or misused indexes are often the low-hanging fruit—especially on WHERE, JOIN, or ORDER BY.

3. **If row counts look huge, check filtering**
   Can I apply filters earlier? Push conditions closer to the base tables?

4. **If the query joins multiple big tables, simplify**
   Sometimes restructuring or denormalizing a bit is worth the tradeoff.

5. **If I see repeated queries inside loops, it's probably N+1**
   This usually comes from lazy loading in ORMs. I preload or rewrite to batch instead.

6. **If a lot of unnecessary columns are being fetched, I reduce the payload**
   But only after confirming it's part of the problem. SELECT * isn't always bad—it depends on what's being returned and why.

7. **If the query is still slow but the data doesn't change often, I consider caching**
   This can be a game-changer—but only when staleness is acceptable and cache invalidation is manageable.

8. **For high-volume or time-based data, I look at partitioning**
   PostgreSQL partitioning works best when queries align with the partition key (e.g. time windows). Otherwise, it can add complexity with no gain.

9. **If this query runs fine alone, but collapses under concurrency, it's time to look at connection pooling, locks, and transaction scopes**
   Sometimes the query isn't the problem—the context is.

----------------------------------------

💡 These aren't just tips, they're questions I ask the system.
Query performance isn't solved with a checklist. It's diagnosed.
