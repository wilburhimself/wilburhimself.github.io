---
title: "Idempotency: The API Principle You're Probably Neglecting"
date: "September 22, 2025"
excerpt: 'A user double-clicks "Pay Now." Are they charged twice? In a world of unreliable networks and automatic client retries, idempotency isn''t an advanced feature—it''s a fundamental requirement for any robust API. This post shows you how to implement it using the Idempotency-Key header pattern in Rails.'
tags: ["api-design", "idempotency", "rails", "distributed-systems", "backend"]
---

A user clicks the "Confirm Purchase" button. The spinner appears, but their train goes into a tunnel and the network request times out. Frustrated, they click the button again. A few minutes later, they get two order confirmation emails and their card has been charged twice.

This isn’t a rare edge case. It’s a predictable failure mode in any system that doesn’t account for idempotency. In an era of automatic client-side retries and unreliable mobile networks, designing for idempotency is not optional—it’s a fundamental requirement for building a trustworthy API.

### What is Idempotency?

An operation is idempotent if making the same request multiple times produces the exact same result as making it once. Think of it as a "safe to retry" guarantee.

In HTTP, `GET`, `PUT`, and `DELETE` requests are generally expected to be idempotent. You can `GET /users/123` a hundred times and you'll get the same response. You can `DELETE /users/123` multiple times; the first request deletes the user, and subsequent requests do nothing (or return a `404`), but the system state remains consistent.

The problem lies with `POST` requests. A `POST /orders` request is explicitly non-idempotent; sending it twice is meant to create two orders.

So how do we make a `POST` request safe to retry?

### The Solution: The `Idempotency-Key` Header

The most common and robust solution is for the client to generate a unique key for each operation it wants to make idempotent. This key is passed in a request header, typically `Idempotency-Key`.

The client generates a UUID, sends it with the initial request, and if that request fails or times out, it sends the _exact same request_ with the _exact same idempotency key_.

The server is now responsible for keeping track of these keys and ensuring that it only processes the request for a given key once.

### Implementing Idempotency on the Server

Here’s how you can build a generic idempotency layer for a Rails API using a Rack middleware and Redis.

#### Step 1: The Middleware

This middleware will intercept incoming requests, check for the `Idempotency-Key` header, and manage the caching logic.

```ruby
# app/middleware/idempotency_middleware.rb
class IdempotencyMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    idempotency_key = env['HTTP_IDEMPOTENCY_KEY']

    # If no key, or not a POST/PATCH/PUT request, skip the logic
    unless idempotency_key && ['POST', 'PATCH', 'PUT'].include?(env['REQUEST_METHOD'])
      return @app.call(env)
    end

    # Use Redis for distributed locking and caching
    redis = Redis.new
    lock_key = "idempotency:lock:#{idempotency_key}"
    cache_key = "idempotency:cache:#{idempotency_key}"

    # Check if we already have a cached response
    if (cached_response_json = redis.get(cache_key))
      cached_response = JSON.parse(cached_response_json)
      return Rack::Response.new([cached_response['body']], cached_response['status'], cached_response['headers']).finish
    end

    # Acquire a lock to prevent concurrent requests with the same key
    if redis.set(lock_key, '1', nx: true, ex: 10) # 10-second lock
      begin
        status, headers, body = @app.call(env)

        # Cache the response on success
        if status >= 200 && status < 300
          # The body must be read and joined as it is often an array
          body_content = []
          body.each { |part| body_content << part }
          response_to_cache = { status: status, headers: headers, body: body_content.join }.to_json
          redis.set(cache_key, response_to_cache, ex: 24 * 60 * 60) # Cache for 24 hours
        end

        [status, headers, body]
      ensure
        redis.del(lock_key)
      end
    else
      # Another request with the same key is already in progress
      return Rack::Response.new(['A request with this key is already in progress.'], 409, { 'Content-Type' => 'application/json' }).finish
    end
  end
end
```

This example focuses on the core idea. In a production system, you’d need to normalize response bodies, filter out volatile headers, and tune cache lifetimes to match your domain (e.g., order creation vs. profile updates). The principle stands: capture the result once and make retries safe.

#### Step 2: Add the Middleware to the Stack

```ruby
# config/application.rb
require_relative '../app/middleware/idempotency_middleware'

config.middleware.use IdempotencyMiddleware
```

### How It Works

1.  **Check for Key:** The middleware looks for an `Idempotency-Key` on state-changing requests (`POST`, `PUT`, `PATCH`).
2.  **Cache Check:** If a response is already cached for this key, the middleware short-circuits the request. No controller logic runs, which ensures consistent outcomes for repeated requests.
3.  **Locking for Concurrency:** To handle race conditions where two identical requests arrive simultaneously, the middleware attempts to acquire a distributed lock. If the lock is already held, it signals a conflict (`409 Conflict`), preventing duplicate processing.
4.  **Process Request:** If the lock is acquired, it calls the actual controller action.
5.  **Cache Response:** Upon a successful response from the controller, the middleware serializes and caches the status, headers, and body in Redis against the idempotency key.
6.  **Release Lock:** Finally, it releases the lock.

### Conclusion

A generic idempotency layer like this shifts responsibility from clients to the server. The client no longer has to worry about the side effects of retrying a request. If a request fails for any reason, it can be sent again with confidence.

Idempotency is not just for payment gateways. It's a core principle of robust API design. In a distributed world, you must assume that requests will fail and will be retried. Building your system to handle this gracefully from the start prevents a whole class of hard-to-debug data consistency issues.
