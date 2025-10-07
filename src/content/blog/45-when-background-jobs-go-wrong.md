---
title: 'When Background Jobs Go Wrong: A Debugging Guide for Async Rails Features'
date: "October 14, 2025"
excerpt: 'Your async AI feature works... until it doesn't. This guide covers how to debug silent job failures, trace Action Cable WebSocket issues, and handle common pitfalls in production.'
---

In the [previous post](/blog/44-speeding-up-ai-features-in-rails), we built a responsive AI feature using background jobs and Action Cable. The "happy path" is great, but in production, things go wrong. Jobs fail silently, WebSockets disconnect, and race conditions emerge. This post is your debugging playbook.

### Part 1: The Case of the Silent Job Failure

You enqueued a job, the UI says "processing," but nothing ever happens. There are no errors in your main Rails log. Where do you look?

#### 1. Check Your Exception Tracker (The #1 Culprit)

Standard Rails logging doesn't always capture exceptions inside background job threads, especially if the job process itself crashes. An exception tracking service is non-negotiable for production apps.

*   **Services:** [Sentry](https://sentry.io/), [Honeybadger](https://www.honeybadger.io/), [Bugsnag](https://www.bugsnag.com/).
*   **Why it helps:** They are specifically designed to capture and report errors from any part of your application stack, including background jobs. This is almost always where your "silent" error is hiding.

#### 2. Visit the Job Runner's Web UI

Whether you use Sidekiq, GoodJob, or another backend, its web interface is a goldmine.

*   **Sidekiq:** Visit `/sidekiq`. Check the **"Retries"** and **"Dead"** tabs.
    *   **Retries:** A job here means it failed but is scheduled to be retried. The UI will show the error message and when the next attempt will be. This tells you the failure is transient.
    *   **Dead:** A job here has failed all its retry attempts. This is a permanent failure that you need to inspect and likely fix. The error backtrace is available here.

#### 3. Add Granular, Structured Logging

If the job isn't in your exception tracker or dead set, it might be getting stuck or exiting unexpectedly. Add logging at key points.

`app/jobs/generate_summary_job.rb`
```ruby
class GenerateSummaryJob < ApplicationJob
  def perform(document_id)
    Rails.logger.info "[GenerateSummaryJob] Starting for document_id: #{document_id}"
    document = Document.find(document_id)
    document.processing!

    summary = OpenAiService.generate_summary(document.text)
    document.update!(summary: summary, summary_status: :complete)

    Rails.logger.info "[GenerateSummaryJob] Completed for document_id: #{document_id}"
  rescue => e
    Rails.logger.error "[GenerateSummaryJob] Failed for document_id: #{document_id}, Error: #{e.message}"
    # ... rest of error handling
  end
end
```
This helps you trace exactly how far the job got before it failed.

#### 4. Reproduce it in the Console

The fastest way to debug a job's logic is to run it directly in the Rails console. This runs it synchronously in the foreground, so you can interact with it using a debugger like `binding.irb`.

```bash
rails c
> GenerateSummaryJob.new.perform(123)
```

---

### Part 2: Tracing Action Cable & WebSocket Issues

The job completed successfully, the database is updated, but the UI never changes. This points to a problem in your real-time layer.

#### 1. Use Your Browser's DevTools

This is your first and most important tool.
*   **Network Tab:**
    1.  Open the Network tab and refresh the page.
    2.  Filter by "WS" (WebSockets). You should see a request to `/cable` with a `101 Switching Protocols` status. If not, your client-side connection is failing.
    3.  Click the request and go to the "Messages" or "Frames" tab. You should see incoming `ping` messages from the server and any messages broadcast from your channels. If you see a `{"type":"reject_subscription"}` message, your channel authorization is failing.
*   **Console Tab:** Look for any JavaScript errors. Is your Stimulus controller failing to connect? Is the Action Cable consumer not being created?

#### 2. Enable Verbose Action Cable Logging

You can get more insight into what Action Cable is doing on the server.

`config/development.rb`
```ruby
# This will log all broadcasts, subscriptions, and messages
config.action_cable.logger = Logger.new(STDOUT, level: :debug)
```

With this enabled, your Rails log will show entries like:
```
DocumentChannel is transmitting {"status":"complete",...} to document:Z2lkOi8v...
```
If you don't see a "transmitting" message after your job completes, the `broadcast_to` call is likely incorrect.

#### 3. Common Broadcasting Mistakes

*   **Wrong Stream Name:** `broadcast_to(document, ...)` creates a unique stream name based on the object's GlobalID. On the client, `stream_for document` subscribes to that same name. If you accidentally broadcast to `broadcast_to("document_#{document.id}", ...)` it won't work. The objects must match.
*   **Authorization Rejection:** As mentioned in the previous post, if your `subscribed` method calls `reject`, the client will be silently disconnected from that channel. Your server logs will show `Subscription rejected`.

---

### Part 3: Advanced Pitfalls

#### Making Jobs Idempotent

What happens if your job runs twice due to a retry? You'll call the LLM API twice, costing you money and time. Design your jobs to be idempotent—safe to run multiple times.

```ruby
def perform(document_id)
  document = Document.find(document_id)
  # Don't run again if it's already complete
  return if document.summary_status == 'complete'

  document.processing!
  # ...
end
```

#### `RecordNotFound` on Retries

You enqueue a job with `perform_later(document)`. The document is deleted. A few seconds later, the job runs and immediately fails with `ActiveRecord::RecordNotFound`.

*   **Solution:** Pass simple IDs (`perform_later(document.id)`) instead of full AR objects. This is more robust. The job is then responsible for finding the record, and can gracefully handle the case where it no longer exists.

### Conclusion

Debugging asynchronous systems is about knowing where to look. Your toolkit should include your exception tracker, your job runner's UI, your browser's DevTools, and structured server-side logging. By methodically checking each component—the job, the broadcast, and the client-side subscription—you can quickly diagnose and fix even the most "silent" failures.

```