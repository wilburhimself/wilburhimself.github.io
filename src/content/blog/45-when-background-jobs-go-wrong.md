---
title: "When Background Jobs Go Wrong: A Debugging Guide for Async Rails Features"
date: "October 8, 2025"
excerpt: "Your async AI feature works... until it doesn't. This guide covers how to debug unreported job failures, trace Action Cable WebSocket issues, and handle common pitfalls in production."
tags: ["background-jobs", "debugging", "rails", "devops", "async"]
---

In the [previous post](/blog/44-speeding-up-ai-features-in-rails), we built a responsive AI feature using background jobs and Action Cable. The "happy path" is great, but in production, things go wrong. Jobs fail without warning, WebSockets disconnect, and race conditions emerge. This post is your debugging playbook.

### Part 1: The Case of the Hidden Job Failure

You enqueued a job, the UI says "processing," but nothing ever happens. There are no errors in your main Rails log. Where do you look?

#### 1. Check Your Exception Tracker (The #1 Culprit)

Standard Rails logging doesn't always capture exceptions inside background job threads, especially if the job process itself crashes. An exception tracker is non-negotiable for production apps.

- **Services:** [Sentry](https://sentry.io/), [Honeybadger](https://www.honeybadger.io/), [Bugsnag](https://www.bugsnag.com/).
- **Why it helps:** They are specifically designed to capture and report errors from any part of your application stack, including background jobs. This is almost always where your hidden error is lurking.

#### 2. Visit the Job Backend's Web UI

Whether you use Sidekiq, GoodJob, or another job backend, its web interface is a goldmine.

- **Sidekiq:** Visit `/sidekiq`. Check the **"Retries"** and **"Dead"** tabs.
  - **Retries:** A job here means it failed but is scheduled to be retried. The UI will show the error message and when the next attempt will be. This tells you the failure is transient.
  - **Dead:** A job here has failed all its retry attempts. This is a permanent failure that you need to inspect and likely fix. The error backtrace is available here.

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

# Use the connection to make requests
response = conn.post('/v1/chat/completions') do |req|
  req.body = { model: 'gpt-4', messages: [...] }.to_json
end
```

**Set job-level timeouts:**

```ruby
# Option 1: Use the sidekiq-timeout gem (recommended)
class GenerateSummaryJob < ApplicationJob
  sidekiq_options timeout: 120 # Requires sidekiq-timeout gem
end

# Option 2: Manual timeout with proper error handling
class GenerateSummaryJob < ApplicationJob
  def perform(document_id)
    Timeout.timeout(120) do
      # job logic here
    end
  rescue Timeout::Error => e
    Rails.logger.error "Job timed out: #{e.message}"
    raise # Will be retried according to retry rules
  end
end

# Note: Sidekiq Enterprise has reliable_fetch with kill_timeout,
# but that's for the entire worker, not per-job
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

| Technique             | Development       | Production                         |
| --------------------- | ----------------- | ---------------------------------- |
| `binding.irb` in jobs | ✅ Works great    | ❌ Don't do this                   |
| Verbose logging       | ✅ Helpful        | ⚠️ Use sparingly (log volume)      |
| Reproduce in console  | ✅ Fast iteration | ⚠️ Be careful with production data |
| Exception tracker     | ⚠️ Optional       | ✅ **Required**                    |

#### 7. Job Queue Starvation (Priorities Matter)

Not all jobs are created equal. Critical jobs might be starving in the queue while low-priority jobs hog the workers.

**Configure queue priorities in `sidekiq.yml`:**

```yaml
:queues:
  - [critical, 2] # Check critical queue 2x as often
  - [default, 1]
  - [low, 1]
```

**Set job priorities:**

```ruby
class GenerateSummaryJob < ApplicationJob
  queue_as :default  # Or :low, :high, :critical
end

class CriticalNotificationJob < ApplicationJob
  queue_as :critical
end
```

**Monitor queue depths:** Visit `/sidekiq` and check the queue sizes in the web UI.

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

#### 3. Common Broadcasting Mistakes

With verbose logging enabled, your Rails log will show entries like:

```log
DocumentChannel is transmitting {"status":"complete",...} to document:Z2lkOi8v...
```

If you don't see a "transmitting" message after your job completes, the `broadcast_to` call is likely incorrect.

**Common issues:**

- **Wrong Stream Name:** `broadcast_to(document, ...)` creates a unique stream name based on the object's GlobalID. On the client, `stream_for document` subscribes to that same name. If you accidentally broadcast to `broadcast_to("document_#{document.id}", ...)` it won't work. The objects must match.
- **Authorization Rejection:** If your `subscribed` method calls `reject`, the client will be disconnected from that channel. Your server logs will show `Subscription rejected`.

#### 4. The "Connection Closed" Race Condition

A common Action Cable pitfall: users navigate away before your job completes, causing unreported broadcast failures.

**Problem:**

```javascript
// User starts request, navigates away before completion
// Job tries to broadcast → connection is gone → hidden error
```

**Solutions:**

1. **Store results in database as fallback:**

```ruby
# Job saves to database first (user can see on page reload)
document.update!(summary: summary, summary_status: :complete)

# Then broadcast (nice-to-have real-time update)
DocumentChannel.broadcast_to(document, status: 'complete')
```

2. **Action Cable handles closed connections gracefully:** Rails automatically detects closed connections and won't attempt to broadcast to them.

3. **Check connection status in JavaScript:**

```javascript
// Monitor connection health
App.cable.connection.monitor = {
  connected() {
    console.log("WebSocket connected");
  },
  disconnected() {
    console.log("WebSocket disconnected");
  },
};
```

#### 5. Action Cable Production Configuration

In production with multiple servers, configure Redis adapter properly:

**`config/cable.yml`:**

```yaml
production:
  adapter: redis
  url: <%= ENV['REDIS_URL'] %>
  channel_prefix: myapp_production
```

**Why Redis is required:** Action Cable uses Redis to coordinate messages across multiple server instances. Without it, users connected to different servers won't receive broadcasts. See the [Action Cable Overview](https://guides.rubyonrails.org/action_cable_overview.html#subscription-adapter) for more details.

---

### Part 3: Advanced Pitfalls

#### Making Jobs Idempotent

What happens if your job runs twice due to a retry? You'll call the LLM API twice, costing you money and time. [Design your jobs to be idempotent](/blog/42-idempotency-the-api-principle-youre-probably-neglecting/) to be safe to run multiple times. Sidekiq's [default retry behavior](https://github.com/sidekiq/sidekiq/wiki/Error-Handling) includes 25 retry attempts over 21 days. You need an atomic operation to prevent race conditions.

```ruby
# More explicit and database-agnostic approach:
def perform(document_id)
  # Use UPDATE with WHERE clause for true atomicity (works without state machine gems)
  affected_rows = Document.where(id: document_id, summary_status: 'pending')
                         .update_all(summary_status: 'processing')

  return if affected_rows.zero? # Already being processed or completed

  document = Document.find(document_id)
  # ... rest of job
end

# Or if using AASM or state_machines gem:
def perform(document_id)
  document = Document.find(document_id)
  # The processing! method should atomically check and transition
  # Configure your state machine to prevent invalid transitions
  return unless document.may_process? && document.processing!
  # ... rest of job
end
```

#### 6. Job Uniqueness (Preventing Duplicate Enqueues)

Prevent the same job from being enqueued multiple times:

```ruby
# Using sidekiq-unique-jobs gem (https://github.com/mhenrixon/sidekiq-unique-jobs)
class GenerateSummaryJob < ApplicationJob
  sidekiq_options lock: :until_executed,
                  on_conflict: :log

  def perform(document_id)
    # Only one instance of this job per document_id can run
  end
end
```

**Alternative approaches:**

- **Database-level locking:** Use `with_lock` or similar mechanisms
- **Redis-based deduplication:** Store job signatures in Redis with expiration

#### `RecordNotFound` on Retries

You enqueue a job with `perform_later(document)`. The document is deleted. A few seconds later, the job runs and immediately fails with `ActiveRecord::RecordNotFound`.

**Why does this happen?**

When you pass an ActiveRecord object to a job (`perform_later(document)`), ActiveJob serializes it using [GlobalID](https://github.com/rails/globalid). The job stores a reference like `gid://app/Document/123`, not the actual data. If the document is deleted before the job runs (e.g., user cancels, record is purged), the job fails when it tries to find the record.

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
- Action Cable connections fail without errors
- Redis logs show: `OOM command not allowed when used memory > 'maxmemory'`

**Debug:**

```bash
redis-cli INFO memory
# Check used_memory_human and maxmemory_human
```

**Solutions:**

- Increase Redis memory limit
- Enable safe eviction policies:
  ```bash
  # NEVER use allkeys-lru with Sidekiq or Action Cable
  # Correct policies for job systems:
  maxmemory-policy noeviction  # Fail writes when full (safer - alerts you to resize)
  maxmemory-policy volatile-lru # Only evict keys with TTL (if you use them)
  ```
- Use separate Redis instances for jobs vs Action Cable

---

### Part 4: Testing Async Features & Production Readiness

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

**Testing job priorities and uniqueness:**

```ruby
# Test that critical jobs are processed first
it "processes critical jobs before default jobs" do
  # Enqueue a default job, then a critical job
  expect {
    LowPriorityJob.perform_later
    CriticalJob.perform_later
  }.to have_enqueued_job(CriticalJob).before(LowPriorityJob)
end

# Test job uniqueness
it "prevents duplicate job enqueues" do
  expect {
    2.times { GenerateSummaryJob.perform_later(document.id) }
  }.to have_enqueued_job(GenerateSummaryJob).exactly(1).times
end
```

**Testing race conditions:**

```ruby
# Test idempotency
it "handles duplicate job execution gracefully" do
  # Run job twice - should not cause errors or duplicate API calls
  expect {
    2.times { GenerateSummaryJob.perform_now(document.id) }
  }.not_to raise_error
  expect(document.summary_api_calls).to eq(1) # Only one API call made
end
```

**Testing Action Cable connection handling:**

```ruby
it "handles connection closed during broadcast" do
  # Simulate connection closing after job starts but before broadcast
  expect {
    job = GenerateSummaryJob.perform_later(document.id)
    # Simulate connection closing
    document_channel = DocumentChannel.new(connection, identifier)
    allow(document_channel).to receive(:broadcast_to).and_raise(ActionCable::Connection::Closed)

    job.perform_now
  }.not_to raise_error
end
```

## Production Readiness Checklist

Before deploying async features to production:

**🔍 Monitoring & Error Tracking:**

- [ ] Exception tracker configured (Sentry/Honeybadger/Bugsnag)
- [ ] Job queue depth monitoring alerts
- [ ] Redis memory usage monitoring
- [ ] Action Cable connection count monitoring

**⚡ Performance & Reliability:**

- [ ] Timeouts on all external API calls (30-60 seconds)
- [ ] Job-level timeouts configured (2-5 minutes)
- [ ] Queue priorities configured for critical jobs
- [ ] Job uniqueness implemented for expensive operations
- [ ] Separate Redis instances for jobs vs Action Cable

**🛡️ Data Safety:**

- [ ] Jobs pass IDs, not ActiveRecord objects
- [ ] Idempotency guards in place for all jobs
- [ ] Database atomic operations for state transitions
- [ ] Graceful handling of deleted records

**🔧 Configuration:**

- [ ] Sidekiq configuration optimized (`sidekiq.yml`)
- [ ] Action Cable Redis adapter configured (`cable.yml`)
- [ ] Redis eviction policies set correctly
- [ ] Environment-specific Redis URLs configured

**📊 Logging & Debugging:**

- [ ] Structured logging in all jobs
- [ ] Action Cable verbose logging toggleable
- [ ] Job backend web UI accessible in production
- [ ] Browser DevTools WebSocket inspection documented

## Quick Reference: Debugging Flowchart

```
Job not working? 🔍
├─ Check exception tracker → Found error? → Fix and deploy
├─ Check job UI (Retries/Dead tabs) → Found job? → Investigate error
├─ Check logs → Found "Starting"?
│  ├─ Yes → Job is stuck (add timeouts)
│  └─ No → Job never enqueued (check controller)
└─ UI not updating?
   ├─ DevTools → WebSocket → Check connection
   └─ Server logs → Check for "transmitting"
```

## Key Takeaways

Debugging asynchronous systems requires a systematic approach. Your toolkit should include your exception tracker, job backend UI, browser DevTools, and structured server-side logging. By methodically checking each component—the job execution, the broadcast mechanism, and the client-side subscription—you can quickly diagnose and fix even the most hidden failures.

The most important principle: **always assume things will go wrong** and design your async features with comprehensive error handling, timeouts, and fallback mechanisms from the start.
