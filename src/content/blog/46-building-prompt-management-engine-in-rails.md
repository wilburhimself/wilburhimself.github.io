---
title: 'The Prompt Engineering Manifesto: From $2,400 Mistakes to Production-Grade AI'
date: "18 October 2025"
excerpt: 'A hardcoded prompt typo cost us $2,400 in 72 hours. Here''s the engineering discipline, testing strategies, and open-source tool (Promptly) we built to fix it for good.'
tags: ["rails", "ruby", "ai", "patterns"]
---

Last month, a typo in a hardcoded AI prompt cost us dearly. The prompt was supposed to ask for a JSON object with three keys, but the typo made the request ambiguous. For 72 hours, our AI spat out unstructured text, breaking a critical background job. By the time we caught it, we had wasted over $2,400 in API calls and processed zero records.

The root cause wasn't a single mistake; it was our collective failure to treat prompts as what they are: **production code**.

This post is a manifesto on the engineering discipline required for prompt management. I'll show you the pain, the patterns, and the open-source Rails gem, [Promptly](https://github.com/wilburhimself/promptly), that I built to enforce this discipline.

### The Anatomy of a "Magic String" Disaster

The problematic prompt was a "magic string" buried in a service object:

`app/services/document_processor.rb`:
```ruby
# ...
def summarize_and_categorize(document)
  prompt = "Summarize the following text and extract the category, title, and keywords. Respond with a single JSON object containing the keys 'summary', 'category', 'title', and 'keywords'. Do not include any other text in your reponse. Text: #{document.content}"
  # ... send to AI
end
# ...
```
The typo was subtle: `reponse` instead of `response`.

A `git blame` showed this prompt had been tweaked three times by two different developers in the last month, with no PR comments, no tests, and no versioning. It was a time bomb.

### The Core Thesis: Prompts Are Code, Treat Them That Way

Prompts must be:
1.  **Version Controlled:** Every change must be reviewable.
2.  **Testable:** Their output structure must be verifiable.
3.  **Safe:** They must handle variable interpolation securely.
4.  **Observable:** Their performance, cost, and success rate must be monitored.
5.  **Organized:** They must not be scattered across the codebase.

To solve this, I built `Promptly`. It’s a lightweight gem that brings Rails conventions to prompt management.

First, add it to your `Gemfile`:
```ruby
gem "promptly"
```

### A Production-Grade Workflow with `Promptly`

Let's fix our `DocumentProcessor` with an engineering-first approach.

#### Step 1: Create a Versioned Prompt File

`app/prompts/document_processor/summarize_v1.erb`:
```erb
Summarize the following text and extract the category, title, and keywords.
Respond with a single JSON object containing the keys 'summary', 'category', 'title', and 'keywords'.
Do not include any other text in your response.

Text:
<%-# Using <%== is critical for safety! It escapes content, preventing ERB injection. -%>
<%== document_content %>
```
We've created a versioned file in a dedicated `prompts` directory. Crucially, we use `<%==` to safely inject the document content, preventing potential ERB injection if the content itself contained malicious tags. Note: While `<%==` protects against ERB injection, it doesn't prevent prompt injection attacks where malicious content tricks the AI itself. Always validate and sanitize user input at multiple layers.

#### Step 2: Build a Robust Service Object

Now, we refactor `DocumentProcessor` to use `Promptly`.

`app/services/document_processor.rb`:
```ruby
class DocumentProcessor
  class PromptError < StandardError; end
  AI_MODEL = "gpt-4".freeze

  # GPT-4 pricing as of Oct 2025: $0.03 per 1K input tokens.
  # Update these constants when pricing changes.
  COST_PER_TOKEN = 0.00003

  def self.call(document, model: AI_MODEL)
    prompt_name = prompt_name_for_model(model)
    prompt = render_prompt(prompt_name, document)

    Rails.logger.info(
      "Rendering AI prompt",
      prompt_name: prompt_name,
      token_estimate: estimate_tokens(prompt),
      document_id: document.id
    )

    response = with_retry { send_to_ai(prompt, model) }

    validate_response_structure(response, model)
    track_prompt_performance(prompt_name, response)

    response
  rescue Promptly::TemplateNotFound => e
    Rails.logger.error("Prompt template missing!", { prompt_name: prompt_name })
    raise PromptError, "Prompt template missing: #{e.message}"
  rescue => e
    Rails.logger.error("AI processing failed", { document_id: document.id, error: e.message })
    raise PromptError, "Failed to process document"
  end

  private

  def self.render_prompt(prompt_name, document)
    Promptly.render(prompt_name, locals: { document_content: document.content })
  end

  def self.send_to_ai(prompt, model)
    # Currently only supports OpenAI models.
    # Multi-provider support requires client abstraction.
    client = OpenAI::Client.new
    client.chat(
      parameters: {
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      }
    )
  end

  def self.with_retry(max_attempts: 3, &block)
    attempts = 0
    begin
      attempts += 1
      block.call
    rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
      retry if attempts < max_attempts
      raise
    end
  end

  def self.estimate_tokens(text)
    # For production, use the `tiktoken_ruby` gem for accurate counts.
    # This is a rough estimate: ~1 token per 4 chars for English text.
    (text.length / 4.0).ceil
  end

  def self.track_prompt_performance(prompt_name, response)
    tokens_used = response.dig("usage", "total_tokens")
    return unless tokens_used

    estimated_cost = tokens_used * COST_PER_TOKEN

    ActiveSupport::Notifications.instrument(
      'prompt.render',
      prompt: prompt_name,
      tokens_used: tokens_used,
      cost_usd: estimated_cost,
      success: response.present?
    )
  end

  # Extracted as a separate method to support future multi-provider scenarios
  def self.extract_content(response, model)
    # This example assumes OpenAI's response structure.
    # A robust implementation would handle different structures from different providers.
    response.dig("choices", 0, "message", "content")
  end

  def self.validate_response_structure(response, model)
    # Implementation shown in "Monitoring for Prompt Drift" section
  end

  def self.prompt_name_for_model(model)
    # This example uses different versions of a prompt for different OpenAI models.
    case model
    when "gpt-4" then "document_processor/summarize_v1"
    when "gpt-4-turbo" then "document_processor/summarize_v2"
    else raise "Unsupported model: #{model}"
    end
  end
end
```

