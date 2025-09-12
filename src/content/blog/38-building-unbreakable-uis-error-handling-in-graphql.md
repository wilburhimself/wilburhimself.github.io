---
title: "Building Unbreakable UIs: Error Handling in GraphQL"
date: "September 16, 2025"
excerpt: "A fast app that crashes is a failed app. This post tackles the unique challenges of GraphQL error handling, from partial data responses to network failures. Learn to build resilient UIs with skeleton loaders, intelligent retry policies, and centralized logging."
---

So far in this series, we've made our application fast, lean, and efficient. But what happens when things go wrong? A network request fails, a backend service times out, an API returns an unexpected null. A fast app that crashes under pressure is not a good app. The final layer of a world-class user experience is **resilience**.

### The Unique Challenge of GraphQL Errors

In a RESTful world, an error is usually a simple `4xx` or `5xx` status code. In GraphQL, it's more nuanced. A GraphQL server almost always responds with a `200 OK` status code, even if something went wrong. The errors are inside the response body, in an `errors` array.

This allows for **partial success**, where one field in your query fails but others succeed. Your UI must be prepared to handle this.

```json
{
  "data": {
    "user": {
      "id": "1",
      "name": "Jane Doe",
      "latestPost": null
    }
  },
  "errors": [
    {
      "message": "Could not retrieve latest post.",
      "path": ["user", "latestPost"]
    }
  ]
}
```

If your code blindly assumes `data.user.latestPost.title` exists, your entire component tree will crash.

### Strategy 1: Graceful Degradation with Partial Data

Your components should never assume data exists. Defensive coding is key. Instead of letting a missing non-critical piece of data crash the page, render the UI gracefully without it.

```javascript
function UserProfile({ user }) {
  // If the top-level user object fails to load, show an error message.
  if (!user) {
    return <p>Could not load user profile.</p>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      
      {/* If recommendations fail, this part just won't render. No crash. */}
      {user.recommendations && <Recommendations data={user.recommendations} />}
    </div>
  );
}
```

### Strategy 2: Skeleton UIs for a Better Loading Experience

Spinners are a lazy default. A **skeleton UI**—the gray, pulsing placeholders you see on sites like LinkedIn and YouTube—is far superior for perceived performance.

Why? It sets the user's expectation for the page layout, preventing jarring content shifts and making the load time feel shorter. It also serves as a natural fallback during error states.

```javascript
import { SkeletonCard, SkeletonHeader } from '../components/Skeleton';

function UserPage() {
  const { data, loading, error } = useQuery(GET_USER_PAGE);

  if (loading) {
    return (
      <div>
        <SkeletonHeader />
        <SkeletonCard />
      </div>
    );
  }

  if (error) { /* ... handle error */ }

  return <UserProfile user={data.user} />;
}
```

### Strategy 3: Intelligent Retries for Network Failures

Network connections are fickle. When a query fails due to a network blip, an immediate retry can flood a struggling server. The solution is **exponential backoff**: wait 1s, then 2s, then 4s before retrying. This gives the system time to recover.

Libraries like Apollo Client offer this out of the box with `apollo-link-retry`. You can configure it to retry only on specific error codes and to give up after a certain number of attempts.

```javascript
// Conceptual setup for apollo-link-retry
import { RetryLink } from "@apollo/client/link/retry";

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 2000,
    jitter: true
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => !!error // Retry on all network errors
  }
});
```

### Strategy 4: Centralized Logging for Faster Debugging

When errors occur in production, you need visibility. A global error handler is essential for logging and monitoring.

Using a tool like `apollo-link-error`, you can intercept every single GraphQL error—whether it's a network failure or a GraphQL-specific error from the `errors` array—and log it to a service like Sentry, Datadog, or New Relic.

```javascript
import { onError } from "@apollo/client/link/error";

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      // Send to logging service
      console.log(`[GraphQL error]: Op: ${operation.operationName}, Msg: ${message}`);
    });
  }

  if (networkError) {
    // Send to logging service
    console.log(`[Network error]: ${networkError}`);
  }
});
```

This gives you a centralized place to understand what’s failing, for whom, and on what query.

### Conclusion: From Fast to Unbreakable

Performance isn't just about speed; it's about reliability. A resilient application feels stable and trustworthy, which is a critical component of the user experience. By handling partial data, designing thoughtful loading and error states, and implementing smart retry and logging policies, you create a UI that is not just fast, but unbreakable.

In the final part of our series, we'll zoom out and tie everything together, exploring how **frontend performance is ultimately a reflection of backend schema design and full-stack collaboration**.
