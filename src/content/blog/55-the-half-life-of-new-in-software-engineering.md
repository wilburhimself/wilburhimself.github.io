---
title: The Half-Life of "New" in Software Engineering
date: "April 20, 2026"
tags: [architecture, patterns, career]
excerpt: "The engineers who stand the test of time aren't the ones who chased every new thing, they're the ones who knew what was worth chasing. Every field has a surface and a foundation. The ones who only ever work the surface stay busy but never quite arrive anywhere. The ones who go deep find that the fundamentals they learned ten years ago are still paying interest today. That's not nostalgia. That's how engineering actually compounds ... not by accumulating tools, but by developing the judgment to know which problems are new and which ones just look that way."
---

## The industry moves fast. The substrate doesn't.

There's a pressure in engineering that's hard to name but easy to feel: the sense that if you're not learning something new every few months, you're falling behind. New frameworks, new paradigms, new tools. The conference talks, the newsletters, the LinkedIn posts, they all carry the same message. The field reinvents itself constantly. Keep up or get left behind.

I've been writing production software for over a decade. The longer I do this, the more that narrative feels like a miscalibrated lens.

Here's the thesis, stated plainly: **most of what changes in software affects how we interact with systems, not the constraints those systems operate under, and confusing the two leads to costly mistakes.**

---

## Interface vs. Constraint — Why the Distinction Matters

Most conversations about change in software conflate two different layers. Call it the **interface/constraint split**.

The **interface layer** changes constantly. Framework APIs, tooling ergonomics, deployment targets, frontend conventions — the churn here is real and fast. Rails 4 to Rails 7 changed how you structure applications meaningfully. That's not cosmetic.

The **constraint layer** changes slowly, through expensive trade-offs, not frequent reinvention. Interfaces change for ergonomics. Constraints change only when a genuine trade-off is renegotiated — and that's rare.

The relational model Codd formalized in 1970 is what you're using when you write `SELECT * FROM users WHERE active = true`. B-trees — invented in 1970 — are still the dominant index structure in PostgreSQL and MySQL. TCP/IP is fifty years old and moves your data across every system you've built. These haven't survived out of inertia. They've survived because the underlying trade-offs they encode haven't been superseded.

The transformer architecture behind current LLMs is instructive here. The attention mechanism was formalized in *Attention Is All You Need* (2017), built on backpropagation from the 1980s, running on linear algebra that predates modern computing entirely. What changed between 2017 and now isn't the underlying mathematical primitives — it's the scale at which they can be applied. Compute, data volume, and infrastructure shifted the practical constraints under which these systems operate. Those are real advances. But they're advances in applied scale, not in the constraint layer itself.

Much of the code we write today is still compatible with abstractions that have existed for decades — POSIX, TCP/IP, the relational model — even as the interfaces around them evolve. If you can't identify which constraint a new technology actually changes, you're probably looking at an interface shift, not a fundamental one.

---

## What Happens When Teams Confuse the Two

This isn't an academic distinction. Misreading which layer you're working in produces predictable, recurring failures.

**Rewrites replace refactoring.** If the framework feels dated, the instinct is to start over. But rewrites have a long history of underdelivering — not because the new technology is wrong, but because the original problems travel with you.

Here's a pattern I've watched play out: a team decides their Rails monolith has become unmaintainable. The real problems are unclear ownership boundaries, inconsistent data modeling, and business logic scattered across callbacks and controllers. The decision is made to migrate toward microservices. Six months later, they have distributed failures instead of local ones, duplicated business logic across services, and worse observability than before. The issue wasn't choosing microservices — it was choosing them as a solution to problems they don't solve. The constraint-layer problems — data integrity, clear ownership, bounded contexts — were never addressed. They were redistributed.

**Engineers optimize for breadth over depth.** If the landscape shifts constantly, why invest deeply in anything? This is a rational response to a bad incentive structure. But it produces engineers who can stand up a new service quickly but can't explain why their query plan is scanning 800k rows when it should be hitting an index.

**The actual hard problems stay invisible.** Requirements problems have been the dominant cause of software project failure since Brooks documented it in the 1970s. The Standish Group's CHAOS reports have tracked this for thirty years. The finding is stubbornly unchanged: unclear requirements, not technology choices, drive most failures. But requirements work is unglamorous. It doesn't generate conference talks or framework releases. So the industry under-invests in it while debating REST vs GraphQL.

---

## Why the Churn Gets Manufactured

Some of the perceived pace of change is structural, not organic.

Hiring markets signal competence through tool familiarity, not depth of understanding. Listing a specific framework version in a job description is easy to screen for. Evaluating systems thinking is harder. So frameworks become proxies for capability, which creates demand for framework churn independent of whether the new framework is better.

Conference economies run on novelty — selection pressure favors it over depth. A talk on B-tree index internals is less likely to be accepted than a talk on a new Rust-based query engine, regardless of which one would make more engineers more effective. The selection pressure shapes what gets amplified.

VC-driven tool ecosystems have incentives to establish new categories, not improve existing ones. "We do what Postgres does, but for the modern data stack" is a fundable pitch. "We help you use Postgres better" is not.

None of this makes new tools untrustworthy. It means your evaluation of what's worth learning should be independent of what's getting attention.

---

## Principles

These aren't general recommendations. They follow directly from the interface/constraint split.

**Allocate learning time by half-life.** Data modeling, concurrency, debugging methodology, and systems design have decades-long half-lives. React's API does not. A reasonable heuristic: spend the majority of your deliberate learning time on concepts that will still apply in ten years, and treat specific tools as interfaces on top of those concepts — useful to know, but not foundational.

**Use constraint-layer thinking to evaluate what's new.** When something appears, ask: what constraint does this actually change? If the answer is mostly ergonomics or developer experience, it's an interface shift. If the answer involves a different trade-off in consistency, availability, or durability — that's worth studying as a real shift. LSM trees vs. B-trees is a genuine constraint trade-off. A new ORM syntax is not. And if you can't identify the constraint being changed, you're not looking at a fundamental shift.

**The "legacy" label is often a misdiagnosis.** Old code that works isn't legacy code. Legacy code is code that's hard to change safely. Those are different problems. Before calling something legacy, ask: can I test it? Can I change it safely? If yes, the problem isn't the age of the code — it's something else.

**Rewrites require a burden of proof.** The question isn't "is this code old?" It's "have I correctly identified what's broken, and does a rewrite actually fix it?" Constraint-layer problems can usually be addressed incrementally. Incrementalism is less dramatic. It's also more likely to work.

---

## Mentor's Note

If you're earlier in your career, the pace of the industry can feel disorienting. There's always something new, and it can seem like experienced engineers already know all of it.

They don't. What they have is a stable foundation that lets them learn new things faster. When a senior engineer evaluates a new database quickly, it's not because they already know that database. It's because they know what questions to ask about any database: What's the consistency model? What does the write path look like? What trade-off was made to achieve the headline feature?

Those questions come from constraint-layer thinking. They transfer across every new tool that appears.

The engineers who struggle chasing novelty aren't undisciplined — they've been optimizing against the wrong signal. The interface layer rewards you immediately and visibly for keeping up. The constraint layer rewards you quietly, over years.

That's a harder bet to make early on. It's still the right one.