### Justifying the Gem: Why Not Just `render_to_string`?

You could replicate this with Rails partials in `app/views/prompts/`. So why use a dedicated gem?

1.  **Convention & Isolation:** `app/prompts` creates a clear boundary. These aren't user-facing views; they are a distinct layer of your application.
2.  **Safety:** `Promptly` can evolve to add more safety features, like automatic sanitization.
3.  **Tooling:** It provides a foundation for future tooling, like Rake tasks for validating prompts or integrating with services like PromptLayer.
4.  **I18n:** It has built-in conventions for locale fallbacks (`summarize.es.erb` -> `summarize.en.erb`).

### Testing Your Prompts

Your prompts are now part of your CI/CD pipeline.

`spec/prompts/document_processor_spec.rb`:
```ruby
require 'rails_helper'

RSpec.describe "document_processor/summarize_v1 prompt" do
  let(:content) { "This is a test document." }

  it "renders the prompt with the provided content" do
    prompt = Promptly.render("document_processor/summarize_v1", locals: { document_content: content })

    expect(prompt).to include("Summarize the following text")
    expect(prompt).to include(content)
  end

  it "escapes malicious content" do
    malicious_content = "<%= `rm -rf /` %>"
    prompt = Promptly.render("document_processor/summarize_v1", locals: { document_content: malicious_content })

    expect(prompt).to include("&lt;%= `rm -rf /` %&gt;")
    expect(prompt).not_to include("<%= `rm -rf /` %>")
  end
end
```

### Advanced Patterns for Production

- **Prompt Composition:** Build complex prompts from smaller, reusable pieces.

`app/prompts/shared/_json_format_instructions.erb`:
```erb
Respond with valid JSON only. Do not include explanatory text, markdown formatting, or code blocks surrounding the JSON.
```

`app/prompts/shared/_professional_tone.erb`:
```erb
Use clear, professional language. Avoid colloquialisms and maintain a formal tone throughout.
```

`app/prompts/document_processor/summarize_v2.erb`:
```erb
<%== render 'prompts/shared/json_format_instructions' %>
<%== render 'prompts/shared/professional_tone' %>

Text:
<%== document_content %>
```

*   **Multi-Model Support:** The service object shown in Step 2 is already wired for multi-model support. You can use it like this:

```ruby
# Uses default AI_MODEL (gpt-4)
DocumentProcessor.call(document)

# Explicitly uses a different OpenAI model
DocumentProcessor.call(document, model: "gpt-4-turbo")
```

### Monitoring for Prompt Drift

AI models change. A prompt that works today might fail tomorrow. You must monitor the *structure* of your responses to detect this "prompt drift."

`app/services/document_processor.rb`:
```ruby
  def self.validate_response_structure(response, model)
    required_keys = %w[summary category title keywords]
    content = extract_content(response, model)
    return unless content

    begin
      parsed_json = JSON.parse(content)
      missing_keys = required_keys - parsed_json.keys

      if missing_keys.any?
        Sentry.capture_message("Prompt drift detected: Missing keys", extra: { missing: missing_keys })
      end
    rescue JSON::ParserError => e
      Sentry.capture_message("Prompt response is not valid JSON", extra: { error: e.message })
    end
  end
```

### A Note on A/B Testing

A full A/B testing implementation is beyond this post's scope, but this architecture makes it possible. Using a feature flagging tool like Flipper, you can control which prompt version a user receives.

```ruby
# In your service object
def self.prompt_name_for_request(user)
  if Flipper[:new_summarizer_prompt].enabled?(user)
    "document_processor/summarize_v2"
  else
    "document_processor/summarize_v1"
  end
end
```

### When *Not* to Use `Promptly`

This approach is not a silver bullet. Don't use it if:
*   Your project has only 1-2 simple, stable prompts.
*   You require prompts to be dynamically managed by non-technical users in a CMS (a database solution is better here).
*   You are primarily using streaming scenarios where the "prompt" is a complex, stateful conversation.

### The Five Principles of Production Prompt Engineering

This entire workflow is built on five core principles.

1.  **Prompts are code.** Version them, review them, test them.
2.  **Safety first.** Always escape variables. Never trust any input.
3.  **Observability is non-negotiable.** Log every render, track every cost, monitor every response.
4.  **Iteration requires discipline.** Use versioning and feature flags, not inline edits.
5.  **Failure is expected.** Handle errors gracefully, retry intelligently, and alert on drift.

By treating prompts with the same rigor as the rest of our code, we turned a constant source of chaos into a stable, scalable part of our application. The $2,400 mistake wasn't just a bug; it was the catalyst for building a better system.
