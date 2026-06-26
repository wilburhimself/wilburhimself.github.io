---
title: "How to Convince a Team to Delete 20,000 Lines of Code"
date: "May 22, 2026"
tags: [leadership, collaboration, simplicity, refactoring]
excerpt: "Deleting code is easy; convincing other developers, product managers, and business stakeholders to let you delete it is the real challenge. Here is how to build a case for deletion, treat code removal as a product feature, and safely execute large-scale cleanups."
---

Every line of code in your codebase is a liability. It has to be compiled, linted, tested, updated when dependencies change, and loaded into the heads of new developers onboarding onto the team.

Yet, codebases grow infinitely. Features that were launched three years ago and now receive zero traffic are kept "just in case." Unused abstractions, abandoned service objects, and half-finished migrations clutter the directory structure.

Deleting code is easy. Convincing your team, your product managers, and engineering leadership to dedicate time to deleting it is the real challenge. Here is my playbook for driving large-scale code deletions that make your team faster.

---

## 1. Make the Cost of Code Visible

You cannot convince stakeholders to prioritize code deletion by telling them the code is "ugly" or "messy." Those are subjective aesthetic concerns. You must frame the cost of code in terms of business velocity, developer productivity, and system reliability.

Translate technical debt into metrics:
- **Build & CI Times:** Show how much faster tests will run if you delete unused modules and their associated specs. If removing a legacy package cuts CI time by 3 minutes, multiply that by the number of daily PR builds to show the hours saved per week.
- **Onboarding Friction:** Explain how much cognitive load is lifted from new team members who no longer have to learn systems that are actually dead.
- **Maintenance Cost:** Highlight how much time was spent in the last quarter fixing bugs or upgrading dependencies for features that serve no active users.

---

## 2. Treat Deletion as a First-Class Product Feature

Product managers are evaluated on what they deliver, not what they remove. To get deletion on the roadmap, you must partner with them to treat code removal as a joint product goal.

- **The "Sunset" Roadmap:** Work with product managers to define a feature's end-of-life (EOL). Agree on the metrics that define when a feature is considered inactive (e.g., fewer than 10 active users in the last 90 days).
- **Consolidate and Simplify:** Present code deletion as a prerequisite for building new capabilities. *"If we want to ship this new checkout flow in Q3, we should delete these three deprecated payment gateways first so we don't have to build complex backward-compatibility adapters."*

---

## 3. Verify Before You Delete (Safe Deletion Strategies)

The fear of breaking something is what keeps dead code alive. You must build confidence within the team that the code you are removing is truly inactive.

- **Observability Gates:** Never assume a code path is dead just because you can't find it in your local search. Add loggers or telemetry metrics (e.g., Datadog or Prometheus counters) to the entry points of the code you want to delete. Run them in production for 30 days. If the count is 0, you have empirical proof.
- **Feature Flag Sunsetting:** Wrap the entrance to the legacy path in a feature toggle and disable it for 100% of users. If no alerts fire and no customer support tickets are generated, it is safe to delete.
- **The Red PR:** Create a pull request that contains *only* deletions. Keep it focused. Do not mix refactoring or new feature code into a deletion PR, as this complicates review and risks introducing new bugs. Make the diff clean, red, and satisfying.
