---
title: "Feature Flags: Beyond Simple Toggles"
date: "September 20, 2025"
excerpt: "Most teams see feature flags as simple on/off switches. They are so much more. This post explores how to use flags for percentage-based rollouts, targeted betas, and even as operational circuit breakers, transforming them from a developer convenience into a strategic tool for shipping safer, better software."
---

We had just deployed a major refactoring of our checkout system. Ten minutes later, the alerts started firing. A subtle bug was preventing a small but significant percentage of users from completing their purchases. The problem was, rolling back would take another ten minutes, and every minute of downtime meant lost revenue.

That incident made the distinction clear for us: deploying code and releasing a feature are not the same. A deployment should fade into the background—routine and reversible. A release should be deliberate, tied to a business decision. Feature flags are the mechanism that lets you separate the two.

But most teams only scratch the surface of what feature flags can do. They are not just simple on/off switches; they are a powerful mechanism for controlling your system.

### Level 1: The Basic Boolean Toggle

This is the simplest form of a feature flag. It's a conditional in your code that checks if a feature is globally enabled.

In a Rails app, you might have a simple model and a helper:

```ruby
# app/models/feature_flag.rb
class FeatureFlag < ApplicationRecord
  # attributes: name:string, active:boolean
end

# app/helpers/features_helper.rb
module FeaturesHelper
  def feature_enabled?(feature_name)
    # In production, you would cache this lookup to avoid DB hits on every check.
    FeatureFlag.find_by(name: feature_name.to_s)&.active? || false
  end
end
```

This is great for hiding a work-in-progress feature until it's ready. But we can do much more.

### Level 2: Percentage-Based Rollouts

A major change always carries risk. A percentage-based rollout allows you to release a feature to a small subset of users first, monitor its impact, and gradually increase the percentage as your confidence grows.

To implement this, we can add a `percentage` attribute to our model.

```ruby
# Extend the helper to handle percentages
module FeaturesHelper
  def feature_enabled?(feature_name, user: nil)
    flag = FeatureFlag.find_by(name: feature_name.to_s)
    return false unless flag&.active?

    # If percentage is 100 or not set, it's enabled for everyone
    return true if flag.percentage.nil? || flag.percentage >= 100

    # If a user is provided, check if they fall within the percentage
    return user && (user.id % 100) < flag.percentage if user

    false
  end
end
```

The key is determinism. Using something like `user.id % 100` ensures a user’s experience is stable—they won’t see a feature on one request and lose it on the next. For large datasets, this balances out. For smaller cohorts, a hash-based approach (e.g., MD5 of the user ID) can produce a more uniform distribution.

### Level 3: Actor-Based Targeting

Sometimes you want to release a feature to specific users or groups, such as your internal team for dogfooding, or a set of beta testers.

We can extend our model with a JSONB column for targeting rules.

```ruby
# A more advanced feature check
def feature_enabled?(feature_name, user: nil)
  flag = FeatureFlag.find_by(name: feature_name.to_s)
  return false unless flag&.active?

  # Rule evaluation logic
  if flag.targeting_rules.present? && user
    allow_list = flag.targeting_rules["allow_list"]
    return true if allow_list&.include?("user:#{user.id}")

    # Could also check for user roles, subscription plans, etc.
    # return true if user.is_beta_tester?
  end

  # Fall back to percentage check
  return (user.id % 100) < flag.percentage if user && flag.percentage.present?

  # Default to fully on/off
  flag.percentage.nil? || flag.percentage >= 100
end
```

This approach turns feature flags from broad toggles into targeted release mechanisms. You can roll out to specific users, roles, or subscription tiers without branching code paths or creating one-off builds.

### Level 4: The Operational Circuit Breaker

This is the most advanced and, in an incident, the most powerful use of a feature flag. Think of it as a kill switch for a specific part of your system.

Imagine you have a resource-intensive "Related Products" widget that calls a machine learning service. If that service becomes slow or starts erroring, it could degrade the performance of your entire product page. With a feature flag, your operations team can instantly disable the widget in production without a code deploy.

```ruby
# In your view or controller
if feature_enabled?(:product_recommendations)
  @recommendations = RecommendationsService.fetch_for(@product)
else
  # The feature is disabled, return an empty set or a cached fallback
  @recommendations = []
end
```

This shifts an incident from a system-wide outage to a localized degradation. Instead of scrambling with a rollback, your on-call engineer can flip a switch, stabilize the system, and then investigate the root cause without the pressure of a full outage.

### Conclusion

Feature flags start as a way to hide unfinished work, but their real value is strategic. They reduce operational risk, enable controlled experimentation, and give teams more precise levers to manage complexity. By layering rollouts, targeting, and circuit breakers, deployments become routine—and releases become intentional. That separation is what allows teams to ship both faster and more safely.
