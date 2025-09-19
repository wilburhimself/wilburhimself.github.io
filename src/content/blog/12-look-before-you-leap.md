---
title: "Look before you leap"
date: "April 15, 2023"
excerpt: "Defensive programming principles emphasize state verification before execution to prevent runtime errors and improve application reliability. Ruby implementations demonstrate checking for nil values, empty arrays, hash key existence, and other validation patterns that ensure robust data structure operations."
---

**Look before you leap** is a principle that emphasizes the importance of verifying the state of a program before executing an action. This principle is particularly useful when working with data structures, as it allows you to check if the data is valid and avoid potential errors or bugs.

In Ruby, there are several ways to implement the **Look before you leap** principle. Here are some examples:

#### Checking for Nil Values

In Ruby, nil is a special value that represents the absence of a value. It’s important to check for nil values before using them to avoid runtime errors.

    # Example of checking for a nil value in Ruby
    if my_variable.nil?
      puts "my_variable is nil"
    else
      puts "my_variable is not nil"
    end

#### Checking for an Empty Array

When working with arrays, it’s important to verify that the array is not empty before performing any actions on it.

    # Example of checking for an empty array in Ruby
    my_array = []
    if my_array.empty?
      puts "my_array is empty"
    else
      puts "my_array is not empty"
    end

#### Checking for a Key in a Hash

When working with hashes, it’s important to verify that a key exists before accessing its value.

    # Example of checking for a key in a hash in Ruby
    my_hash = {a: 1, b: 2, c: 3}
    if my_hash.has_key?(:d)
      puts "Key :d exists in my_hash"
    else
      puts "Key :d does not exist in my_hash"
    end

While the “Look before you leap” principle is useful for preventing runtime errors, it may not be sufficient in cases where exceptions can occur. This is where the `begin-rescue` construct comes into play.

The `begin-rescue` construct is used in Ruby to handle exceptions that may occur during program execution. Here’s an example:

    begin
      # Code that may raise an exception
      result = 10 / 0
    rescue => exception
      # Handle the exception
      puts "Error: #{exception.message}"
    end

In this example, we attempt to divide the number 10 by 0, which would normally raise a `ZeroDivisionError` exception. However, we catch this exception using a `rescue` block and print an error message instead of allowing the exception to terminate the program.

The `begin-rescue` construct is particularly useful when dealing with situations where exceptions can occur, such as when working with external APIs or user input. However, it’s important to remember that the “Look before you leap” principle should still be applied to prevent exceptions from occurring in the first place.

The “Look before you leap” principle is a valuable programming principle that can help prevent errors and bugs in your code. While the `begin-rescue` construct is useful for handling exceptions, it’s important to verify the state of your program before executing code to prevent exceptions from occurring in the first place. By combining the two techniques, you can write more robust and reliable code that is less prone to errors and bugs.
