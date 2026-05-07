---
title: How CLAUDE.md actually works
date: "May 7, 2026"
tags: [ai, coding]
excerpt: "Most engineers write CLAUDE.md like a README. They put their stack, a few preferences, maybe a note about testing. The agent reads it and proceeds to write code shaped by its training data rather than their codebase. The file exists. It doesn't do much. The problem is category. A README describes a project. A specification constrains behavior. This post covers three dimensions of getting it right: how to structure the file across a real directory hierarchy, how to write rules the agent actually follows instead of weighs, and how to keep the file current as the codebase evolves."
---

Most engineers write `CLAUDE.md` like a README. They put their stack, a few preferences, maybe a note about testing. The agent reads it, nods politely, and proceeds to write code shaped by its training data rather than their codebase.

The file exists. It doesn't do much.

The problem isn't effort. It's category. A README describes a project. A specification constrains behavior. `CLAUDE.md` only works as the second thing, and most engineers have never written a specification for an agent before, so they reach for the format they know.

This post covers three dimensions of getting it right: how to structure the file, how to write rules the agent actually follows, and how to keep the file current as the codebase evolves.

---

## Structure: one file is the wrong model

Claude Code reads `CLAUDE.md` from the project root. What most engineers don't know is that it also reads `CLAUDE.md` from any subdirectory it's working in, and those files inherit from the root.

This matters because context is directional. The rules that apply when the agent is writing a migration are not the rules that apply when it's writing a Sidekiq job. A single root file that tries to encode both produces either redundancy or contradiction.

A structure that works:

```
project/
├── CLAUDE.md                    # global constraints, stack, communication protocol
├── app/
│   ├── models/CLAUDE.md         # schema rules, validation patterns, query constraints
│   ├── jobs/CLAUDE.md           # idempotency rules, retry logic, failure handling
│   └── services/CLAUDE.md       # when to extract, interface contracts, no god objects
└── db/
    └── migrate/CLAUDE.md        # migration rules, index requirements, reversibility
```

Each file answers: what does good work look like in this specific part of the codebase?

The root file handles things true everywhere: pinned versions, architectural decisions already made, the communication protocol (plan before execute, ask before touching schema). The directory files encode local expertise. When the agent opens `app/jobs/`, it reads both. The local file wins on conflicts.

Write the root file last. You'll know what belongs there after writing the directory files, because you'll see what keeps repeating.

---

## Structure: separate facts from rules

Inside any `CLAUDE.md`, two categories of content live at different distances from the agent's decisions.

**Facts** describe the environment:

```markdown
## Stack
- Ruby 3.3.4
- Rails 7.2.1
- PostgreSQL 15
- Sidekiq 7.3
- pgvector 0.7 (used in app/models/document.rb, not widely available)
```

**Rules** constrain behavior:

```markdown
## Database
Never update records in a loop. Use set-based updates.
Never call update_all without a WHERE condition.
Every query touching the documents table needs an EXPLAIN ANALYZE before merging.
```

Engineers mix these in paragraph form and the agent treats them with roughly equal weight. Separate them with explicit headers. Facts get a section. Rules get a section. The agent applies rules when deciding; it consults facts when writing. Conflating them produces a file that's harder to maintain and rules that get buried.

---

## Content: negative rules outperform positive ones

"Prefer set-based updates" loses to "never update records in a loop." Both encode the same intent. One requires the agent to weigh it against competing preferences. The other removes the decision entirely.

Agents generalize from positive instructions; they treat negative ones as constraints. Constraints bind more consistently than preferences, especially when the agent is mid-task and optimizing for completion.

The practical test: rewrite every "prefer X" in your `CLAUDE.md` as "never Y." If you can't, the rule isn't specific enough to be useful.

Compare:

```markdown
# Weak
Prefer idiomatic Rails patterns where possible.

# Useful
Never extract a service object without a domain justification written in a comment above the class.
Never rescue StandardError without logging the exception and the calling context.
Never write a background job where perform is not safe to call twice with the same arguments.
```

The first rule tells the agent something it already knows. The second, third, and fourth tell it something about your codebase specifically, stated as a constraint it can't argue with.

---

## Content: attach the why to every constraint

A rule without a reason the agent follows literally. A rule with a reason it generalizes.

```markdown
# Without why
Never use update_all without conditions.

# With why
Never use update_all without conditions. A bare update_all on the users table
has caused production data corruption twice in this codebase because background
jobs held stale references. Always scope it.
```

Both rules produce the same behavior on the exact scenario described. The second one produces correct behavior on the novel scenario the agent hasn't seen yet, because it understands the failure mode. The agent can ask "does this situation have the same risk?" and answer correctly.

This is the highest-leverage thing you can do to `CLAUDE.md`. Every rule that currently has no attached reason is a rule the agent interprets locally and fails to generalize.

The format that works:

```markdown
**Rule:** [constraint]
**Why:** [failure mode or past incident that produced the rule]
**Exception:** [when the rule doesn't apply, if any]
```

