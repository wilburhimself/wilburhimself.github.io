---
title: "The Two Sources of Noise Every LLM Evaluation System Must Handle"
date: "July 22, 2026"
tags: ["llm", "testing", "evaluation", "reliability", "architecture"]
excerpt: "LLM evaluation is probabilistic. If you treat your LLM judges like unit tests, you'll chase ghosts. Here is how to separate the two sources of noise and build an evaluation pipeline you can trust."
---

*Traditional tests are binary. LLM evaluations are a forecast.*

---

We spent three weeks chasing ghosts in our prompt templates. We'd run our benchmark, get an 84%, tweak a word, and see it drop to 81%. We'd revert the change, run it again, and watch it swing to 87%.

Nothing in the code had changed.

LLMs aren't unit tests. They're probabilistic, but we treated them like compiled binaries. When your test suite is a forecast, a single scoreboard is a lie.

---

## Why scoreboards lie

A score looks like a measurement. It isn't. It's an estimate.

If you've run A/B tests or performance benchmarks, you've dealt with statistical noise. LLMs just make it impossible to ignore.

To build an eval system you can trust, you must separate the noise. It comes from two places:

When the inputs are ambiguous, fix the inputs.
When the judge is inconsistent, fix the judge.
The hardest part is knowing which problem you have.

Every score change asks: Did the model change? Did the prompt change? Or did the measurement change? Treating them all as "the score changed" is how evaluation pipelines lose credibility.

---

## Problem 1: The input is ambiguous

Imagine a user replies with a single word: "Stop".

For an SMS bot, that's an opt-out. For customer support, they might be frustrated or just pausing the session. Without context, both are correct. Even human evaluators will disagree. The ambiguity is baked into the conversation itself.

Statisticians call this aleatoric uncertainty. In plain English: the input lacks the information needed for a single correct answer. Improving the judge won't fix this. You're optimizing the wrong side of the equation.

### Fixing the inputs

To clean up inputs, we changed how we built benchmarks:

* We passed the last three turns of history. Single-turn conversations often lack the context needed for a reliable evaluation.
* We stopped writing synthetic test cases. Now, we strip personal data from real production sessions and use those as fixtures.
* We tagged prompts with multiple valid replies, preventing the judge from penalizing correct but unexpected answers.

---

## Problem 2: The judge is inconsistent

Now look at the other side: a clean prompt and a correct model output, but the LLM judge gives it a 3 out of 5. Five minutes later, the exact same output gets a 5.

Nothing changed, but the score did. This is epistemic uncertainty: noise in the measurement, not the task.

This noise usually comes from three places:

* Hosted model nondeterminism. Even at temperature 0, hosted models can return different outputs over time due to backend updates or load balancing.
* Vague rubrics. If you ask a judge whether a response is "helpful," it must invent a definition on every run.
* Model bias. LLMs favor their own writing, prefer longer answers, and lean toward the first option in a list.

### Fixing the judge

Here is how we stabilized our evaluations:

* We ensemble evaluations across multiple models (Claude, GPT-4, Gemini) and flag the run if they disagree.
* We run the same suite three times in a row to calculate baseline standard deviation. An 84% score is never a static number; it's **84% ± 3%**.
* We score along binary, objective axes. Instead of asking for a 1-to-5 rating, we ask yes-or-no questions: Did it answer? Did it hallucinate? Was the tone polite?

---

## Designing a better eval architecture

If you don't know where your noise is coming from, you'll waste weeks tuning the wrong thing. You can't prompt-engineer your way out of an ambiguous input, and you can't fix hosted model nondeterminism by rewriting your benchmark.

Once we separated the noise, our design fell into place. We stopped trying to hit 100% correctness and focused on confidence intervals. We ensembled evaluations to flag judge drift, and we stopped treating variance as a bug and started treating it as a property of the system.

---

## Stop chasing the scoreboard

Unit tests are binary. LLM evaluations are more like performance benchmarks or A/B tests: they don't prove correctness, they estimate confidence.

Once you stop treating evals like unit tests, you stop chasing minor fluctuations. The goal isn't a perfect green checkmark. It's to build enough statistical confidence to ship.
