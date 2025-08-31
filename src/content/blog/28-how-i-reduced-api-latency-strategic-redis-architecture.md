---
title: "How I Reduced API Latency by 50% Using Strategic Redis Architecture"
date: "2025-08-31"
excerpt: "SQL query optimization requires diagnostic thinking rather than checklist application. Effective performance tuning involves distinguishing between design issues and scaling problems through EXPLAIN analysis, indexing evaluation, filtering optimization, and concurrency assessment."
---

The other day I wrote about [“Caching with Intent”](/blog/19-caching-with-intent-how-to-avoid-the-redis-graveyard/), and stated that caching should be deliberate, not accidental, and should become a tool to shape predictable performance.

Here’s how I put that philosophy into practice in a production system that was really stressed under peak load and what happened after Redis was added with intent.

---

## The Problem

At peak traffic, the system was at it's limit:

- **API Latency (P95):** 450ms
- **Mean Latency:** 280ms
- **Throughput:** ~800 requests/minute
- **Database Load:** 85% CPU on the primary DB
- **Error Rate:** 2.3% (mostly timeouts during peak traffic)
- **Cache Hit Ratio:** 0% (no caching)

Users felt it as *“slow mornings”* dashboards loading in 3–5 seconds, search timing out, and mobile apps crashing under load.

---

## Architecture Before
```
Client Request
↓
Rails API
↓
PostgreSQL Database
```

Every request hit the database:
- Complex joins for permission checks
- Repeated lookups for the same user/contact data
- Expensive aggregate queries for dashboards

The result: a DB that worked overtime to answer the same questions again and again.

---

## The Solution: Redis with Intent

Instead of throwing Redis in as a generic cache, I designed the caching layer around *access patterns* and *business pain points*.

**Cache Strategy:**
- User sessions → 4h TTL
- CRM contact data → 30m TTL
- Permission checks → 2h TTL
- Dashboard aggregates → 15m TTL

**Key Cache Objects:**
- `user:{id}:permissions` → eliminated repeated ACL queries
- `contact:{id}:full` → cached complete contact records
- `dashboard:{user_id}:{date}` → cached aggregates
- `search:{query_hash}:page:{n}` → cached paginated search

**Smart Invalidation:**
- Contact updates invalidated related dashboards
- Permission changes cleared only relevant user caches
- Bulk operations warmed caches instead of invalidating everything

---

## Architecture After
```
Client Request
↓
Rails API
↓
Redis Cache Check → Cache Hit → Return data
↓
Cache Miss
↓
PostgreSQL Database
↓
Store in Redis
↓
Return data
```


The critical change: requests that used to *always* hit the DB now bypassed it most of the time.

---

## The Results

Measured after rollout:

- **API Latency (P95):** dropped from **450ms → 220ms** (50% improvement)
- **Mean Latency:** 280ms → 140ms
- **Throughput:** ~800 → **1,400 requests/minute** (+75%)
- **Database CPU Load:** 85% → **45%**
- **Error Rate:** 2.3% → **0.4%** (83% reduction)
- **Cache Hit Ratio:** ~78% for frequently accessed data
- **Memory Footprint:** Redis using 2.3GB for 1M+ cached objects

The subjective impact was just as important: dashboards became *“instant”* to users, morning slowdowns disappeared, and customer complaints stopped.

---

## Why It Worked

This wasn’t just “adding Redis.” It worked because the cache was aligned with how users interacted with the system:
- **Predictability:** every key had a defined scope and TTL
- **Resilience:** invalidation was targeted, not destructive
- **Leverage:** caching the *right* 20% of queries relieved 80% of DB pressure

Caching with intent isn’t about storing everything—it’s about making deliberate trade-offs to shift the performance bottleneck in your favor.

---

## Monitoring & Maintenance

After implementation, we set up monitoring on:
- Redis memory usage and eviction rates
- Cache hit/miss ratio
- API latency (P50, P95, P99)
- Database CPU load

Alerting thresholds ensured we could detect cache regressions before users noticed them.

---

## Takeaway

If your system feels “slow” during peak load, resist the urge to bolt on a generic cache. Instead:
1. Profile the pain points—where do users actually feel latency?
2. Design caches around those access patterns.
3. Treat invalidation as part of the architecture, not an afterthought.
4. Put monitoring in place to catch regressions early.

That’s how a carefully designed Redis layer turned a stressed-out API into a system that could scale gracefully, and cut P95 latency in half.


