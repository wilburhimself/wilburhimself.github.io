---
title: "When the Service Directory Becomes a Liability"
date: "October 20, 2025"
excerpt: "The app/services directory starts with good intentions but often decays into a junk drawer. We'll diagnose the symptoms of a service directory in crisis and explore how patterns like Form Objects, Commands, and Query Objects can restore clarity and maintainability to your Rails app."
---

The `app/services` directory is born from good intentions. We're told to keep our controllers and models thin, so we extract complex business logic into Plain Old Ruby Objects (POROs). The problem isn't the extraction; it's the destination. `app/services` is a name so generic it invites chaos.

It starts slowly. First, a `UserCreator` service. Then a `PdfGenerator`. Then `DataProcessor`, `StripeWebhookHandler`, and `LegacyDataImporter`. A year later, your `app/services` directory contains 47 files with no discernible pattern. New developers can't find anything, and merge conflicts become a daily ritual as unrelated features force changes to the same generic `PaymentProcessor` service.

This isn't a failure of the developer; it's a failure of the pattern's ambiguity. The "Service Object" has become a junk drawer. This post offers a diagnostic guide to recognize when your service layer has become a liability and provides a set of more explicit patterns to restore order.

### How to Recognize When Services Have Become a Problem

The symptoms aren't always obvious. Watch for:

- **Discovery time creeping up**: New team members take longer to find where logic lives.
- **Naming drift**: You have both `CreateUser` and `UserCreator` doing similar things.
- **Test confusion**: Integration tests are easier to write than unit tests because the service boundaries are unclear.
- **Merge conflicts**: Multiple developers editing the same service for unrelated features.

### When a Service Object Works

Not all service objects are bad. A service is appropriate when:
- It's a **thin wrapper** around an external API with a clear, stable interface (e.g., `SlackNotificationService`, `StripePaymentService`).
- It orchestrates a **single, well-defined integration point**.
- The name clearly indicates its **singular responsibility**.

The problem isn't services themselves—it's the generic `app/services` dumping ground.

Here are four patterns that provide clearer boundaries and intent.

### 1. Form Objects: For Complex User Input

**When to use it:** When a single form on your UI maps to multiple ActiveRecord models or involves complex validation logic that doesn't belong on a single model.

A Form Object explicitly models the form itself.

`app/forms/registration_form.rb`:
```ruby
class RegistrationForm
  include ActiveModel::Model

  # Expose the created user for the controller
  attr_reader :user

  # Form fields
  attr_accessor :name, :email, :password, :plan_id, :company_name

  # Validations
  validates :name, :email, :password, :plan_id, :company_name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :email_must_be_unique

  def submit
    return false if invalid?

    ActiveRecord::Base.transaction do
      @user = User.create!(name: name, email: email, password: password)
      account = Account.create!(owner: @user, name: company_name)
      Subscription.create!(account: account, plan_id: plan_id)
    end
    true
  rescue ActiveRecord::RecordInvalid => e
    # Promote the specific model error to the form's base
    errors.add(:base, e.record.errors.full_messages.join(", "))
    false
  end

  private

  def email_must_be_unique
    errors.add(:email, "is already taken") if User.exists?(email: email)
  end
end
```

**How it’s used in the controller:**
```ruby
class RegistrationsController < ApplicationController
  def create
    @form = RegistrationForm.new(registration_params)

    if @form.submit
      sign_in(@form.user) # The controller can now access the created user
      redirect_to root_path, notice: "Registration successful!"
    else
      render :new
    end
  end
  # ...
end
```

### 2. Command Objects: For Single, Atomic Actions

**When to use it:** When you need to perform a single, imperative action that has a clear outcome.

`app/commands/refund_payment.rb`:
```ruby
class RefundPayment
  class RefundFailedError < StandardError; end

  def initialize(payment, user:, logger: Rails.logger)
    @payment = payment
    @user = user
    @logger = logger
  end

  def call
    raise RefundFailedError, "Payment cannot be refunded" unless @payment.refundable?
    
    # Idempotency check
    return true if @payment.refunded?

    @logger.info("Refunding payment", payment_id: @payment.id, user_id: @user.id)

    # PaymentGateway would be a thin wrapper around an external API like Stripe
    gateway_response = PaymentGateway.refund(@payment.transaction_id)

    if gateway_response.success?
      @payment.update!(
        status: 'refunded', 
        refunded_by: @user,
        refunded_at: Time.current
      )
      RefundAuditLog.create!(payment: @payment, user: @user)
      # Notifier.payment_refunded would be a simple mailer or notification service
      Notifier.payment_refunded(@payment.customer)
      true
    else
      @logger.error("Refund failed", 
        payment_id: @payment.id, 
        error: gateway_response.error_message
      )
      raise RefundFailedError, gateway_response.error_message
    end
  end
end
```

### 3. Query Objects: For Complex Database Queries

**When to use it:** When you have a complex ActiveRecord query that involves multiple joins, subqueries, or calculations that don't belong on a single model.

`app/queries/overdue_invoices_query.rb`:
```ruby
class OverdueInvoicesQuery
  def initialize(relation = Invoice.all)
    @relation = relation
  end

  def call
    @relation.where("due_date < ?", Date.current)
             .where(status: ["pending", "sent"])
             .joins(:customer)
             .where.not(customers: { status: "inactive" })
  end
end
```
**How it's used:**
```ruby
# In a controller
@overdue_invoices = OverdueInvoicesQuery.new.call

# Chained with other scopes
@high_value_overdue_invoices = OverdueInvoicesQuery.new(Invoice.where("amount > 1000")).call
```

### 4. Domain-Specific Modules: For Grouping Related Logic

**When to use it:** When you have a set of related operations for a business domain. Use instance methods to improve testability.

`app/shipping/rate_calculator.rb`:
```ruby
module Shipping
  class RateCalculator
    def initialize(order, api_key: ENV['SHIPPING_API_KEY'])
      # ...
    end

    def call
      # Logic to calculate rates from different carriers
    end
  end
end
```

### What This Looks Like in Production

Clear patterns improve debuggability. Compare these log entries:

**Generic Service log:**
`Processing user registration (UserService#create)`

**Specific Pattern logs:**
`RegistrationForm validation failed: email format invalid`
`RegistrationForm submitted successfully (user_id: 123)`
`Refunding payment (payment_id: 456, user_id: 789)`

The explicit naming makes it trivial to search logs and understand what failed where.

### Migrating from Services: A Practical Approach

Don't rewrite everything at once. Apply the Strangler Fig pattern:

1.  **Audit**: List all files in `app/services` and categorize them.
2.  **Prioritize**: Start with services that are changed frequently or are causing bugs.
3.  **Pattern match**:
    - Does it handle form input? → Form Object
    - Single action? → Command
    - Complex query? -> Query Object
    - Multiple related operations? → Domain Module
4.  **Extract gradually**: Create the new pattern alongside the old service, and migrate callers incrementally.
5.  **Delete**: Once all references are migrated, remove the old service.

By replacing the generic `app/services` junk drawer with these explicit patterns, you create a more maintainable, scalable, and debuggable codebase. You force yourself to think more deeply about the structure of your code, and the result is a system that is easier for everyone to understand.
