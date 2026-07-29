---
title: "The Most Dangerous Code Is the Code That Assumes"
date: "July 29, 2026"
tags: ["architecture", "rails", "sidekiq", "engineering", "system-design"]
excerpt: "Every system has invariants—conditions that must always be true. The most dangerous ones are the implicit invariants that nobody writes down."
---

Eight lines of Ruby.

A four-minute review.

One missing assumption.

Eleven weeks later, an enterprise data import brought production down.

The code itself was standard and the unit tests passed. The failure stemmed from an implicit invariant that lived only in the author's head.

---

## The 80,000-job surge

The job looked innocent enough in code review:

```ruby
class SyncUserProfileJob
  include Sidekiq::Job

  def perform(user_id)
    user = User.find(user_id)
    CrmClient.sync(user.account.external_id, user.attributes)
  end
end
```

In standard UI sign-ups, an account was created before the user. `user.account` was always present.

Eleven weeks after merge, a customer ran a legacy data migration over the API, importing 40,000 records on a Tuesday afternoon. Each record enqueued two profile sync jobs. Within four seconds, 80,000 jobs hit the queue.

The API import pipeline staged records with `account_id: nil` until a background reconciler attached them minutes later. Every single job crashed instantly on `NoMethodError: undefined method 'external_id' for nil:NilClass`.

Sidekiq serialized backtraces and moved the failures to the retry queue. Because the application ran without queue isolation, mixing low-priority CRM syncs and high-priority password reset emails in the same worker pool, all 25 worker threads spent 100% of their time crashing on doomed sync jobs. Transactional emails ground to a halt for two hours.

---

## What is an implicit invariant?

Every system relies on invariants: conditions that must always be true for the software to operate correctly.

The dangerous ones are implicit invariants. These are assumptions never written into schema constraints, type signatures, defensive guards, or design docs.

In this incident, system ownership of the invariant—that a profile sync requires an attached account—was unassigned across every layer:

* The background job assumed the invariant held.
* The API importer violated it.
* No boundary in the system enforced it.

Without an assigned owner, the system operates on luck. It works as long as caller behavior matches the author's mental model. When a bulk API import bypasses that mental model, the hidden assumption becomes an outage.

---

## Making assumptions explicit

Surfacing implicit invariants goes beyond adding defensive `nil` checks to every line of code. Catch-all `nil` guards can obscure broken system boundaries.

Making invariants explicit means assigning constraints to the correct layer in your architecture:

* **At the database boundary:** Enforce non-null relationships or foreign key constraints so invalid state cannot persist.
* **At the execution boundary:** Structure pipelines so downstream jobs enqueue only after required state, like account reconciliation, finishes.
* **At the component boundary:** Document and validate preconditions explicitly when invoking a job or service across domain boundaries.

Experienced engineers consistently spot the unwritten assumptions code depends on.

---

## Reviewing assumptions, not just diffs

It is easy to admire the engineer who jumps into a 2 AM outage, triages a failing job queue, and restores service.

Firefighting is visible. The discipline of software architecture happens months earlier when an author or reviewer pauses on an eight-line pull request and asks a single question:

> What assumption does this code make about system state, and what happens when that assumption fails at scale?

Every production outage leaves a stack trace. Great engineering starts by reviewing the assumptions that never made it into the PR.
