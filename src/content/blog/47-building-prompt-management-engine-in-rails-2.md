---
title: 'Scaling AI Prompts: A Guide to Building a Prompt Management Engine in Rails'
date: 'October 19, 2025'
excerpt: 'Move beyond hardcoded strings and build a scalable, version-controlled, and testable prompt management system in Rails to manage your AI prompts like professional software.'
tags: ["rails", "ruby", "ai", "patterns"]
---

As AI features grow, hardcoded prompts become a significant source of technical debt. They are difficult to track, impossible to version, and a nightmare to A/B test. This guide presents a solution: treating your prompts as software by building a dynamic, database-backed management system in Rails.

We'll design a versioned `Prompt` model and a `PromptManager` service that transforms prompt engineering from a chaotic art into a disciplined engineering practice.

### When Do You Need a Prompt Engine?

This pattern is not for every project. Consider it when:
*   You have more than a handful of prompts.
*   Multiple teams or developers need to collaborate on prompts.
*   You want to A/B test different prompt versions to improve performance.
*   You need to update prompts without deploying new code.

If you only have one or two stable prompts, this is likely overkill.

### Step 1: Designing a Version-Aware `Prompt` Model

Our model needs to track not just the prompt text, but also its version and status. A more advanced design might use separate `Prompt` and `PromptVersion` models, but for this guide, we'll use a single model with a version number and an `active` flag.

`db/migrate/YYYYMMDDHHMMSS_create_prompts.rb`:
```ruby
create_table :prompts do |t|
  t.string :name, null: false
  t.integer :version, null: false, default: 1
  t.text :template, null: false
  t.string :description
  t.boolean :active, default: false, null: false
  t.jsonb :metadata

  t.timestamps
  t.index [:name, :version], unique: true
  t.index [:name, :active], where: "active = true", unique: true
end
```
This structure allows multiple versions of a prompt (`summarizer` v1, v2, etc.) but ensures only one version can be `active` for a given name at any time.

### Step 2: The `PromptManager` Service

This service is the sole entry point for accessing prompts. It handles finding the correct version and rendering it with variables.

`app/services/prompt_manager.rb`:
```ruby
class PromptManager
  # Custom error for better handling
  class PromptNotFoundError < StandardError; end

  # Fetches the active prompt by name, or a specific version if provided.
  def self.render(name:, version: nil, variables: {})
    prompt = find_prompt(name, version)

    # Using ERB for templating. For more complex logic, consider Liquid.
    template = ERB.new(prompt.template)
    template.result_with_hash(variables)
  end

  private

  def self.find_prompt(name, version)
    scope = Prompt.where(name: name)
    prompt = version ? scope.find_by(version: version) : scope.find_by(active: true)

    raise PromptNotFoundError, "Prompt '#{name}' not found." unless prompt
    prompt
  end
end

# Usage:
# Renders the active version
PromptManager.render(name: "summarizer", variables: { text: "..." })

# Renders a specific version for testing
PromptManager.render(name: "summarizer", version: 2, variables: { text: "..." })
```

### Step 3: A Developer Workflow for Managing Prompts

How do you get prompts into the database? Relying on manual entry in a production console is not a scalable or repeatable process. The best practice is to define prompts in version-controlled files and use a Rake task to sync them.

`db/prompts/summarizer.yml`:
```yaml
- version: 1
  description: "Initial summary prompt."
  active: false
  template: |
    Summarize this: {{text}}
- version: 2
  description: "More detailed summary prompt with bullet points."
  active: true
  template: |
    Summarize the following text into three concise bullet points:\n\n{{text}}
```

`lib/tasks/prompts.rake`:
```ruby
namespace :prompts do
  desc "Syncs prompts from YAML files into the database."
  task sync: :environment do
    Dir[Rails.root.join("db/prompts/*.yml")].each do |file_path|
      name = File.basename(file_path, ".yml")
      versions = YAML.load_file(file_path)

      versions.each do |config|
        prompt = Prompt.find_or_initialize_by(name: name, version: config['version'])
        prompt.update!(config)
        puts "Synced prompt: #{name} v#{config['version']}"
      end
    end
  end
end
```
Now, your prompts live in version-controlled files, and `rake prompts:sync` becomes part of your deployment process, providing a reliable workflow.

### Step 4: A/B Testing and Continuous Improvement

This engine makes A/B testing straightforward. To compare `v2` and `v3` of your `summarizer` prompt:

1.  Deploy both versions via the sync task, with `v2` marked as `active`.
2.  In your application code, divert a percentage of traffic to explicitly render `v3`.
3.  Log the evaluation scores (using the framework from our first post!) for both versions.
4.  Compare the average scores to decide on a winner.

```ruby
# In a controller or service
version_to_render = should_use_test_version? ? 3 : nil # nil renders the active version
prompt = PromptManager.render(name: "summarizer", version: version_to_render, ...)
# ... then log the results of this interaction against the version used.
```

### Prompts as Code

By moving your prompts from hardcoded strings into a version-controlled, database-backed system, you treat them with the same discipline as the rest of your codebase. This engine provides a foundation for collaboration, testing, and continuous improvement, allowing you to scale your AI features responsibly. It adds a layer of complexity, but for any project serious about prompt engineering, the benefits in stability and manageability are well worth the investment.
