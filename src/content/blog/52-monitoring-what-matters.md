---
title: "Monitoring What Matters: Beyond Vanity Metrics in Production Systems"
date: "October 24, 2025"
excerpt: "Your dashboards are full of graphs, but do they tell you what you really need to know? We'll dive into the difference between metrics that look impressive and those that actually help you understand system health, and how to design alerts that respect your on-call engineers' time."
---

We’ve all seen them: the giant TV screens in the office displaying dashboards full of smoothly climbing graphs. Total users, up. Sign-ups per day, up. Revenue, up. These are vanity metrics. They feel good to look at, but they are useless for understanding the health of your system and respecting the time of your on-call engineers.

When something goes wrong at 3 AM, the on-call engineer doesn’t care about the daily sign-up rate. They care about what is broken *right now* and how to fix it. Effective monitoring is not about collecting as much data as possible; it’s about collecting the *right* data and turning it into actionable insights.

This is the art of instrumenting for insight, not for coverage.

### The Four Golden Signals

Google’s SRE book introduced the concept of the “Four Golden Signals” of monitoring. These are the four key metrics that, for most systems, are sufficient to understand its health from a user-facing perspective.

1.  **Latency:** The time it takes to service a request. It’s crucial to distinguish between the latency of successful requests and the latency of failed requests. A fast error is still an error.
2.  **Traffic:** A measure of how much demand is being placed on your system, typically measured in requests per second.
3.  **Errors:** The rate of requests that fail, either explicitly (e.g., HTTP 500s) or implicitly (e.g., a 200 OK with a malformed response).
4.  **Saturation:** How “full” your service is. This is a measure of your system’s capacity, such as CPU utilization, memory usage, or disk space. A system that is consistently at high saturation is at risk of performance degradation.

If you monitor nothing else, monitor these four signals for every service in your stack. They will give you a high-level overview of your system’s health and are often the first indicators of a problem.

### Beyond the Golden Signals: Work-Centric Metrics

The Golden Signals are a great starting point, but they are fundamentally system-centric. To get a deeper understanding of your application, you need to measure the things that matter to your business. These are work-centric metrics.

*   **For an e-commerce site:** How many orders are being placed per minute? What is the latency of the checkout process? What is the error rate of payment processing?
*   **For a video streaming service:** How many users are currently streaming? What is the average buffer rate? How long does it take for a video to start playing?
*   **For a background job system:** What is the queue depth? What is the end-to-end latency of a job (from enqueue to completion)? What is the job failure rate?

These metrics connect the health of your system to the experience of your users. A spike in the checkout process latency is a much more meaningful and actionable alert than a generic CPU utilization alert.

### The Art of the Actionable Alert

An alert that fires at 3 AM should be three things:

1.  **Urgent:** It requires immediate attention.
2.  **Actionable:** The person receiving the alert knows what to do about it.
3.  **Important:** It represents a real problem that is affecting users or the business.

If your alerts do not meet these criteria, you are doing it wrong. Here are some common anti-patterns:

*   **The “CPU is high” alert:** This is the classic meaningless alert. Is high CPU a problem? Maybe, maybe not. A better alert would be “p99 request latency is over 2 seconds,” which is a direct measure of user impact.
*   **The flaky alert:** An alert that fires intermittently and resolves itself is worse than no alert at all. It trains your team to ignore alerts.
*   **The “log everything” alert:** Alerting on every single error is a recipe for alert fatigue. You should alert on the *rate* of errors, not on individual errors.

A good alert should also include a link to a runbook. A runbook is a document that explains what the alert means and provides step-by-step instructions for diagnosing and mitigating the problem. This is a crucial part of respecting your on-call engineers’ time.

### From Vanity to Sanity

Building a sane monitoring and alerting system requires a shift in mindset. It’s not about collecting data; it’s about answering questions.

*   What is the user experiencing right now?
*   Is the system healthy?
*   If not, where is the problem?

Start with the Four Golden Signals. Then, add work-centric metrics that are specific to your business domain. Design your alerts to be urgent, actionable, and important. And for every alert, write a runbook.

By focusing on what matters, you can build a monitoring system that not only helps you fix problems faster but also creates a more sustainable and humane on-call culture for your team.
