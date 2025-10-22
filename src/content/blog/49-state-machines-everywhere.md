---
title: "Building Bulletproof State Machines: Migrations, Locking, and Audit Trails in Rails"
date: "October 21, 2025"
excerpt: "Implicit state is a breeding ground for bugs. We'll refactor a typical Rails model to use a production-ready state machine, covering migrations, race conditions, testing, and audit trails to make your code safer and easier to reason about."
---

Your application is full of state, whether you model it explicitly or not. A user is `new`, then `active`, then `suspended`. An order is `pending`, then `paid`, then `shipped`. Too often, we manage this with a collection of booleans and timestamps: `paid_at`, `shipped_on`, `is_active`. This seems simple, but it creates a combinatorial explosion of possibilities that breed bugs, security holes, and confusing logic.

What does it mean if an order is `paid_at` but not `shipped_on`? What if a user is `suspended` but `can_login` is still true? Answering these questions leads to defensive code scattered across your application. The solution is to make the implicit explicit with a state machine.

A state machine is a simple concept: an object can only be in one of a finite number of states at any given time. It can only transition between states through predefined events. Let's explore how to apply this pattern in Rails for production using the popular [AASM](https://github.com/aasm/aasm) gem.

### The Anatomy of an Implicit State Mess

Consider a typical `Order` model where business logic is unenforced. To compensate, we write brittle checks everywhere the state can change:

```ruby
# In a controller...
if @order.paid_at.present? && @order.shipped_at.nil?
  @order.ship!
end

# In a background job...
def perform(order_id)
  order = Order.find(order_id)
  # This logic is subtly different. Is that intentional?
  if order.paid? && !order.shipped?
    order.ship!
  end
end
```

The business logic is smeared across the codebase, becoming inconsistent and hard to refactor.

### Introducing AASM: Making States Explicit

Let's refactor the `Order` model with AASM. First, add `gem 'aasm'` to your `Gemfile` and run `bundle install`.

#### 1. The Migration: A Solid Foundation

A simple `add_column` is not enough. We need a robust migration that handles existing data, ensures new data is valid, and optimizes for performance.

```bash
rails generate migration AddAasmStateToOrders aasm_state:string
```

Then, edit the migration file to make it production-ready:

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_aasm_state_to_orders.rb
class AddAasmStateToOrders < ActiveRecord::Migration[7.0]
  def up
    add_column :orders, :aasm_state, :string, default: 'pending', null: false
    add_index :orders, :aasm_state

    # Backfill existing records with reasonable defaults.
    # This is crucial to avoid breaking your app for old orders.
    # Adjust this logic based on your actual legacy columns and values.
    execute <<-SQL
      UPDATE orders
      SET aasm_state = CASE
        WHEN status = 'delivered' THEN 'delivered'
        WHEN status = 'cancelled' THEN 'cancelled'
        WHEN status = 'returned' THEN 'returned'
        WHEN shipped_at IS NOT NULL THEN 'shipped'
        WHEN paid_at IS NOT NULL THEN 'paid'
        ELSE 'pending'
      END
    SQL
  end

  def down
    remove_column :orders, :aasm_state
  end
end
```
This migration does three critical things:
1.  **`default: 'pending', null: false`**: Ensures all new orders start in a valid state and the column can never be `NULL`.
2.  **`add_index`**: The `aasm_state` column will be used in `WHERE` clauses constantly. An index is essential for performance.
3.  **Backfill `UPDATE`**: It intelligently sets the state for existing records based on your legacy `status` and timestamp columns, ensuring a smooth transition.

#### 2. Defining the State Machine

Now, we can define the lifecycle in the model:

`app/models/order.rb`:
```ruby
class Order < ApplicationRecord
  include AASM

  aasm do # column: 'aasm_state' is inferred
    state :pending, initial: true
    state :paid, :shipped, :delivered, :cancelled, :returned

    event :pay do
      transitions from: :pending, to: :paid
    end

    event :ship do
      transitions from: :paid, to: :shipped
    end
    # ... other events
  end
end
```

### The Benefits of Explicit State

#### Safety: Invalid Transitions are Prevented

The state machine now enforces your business rules. What happens if we try to ship an unpaid order?

```ruby
order = Order.create! # state is :pending
order.ship!
# => AASM::InvalidTransition: Event 'ship' cannot transition from 'pending'.
```

This isn't magic; it's an exception. In production, you must handle it. Don't let background jobs crash because a user's action made a transition invalid.

```ruby
def process_shipment(order)
  order.ship!
