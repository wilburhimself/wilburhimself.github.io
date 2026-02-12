---
title: "Stop managing threads, start modeling systems"
date: "2025-07-28"
excerpt: "Effective concurrency requires thinking in terms of systems rather than low-level thread management. Languages like Elixir and Go enable this shift through lightweight processes and message passing that align with system thinking."
tags: ["concurrency", "system-design", "elixir", "go"]
---

Two languages stand out for how they embrace concurrency:

- Elixir
- Go

Plenty of languages support concurrency: Rust, Kotlin, even Java with enough effort. But Elixir and Go do more than support it. They shape your thinking around it.

In Elixir, you model systems with lightweight, isolated processes ... part of the same philosophy that powers telecom switches and WhatsApp. In Go, goroutines and channels make it easy to build concurrent code without drowning in threads or callbacks.

Neither asks you to micromanage memory or juggle locks. Instead, they teach you to compose behavior, to think in terms of flows, fault boundaries, and message passing.

That shift, from managing threads to modeling systems is subtle, but it changes everything.

For me, Elixir made concurrency feel natural, like I was building living systems. Go made it feel simple, like I didn't need to outsmart the runtime just to get things done.

Not the only languages to take concurrency seriously. But the only two that rewired how I build software.

#concurrency #elixir #go
