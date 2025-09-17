---
title: "From Monolith to Modulith: A Pragmatic Guide to Deconstruction"
date: "September 19, 2025"
excerpt: "Everyone wants to break the monolith, but jumping straight to microservices is a fast track to a distributed mess. The Modulith is a more pragmatic step: a single application with strong, enforced internal boundaries. This post explores how to use tools like Packwerk in Rails to achieve modularity without the operational overhead of a distributed system."
---

The dream of breaking the monolith into a fleet of sleek, independent microservices is a powerful one. But I've seen it turn into a nightmare more than once. Teams trade their familiar, if messy, monolith for a distributed big ball of mud—a system where everything is coupled over the network, making development slower and debugging nearly impossible.

There is a better way. A more pragmatic, intermediate step that gives you many of the benefits of microservices without the immense operational cost: the **Modulith**.

A Modulith is an application that is developed as a single unit but is designed with strong internal boundaries between its different logical components. Think of it as building walls inside your house instead of trying to build five separate houses all at once.

### The First Step is Culture, Not Code

Before you write a single line of code, you must agree on your domains. This is a cultural exercise. Get your team in a room (virtual or physical) and map out the core responsibilities of your application. What are the logical components? You might end up with domains like:

-   `Identity` (user accounts, authentication)
-   `Billing` (subscriptions, payments)
-   `Inventory` (product stock)
-   `Shipping` (logistics, fulfillment)

These domains are your future microservices. For now, they will be modules inside your monolith.

### Enforcing Boundaries with Tooling

Once you've defined your domains, you need to enforce them. Good intentions are not enough. Without tooling, the boundaries will erode over time as developers take shortcuts. In the Rails ecosystem, the best tool for this is Shopify's **Packwerk**.

Packwerk allows you to define your components (or "packages") and specify the dependencies between them. It prevents code in one component from reaching into the private implementation details of another.

#### Step 1: Install and Configure Packwerk

Add it to your `Gemfile`:

```ruby
gem 'packwerk', group: :development
```

Run the initializer:

```bash
bundle exec packwerk init
```

This creates the necessary configuration files. Now, you can start defining your packages.

#### Step 2: Define Your Packages

Let's say we've identified a `billing` component. We move all related code into a new directory, `components/billing`. Then, we create a `package.yml` file for it:

```yaml
# components/billing/package.yml
enforce_dependencies: true
enforce_privacy: true
```

-   `enforce_dependencies: true` means this package must explicitly declare its dependencies.
-   `enforce_privacy: true` means other packages cannot call the private code of this package.

#### Step 3: Define a Public API for Your Component

If other components can't call private code, how do they interact with `billing`? Through its public API. You define this explicitly.

```ruby
# components/billing/app/public/billing.rb

module Billing
  # This is the ONLY class other components can directly use.
  class API
    def self.charge_customer(customer_id, amount)
      # ... internal logic to handle charging
      InternalCharger.new.perform(customer_id, amount)
    end
  end

  # This class is private to the billing component.
  class InternalCharger
    # ...
  end
end
```

Now, if the `shipping` component needs to charge a customer, it can *only* do so through `Billing::API.charge_customer`. Any attempt to call `Billing::InternalCharger` directly will be caught by Packwerk.

#### Step 4: Validate Your Architecture

Running `bundle exec packwerk check` will analyze your codebase and report any boundary violations. For example, if your `shipping` component tried to access a private constant from `billing`:

```
components/shipping/app/services/create_shipment.rb:15
Privacy violation: '::Billing::InternalCharger' is private to 'components/billing' but referenced from 'components/shipping'.
```

This check fails your CI build, forcing you to respect the boundaries you've established.

### The Payoff: A Stepping Stone to Microservices

By building a Modulith, you gain immediate benefits:

1.  **Improved Code Quality:** The codebase becomes easier to reason about as logical components are cleanly separated.
2.  **Team Autonomy:** Different teams can work on different components with fewer merge conflicts and unintended side effects.
3.  **Painless Extraction:** When the time comes to extract a component into a true microservice, the work is drastically simplified. The public API of your component becomes the API contract for the new service. All the hard work of untangling dependencies is already done.

### Conclusion

The Modulith isn't a compromise; it's a mature, strategic architectural choice. It recognizes that modularity is the goal, and microservices are just one way to achieve it. By focusing on clear, enforced boundaries within your monolith first, you build a more maintainable system today and pave a much smoother path for a distributed future tomorrow.
