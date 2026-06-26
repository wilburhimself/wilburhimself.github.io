---
title: "Why Most Technical Migrations Fail (And How to Run Them)"
date: "June 26, 2026"
tags: [leadership, collaboration, modularity, migrations]
excerpt: "Every senior engineer has lived through a migration that got 80% finished, stalled for a year, and left the team maintaining two versions of the same system forever. Migrations rarely fail because the new architecture is bad; they fail because of incorrect system boundaries, lack of dual-writing strategy, and ignoring human momentum."
---

Every senior engineer has lived through a migration that got 80% finished, stalled for a year, and left the team maintaining two versions of the same system forever. The old database table is still receiving writes, the old service is still running in a Kubernetes pod somewhere, and the team is twice as slow because they have to remember the quirks of both.

Migrations rarely fail because the new architecture is bad. They fail because of a misunderstanding of system boundaries, a lack of progress-tracking checkpoints, and the human momentum of a engineering team that still needs to ship product features while changing the engine mid-flight.

Here is the operational playbook I use to design and execute migrations that actually finish.

---

## 1. The Trap of "The Rewrite" (Second System Syndrome)

The most common migration failure begins with a developer declaring: *"This codebase is a mess; we need to rewrite it from scratch."*

When you rewrite a system from scratch, you are making a massive bet:
1. That you fully understand every edge case, bug fix, and undocumented business requirement that the old system accumulated over 5 years. (You don't).
2. That you can freeze product requirements long enough for the new system to catch up. (You can't).

### The Solution: Strangler Fig Pattern
Instead of a total rewrite, wrap the old system and gradually replace its boundaries. 
- Introduce an abstraction layer (an API gateway, a routing constraint, or a polymorphic adapter).
- Migrate one path or domain resource at a time.
- Delete the old code path immediately once it reaches 0% traffic.

---

## 2. The Golden Rule: Never Deploy a Migration Without Dual Writing

If you are migrating a database schema or a core data service, you cannot rely on a single "big bang" switchover night. If something goes wrong, rollbacks are high-risk, data loss is likely, and the pressure on the engineering team is immense.

Instead, structure the migration in five distinct, low-risk phases:

1. **Write to Old, Read from Old:** The baseline.
2. **Write to Both, Read from Old (Dual Writing):** Start writing to both the old and new data stores. Wrap the write operation in an asynchronous worker or a transaction block. If the write to the new store fails, log the error but *do not fail* the client request. This populates the new system with live data while you verify consistency.
3. **Backfill Historical Data:** Write a set-based, rate-limited migration script to backfill old records into the new system.
4. **Write to Both, Read from New:** Switch the read paths to query the new store. Keep dual-writing to the old store so you have an instant, zero-downtime rollback path if a latency anomaly or edge case arises.
5. **Write to New, Read from New:** Deprecate and remove all write/read code to the old store. Delete the old tables.

---

## 3. The Human Factor: Making Migration Progress Visible

A migration is a political and organizational challenge as much as a technical one. If the team doesn't see progress, migration fatigue sets in, product managers demand feature work, and the migration gets abandoned.

- **Automate Deprecation Warnings:** Use tools to raise warnings in development or CI when developers write code referencing the old system.
- **Track the Diff:** Create a simple dashboard showing the percentage of traffic routed to the new system, or the number of remaining references to the old module in the codebase.
- **Celebrate Deletions:** Deleting code should be treated with the same prestige as shipping a new feature. Share the diffs where old infrastructure is completely removed.
