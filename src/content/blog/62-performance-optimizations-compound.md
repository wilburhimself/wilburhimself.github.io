---
title: "Why Performance Improvements Compound"
date: "July 6, 2026"
tags: [performance, systems, engineering, optimization]
excerpt: "Mature systems rarely waste time inside algorithms. They waste time moving data between them—and that is why performance fixes compound."
---

Most performance writeups feature a silver bullet: a missing index added, a cache TTL doubled, or a database pool size bumped. But production software rarely stalls from a single mistake. It slows down because five small inefficiencies stack on top of each other.

When systems scale, component boundaries become the primary latency bottleneck. That's why speedups compound: fixing one bottleneck unlocks headroom for the next.

---

## The cost of boundaries

Every time data crosses a boundary—between functions, IPC sockets, or networks—you pay overhead. In web services, raw math rarely throttles execution. The time goes to serializing JSON payloads, thread context switches in the CPU scheduler, memory copy operations, or TLS wrapping.

Individually, none of these steps trigger APM alerts. Combined, they define your latency floor. In a multi-stage request pipeline, clearing one stall immediately amplifies the payoff of subsequent fixes.

---

## How pipeline speedups stack

Take a request spending 100ms total across three steps:
* 40ms parsing JSON payloads
* 50ms running model inference
* 10ms network transfer

Cutting inference time in half (to 25ms) drops total request duration to 75ms. That's a 25% win, but the JSON parser now dominates execution time.

If you instead rewrite the parser to run 4x faster (10ms), total time drops to 70ms—a 30% gain.

Do both together:
* Original: 40ms + 50ms + 10ms = 100ms
* Fixed: 10ms + 25ms + 10ms = 45ms

Isolated, those changes saved 30ms and 25ms. Combined, they cut latency by 55% and doubled throughput.

This is Amdahl’s Law. Speeding up serialization unlocked the headroom created by the inference work. Each fix shifts where the CPU spends its time, amplifying the impact of the next change.

---

## Profiling an embedding service

We hit this directly while tuning an embedding pipeline in production.

We assumed PyTorch inference was the bottleneck. Profiling proved us wrong. The system had two unrelated bugs:

1. PyTorch and OpenMP were spawning 240 competing worker threads, thrashing the OS thread scheduler.
2. The Rails app serialized 1,536-dimensional float vectors as text JSON, consuming more CPU cycles parsing strings than PyTorch spent generating tensors.

The Ruby process literally burned more CPU cycles turning floats into JSON strings than the ML model spent executing matrix math.

Fixed individually, the patches looked modest. Applied together, throughput doubled:

```
Baseline: 7.3 req/s

Fix 1 (Cap PyTorch/OpenMP worker threads): 11.5 req/s (1.6x)
Fix 2 (Unpack Base64 binary vectors directly): 13.9 req/s (1.2x)

Combined result: 1.9x throughput (13.9 req/s)
```

Replacing JSON string parsing didn't just shave milliseconds off serialization. It allowed the thread scheduler fix to reach its full effect. Focusing solely on PyTorch inference or Ruby code would have led us to buy larger instances prematurely.

---

## Moving the bottleneck

Every effective speedup changes your latency profile.

Tuning isolated functions without profiling the entire path usually fails. If you make a database query twice as fast while a downstream service holds a mutex, the latency simply migrates to the lock.

Performance work is iterative: profile, isolate, patch, re-measure. The point isn't just fixing the current stall. It's pushing the bottleneck to the next boundary until the system reaches its physical limits.
