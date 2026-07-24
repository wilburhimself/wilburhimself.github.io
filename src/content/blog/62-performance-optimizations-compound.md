---
title: "Why Performance Improvements Compound"
date: "July 6, 2026"
tags: [performance, systems, engineering, optimization]
excerpt: "Mature systems rarely waste time inside algorithms. They waste time moving data between them—and that is why optimizations compound."
---

*Mature systems rarely waste time inside algorithms. They waste time moving data between them.*

---

We love performance stories with a dramatic ending: a missing index found, a cache doubled, a config line changed. But systems rarely slow down from a single catastrophic choice. They slow down because dozens of small inefficiencies accumulate.

As systems grow, the boundaries between components become the main source of overhead. That's why performance work compounds: every optimization removes friction that cap the value of the next one.

---

## The cost of boundaries

Every time data crosses a boundary—between functions, processes, or physical servers—you pay a tax. In modern application architectures, it's rarely the raw math that throttles a system. It's the serialization of JSON payloads, context-switching scheduler threads, copying bytes between memory regions, or network wrapping.

None of these operations are expensive enough to trigger alerts on their own. Together, they define your latency profile. In a multi-stage pipeline, removing one bottleneck immediately makes the next stage's speedup twice as valuable.

---

## The compounding pipeline

Imagine a request that takes 100 milliseconds:
* 40ms parsing JSON
* 50ms running model inference
* 10ms network transfer

If you optimize inference to be twice as fast (dropping it to 25ms), total request time drops to 75ms—a 25% speedup. The parsing bottleneck dominates.

If you only optimize parsing to be 4x faster (dropping it to 10ms), request time drops to 70ms—a 30% speedup.

But if you do both:
* Original: 40ms + 50ms + 10ms = 100ms
* Optimized: 10ms + 25ms + 10ms = 45ms

Individually, they saved 25ms and 30ms. Together, they cut latency by 55%, more than doubling throughput.

This is Amdahl’s Law in practice. Speeding up parsing unlocked the value of the inference change. Optimizations compound because each one shifts where the system spends its time, increasing the leverage of the next.

---

## Case study: An embedding pipeline

We recently ran into this while optimizing an embedding inference pipeline.

We assumed the machine learning model was the bottleneck. It wasn't. Profiling revealed two completely different issues:

1. PyTorch and OpenMP were spawning 240 conflicting threads, causing the CPU scheduler to thrash.
2. We were transmitting 1,536-dimensional float arrays as text-based JSON, which ate up Rails CPU cycles during parsing.

The Rails process spent more CPU parsing the embeddings than the model spent generating them.

Separately, the fixes were minor. Together, they shifted the limits of the system:

```
Baseline: 7.3 req/s

Step 1 (Fix PyTorch/OpenMP thread thrashing): 11.5 req/s (1.6x)
Step 2 (Unpack Base64 binary instead of parsing JSON): 13.9 req/s (1.2x)

Total improvement: 1.9x throughput.
```

Removing the parsing bottleneck didn't just reduce latency. It increased the value of every optimization behind it. Had we only focused on the model, or only on the Rails serialization code, we would have concluded that our servers were at their physical limits and paid for more expensive hardware.

---

## Bottlenecks shift

Every successful optimization invalidates your previous profile.

Optimizing components in isolation usually fails because systems don't execute in isolation. If you make Component A twice as fast, but Component B is waiting on a lock, the system just shifts the bottleneck.

Performance tuning is an iterative discipline: you observe, isolate, fix, and measure again. The fix itself isn't the point—it's that the next bottleneck has now moved somewhere else.

---

## Stop looking for "the" bottleneck

Junior engineers search for "the" bottleneck. Senior engineers look for where work is being repeated.

Systems rarely slow down in spectacular ways. They die by a thousand papercuts: a redundant copy, an extra query, an oversized JSON payload, a scheduler conflict. None of them is expensive enough to justify attention on its own. Together, they dictate your system's limit.

The first bottleneck you find is simply the first one preventing you from seeing the next. Performance engineering is the disciplined removal of friction wherever work crosses boundaries.

Mature systems don't become fast because of one brilliant optimization. They become fast because dozens of ordinary improvements finally begin reinforcing one another.
