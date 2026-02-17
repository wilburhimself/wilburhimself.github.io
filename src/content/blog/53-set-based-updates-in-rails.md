---
title: "Set-Based Updates in Rails: 4 Hours to 8 Seconds"
date: "February 28, 2026"
excerpt: "Stop writing N+1 update loops. Learn how `update_all`, `update_columns`, and safe, batched SQL can drastically improve your Rails app's performance."
tags: ["rails", "ruby", "performance", "database", "optimization", "activerecord", "sql"]
---

I once inherited a background job to deactivate stale users. In production, a job processing 50,000 users that should have taken a minute was taking over 4 hours, consuming 2GB of RAM, and frequently timing out.

The culprit was a classic Rails performance pitfall: the N+1 update loop. The code looked innocent:

```ruby
# Find users whose last login was more than 90 days ago
users_to_deactivate = User.where("last_login_at < ?", 90.days.ago)

users_to_deactivate.each do |user|
  # This runs one UPDATE query for every single user
  user.update(active: false)
end
```
This generates a flood of queries, hammering the database with thousands of individual transactions:
```sql
-- The N+1 Update Hell
SELECT "users".* FROM "users" WHERE (last_login_at < '2025-11-30...');
UPDATE "users" SET "active" = false, "updated_at" = '...' WHERE "users"."id" = 1;
UPDATE "users" SET "active" = false, "updated_at" = '...' WHERE "users"."id" = 2;
-- ... 49,998 more UPDATE statements
```
This approach is not just inefficient; it's hostile to your database. There is a much better way.

> **A Note on Indexes**
> All performance advice in this post assumes your query conditions are indexed. The `User.where("last_login_at < ?", ...)` query is only fast if you have a database index on the `last_login_at` column. Without it, the `SELECT` itself will be slow.
>
> You can check this with `User.where("last_login_at < ?", 90.days.ago).explain`. If you see a `Seq Scan` (Sequential Scan), you need an index:
> ```ruby
> # db/migrate/YYYYMMDDHHMMSS_add_index_to_users_last_login_at.rb
> add_index :users, :last_login_at
> ```

### The Power of `update_all`

Instead of pulling 50,000 records into memory, we can tell the database to update the entire set in a single command. Active Record's `update_all` constructs one SQL `UPDATE` statement and sends it directly to the database.

Let's refactor the slow job:
```ruby
count = User.where("last_login_at < ?", 90.days.ago)
            .update_all(active: false, updated_at: Time.current)

Rails.logger.info "Deactivated #{count} users."
```
This generates one beautiful, efficient SQL query and returns the number of rows affected. The result: 4 hours becomes 8 seconds.

### The Sharp Edges of `update_all`

This performance comes with a critical trade-off: `update_all` bypasses most of the ActiveRecord lifecycle.
-   **It ignores validations.**
-   **It skips callbacks.** This will break any business logic in `after_save` or `after_commit`, like sending notifications or invalidating caches.

#### The `updated_at` Trap
The most insidious side effect is that **`update_all` does not automatically update the `updated_at` timestamp.** This will break any downstream system that relies on it for cache invalidation, audit trails, or synchronization.

Imagine a UI that caches a user's profile:
```ruby
Rails.cache.fetch("user-#{user.id}-#{user.updated_at.to_i}") { ... }
```
If you use `update_all(active: false)`, `updated_at` remains unchanged. The cache key stays the same, and your UI continues to show the user as active until the cache expires. The fix is to set it manually, as shown in the example above.

### The Middle Ground: `update_columns`
`update_columns` is for when you *already have* an object in memory and need to perform a targeted update while bypassing callbacks and validations. It's a scalpel for a single record.

```ruby
user = User.find_by(email: "some_user@example.com")
# ... some complex logic ...

# Now, update just one attribute without triggering callbacks.
user.update_columns(login_attempts: 0)
```
Unlike `update_all`, `update_columns` *does* touch `updated_at` by default (though this can be configured). It is **not** for bulk operations; using it in a loop brings you right back to the N+1 problem.

### War Story #2: The Death-by-a-Thousand-Increments
I once debugged a Rails app where a popular blog post page was taking 20 seconds to load. The culprit? The controller was incrementing view counts like this for every recommended article on the page:
```ruby
# ANTI-PATTERN: 50 posts on the page = 50 UPDATE queries
recommended_posts.each { |post| post.increment!(:view_count) }
```
`increment!` is just `update` under the hood. The fix was to switch to `update_all` with a SQL fragment, which dropped the response time to 200ms.
```ruby
# GOOD: One query to increment all counters
Post.where(id: recommended_posts.map(&:id))
    .update_all("view_count = view_count + 1")
```

### Going Deeper: Safe Heterogeneous Updates with SQL `CASE`
`update_all` is great for applying the *same* change to many records. But what if you need to update a set of records, each with a *different* value, like reordering items in a playlist?

> ⚠️ **Security Warning: SQL Injection**
> Building raw SQL queries with string interpolation is extremely dangerous. The following example demonstrates a **safe** approach using `sanitize_sql_array`. **Never** inject raw user input directly into SQL strings.

```ruby
# Use case: Reorder a list of tasks from user input
# updates = { "1" => 1, "2" => 2, "3" => 3 } where key is task_id and value is new position
def self.reorder_tasks(updates)
  # Build the CASE statement using sanitize_sql_array for each condition
  case_sql = updates.map do |id, position|
    # Ensure id and position are integers to prevent injection
    ActiveRecord::Base.sanitize_sql_array(["WHEN ? THEN ?", id.to_i, position.to_i])
  end.join(" ")

  # Construct the final, safe update statement
  update_sql = [
    "position = CASE id #{case_sql} END, updated_at = :now",
    { now: Time.current }
  ]
  
  Task.where(id: updates.keys).update_all(update_sql)
end
```
This is the most performant way to handle complex batch updates, combining the power of raw SQL with the safety of Rails' sanitization.

### Production Considerations
#### Locking and Concurrency
A long-running `update_all` can lock many rows, blocking other requests. This can cause timeouts in a high-traffic application. It's often better to process records in batches to reduce lock duration.

#### Processing in Batches
For very large updates, use `in_batches` to break the work into smaller chunks. This runs more queries but keeps transactions short and locks minimal.
```ruby
# Process 50,000 users in batches of 5,000
User.where("last_login_at < ?", 90.days.ago)
    .in_batches(of: 5000) do |batch|
      batch.update_all(active: false, updated_at: Time.current)
      sleep(0.1) # Optional: yield to other processes
end
```

### The Decision Framework

-   **`update`**: The default for single-record updates where callbacks and validations **must** run.
-   **`update_columns`**: A scalpel for single-record updates where callbacks and validations **must** be skipped.
-   **`update_all`**: The workhorse for bulk-updating many records to the **same** value.
-   **`update_all` with `CASE`**: The specialist tool for bulk-updating many records to **different** values.

Avoid set-based updates entirely when you need to trigger side effects (like sending emails) for each updated record or when you need to run model validations.

### Conclusion
The next time you write `.each { |record| record.update(...) }`, pause. Ask yourself: am I processing complex business logic for each record, or am I simply updating a set of records based on a condition?

If you're just changing data, you're in set-based territory. Choosing the right tool for the job is the mark of a seasoned developer. Your database will thank you. And when your background job finishes in 8 seconds instead of timing out after 4 hours, you will too.