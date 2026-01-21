---
title: "Missing data after creation is often a view filtering problem, not a data persistence problem"
date: "2026-01-20"
tags: ["views", "data", "filtering"]
---

When a record appears to vanish immediately after creation despite successful database writes, the issue is typically at the presentation layer. The data exists, but view-level filters (status, type, date range, feature flags) are hiding it from the query results.

**The debugging pattern:** Instead of checking data integrity first, verify the view's filter state and search by a unique identifier that bypasses all filters. This reveals whether you have a persistence issue or a UX issue.

**The architectural lesson:** Separation of concerns breaks down when views apply implicit filters that users don't perceive. "Show me everything" should actually show everything, or at least make filtering state explicit and obvious.