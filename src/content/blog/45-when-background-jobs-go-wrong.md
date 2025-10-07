---
title: 'When Background Jobs Go Wrong: A Debugging Guide for Async Rails Features'
date: "October 8, 2025"
excerpt: "Your async AI feature works... until it doesn't. This guide covers how to debug silent job failures, trace Action Cable WebSocket issues, and handle common pitfalls in production."
---

In the [previous post](/blog/44-speeding-up-ai-features-in-rails), we built a responsive AI feature using background jobs and Action Cable. The "happy path" is great, but in production, things go wrong. Jobs fail silently, WebSockets disconnect, and race conditions emerge. This post is your debugging playbook.

### Part 1: The Case of the Silent Job Failure

You enqueued a job, the UI says "processing," but nothing ever happens. There are no errors in your main Rails log. Where do you look?

#### 1. Check Your Exception Tracker (The #1 Culprit)

Standard Rails logging doesn't always capture exceptions inside background job threads, especially if the job process itself crashes. An exception tracker is non-negotiable for production apps.

*   **Services:** [Sentry](https://sentry.io/), [Honeybadger](https://www.honeybadger.io/), [Bugsnag](https://www.bugsnag.com/).
*   **Why it helps:** They are specifically designed to capture and report errors from any part of your application stack, including background jobs. This is almost always where your "silent" error is hiding.

#### 2. Visit the Job Backend's Web UI

Whether you use Sidekiq, GoodJob, or another job backend, its web interface is a goldmine.

*   **Sidekiq:** Visit `/sidekiq`. Check the **"Retries"** and **"Dead"** tabs.
    *   **Retries:** A job here means it failed but is scheduled to be retried. The UI will show the error message and when the next attempt will be. This tells you the failure is transient.
    *   **Dead:** A job here has failed all its retry attempts. This is a permanent failure that you need to inspect and likely fix. The error backtrace is available here.

#### 3. Check Your Job Backend's Log File

Background jobs don't always log to your main Rails log, especially in production.

- **Sidekiq:** Logs to STDOUT by default, which might go to `log/sidekiq.log` depending on your setup.
- **GoodJob:** Logs to your main Rails log by default.
- **Delayed Job:** Logs to `log/delayed_job.log`.

If you're using systemd or Docker, your logs might be in journalctl or your container runtime's logs.

#### 4. Add Granular, Structured Logging

If the job isn't in your exception tracker or dead set, it might be getting stuck or exiting unexpectedly. Add logging at key points.

`app/jobs/generate_summary_job.rb`
```ruby
class GenerateSummaryJob < ApplicationJob
  def perform(document_id)
    Rails.logger.info "[GenerateSummaryJob] Starting for document_id: #{document_id}"
    document = Document.find_by(id: document_id)
    return unless document # Gracefully exit if deleted

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

#### 5. The Job That Never Completes

Your job status shows "processing" for hours. The job didn't fail, it's stuck.

**Common causes:**
- **No timeout on HTTP requests:** LLM APIs can hang indefinitely.
- **Deadlocks:** The job is waiting for a database lock that never releases.
- **Infinite loops:** Logic errors in your code.

**Solutions:**

Add timeouts to all external API calls:
```ruby
# Using Faraday (common HTTP client)
conn = Faraday.new(url: 'https://api.openai.com') do |f|
  f.options.timeout = 30      # 30 second timeout
  f.options.open_timeout = 10 # 10 second connection timeout
end

# Or use Timeout::timeout (less ideal, but works)
Timeout::timeout(60) do
  OpenAiService.generate_summary(document.text)
end
```

**Set job-level timeouts in Sidekiq:**
```ruby
class GenerateSummaryJob < ApplicationJob
  sidekiq_options timeout: 120 # Kill job after 2 minutes
end
```

#### 6. Reproduce it in the Console

The fastest way to debug a job's logic is to run it directly in the Rails console. This bypasses the queue, but still runs the job through the full ActiveJob stack, including callbacks and exception handling.

```ruby
# In your rails console (`rails c`):

# This goes through the full ActiveJob stack but runs synchronously
GenerateSummaryJob.perform_now(123)

# Or enqueue and process immediately (tests the entire pipeline)
job = GenerateSummaryJob.perform_later(123)
Sidekiq::Worker.drain_all  # For Sidekiq
```

**Development vs Production Debugging:**

| Technique | Development | Production |
|-----------|-------------|------------|
| `binding.irb` in jobs | ✅ Works great | ❌ Don't do this |
| Verbose logging | ✅ Helpful | ⚠️ Use sparingly (log volume) |
| Reproduce in console | ✅ Fast iteration | ⚠️ Be careful with production data |
| Exception tracker | ⚠️ Optional | ✅ **Required** |

---

### Part 2: Tracing Action Cable & WebSocket Issues

The job completed successfully, the database is updated, but the UI never changes. This points to a problem in your real-time layer.

#### 1. Use Your Browser's DevTools

**Network Tab → WebSocket Inspector:**
1. Open DevTools → Network tab → Filter by "WS"
2. Refresh the page
3. **What you should see:**
   - A request to `/cable` with status `101 Switching Protocols` (green)
   - In the Messages/Frames tab: Regular `{"type":"ping"}` messages every 3 seconds
   - Your subscription confirmation: `{"identifier":..., "type":"confirm_subscription"}`

**What different statuses mean:**
- `101 Switching Protocols`: ✅ Connection successful
- `404 Not Found`: Your Action Cable mount point is wrong (check `config/routes.rb`)
- `401/403 Unauthorized`: Your authentication is failing in `ApplicationCable::Connection`
- `Connection refused`: Redis isn't running (Action Cable requires Redis in production)

**If you see `{"type":"reject_subscription"}`:**
Your channel's `subscribed` method called `reject`. Check your authorization logic.

#### 2. Enable Verbose Action Cable Logging

This will flood your logs in production, so use it carefully.

In `config/environments/development.rb`:
```ruby
# In development, verbose logging is helpful
config.action_cable.logger = Logger.new(STDOUT, level: :debug)
```

**In production, use this sparingly:**
```ruby
# Enable temporarily for debugging, then disable
# WARNING: This generates a LOT of log volume
Rails.application.config.action_cable.logger.level = :debug
```

Or better yet, use a dynamic log level:
```ruby
# Toggle via environment variable
config.action_cable.logger.level = ENV.fetch('CABLE_LOG_LEVEL', 'info').to_sym
```

With this enabled, your Rails log will show entries like:
```log
DocumentChannel is transmitting {"status":"complete",...} to document:Z2lkOi8v...
```
If you don't see a "transmitting" message after your job completes, the `broadcast_to` call is likely incorrect.

#### 3. Common Broadcasting Mistakes

*   **Wrong Stream Name:** `broadcast_to(document, ...)` creates a unique stream name based on the object's GlobalID. On the client, `stream_for document` subscribes to that same name. If you accidentally broadcast to `broadcast_to("document_#{document.id}", ...)` it won't work. The objects must match.
*   **Authorization Rejection:** As mentioned in the previous post, if your `subscribed` method calls `reject`, the client will be silently disconnected from that channel. Your server logs will show `Subscription rejected`.

---

### Part 3: Advanced Pitfalls

#### Making Jobs Idempotent

What happens if your job runs twice due to a retry? You'll call the LLM API twice, costing you money and time. [Design your jobs to be idempotent](/blog/42-idempotency-the-api-principle-youre-probably-neglecting/) to be safe to run multiple times. You need an atomic operation to prevent race conditions.

```ruby
def perform(document_id)
  document = Document.find(document_id)
  
  # This atomic transition ensures only one job can process the document.
  # It assumes you have a state machine (e.g., AASM) where `processing!`
  # returns false if the state transition is not allowed (e.g., from `complete`).
  return unless document.pending? && document.processing!
  
  # Now we know we're the only job processing this document
  summary = OpenAiService.generate_summary(document.text)
  document.update!(summary: summary, summary_status: :complete)
end
```

#### `RecordNotFound` on Retries

You enqueue a job with `perform_later(document)`. The document is deleted. A few seconds later, the job runs and immediately fails with `ActiveRecord::RecordNotFound`.

**Why does this happen?** 

When you pass an ActiveRecord object to a job (`perform_later(document)`), ActiveJob serializes it using GlobalID. The job stores a reference like `gid://app/Document/123`, not the actual data. If the document is deleted before the job runs (e.g., user cancels, record is purged), the job fails when it tries to find the record.

**The fix:**
Pass simple IDs (`perform_later(document.id)`) instead of full AR objects. The job is then responsible for finding the record, and can gracefully handle the case where it no longer exists.
```ruby
# Pass the ID, handle the missing record gracefully
def perform(document_id)
  document = Document.find_by(id: document_id)
  return unless document  # Silently skip if deleted
  
  # ... rest of job
end
```

#### Redis is Full

**Symptoms:**
- Jobs enqueue but never process
- Action Cable connections fail silently
- Redis logs show: `OOM command not allowed when used memory > 'maxmemory'`

**Debug:**
```bash
redis-cli INFO memory
# Check used_memory_human and maxmemory_human
```

**Solutions:**
- Increase Redis memory limit
- Enable eviction policies: `maxmemory-policy allkeys-lru`
- Use separate Redis instances for jobs vs Action Cable

---

### Part 4: Testing Async Features

**Testing jobs:**
```ruby
# RSpec
it "generates a summary" do
  expect {
    GenerateSummaryJob.perform_now(document.id)
  }.to change { document.reload.summary }.from(nil)
end

# Test that the job is enqueued (not executed)
it "enqueues the job" do
  expect {
    post :generate_summary, params: { id: document.id }
  }.to have_enqueued_job(GenerateSummaryJob).with(document.id)
end
```

**Testing Action Cable broadcasts:**
```ruby
it "broadcasts the result" do
  expect {
    GenerateSummaryJob.perform_now(document.id)
  }.to have_broadcasted_to(document).with(hash_including(status: 'complete'))
end
```

### Conclusion

Debugging asynchronous systems is about knowing where to look. Your toolkit should include your exception tracker, your job backend's UI, your browser's DevTools, and structured server-side logging. By methodically checking each component—the job, the broadcast, and the client-side subscription—you can quickly diagnose and fix even the most "silent" failures.
