---
title: Elevating Your Ruby on Rails Apps with Value Objects
date: 2024-04-18
---

I'll never forget the day my team and I sat down to review the codebase for our latest Ruby on Rails project. As we dove into the details, it quickly became clear that our code was a tangled web of conditional logic, duplicated calculations, and a general lack of consistency. It was a mess - the kind of thing that keeps developers up at night.

That's when I realized we were missing an important tool in our application architecture: value objects. These small, immutable objects had the potential to transform our codebase from chaotic to clean, from error-prone to robust. In this post, we'll explore what value objects are, why they're so beneficial, and how to implement them in your Ruby on Rails projects.

### What is a Value Object?
A value object is a small, immutable object that represents a specific value or concept within your application. Unlike an entity object, which has an identity and can change over time, a value object is purely defined by its attributes. Two value objects are considered equal if they have the same attribute values, regardless of their object identity.

Value objects are commonly used to represent things like money, dates, addresses, or any other domain-specific concept that doesn't have a unique identity. By encapsulating these values into their own objects, you can improve the overall design and maintainability of your codebase.

### Benefits of Using Value Objects

Employing value objects in your Ruby on Rails applications can provide several benefits:

1. **Improved Code Readability**: Value objects make your code more expressive and self-documenting. Instead of working with raw data types, you're interacting with objects that represent meaningful concepts in your domain.
2. **Increased Robustness**: Value objects are immutable, meaning their state cannot be changed after creation. This helps prevent unintended side effects and makes it easier to reason about your code.
3. **Enhanced Reusability**: Value objects can be easily shared and reused across different parts of your application, promoting code consistency and reducing duplication.
4. **Better Error Handling**: Value objects can encapsulate validation logic, ensuring that only valid values are used throughout your application. This can catch errors earlier and provide more helpful error messages.

### Implementing Value Objects in Ruby on Rails

Let's look at an example of how you might implement a value object for representing a monetary amount in a Rails application.

```ruby
# app/value_objects/money.rb
class Money
  include Comparable

  attr_reader :amount, :currency

  def initialize(amount, currency)
    @amount = amount
    @currency = currency
  end

  def +(other)
    raise ArgumentError, "Cannot add values with different currencies" if currency != other.currency
    Money.new(amount + other.amount, currency)
  end

  def -(other)
    raise ArgumentError, "Cannot subtract values with different currencies" if currency != other.currency
    Money.new(amount - other.amount, currency)
  end

  def *(scalar)
    Money.new(amount * scalar, currency)
  end

  def /(scalar)
    Money.new(amount / scalar, currency)
  end

  def <=>(other)
    raise ArgumentError, "Cannot compare values with different currencies" if currency != other.currency
    amount <=> other.amount
  end

  def to_s
    "#{amount} #{currency}"
  end
```

In this example, we've created a `Money` value object that encapsulates a monetary amount and its associated currency. The object includes common arithmetic operations, such as addition, subtraction, multiplication, and division, as well as comparison methods. This allows us to perform monetary calculations in a safe and intuitive way.

The reason we've included the `Comparable` module in the `Money` class is to enable comparison operations between `Money` objects. By including `Comparable`, we can use comparison operators like `<`, `>`, `<=`, `>=`, and `==` to compare the values of `Money` objects. This allows us to perform operations like sorting, min/max, and other comparison-based logic on Money objects, making the code more expressive and easier to work with.

Here's how you might use the `Money` value object in a Rails controller:

```ruby
# app/controllers/orders_controller.rb
class OrdersController < ApplicationController
  def create
    total_price = Money.new(100.0, 'USD') + Money.new(50.0, 'USD')
    if total_price > Money.new(149.99, 'USD')
      # Do something with the order total
    else
      # Handle the case where the total is less than $149.99
    end
    @order = Order.new(total_price: total_price)
    if @order.save
      redirect_to @order
    else
      render :new
    end
  end
end
```

By using the `Money` value object, we can ensure that all monetary calculations in our application are performed correctly and with the appropriate currency handling.

Incorporating value objects into your Ruby on Rails applications can lead to significant improvements in code quality, maintainability, and robustness. By encapsulating domain-specific concepts into their own objects, you can write more expressive, self-documenting code that is less prone to errors.
