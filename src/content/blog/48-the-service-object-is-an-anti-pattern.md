---
title: "The Service Object is an Anti-Pattern (And What to Use Instead)"
date: "October 20, 2025"
excerpt: "The generic `app/services` directory is a code smell. It becomes a junk drawer that obscures domain logic. It’s time to replace it with patterns that make intent explicit: Form Objects, Commands, and domain-specific modules."
---

For years, the Rails community has championed the "Service Object" as the solution for fat models and controllers. The advice is simple: extract complex business logic into a plain old Ruby object (PORO) and stick it in `app/services`. The problem? This advice is a trap.

The `app/services` directory, born from good intentions, inevitably decays into a junk drawer of unrelated, poorly-structured code. It’s the architectural equivalent of a miscellaneous folder on your desktop—a dumping ground for anything that doesn't have an obvious home. It tells you nothing about what the code *does* or what business concept it represents.

This isn't a failure of the developer; it's a failure of the pattern. The term "Service" is too generic to be meaningful. Is it a service that processes a payment? A service that generates a PDF? A service that calls a third-party API? When everything is a service, nothing is.

It’s time to kill the generic service object and adopt patterns that carry intent. Here are three alternatives that create clearer, more maintainable Rails applications.

### 1. Form Objects: For Complex User Input

**When to use it:** When a single form on your UI maps to multiple ActiveRecord models or involves complex validation logic that doesn't belong on a single model.

Consider a user registration form that also creates an account and a subscription. A naive approach might stuff this logic into the `UsersController` or the `User` model. A generic service object would just move the mess into `app/services/user_creator.rb`.

A Form Object, however, explicitly models the form itself.

`app/forms/registration_form.rb`:
```ruby
class RegistrationForm
  include ActiveModel::Model

  # Form fields
  attr_accessor :name, :email, :password, :plan_id, :company_name

  # Validations
  validates :name, :email, :password, :plan_id, :company_name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :email_must_be_unique

  def submit
    return false if invalid?

    ActiveRecord::Base.transaction do
      user = User.create!(name: name, email: email, password: password)
      account = Account.create!(owner: user, name: company_name)
      Subscription.create!(account: account, plan_id: plan_id)
    end
    true
  rescue ActiveRecord::RecordInvalid => e
    # Promote model errors to the form object
    errors.add(:base, e.message)
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
      redirect_to root_path, notice: "Registration successful!"
    else
      render :new
    end
  end

  private

  def registration_params
    params.require(:registration_form).permit(:name, :email, :password, :plan_id, :company_name)
  end
end
```

**Why it’s better:**
*   **Explicit:** The class name `RegistrationForm` tells you exactly what it is.
*   **Cohesive:** It groups together the data, validation, and submission logic for a specific user interaction.
*   **Testable:** You can test the form's validations and submission logic in isolation without involving the controller or HTTP requests.

### 2. Command Objects: For Single, Atomic Actions

**When to use it:** When you need to perform a single, imperative action that has a clear outcome. This is the classic Command Pattern.

Think of actions like "approving a document," "refunding a payment," or "suspending a user." A generic service object might be called `DocumentManager` or `PaymentProcessor`. A Command Object is more precise: `ApproveDocument`, `RefundPayment`.

`app/commands/refund_payment.rb`:
```ruby
class RefundPayment
  class RefundFailedError < StandardError; end

  def initialize(payment, user:)
    @payment = payment
    @user = user
  end

  def call
    raise RefundFailedError, "Payment cannot be refunded" unless @payment.refundable?

    gateway_response = PaymentGateway.refund(@payment.transaction_id)

    if gateway_response.success?
      @payment.update!(status: 'refunded', refunded_by: @user)
      Notification.send(:payment_refunded, to: @payment.customer)
      true
    else
      raise RefundFailedError, gateway_response.error_message
    end
  end
end
```

**How it’s used:**
```ruby
# In a controller
begin
  RefundPayment.new(payment, user: current_user).call
  redirect_to payments_path, notice: "Payment refunded."
rescue RefundPayment::RefundFailedError => e
  redirect_to payment_path(payment), alert: e.message
end

# In a background job
RefundPayment.new(payment, user: automated_system_user).call
```

**Why it’s better:**
*   **Intent:** The name `RefundPayment` describes an action, not a thing.
*   **Single Responsibility:** The object does one thing and one thing only.
*   **Decoupled:** The command encapsulates the entire process, including interactions with external services and sending notifications. The caller doesn't need to know the details.

### 3. Domain-Specific Modules: For Grouping Related Logic

**When to use it:** When you have a set of related operations that belong to a specific business domain, but don't fit neatly into a single model.

Your application has business domains: billing, shipping, analytics, etc. Instead of scattering this logic across `app/services`, create modules that represent these domains.

Imagine you're building an e-commerce platform. The concept of "Shipping" involves calculating rates, generating labels, and tracking packages.

Create a dedicated directory: `app/shipping/`.

`app/shipping/rate_calculator.rb`:
```ruby
module Shipping
  class RateCalculator
    def self.for(order)
      # Logic to calculate rates from different carriers
    end
  end
end
```

`app/shipping/label_generator.rb`:
```ruby
module Shipping
  class LabelGenerator
    def self.for(shipment)
      # Logic to generate a shipping label via an API
    end
  end
end
```

`app/shipping/tracker.rb`:
```ruby
module Shipping
  class Tracker
    def self.status_for(tracking_number)
      # Logic to get tracking status
    end
  end
end
```

**How it’s used:**
```ruby
# Calculate rates
rates = Shipping::RateCalculator.for(order)

# Generate a label
label = Shipping::LabelGenerator.for(shipment)

# Get status
status = Shipping::Tracker.status_for("1Z9999W99999999999")
```

**Why it’s better:**
*   **High Cohesion:** All shipping-related code lives in one place.
*   **Clear Boundaries:** The `Shipping` module acts as a public API for that domain. It’s immediately clear where to find code related to shipping.
*   **Scalable:** As the shipping domain grows, you can add more classes to the `Shipping` module without polluting the global namespace or the dreaded `app/services` folder.

### The Way Forward: Name Things What They Are

The problem with `app/services` is that it encourages lazy naming and poor organization. By abolishing it and adopting more descriptive patterns, you force yourself to think more deeply about the structure of your code.

*   Is it handling complex user input? **Use a Form Object.**
*   Is it performing a single, transactional action? **Use a Command.**
*   Is it a collection of related business operations? **Group it into a Domain Module.**

Stop creating "services." Start modeling your domain. Your future self, and anyone else who works on your codebase, will thank you.
