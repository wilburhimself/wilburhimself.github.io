---
title: "The Postgres You Already Have: Solving Problems Without Adding Dependencies"
date: "October 22, 2025"
excerpt: "Before you reach for another specialized tool, take a closer look at your database. Postgres is more than just a data store; it’s a powerful, extensible platform. We’ll explore how to leverage its built-in features for full-text search, job queues, and more, reducing complexity and cost."
---

Your team has a new requirement: you need to add search to your application. The immediate, almost reflexive, response in the Rails community is to add a dependency. "Let's add Elasticsearch!" someone says. "Or maybe MeiliSearch?" another suggests. Soon you're debating the operational overhead of a new service, the complexity of keeping it in sync with your primary database, and the cost of running another piece of infrastructure.

This is a common story. We see a problem, and we reach for a new tool. We need a background job processor, so we add Redis and Sidekiq. We need to publish events, so we add Kafka or RabbitMQ. While these tools are powerful and have their place, they all come with a cost: increased operational complexity, more failure modes, and a larger cognitive load for the team.

But what if the tool you need is the one you already have? For a surprisingly large number of use cases, PostgreSQL can do the job, and do it well.

### 1. Full-Text Search: Good Enough is Often Great

Elasticsearch is a phenomenal piece of technology, but it's also a complex distributed system. For many applications, the search requirements are simple: search a few text fields on a few models. Postgres has had robust full-text search capabilities for years.

Let's say you want to search for blog posts.

**Step 1: Add a search vector column**

```ruby
# migration
add_column :posts, :search_vector, :tsvector
add_index :posts, :search_vector, using: :gin
```

The `tsvector` type stores a document in a format optimized for text search, and a GIN (Generalized Inverted Index) is the key to making these searches fast.

**Step 2: Keep the vector updated**

You can use a database trigger to automatically update the `search_vector` column whenever a post is created or updated.

```sql
-- migration
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON posts FOR EACH ROW EXECUTE PROCEDURE
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);
```

**Step 3: Search**

Now you can search your posts with a simple scope:

```ruby
# in Post.rb
scope :search, ->(query) do
  where("search_vector @@ to_tsquery(?)", query)
end

# usage
Post.search('rails & performance')
```

This is fast, transactionally consistent with your data, and requires zero new dependencies. For a huge number of applications, this is more than good enough.

### 2. Job Queues: `FOR UPDATE SKIP LOCKED`

Redis and Sidekiq are the default for background jobs in Rails, but what if your job throughput is modest? Do you really need another service to manage?

Postgres can be a surprisingly robust job queue, thanks to a single feature: `FOR UPDATE SKIP LOCKED`.

Here's how it works:

1.  You have a `jobs` table with columns like `queue_name`, `payload`, and `run_at`.
2.  A worker process runs a query like this:

```sql
SELECT id, payload FROM jobs
WHERE run_at <= NOW()
ORDER BY run_at
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

This query does something magical. It looks for the next available job, but if it finds a job that is already locked by another worker, it simply skips it and moves to the next one. This allows multiple workers to pull from the same job queue without any race conditions or complex locking logic.

This is exactly how popular job processors like [GoodJob](https://github.com/bensheldon/good_job) work. GoodJob is a full-featured ActiveJob backend that uses a pure-Postgres implementation. It gives you all the benefits of a modern job processor—dashboard, retries, priorities—with zero new dependencies.

### 3. Pub/Sub: `LISTEN` and `NOTIFY`

Need to broadcast events between different parts of your system? Before you reach for Kafka, consider Postgres's built-in `LISTEN` and `NOTIFY` commands.

`NOTIFY` sends a message to a named channel, and `LISTEN` allows a session to subscribe to that channel.

```ruby
# A process that needs to be notified of new users
ActiveRecord::Base.connection.execute("LISTEN new_user_channel")
loop do
  ActiveRecord::Base.connection.raw_connection.wait_for_notify do |channel, pid, payload|
    puts "New user created: #{payload}"
  end
end

# In your User model, after creation
ActiveRecord::Base.connection.execute("NOTIFY new_user_channel, '#{self.to_json}'")
```

This is a simple but powerful way to decouple parts of your application. It's not a replacement for a high-throughput system like Kafka, but for many internal eventing needs, it's a perfect fit. Action Cable, for example, can use this pub/sub mechanism to broadcast messages across multiple web servers.

### 4. JSONB: Your Schema-less Datastore

Need to store unstructured or semi-structured data? Before you add a MongoDB or Redis dependency, look at Postgres's `JSONB` type. It allows you to store JSON documents natively and, crucially, allows you to index and query them efficiently.

```ruby
# migration
add_column :events, :data, :jsonb
add_index :events, :data, using: :gin

# model
class Event < ApplicationRecord
end

# usage
Event.create(data: { user_id: 1, action: 'login', ip: '127.0.0.1' })

# query
Event.where("data @> ?", { user_id: 1 }.to_json)
```

You get the flexibility of a document database with the transactional guarantees and query power of Postgres.

### The Pragmatic Approach

The point is not that these specialized tools are bad. They are excellent at what they do. The point is that they come with a cost, and that cost is often underestimated.

As a pragmatic engineer, your goal should be to solve the business problem with the least amount of complexity. The next time you have a new requirement, ask yourself: "Can Postgres do this?"

You might be surprised at how often the answer is yes. By leveraging the power of the tools you already have, you can build simpler, more robust, and more maintainable systems.
