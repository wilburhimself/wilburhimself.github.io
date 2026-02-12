---
title: "Stacks and Queues"
date: "February 10, 2023"
excerpt: "Fundamental data structures stacks (LIFO) and queues (FIFO) receive comprehensive Ruby implementations with complete RSpec test suites, covering practical applications in function call management, task scheduling, and algorithm optimization essential for software engineering interviews and production development work."
tags: ["computer-science", "ruby", "algorithms", "data-structures"]
---

Stacks and Queues are two basic data structures used in computer science and software engineering. This post will explain what stacks and queues are, how they function, and how to use them in Ruby. I will also add RSpec tests for the implementations.

## **Stacks**

A stack is a data structure that operates on the Last-In-First-Out (LIFO) principle. This indicates that the last item added to the stack will be the first to be deleted. Stacks are frequently used in programs to keep track of function calls (the call stack) or to reverse the order of items.

Here’s an example of a basic Ruby stack implementation:

    class Stack
      def initialize
        @elements = []
      end

      def push(element)
        @elements.push(element)
      end

      def pop
        @elements.pop
      end

      def empty?
        @elements.empty?
      end
    end

In this implementation, the push method is used to add an element to the top of the stack, the pop method is used to remove the top element from the stack, and the empty? method is used to determine whether the stack is empty.

Here are some RSpec tests for our stack implementation:

    describe Stack do
      describe "#push" do
        it "adds an element to the top of the stack" do
          stack = Stack.new
          stack.push(1)
          stack.push(2)
          expect(stack.instance_variable_get(:@elements)).to eq([1, 2])
        end
      end

      describe "#pop" do
        it "removes the top element from the stack" do
          stack = Stack.new
          stack.push(1)
          stack.push(2)
          expect(stack.pop).to eq(2)
          expect(stack.instance_variable_get(:@elements)).to eq([1])
        end
      end

      describe "#empty?" do
        it "returns true if the stack is empty" do
          stack = Stack.new
          expect(stack.empty?).to be true
        end

        it "returns false if the stack is not empty" do
          stack = Stack.new
          stack.push(1)
          expect(stack.empty?).to be false
        end
      end
    end

## **Queues**

A Queue is a FIFO (First-In-First-Out) data structure. This implies that the first thing added to the queue will also be the first item withdrawn. Queues are frequently used to create waiting lines or to schedule jobs.

Here’s an example of a simple Ruby queue implementation:

    class Queue
      def initialize
        @elements = []
      end

      def enqueue(element)
        @elements.push(element)
      end

      def dequeue
        @elements.shift
      end

      def empty?
        @elements.empty?
      end
    end

In this implementation, the enqueue method is used to add an element to the end of the queue, and the dequeue method is used to remove the initial element from the queue, and the empty? method determines whether the queue is empty.

Here are some RSpec tests for our queue implementation:

    describe Queue do
      describe "#enqueue" do
        it "adds an element to the end of the queue" do
          queue = Queue.new
          queue.enqueue(1)
          queue.enqueue(2)
          expect(queue.instance_variable_get(:@elements)).to eq([1, 2])
        end
      end

      describe "#dequeue" do
        it "removes the first element from the queue" do
          queue = Queue.new
          queue.enqueue(1)
          queue.enqueue(2)
          expect(queue.dequeue).to eq(1)
          expect(queue.instance_variable_get(:@elements)).to eq([2])
        end
      end

      describe "#empty?" do
        it "returns true if the queue is empty" do
          queue = Queue.new
          expect(queue.empty?).to be true
        end

        it "returns false if the queue is not empty" do
          queue = Queue.new
          queue.enqueue(1)
          expect(queue.empty?).to be false
        end
      end
    end

I’m thrilled to have shared my knowledge of stack and queue algorithms in Ruby with you. These fundamental ideas are necessary for any computer science student or programmer to understand. Experimenting with these algorithms in Ruby was a great learning experience for me, and I hope it was for you as well.

It’s now your turn! I’d love to learn about how you’ve implemented these techniques in different programming languages. Share your ideas, ask questions, and let’s keep growing and learning together. Don’t be afraid to post a comment. I’m looking forward to hearing from you!
