---
title: 'From Seconds to Milliseconds: Speeding Up AI Features in Rails'
pubDate: 2025-10-06
description: 'How to use asynchronous processing and smart caching to make your Rails AI features faster.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/speeding-up-ai-features-in-rails.png'
    alt: 'A rocket ship with the Ruby on Rails logo accelerating.'
tags: ["ruby", "rails", "ai", "performance", "sidekiq", "redis"]
---

Integrating LLMs can introduce significant latency, harming the user experience. Drawing from previous posts on performance, this article tackles the challenge of slow AI API calls. We'll demonstrate how to move expensive LLM interactions into asynchronous background jobs using Sidekiq and implement a strategic caching layer with Redis to store and reuse costly embeddings and API responses, ensuring your AI-powered features are both intelligent and instantaneous.

### The Problem: Synchronous API Calls

Calling an external LLM API in the middle of a web request is a recipe for a slow user experience. The entire request is blocked waiting for the API to respond.

```ruby
# The slow way: in the controller
class AiController < ApplicationController
  def generate_summary
    # This blocks the request!
    @summary = OpenAiService.generate_summary(params[:text])
  end
end
```

### Solution 1: Asynchronous Processing with Sidekiq

We can immediately improve the user experience by moving this work to a background job. The controller can enqueue the job and the user gets a response right away.

```ruby
# app/jobs/generate_summary_job.rb
class GenerateSummaryJob < ApplicationJob
  queue_as :default

  def perform(document_id)
    document = Document.find(document_id)
    summary = OpenAiService.generate_summary(document.text)
    document.update!(summary: summary)
    # Optionally, notify the user via ActionCable or email
  end
end
```

### Solution 2: Strategic Caching with Redis

Many AI API calls are expensive and deterministic. If you ask for a summary of the same text twice, you should get the same result. This is a perfect use case for caching.

```ruby
# app/services/open_ai_service.rb
class OpenAiService
  def self.generate_summary(text)
    cache_key = ["summary", Digest::SHA256.hexdigest(text)]

    Rails.cache.fetch(cache_key, expires_in: 24.hours) do
      # This block only runs if the cache key is not found
      # ... actual call to the OpenAI API ...
    end
  end
end
```

By combining background jobs and smart caching, you can build AI features that feel seamless and incredibly fast to your users.
