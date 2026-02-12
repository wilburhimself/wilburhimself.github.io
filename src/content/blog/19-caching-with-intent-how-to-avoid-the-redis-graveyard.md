---
title: "Caching with intent: How to avoid the Redis graveyard"
date: "2025-08-13"
excerpt: "Effective caching strategies require intentional design to prevent memory waste and stale data issues. Implementation guidelines include evaluating query cost, frequency of access, data predictability, TTL settings, and scope management for optimal Redis performance."
tags: ["caching", "redis", "backend", "performance"]
---

To many teams "cache aggressively" means "store the world in Redis".

That's a recipe for staled cache, memory waste, to create more problems than we are trying to solve, and of course no real performance gains.

Caching is not only useful for speed, but also to reduce load where it actually matters.

I have a mental checklist for when and what to cache:

- Is it expensive? I look at query cost and execution speed. If it's under 10ms, caching may be overkill.
- Is it queried often? I look at query logs/APM. If nobody calls it, even if it's slow, may not be worth caching.
- Is it predictable? Leaderboards, summaries and reference data are great candidates for caching.
- Can it be stale? Set TTLs depending on how fresh the data needs to be.
- Is it global or scoped? Avoid caching volatile and per-user results unless you scope it to a user by cache key.

Measure first, then cache with intent. Random caching is just an invitation for future incidents.

#backend engineering #caching #redis #scalability
