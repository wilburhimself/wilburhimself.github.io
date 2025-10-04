---
title: 'From Seconds to Milliseconds: Architecting Fast AI Features in Rails'
pubDate: 2025-10-06
description: 'A deep dive into architectural patterns using Sidekiq and Redis to solve LLM latency issues in Rails applications, focusing on UX, robustness, and cache strategies.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/speeding-up-ai-features-in-rails.png'
    alt: 'A rocket ship with the Ruby on Rails logo accelerating.'
tags: ["ruby", "rails", "ai", "performance", "sidekiq", "redis", "architecture"]
---

Integrating LLMs can introduce significant latency, often turning a snappy feature into a frustrating user experience. This post moves beyond simple fixes to discuss architectural patterns for building fast, production-grade AI features in Rails using asynchronous jobs and intelligent caching.

We'll explore the trade-offs and cover not just the "how," but the "why" behind creating a system that feels instantaneous to the user, even when the underlying AI calls take seconds.

### Pattern 1: The Asynchronous Job with Real-time UI Updates

Moving an LLM call to a background job is the most common first step. But how does the user get the result? The key is to pair a background job with a real-time frontend update.

**The UX Flow:**
1.  User clicks "Generate Summary." The request immediately enqueues a job and returns.
2.  The UI instantly shows a placeholder: "Generating summary..."
3.  The background job runs, calls the LLM, and saves the result.
4.  Upon completion, the job broadcasts an event using Action Cable.
5.  A Stimulus controller on the frontend catches the event and seamlessly replaces the placeholder with the final summary.

**The Backend Implementation:**

Let's make the job more robust with error handling and status updates. Sidekiq's built-in retries are great for transient network issues.

`app/models/document.rb`
```ruby
class Document < ApplicationRecord
  # Add a status field to track the summary generation
  enum summary_status: { pending: 0, processing: 1, complete: 2, failed: 3 }
end
```

`app/jobs/generate_summary_job.rb`
```ruby
class GenerateSummaryJob < ApplicationJob
  queue_as :default
  sidekiq_options retry: 5 # Retry on failure

  def perform(document_id)
    document = Document.find(document_id)
    document.processing!

    summary = OpenAiService.generate_summary(document.text)
    document.update!(summary: summary, summary_status: :complete)

    # Notify the frontend that the work is done
    DocumentChannel.broadcast_to(document, { summary: summary })
  rescue StandardError => e
    document.failed!
    Rails.logger.error "Failed to generate summary for document #{document_id}: #{e.message}"
  end
end
```

This approach provides a great user experience but adds architectural complexity with real-time updates.

### Pattern 2: Proactive Caching with Robust Keys

For data that is expensive to generate but frequently read, caching is essential. However, a naive cache key can cause major issues.

A robust cache key should include:
*   **The object identifier:** `document.id`
*   **The object's last-updated timestamp:** `document.updated_at.to_i`
*   **The prompt/model version:** A constant that you bump when you change the prompt or underlying LLM.

This ensures that if the document or the prompt changes, the cache is automatically invalidated.

`app/services/summary_service.rb`
```ruby
class SummaryService
  PROMPT_VERSION = "v1.1"

  def self.get_for(document)
    # This robust key prevents serving stale data
    cache_key = ["summary", document.id, document.updated_at.to_i, PROMPT_VERSION].join('/')

    Rails.cache.fetch(cache_key, expires_in: 7.days) do
      # This block only runs on a cache miss
      OpenAiService.generate_summary(document.text)
    end
  end
end
```

**Cache Invalidation Strategy:** The `updated_at` timestamp in the cache key provides an elegant, automatic invalidation strategy. Whenever the document is updated, the key changes, and a new summary will be generated on the next request.

### The Hybrid Approach: Proactive Cache Warming

The best systems often combine both patterns. When a document is created or updated, enqueue a background job not to just generate a summary, but to *warm the cache*.

`app/controllers/documents_controller.rb`
```ruby
def create
  @document = Document.new(document_params)
  if @document.save
    # Enqueue a job to warm the cache for the new document
    WarmSummaryCacheJob.perform_async(@document.id)
    redirect_to @document
  else
    render :new
  end
end
```

`app/jobs/warm_summary_cache_job.rb`
```ruby
class WarmSummaryCacheJob
  include Sidekiq::Job

  def perform(document_id)
    document = Document.find(document_id)
    # This call will execute the block inside `fetch`, generating the summary
    # and storing it in the cache for future reads.
    SummaryService.get_for(document)
  end
end
```

With this hybrid pattern, the first user to view the summary gets an instant, cache-hit response, as the work was already done proactively in the background. This provides the best of both worlds: a responsive UI and efficient resource use.

### Conclusion

Moving beyond a simple synchronous call to an LLM requires thinking architecturally about the user experience and system robustness. By using asynchronous jobs for long-running tasks, implementing intelligent caching with versioned keys, and combining these patterns to proactively warm your cache, you can build AI features in Rails that are not only powerful but also feel incredibly fast and reliable to your users.
