---
title: "The Outbox Pattern: Reliable Event Publishing Without Distributed Transactions"
date: "September 18, 2025"
excerpt: "How do you guarantee that an event is sent if, and only if, a database transaction succeeds? The dual-write problem plagues distributed systems, leading to inconsistency and bugs. This post dives deep into the Outbox Pattern, a simple yet powerful solution in Rails to ensure atomic, at-least-once delivery for your critical events."
tags:
  ["patterns", "distributed-systems", "rails", "reliability", "architecture"]
---

In a distributed system, one of the hardest problems is ensuring consistency between services. A classic example is a user signing up: you write the new user to your database, and then you publish a `UserSignedUp` event to a message broker like RabbitMQ or Kafka. Other services listen for this event to kick off their own workflows, like sending a welcome email.

What happens if the database commit succeeds, but the message broker is down and the event fails to publish? You now have a user in your system who never received a welcome email. This is the dual-write problem. Left unaddressed, it creates silent data loss that’s difficult to detect and even harder to reconcile later.

You cannot solve this with a distributed transaction. They are complex, slow, and poorly supported by many modern tools. The solution is a simple and elegant system design pattern: the **Outbox Pattern**.

### The Problem: The Dual-Write Dilemma

The core issue is that you are trying to make two separate atomic operations—a database commit and a message publish—behave as one. This is impossible without a two-phase commit protocol, which is overkill for most applications.

```ruby
# The classic failure mode
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)

    if @user.save
      # What if this fails? The user is saved, but the event is lost.
      EventPublisher.publish("user.signed_up", { user_id: @user.id })
      render :show, status: :created
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end
end
```

Wrapping them in a transaction doesn't help, because the event is published before the transaction commits. If the transaction rolls back later, the event has already been sent, leading to inconsistency.

### The Solution: The Outbox Pattern

The Outbox Pattern solves this by using your local database as a temporary, durable message queue. Instead of publishing the event directly, you save it to a special `outbox` table within the _same database transaction_ as your business logic.

Here’s the flow:

1.  Begin a database transaction.
2.  Create the `User` record.
3.  Create an `Outbox` record containing the event payload.
4.  Commit the transaction.

Now, both the user record and the event record are saved atomically. They either both succeed or both fail. A separate, asynchronous process then reads from the `outbox` table and reliably publishes the events to the message broker.

### Step 1: Create the Outbox Table

First, we need a table to store our outgoing events.

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_outbox_events.rb
class CreateOutboxEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :outbox_events do |t|
      t.string :event_name, null: false
      t.jsonb :payload, null: false
      t.boolean :published, default: false, null: false
      t.datetime :published_at
      t.timestamps
    end
    add_index :outbox_events, [:published, :created_at]
  end
end
```

We have a `published` flag that our background worker will use to find unpublished events. A `published_at` timestamp can also be useful for tracking and for clearing out old, successfully published events.

### Step 2: Write to the Outbox Atomically

Next, modify the user creation logic to use the outbox table. It's critical that this happens inside a transaction.

```ruby
# app/services/user_creation_service.rb
class UserCreationService
  def self.call(params)
    user = User.new(params)

    ActiveRecord::Base.transaction do
      user.save!
      OutboxEvent.create!(
        event_name: "user.signed_up",
        payload: { user_id: user.id, email: user.email }
      )
    end

    user
  end
end
```

Now, the `User` and the `OutboxEvent` are created in a single, atomic transaction. If `user.save!` fails, the outbox event is never created. If the outbox event creation fails, the entire transaction is rolled back, and the user is not saved. Strong consistency between the user record and the outbox entry. The database guarantees they succeed or fail together.

### Step 3: The Publisher Worker

Finally, we need a background process to read from the outbox and publish the events. A Sidekiq worker is a great choice for this.

```ruby
# app/workers/outbox_publisher_worker.rb
class OutboxPublisherWorker
  include Sidekiq::Worker

  def perform
    # Find unpublished events in batches
    OutboxEvent.where(published: false).find_in_batches(batch_size: 100) do |batch|
      batch.each do |event|
        # Use your actual event publisher
        EventPublisher.publish(event.event_name, event.payload)

        # Mark as published
        event.update!(published: true, published_at: Time.current)
      end
    end
  end
end
```

This design guarantees at-least-once delivery. If the worker crashes after publishing but before marking an event as published, the event will be retried. That means downstream consumers must handle duplicates gracefully. In practice, this shifts some responsibility downstream: your event contracts should be idempotent.

For high-throughput systems, you might optimize this worker further by batching database updates (`update_all`) or using a more sophisticated queueing strategy to avoid scanning the table, but the core principle of polling and publishing remains the same.

You can schedule this worker to run every minute using a tool like `sidekiq-cron`.

### Conclusion

The Outbox Pattern is a pragmatic way to handle one of the hardest problems in distributed systems: keeping state consistent across boundaries. By relying on the atomicity of your local database, you avoid the pitfalls of distributed transactions and make event publishing resilient by default. It doesn’t eliminate failure—but it ensures failures are visible, recoverable, and never silently ignored. That’s the real foundation of reliable event-driven systems.
