---
title: Mastering the decorator pattern in Ruby on Rails
date: 2024-04-15
---

As Ruby on Rails developers, we're often faced with the challenge of adding new features or modifying the behavior of existing components without introducing unnecessary complexity or tight coupling. One design pattern that can help us address this challenge is the Decorator Pattern. In this blog post, we'll explore the Decorator Pattern, understand its benefits, and see how we can apply it in our Ruby on Rails applications.

### What is the Decorator Pattern?
The Decorator Pattern is a structural design pattern that allows us to add responsibilities to individual objects dynamically, without affecting the behavior of other objects from the same class. It works by wrapping an object with one or more decorator objects, each of which adds a specific piece of functionality.

In the context of Ruby on Rails, we can use the Decorator Pattern to enhance the functionality of our models, services, or other components, while keeping our codebase modular and maintainable.

### Advantages of the Decorator Pattern
The Decorator Pattern offers several benefits that make it a valuable tool in your Ruby on Rails toolkit:

1. **Flexibility**: Decorators allow you to add or modify the behavior of an object without changing its core functionality. This makes it easier to introduce new features or adapt to changing requirements.
2. **Maintainability**: By encapsulating specific responsibilities in decorators, you can keep your core classes focused and easier to understand. This promotes better code organization and readability.
3. **Testability**: Decorators can be tested in isolation, which simplifies the testing process and makes it easier to ensure the correctness of your application.
4. **Composition over Inheritance**: The Decorator Pattern encourages composition over inheritance, which is generally considered a better design principle, as it promotes more flexible and reusable code.

### Implementing the Decorator Pattern in Ruby on Rails
Let's consider an example of how you might use the Decorator Pattern in a Ruby on Rails application. Imagine you have a `User` model, and you want to add some additional functionality, such as formatting the user's name and displaying their full address.

Without the Decorator Pattern, you might be tempted to add these methods directly to the `User` model. However, this would result in a model that is responsible for too many concerns, making it harder to maintain and test.

Instead, let's create a `UserDecorator` class that wraps the `User` model and adds the desired functionality:


```ruby
class UserDecorator < SimpleDelegator
  def full_name
    "#{first_name} #{last_name}"
  end

  def full_address
    "#{address_line_1}, #{address_line_2}, #{city}, #{state} #{zip_code}"
  end
end
```

In this example, the `UserDecorator` class inherits from `SimpleDelegator`, which is a built-in Ruby class that provides a simple way to implement the Decorator Pattern. The `UserDecorator` class delegates all method calls to the wrapped `User` object, and then adds the `full_name` and `full_address` methods on top of that.

Now, in your application, you can use the `UserDecorator` like this:

```ruby
user = User.find(1)
decorated_user = UserDecorator.new(user)
puts decorated_user.full_name # Output: "John Doe"
puts decorated_user.full_address # Output: "123 Main St, Apt 4, Anytown, CA 12345"
```

By using the Decorator Pattern, you've kept your `User` model focused on its core responsibilities, while adding the additional functionality in a separate, composable component.

### Advanced Decorator Patterns in Ruby on Rails
The basic Decorator Pattern shown above is just the beginning. In Ruby on Rails, you can also explore more advanced decorator patterns, such as:

#### 1 - Facility Decorator
Imagine you have a `FacilityService` that is responsible for managing facilities in your application. The basic `FacilityService` might look like this:

```ruby
# app/services/facility_service.rb
class FacilityService
  def get_facility(id)
    Facility.find(id)
  end

  def create_facility(attributes)
    Facility.create(attributes)
  end

  def update_facility(facility, attributes)
    facility.update(attributes)
    facility
  end
end
```

Now, let's say you want to add some additional functionality to the `FacilityService`, such as caching the results of the `get_facility` method. You can use the Decorator Pattern to achieve this without modifying the original `FacilityService` class.

```ruby
# app/decorators/caching_facility_service_decorator.rb
class CachingFacilityServiceDecorator < SimpleDelegator
  def get_facility(id)
    Rails.cache.fetch("facility_#{id}") do
      super(id)
    end
  end

  def create_facility(attributes)
    facility = super(attributes)
    Rails.cache.delete("facility_#{facility.id}")
    facility
  end

  def update_facility(facility, attributes)
    updated_facility = super(facility, attributes)
    Rails.cache.delete("facility_#{facility.id}")
    updated_facility
  end
end
```

In this example, the `CachingFacilityServiceDecorator` wraps the original `FacilityService` and adds caching functionality to the `get_facility` method. It uses the `Rails.cache.fetch` method to retrieve the facility from the cache if available, or fetch it from the database and store the result in the cache. Additionally, the `create_facility` and `update_facility` methods are decorated to invalidate the cache when a facility is created or updated.

#### 2 - View Decorator
You can also use the Decorator Pattern to enhance the presentation logic of your views. For example:

```ruby
# app/decorators/user_view_decorator.rb
class UserViewDecorator < SimpleDelegator
  def formatted_name
    "#{first_name} #{last_name}"
  end

  def formatted_email
    "#{email} (#{role})"
  end
end

# Usage in a view
<h1><%= UserViewDecorator.new(@user).formatted_name %></h1>
<p><%= UserViewDecorator.new(@user).formatted_email %></p>
```

#### 3 - Model Decorator

Finally, you can use the Decorator Pattern to extend the behavior of your models:

```ruby
# app/decorators/user_model_decorator.rb
class UserModelDecorator < SimpleDelegator
  def save
    before_save
    super
  end

  private

  def before_save
    # Add custom validation or business logic
    errors.add(:name, 'cannot be blank') if name.blank?
  end
end

# Usage
user = UserModelDecorator.new(User.new)
user.name = ''
user.save # => false, user.errors.full_messages # => ["Name cannot be blank"]
```

In this example, the `UserModelDecorator` wraps a `User` model and adds a `before_save` hook that performs custom validation.

By mastering the Decorator Pattern and its various applications, you can create more modular, testable, and maintainable Ruby on Rails applications that are better equipped to handle evolving requirements and growing complexity.

The Decorator Pattern is a powerful tool in the Ruby on Rails developer's arsenal. By separating concerns and allowing you to dynamically add responsibilities to objects, the Decorator Pattern can help you build more flexible, testable, and maintainable applications. As you continue to develop your Ruby on Rails skills, keep the Decorator Pattern in mind as a way to organize your codebase and promote best practices.

