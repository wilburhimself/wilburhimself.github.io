---
title: "Reading Other People's Code: The Skill Nobody Teaches"
date: "October 23, 2025"
excerpt: "We spend most of our time as developers reading code, not writing it. Yet, the skill of code archaeology—navigating unfamiliar codebases, identifying patterns, and making safe changes—is rarely taught. We'll share techniques for building mental models of systems you didn't build."
---

In university, we are taught to write code from a blank slate. We learn algorithms, data structures, and design patterns by building new things. Then we enter the industry and reality hits: you will spend the vast majority of your career reading, maintaining, and modifying code that you did not write.

The ability to parachute into an unfamiliar codebase, understand its structure, and make safe, effective changes is the most undervalued and under-taught skill in software development. It’s a form of code archaeology. You are digging through layers of history, uncovering hidden assumptions, and trying to piece together the story of the system.

Here are some techniques to master this essential skill.

### 1. Don't Just Read; Run.

The first step is to get the code running on your local machine. This sounds obvious, but it’s a critical part of the process. A static analysis of the code is not enough. You need to see it in action.

*   **Run the test suite:** The tests are your first and best form of documentation. Do they pass? Are they flaky? The state of the test suite tells you a lot about the health of the codebase.
*   **Start a Rails console:** The console is your laboratory. Use it to instantiate objects, call methods, and inspect data. This is the fastest way to get a feel for the models and their relationships.
*   **Click around the UI:** Use the application as a user would. This helps you connect the code you are seeing to the features you are experiencing.

### 2. Find the Core Abstractions

Every system has a set of core abstractions. These are the nouns and verbs of the business domain, represented in code. Your first goal is to identify them.

*   **Look at the `models` directory:** What are the most important models? How do they relate to each other? Look for `has_many`, `belongs_to`, and `has_and_belongs_to_many` associations.
*   **Identify the main entry points:** Where does a request begin? In a Rails app, this is typically a controller action. Trace a single request through the system, from the router to the controller, to the models, and back to the view.
*   **Use a tool like `grep` or your editor's search function:** Search for key terms from the business domain. If you're working on an e-commerce system, search for terms like "Order", "Payment", "Shipment". See where they appear and how they are used.

### 3. Build a Mental Model

As you explore the codebase, you are building a mental model of the system. This model is your internal map of how the different parts of the system fit together. Here are some ways to make that model more concrete:

*   **Draw a diagram:** It doesn't have to be a formal UML diagram. A simple boxes-and-arrows sketch on a piece of paper is often enough to clarify your understanding of the relationships between components.
*   **Write it down:** Keep a running log of your discoveries. What did you learn? What are you still confused about? This process of writing will force you to organize your thoughts.
*   **Explain it to someone else:** Find a teammate and try to explain a part of the system to them. The act of teaching is a powerful way to expose the gaps in your own understanding.

### 4. Make a Safe Change

The best way to understand a system is to change it. But how do you make a change without breaking something?

*   **Find the tests:** Is the code you want to change covered by tests? If so, you have a safety net. You can make your change and then run the tests to see if you broke anything.
*   **Write a test:** If the code is not covered by tests, write one. This has two benefits. First, it forces you to understand the code's current behavior. Second, it gives you the confidence to refactor it.
*   **Use the Strangler Fig Pattern:** If you need to make a large change, don't try to rewrite the old code. Instead, build the new functionality alongside the old. Slowly redirect traffic from the old system to the new one. Once the old system is no longer receiving traffic, you can safely delete it.

### 5. Understand the History

Code is not written in a vacuum. It is the product of a series of decisions made by people over time. Understanding the history of the code can give you valuable context.

*   **Use `git blame`:** This is your time machine. Who wrote this code? When? Why? The commit message might give you a clue.
*   **Look at the pull request:** If the commit is associated with a pull request, read the discussion. This can reveal the original intent of the code and the trade-offs that were made.
*   **Talk to the original author:** If they are still on the team, have a conversation with them. But be respectful. Don't criticize their past decisions. Your goal is to understand, not to judge.

### The Archaeologist's Mindset

Reading other people's code requires a different mindset than writing your own. It requires patience, curiosity, and humility. You are not there to judge the past. You are there to understand it, so that you can build a better future.

The next time you are faced with an unfamiliar codebase, don't be intimidated. Embrace the challenge. You are not just a developer; you are a code archaeologist. And the discoveries you make will be invaluable.
