---
title: "After the Outbox: Monitoring and Alerting for Your Rails Event Pipeline"
date: "October 25, 2025"
excerpt: "The Outbox Pattern ensures at-least-once delivery, but what happens when your outbox table grows or the processor fails? We'll cover how to build dashboards and set up alerts to track queue depth, processing latency, and error rates, turning your eventing system into a truly observable component."
---

You’ve successfully implemented the [Outbox Pattern](/blog/38-the-outbox-pattern-reliable-event-publishing-without-distributed-transactions) in your Rails application. Your database transaction now atomically saves your business model and the corresponding event to be published. A separate process picks up the event and sends it to your message broker. You’ve eliminated distributed transactions and achieved reliable event publishing. Congratulations!

But your work isn’t done. You’ve traded one problem for another. Instead of worrying about whether your events are being sent, you now need to worry about the health of the outbox itself. The outbox pattern is not a fire-and-forget solution; it’s a piece of critical infrastructure that requires its own monitoring and alerting.

Without it, you are flying blind. A silent failure in your event processor could lead to a massive backlog of unprocessed events, and you wouldn’t know until your users start complaining that their orders haven’t been processed or their notifications haven’t been sent.

Here’s how to make your outbox observable.

### Key Metrics for an Observable Outbox

To understand the health of your outbox, you need to track three key metrics:

1.  **Queue Depth:** How many unprocessed events are in your outbox table? This is the most critical metric. A consistently growing queue depth is a sign that your event processor is falling behind or has stopped working altogether.
2.  **Processing Latency:** How long does it take for an event to be processed after it’s created? This is the time difference between `created_at` and the time the event is successfully published. High latency could indicate a problem with your message broker or a performance issue in your processor.
3.  **Error Rate:** How many events are failing to be processed? You need to distinguish between transient errors (which can be retried) and permanent failures (which require manual intervention).

### Building the Dashboard

Your monitoring dashboard is your single pane of glass for the health of your outbox. It should display these three metrics in a way that is easy to understand at a glance.

Let’s assume you have an `outbox_events` table with a `status` column (`pending`, `processing`, `published`, `failed`).

**1. Queue Depth**

This is a simple count of the events that are waiting to be processed.

```sql
SELECT COUNT(*) FROM outbox_events WHERE status = 'pending';
```

Graph this metric over time. It should be a relatively flat line. A saw-tooth pattern is normal (events are created, then processed), but a steady upward trend is a red flag.

**2. Processing Latency**

To measure latency, you need to track when an event is published. You can add a `published_at` timestamp to your `outbox_events` table.

```sql
-- p95 processing latency over the last hour
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY (published_at - created_at)) 
FROM outbox_events 
WHERE published_at > NOW() - INTERVAL '1 hour';
```

Why p95? The average latency can be misleading. A few very slow events can skew the average. The 95th percentile tells you that 95% of your events are being processed within a certain time, which is a much better indicator of the user experience.

**3. Error Rate**

This is a count of the events that have failed to be processed.

```sql
SELECT COUNT(*) FROM outbox_events WHERE status = 'failed';
```

You should also group this by the error message to identify the most common causes of failure.

### Actionable Alerting

A dashboard is great for visibility, but you also need alerts to notify you when something is wrong.

*   **Alert on Queue Depth:** This is your most important alert. If the number of pending events exceeds a certain threshold (e.g., 1000), or if it has been steadily increasing for more than 15 minutes, you need to be notified.
*   **Alert on High Latency:** If the p95 processing latency exceeds your SLO (e.g., 30 seconds), it’s a sign that your system is slowing down.
*   **Alert on Failed Events:** A single failed event might not be a crisis, but a sudden spike in the failure rate is. Alert if the number of failed events in the last hour exceeds a certain threshold.

As with any alert, these should be actionable. The alert notification should include a link to a runbook that explains how to diagnose and fix the problem.

### The Runbook: Your First Responder’s Guide

Your runbook for an outbox alert should include steps like:

1.  **Check the event processor logs:** Are there any errors? Is the processor running?
2.  **Check the message broker:** Is it up? Is it accepting connections?
3.  **Check the database:** Is the `outbox_events` table locked? Is the database under heavy load?
4.  **Inspect the failed events:** Is there a common pattern? Is it a problem with a specific event type or a specific payload?

### From Reliable to Observable

The Outbox Pattern is a powerful tool for building reliable distributed systems. But reliability is not enough. Your systems must also be observable.

By treating your outbox as a critical piece of infrastructure and instrumenting it with the right metrics, dashboards, and alerts, you can move from a state of hoping your events are being delivered to knowing they are. This is the difference between a fragile system and a resilient one.
