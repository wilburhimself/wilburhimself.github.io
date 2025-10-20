---
title: "State Machines Everywhere: The Pattern That Makes Implicit Behavior Explicit"
date: "October 21, 2025"
excerpt: "Implicit state is a breeding ground for bugs. We'll explore how explicitly modeling state transitions with state machines solves common problems in order processing, user onboarding, and feature flags, making your code easier to reason about, test, and debug."
---

Your application is full of state, whether you model it explicitly or not. A user is a `new` user, then `active`, then maybe `suspended`. An order is `pending`, then `paid`, then `shipped`, then `delivered` or `returned`. A feature flag is `off`, then `on_for_staff`, then `on_for_everyone`.

Too often, we manage this state implicitly with a collection of boolean flags and timestamps: `paid_at`, `shipped_on`, `is_active`, `can_login`. This approach seems simple at first, but it quickly leads to a combinatorial explosion of possibilities. What does it mean if an order is `paid_at` but not `shipped_on`? What if a user is `suspended` but `can_login` is still true? These implicit states are a breeding ground for bugs, security holes, and confusing logic.

The solution is to make the implicit explicit by using a state machine.

A state machine is a simple concept: an object can only be in one of a finite number of states at any given time. It can only transition from one state to another through predefined events. This constraint is incredibly powerful.

Let's explore how to apply this pattern in Rails using the popular [AASM](https://github.com/aasm/aasm) gem.

### The Anatomy of a Buggy Implicit State Model

Consider a typical `Order` model without a state machine:

```ruby
class Order < ApplicationRecord
  # attributes: status (string), paid_at (datetime), shipped_at (datetime)

  def ship!
    # Can we ship an unpaid order? The code doesn't stop us.
    update!(shipped_at: Time.current, status: 'shipped')
  end

  def charge
    # What if we charge an already shipped order?
    # ... charging logic ...
    update!(paid_at: Time.current, status: 'paid')
  end
end
```

This code is riddled with questions:
*   In what order should these methods be called?
*   What happens if `ship!` is called twice?
*   How do we query for all orders that are paid but not shipped?

This leads to defensive programming scattered throughout the codebase:

```ruby
# In a controller
if @order.paid_at.present? && @order.shipped_at.nil?
  @order.ship!
end
```

This is brittle and hard to maintain. The business logic is smeared across controllers and models.

### Introducing AASM: Making States Explicit

Let's refactor the `Order` model with AASM.

First, add the gem to your `Gemfile`:
```ruby
gem 'aasm'
```

Then, run `bundle install` and add a `aasm_state` column to your model:
```bash
alter table orders add column aasm_state varchar;
```

Now, let's define our state machine:

`app/models/order.rb`:
```ruby
class Order < ApplicationRecord
  include AASM

  aasm do
    state :pending, initial: true
    state :paid, :shipped, :delivered, :cancelled, :returned

    event :pay do
      transitions from: :pending, to: :paid
      after do
        # Trigger side effects like sending a receipt
        send_receipt_email
      end
    end

    event :ship do
      transitions from: :paid, to: :shipped
      after do
        # Send shipping notification
        send_shipping_notification
      end
    end

    event :deliver do
      transitions from: :shipped, to: :delivered
    end

    event :cancel do
      transitions from: [:pending, :paid], to: :cancelled
    end

    event :return do
      transitions from: :delivered, to: :returned
    end
  end

  # ... methods for side effects
end
```

### The Benefits of Explicit State

**1. Invalid Transitions are Impossible**

What happens if we try to ship an unpaid order now?

```ruby
order = Order.create! # state is :pending
order.ship! # => AASM::InvalidTransition: Event 'ship' cannot transition from 'pending'.
```

The state machine protects the integrity of your data. The business rule—"you can only ship a paid order"—is now enforced by the model itself.

**2. Your Code Becomes Self-Documenting**

The `aasm` block provides a clear, readable definition of the object's lifecycle. A new developer can look at this block and immediately understand the flow of an order.

**3. Cleaner, More Intentional Code**

Your controllers and services become much simpler. The messy conditional logic is gone.

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

The `may_ship?` method is provided by AASM and checks if the transition is valid. Your code now speaks in terms of business events (`ship`), not low-level data manipulation.

**4. Simplified Queries**

AASM automatically creates scopes for each state:

```ruby
Order.pending # => returns all orders in the 'pending' state
Order.paid # => returns all paid orders
Order.shipped.count # => returns the number of shipped orders
```

This is far more readable and less error-prone than `Order.where(status: 'paid')` or `Order.where.not(paid_at: nil)`.

**5. Testability**

Testing the behavior of your state machine is straightforward.

```ruby
RSpec.describe Order, type: :model do
  it 'starts in the pending state' do
    order = Order.new
    expect(order).to be_pending
  end

  it 'transitions from pending to paid' do
    order = Order.new
    expect { order.pay! }.to change { order.aasm_state }.from('pending').to('paid')
  end

  it 'does not allow shipping a pending order' do
    order = Order.new
    expect(order).not_to allow_event(:ship)
  end
end
```

### Beyond Order Processing

State machines are everywhere:

*   **User Onboarding:** `pending_confirmation` -> `active` -> `suspended` -> `banned`
*   **Publishing Workflow:** `draft` -> `in_review` -> `approved` -> `published` -> `archived`
*   **Feature Flags:** `disabled` -> `enabled_for_staff` -> `enabled_for_beta_users` -> `globally_enabled`
*   **Background Jobs:** `pending` -> `running` -> `succeeded` -> `failed`

In each case, using a state machine provides the same benefits: clarity, safety, and maintainability.

### The Cost of Implicit State

If you're not using a state machine, you are still implementing one—it's just an implicit, ad-hoc, and likely buggy one, spread across your models, controllers, and views. The `if user.is_admin? && user.active? && !user.suspended?` checks in your code are a symptom of this hidden state machine.

By making your states and transitions explicit, you are trading a small amount of upfront design work for a massive reduction in complexity and bugs down the line. It's a pattern that forces you to think clearly about the behavior of your system, and the result is code that is more robust, easier to understand, and a pleasure to work with.
