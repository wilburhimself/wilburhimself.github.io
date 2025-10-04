---
title: 'Beyond the String: Building a Version-Controlled Prompt Engine in Rails'
pubDate: 2025-10-07
description: 'How to build a dynamic, database-backed prompt management system in Rails to avoid technical debt.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/prompt-management-engine-in-rails.png'
    alt: 'A factory machine constructing a prompt from smaller pieces.'
tags: ["ruby", "rails", "ai", "prompts", "architecture"]
---

As AI features grow, hardcoded prompts become a technical debt nightmare. This post presents a solution: a dynamic, database-backed prompt management system in Rails. We'll design a `Prompt` model to handle versioning, templating with variables, and even A/B testing. The included code will show how to build a simple service object to render, track, and manage your prompts, transforming them from fragile strings into a resilient, manageable part of your application architecture.

### The Problem: Hardcoded Prompts

Hardcoding prompts directly in your service objects or controllers is inflexible. It makes them difficult to update, impossible to version, and a nightmare to test.

```ruby
# The brittle way
class SomeService
  def do_thing(input)
    prompt = "Summarize the following text for a fifth grader: #{input}"
    # ... call to LLM ...
  end
end
```

### A Better Way: A `Prompt` Model

Let's create a model to store our prompts in the database. This allows us to version them, add metadata, and change them without a code deploy.

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_prompts.rb
create_table :prompts do |t|
  t.string :name, null: false
  t.integer :version, null: false, default: 1
  t.text :template, null: false
  t.jsonb :metadata
  t.timestamps

  t.index [:name, :version], unique: true
end
```

### The `PromptManager` Service

Now, we can create a service to fetch, render, and manage these prompts. This service will be the single entry point for accessing prompts in our application.

```ruby
# app/services/prompt_manager.rb
class PromptManager
  # Simple templating with ERB
  require 'erb'

  def self.render(name:, version: 1, variables: {})
    prompt = Prompt.find_by!(name: name, version: version)
    template = ERB.new(prompt.template)
    template.result_with_hash(variables)
  end
end

# Usage
variables = { input: "Some long text..." }
rendered_prompt = PromptManager.render(name: "summarizer", variables: variables)
```

This approach makes your prompts more robust, easier to manage, and sets you up for more advanced features like A/B testing different prompt versions.
