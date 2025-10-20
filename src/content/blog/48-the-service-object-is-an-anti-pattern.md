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

Here are four patterns that provide clearer boundaries and intent. Each addresses a different axis of complexity:

- **Form Objects** tackle the complexity of *user input* that touches multiple models.
- **Commands** encapsulate *imperative actions* with side effects.
- **Query Objects** manage *data retrieval* complexity.
- **Domain Modules** organize *related operations* within a business domain.

Let's examine each pattern.

### 1. Form Objects: For Complex User Input

**When to use it:** When a single form on your UI maps to multiple ActiveRecord models or involves complex validation logic that doesn't belong on a single model.

`app/forms/registration_form.rb`:
```ruby
class RegistrationForm
  include ActiveModel::Model

  # Expose the created user so the controller can sign them in.
  # This is safer than returning the user from submit() because
  # we maintain the convention of submit returning true/false.
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

    # Idempotency: if this command is called twice (e.g., retry after timeout),
    # we don't want to attempt a double refund.
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

**When to use it:** When a query is too complex for a simple model scope. This pattern shines when you need to perform calculations, joins, and post-processing.

`app/queries/revenue_by_product_query.rb`:
```ruby
class RevenueByProductQuery
  def initialize(start_date:, end_date:)
    @start_date = start_date
    @end_date = end_date
  end

  def call
    results = Order
      .joins(line_items: :product)
      .where(created_at: @start_date..@end_date)
      .where(status: 'completed')
      .group('products.id', 'products.name')
      .select(
        'products.id',
        'products.name',
        'SUM(line_items.quantity * line_items.unit_price) as revenue',
        'COUNT(DISTINCT orders.id) as order_count'
      )

    # Post-processing that doesn't belong in SQL
    results.map do |result|
      {
        product_id: result.id,
        product_name: result.name,
        revenue: result.revenue.to_f,
        order_count: result.order_count,
        average_order_value: result.revenue.to_f / result.order_count
      }
    end
  end
end
```

### 4. Domain-Specific Modules: For Grouping Related Logic

**When to use it:** When you have a set of related operations for a business domain. Use instance methods and dependency injection to improve testability.

`app/shipping/rate_calculator.rb`:
```ruby
module Shipping
  class RateCalculator
    class RateCalculationError < StandardError; end

    def initialize(order, carrier_api: CarrierAPIClient.new)
      @order = order
      @carrier_api = carrier_api
    end

    def call
      raise RateCalculationError, "Order has no shipping address" unless @order.shipping_address.present?

      rates = fetch_rates_from_carriers

      rates.sort_by { |rate| rate[:cost] }
    rescue CarrierAPIClient::APIError => e
      Rails.logger.error("Rate calculation failed", order_id: @order.id, error: e.message)
      raise RateCalculationError, "Unable to fetch shipping rates: #{e.message}"
    end

    private

    def fetch_rates_from_carriers
      SUPPORTED_CARRIERS.flat_map do |carrier|
        @carrier_api.get_rates(
          carrier: carrier,
          origin: @order.warehouse_address,
          destination: @order.shipping_address,
          weight: @order.total_weight
        )
      end
    end
  end
end
```

### What This Looks Like in Production

Clear patterns improve debuggability. Compare these scenarios:

**Generic Service encountering an error:**
`ERROR: UserService failed (user_id: nil)`
Where did it fail? Creating the user? The account? The subscription?

**Specific Pattern encountering an error:**
`ERROR: RegistrationForm validation failed: email format invalid, plan_id can't be blank`
`ERROR: RefundPayment failed (payment_id: 456): Payment cannot be refunded`

**During normal operation:**
`INFO: RegistrationForm submitted successfully (user_id: 123, account_id: 456)`
`INFO: Refunding payment (payment_id: 456, user_id: 789)`
`INFO: RefundPayment completed (payment_id: 456, transaction_id: ch_abc123)`

The explicit naming and structured output make it trivial to search logs, understand what failed, and where.

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

### The Way Forward

The health of your service directory isn't about following rules—it's about whether the code structure helps or hinders the team. When you notice discovery time increasing, when you're naming things `DataProcessor` or `BusinessLogic`, when tests become harder to write than the code itself, these are signals that generic patterns have outlived their usefulness.

The patterns presented here aren't dogma. They're tools for restoring intent when ambiguity has taken hold. Use them when they clarify. Ignore them when they don't. The goal is a codebase where the structure reveals the domain, not one where every line follows a pattern perfectly.

Your future self, debugging a production issue at 2 AM, will appreciate the difference.