rescue AASM::InvalidTransition => e
  # Log for investigation, but don't crash the worker
  Rails.logger.warn("Invalid ship attempt for order #{order.id}: #{e.message}")
  Metrics.increment('order.invalid_transition', tags: ["event:ship", "state:#{order.aasm_state}"])
end
```

#### Cleaner, More Intentional Code

The messy conditionals are replaced by intention-revealing methods.

```ruby
# Before
if @order.paid_at.present? && @order.shipped_at.nil?
  @order.ship!
end

# After
if @order.may_ship?
  @order.ship!
end
```

### Production-Ready State Machines

The basics are great, but production systems have more challenges.

#### 1. Keeping Transitions Fast: Beware of Heavy Callbacks

Callbacks are powerful, but they execute *during* the state transition. Heavy work will block the transaction and slow down your application.

```ruby
event :ship do
  transitions from: :paid, to: :shipped
  after do
    # ⚠️ ANTI-PATTERN: This will be SLOW and can cause N+1 queries.
    order.line_items.each { |item| item.notify_supplier! }

    # ✅ BETTER: Move to a background job.
    ShipmentNotificationJob.perform_later(self.id)
  end
end
```

#### 2. Creating a Complete Audit Trail

You need to know *when* and *why* a state changed. We can create a simple audit model and use an `after_all_transitions` hook. You'll need a `StateChange` model with columns like `from_state`, `to_state`, `event`, `triggered_by_id`, and `metadata (jsonb)`.

```ruby
# app/models/order.rb
has_many :state_changes

aasm do
  # ... states and events ...

  after_all_transitions do
    state_changes.create!(
      from_state: aasm.from_state,
      to_state: aasm.to_state,
      event: aasm.current_event,
      triggered_by_id: Current.user&.id, # Assumes Current.user is set
      metadata: { ip_address: Current.ip_address } # Example metadata
    )
  end
end
```

#### 3. Handling Concurrency and Race Conditions

What happens if two workers try to `ship!` the same order? While AASM events are transactional, you can still have race conditions where one process reads a state, another process changes it, and the first process then acts on stale data. You can prevent this with locking.

*   **Pessimistic Locking**: Lock the database row *before* you attempt the transition. This is the safest approach for high-contention operations.

    ```ruby
    # In a service or controller
    def ship_order(order_id)
      Order.transaction do
        order = Order.lock.find(order_id) # Lock the row until the transaction commits
        order.ship!
      end
    end
    ```

*   **Optimistic Locking**: Add a `lock_version` integer column to your table. Rails will automatically increment it on each update and raise `ActiveRecord::StaleObjectError` if another process has modified the record since it was read.

### Testing Your State Machine (For Real)

Don't just test that the gem works. Test your business logic, especially how side effects and transactions behave.

```ruby
RSpec.describe OrderPaymentService do
  # Test business logic in a service object
  it 'pays an order and sends a receipt' do
    order = Order.create!(state: 'pending')
    mailer = double("OrderMailer", deliver_now: true)
    allow(OrderMailer).to receive(:receipt_email).with(order).and_return(mailer)

    OrderPaymentService.new.call(order)

    expect(order.reload).to be_paid
    expect(mailer).to have_received(:deliver_now)
  end

  it 'does not change state if sending the receipt fails' do
    order = Order.create!(state: 'pending')
    allow(OrderMailer).to receive(:receipt_email).and_raise("SMTP Error")

    # The service should wrap the entire operation in a transaction
    expect { OrderPaymentService.new.call(order) }.to raise_error("SMTP Error")
    expect(order.reload).to be_pending
  end
end
```

### Where State Machines Shine (and Where They Don't)

This pattern is powerful for modeling linear, well-defined lifecycles like publishing workflows or subscription statuses. However, they are the wrong tool for modeling logic with many independent, combinatorial attributes.

For example, **don't** model complex permissions with a state machine:
```ruby
# ANTI-PATTERN: Combinatorial explosion of states
class User
  aasm do
    state :basic_user
    state :power_user_us_morning
    state :power_user_eu
    # ... this is unmanageable
  end
end
```

**Do** use a dedicated role/permission system for that kind of logic:
```ruby
# BETTER: Use a role-based system
class User
  has_many :roles
  def can?(action)
    roles.any? { |role| role.permits?(action) }
  end
end
```

### The Cost of Implicit State

If you're not using a state machine, you are still implementing one—it's just an implicit, ad-hoc, and likely buggy one, spread across your codebase. The `if user.is_admin? && user.active?` checks are a symptom of this hidden machine.

By making your states and transitions explicit, you trade a small amount of upfront design for a massive reduction in complexity and bugs. The result is code that is more robust, easier to understand, and a pleasure to work with.