Not every rule needs a formal format. But every non-obvious rule needs a reason.

---

## Content: priority ordering for conflicting rules

Rules conflict. An instruction to keep methods short conflicts with an instruction to avoid multiple database queries. An instruction to match existing patterns conflicts with an instruction to apply a new convention to all new files.

Without explicit priority, the agent resolves conflicts by training data, not by your intent.

Add a section near the top of the root file:

```markdown
## Rule priority

When instructions conflict, apply them in this order:

1. Correctness — no silent failures, no data loss
2. Schema integrity — migrations reviewed, constraints in place before code
3. Explicit rules in this file — over Rails defaults, over conventions
4. Rails conventions — over agent judgment
5. Agent judgment — last resort only
```

This sounds obvious written out. It isn't obvious to an agent mid-task, and the cost of the agent resolving a conflict incorrectly is a file it has already changed.

---

## Content: show examples inline

Instructions describe intent. Examples demonstrate standard.

For any rule where the wrong implementation is plausible, put both versions in the file:

```markdown
## Background jobs

Jobs must survive duplicate execution. Test this by reading perform as if it
runs twice in sequence with the same arguments.

Bad:
```ruby
def perform(order_id)
  order = Order.find(order_id)
  order.update!(status: :processed)
  OrderMailer.confirmation(order).deliver_later
end
```

Good:
```ruby
def perform(order_id)
  order = Order.find(order_id)
  return if order.processed?

  order.update!(status: :processed)
  OrderMailer.confirmation(order).deliver_later
end
```

The return guard is the idempotency checkpoint. Every job needs one.
```

The agent calibrates to examples faster than to instructions. It can see the difference between the two implementations immediately; it can't always infer the difference from a prose rule alone.

---

## Workflow: let the agent update the file

This is the trick most engineers skip entirely.

After any session where the agent encountered a pattern it didn't handle correctly, or where you corrected its output more than once, end the session with:

```
Before we close: what did you learn in this session that should be added to CLAUDE.md?
List specific rules or facts, not generalizations. Draft the additions in the format
already used in the file.
```

The agent has context you don't at the end of a long session. It knows which rules it consulted, which ones it had to interpret ambiguously, and where it made a decision it wasn't confident about. It can surface those explicitly if you ask.

Review what it produces. Reject what's too general. Add what's specific and accurate.

This loop does two things. First, it keeps `CLAUDE.md` current without requiring you to remember what happened three sessions ago. Second, it produces rules written in a format the agent understands, because the agent wrote them.

---

## Workflow: treat CLAUDE.md as a living specification under version control

`CLAUDE.md` should be in git. Commit messages should say why a rule changed, not just that it did.

```
Add explicit idempotency requirement to jobs/CLAUDE.md

Background job wrote duplicate notifications in production on 2024-11-12
because the retry logic ran perform twice. Added rule with failure mode attached.
```

Read the git history of `CLAUDE.md` the same way you'd read the git history of a schema file. It tells you what the codebase has learned about itself. A rule with no commit context is a rule you'll forget to defend when someone asks why it exists.

A practical schedule: review `CLAUDE.md` every Friday, same as any other configuration that controls production behavior. Ask three questions:

- Which rules did the agent follow incorrectly this week? Rewrite them.
- Which decisions did we make that aren't encoded yet? Add them.
- Which rules are stale because the codebase has changed? Remove or update them.

Ten minutes. The agent's output quality is a direct function of how current the file is. Stale context produces output that was correct for the codebase you had six months ago.

---

## Workflow: ask the agent to audit its own compliance

At the start of a session where the work is consequential, run this before any task:

```
Read CLAUDE.md, then read the files you're about to modify.
Before writing any code, list:
1. Which rules in CLAUDE.md apply to this task
2. Any existing code in the target files that already violates those rules
3. Any ambiguity in the rules that you'll need me to resolve
```

This surfaces two problems before they compound: rules the agent would have applied inconsistently, and existing violations it would have implicitly extended by matching surrounding code.

The audit takes thirty seconds. It prevents the situation where the agent writes new code that follows your rules while the file it's modifying already breaks them, and now you have an inconsistency with the agent's fingerprints on both sides of it.

---

## The underlying model

`CLAUDE.md` is a specification for a collaborator who has no memory between sessions, has read every Rails codebase that existed before its training cutoff, and defaults to the most common pattern when your instructions are ambiguous.

The file's job is to replace "most common Rails pattern" with "this specific codebase's pattern." It can only do that job if the rules are negative and specific, the reasons are attached, the examples show the wrong and right version side by side, and the file is updated when the codebase learns something new.

Write it like a contract your future self will have to enforce. Because every session, you're handing the codebase to someone who has never seen it before and has to be told everything that matters.

The README version of `CLAUDE.md` produces a generic collaborator. The specification version produces one that can be trusted with a schema migration.
