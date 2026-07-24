---
title: "The Outbox Pattern Isn't Free"
date: "July 8, 2026"
tags: ["patterns", "distributed-systems", "rails", "reliability", "architecture"]
excerpt: "The Outbox Pattern solves the dual-write problem, but it isn't free. From database write amplification to retention strategies and duplicate execution, here are the real costs of transactional reliability."
---

*Reliable systems don't eliminate failure. They decide where failure is allowed to happen.*

---

If you've written code like this in a Rails app, you've set a trap:

```ruby
Order.transaction do
  order.save!
  OrderCreatedJob.perform_async(order.id)
end
```

It works fine in staging. In production, Redis will eventually go down, the database transaction will roll back, or the process will crash mid-transaction. When that happens, your database commits but the job is lost—or the transaction rolls back but the job runs anyway.

This is the dual-write problem: trying to make two independent databases behave like a single atomic transaction. They won't.

Using a local database table as a temporary, durable message queue solves this consistency issue. But every architectural pattern comes with a bill. The outbox pattern is no exception.

---

## Shifting the problem

The outbox pattern doesn't make distributed systems magically consistent. It just shifts the boundary.

Instead of writing to both your database and an external queue inside the same controller action, you write only to your database. You save the business record (like an order) and insert an event payload into an `outbox_events` table within the same transaction:

```text
BEGIN
INSERT orders
INSERT outbox_events
COMMIT
```

Either both records are saved, or neither is. Once the transaction commits, a separate background process reads the `outbox_events` table and publishes the messages to your broker (Kafka, RabbitMQ, or Sidekiq).

Your database remains the source of truth. Everything else becomes eventually consistent.

---

## Sidekiq is not an outbox

A common mistake is assuming that background job libraries like Sidekiq solve this consistency problem.

They don't.

Sidekiq handles retries, concurrency, backoffs, and scheduling. But it cannot make Redis and PostgreSQL transactional. They are two separate databases with different durability guarantees.

The safest design lets each tool do what it does best: the outbox guarantees persistence, and Sidekiq guarantees execution.

---

## A clean integration

We can build a reliable outbox integration using standard Active Record callbacks:

1. **Inside the transaction:** Save your record and insert the event into `outbox_events` as pending.
2. **On commit:** Trigger an `after_commit` hook to enqueue a background job.
3. **Outside the transaction:** The background job reads the pending events, publishes them to your broker, and updates the database.

If Redis is down when the transaction commits, the enqueue step fails, or the background job crashes, no events are lost. The event payload is already safe in your database. A scheduled cron job can scan for unpublished events later and retry them.

---

## The hidden operational costs

The outbox pattern is popular because it works, but it adds real weight to your database.

### 1. Write amplification
Every event-producing action now requires two writes instead of one:
```sql
INSERT INTO orders ...;
INSERT INTO outbox_events ...;
```
You are doubling the write volume for your core transactions. This means more Write-Ahead Log (WAL) generation, more index updates, more replication traffic, and more autovacuum pressure. For high-volume systems, this is a significant tax.

### 2. Table bloat
Every published event leaves a row behind. If you process millions of events, your outbox table will grow out of control. You must implement a retention strategy: partition the table, archive old events to cold storage, or prune processed rows daily. If you ignore it, query times will degrade.

### 3. Polling overhead
If you write a naive dispatcher that polls the database every second:
```sql
SELECT * FROM outbox_events WHERE published = false LIMIT 100;
```
you are running a heavy query continuously, even when the system is idle. When you scale to dozens of microservices, this polling creates massive, invisible database load. You'll need adaptive backoffs or database triggers (like PostgreSQL's `LISTEN/NOTIFY`) to keep it quiet.

### 4. Out-of-order events
Suppose three events are written in order: `UserCreated`, `UserUpdated`, and `UserDeleted`. If multiple dispatchers process the queue in parallel, the consumer might receive the update before the creation. The outbox pattern guarantees delivery, not order. If order matters, you have to partition your consumers or add sequence numbers.

### 5. Duplicate delivery
If your dispatcher publishes an event successfully but crashes before updating the database record to `published = true`, it will publish the event again on restart. This is a property of at-least-once delivery. Every consumer downstream must be idempotent. If a duplicate event breaks your system, your consumer is not production-ready.

---

## Operational guidelines

If you run an outbox in production, a few engineering decisions will save you a lot of pager alerts:

* We store only database IDs in the outbox table, not entire serialized records. Large payloads bloat the database, clog replication streams, and slow down your backups.
* We use partial indexes. The dispatcher queries the outbox table constantly looking for unpublished events. A partial index (e.g., `WHERE published = false`) keeps these queries cheap, even when the table grows to millions of rows.
* We publish in batches of 100 to 500 events. Enqueuing a job per event doesn't scale, and processing 10,000 at once locks up your database.
* We monitor queue lag instead of just errors. A slow dispatcher is often more dangerous than a failing one. Track the time difference between when an event is created and when it is marked published.

---

## When to use it

Not every application needs this complexity.

A monolith sending a welcome email doesn't need an outbox. Neither does a simple CRUD app with no integrations. The outbox pattern is worth the cost when losing an event creates a business disaster: payment processing, billing, inventory, or order fulfillment.

Its value is defined by the cost of failure.

---

## Stop looking for free reliability

The biggest lesson of the outbox pattern is that reliability is never free.

You can pay with distributed transactions, operational complexity, extra storage, or you can pay with occasional data loss. The Outbox Pattern just chooses a cost that most production systems can live with. In my experience, that's usually the right trade.
