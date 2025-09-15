---
title: "Beyond useQuery: Advanced Data Fetching in GraphQL"
date: "September 12, 2025"
excerpt: "Stop request waterfalls and N+1 problems at the source. This deep-dive covers advanced GraphQL data fetching patterns like fragments, query batching, cursor-based pagination, and real-time subscriptions to build truly performant clients."
---

In [Part 1](/blog/33-why-frontend-performance-starts-at-the-api/), we established that frontend performance begins at the API. A performant API, however, is useless if the client queries it inefficiently. Most developers start and end with a simple `useQuery`, but this is like using only first gear in a race car. Let's unlock the rest of the transmission.

This post dives into the practical strategies that transform a chatty, slow client into a lean, efficient data fetching machine.

### The Default: The `useQuery` Trap and Network Waterfalls

When components fetch their own data independently, you create a network waterfall. Each `useQuery` hook triggers a separate network request, and they run sequentially, not in parallel. The page loads piece by piece, and the user feels every delay.

Consider a user profile page composed of two components:

```javascript
// ProfileHeader.js
function ProfileHeader({ userId }) {
  const { data } = useQuery(GET_USER_PROFILE, { variables: { userId } });
  // ... renders user name and avatar
}

// UserActivity.js
function UserActivity({ userId }) {
  const { data } = useQuery(GET_USER_ACTIVITY, { variables: { userId } });
  // ... renders recent posts or comments
}
```

This results in two sequential round trips to the server. We can do better.

### Solution 1: Colocation and Fragments

GraphQL Fragments allow components to declare the exact data they need, which can then be composed into a single, unified query at the page level. This is colocation: the data requirements live with the component that uses them.

**1. Define Fragments in Your Components:**

```graphql
# ProfileHeader.graphql
fragment ProfileHeaderData on User {
  id
  name
  avatar
}

# UserActivity.graphql
fragment UserActivityData on User {
  recentPosts(limit: 5) {
    id
    title
  }
}
```

**2. Compose Them into a Single Page-Level Query:**

```graphql
# UserPage.graphql
query UserPage($userId: ID!) {
  user(id: $userId) {
    ...ProfileHeaderData
    ...UserActivityData
  }
}
```

Now, the `UserPage` component executes one query and passes the fragmented data down to its children. One network request, multiple components satisfied. This is the single biggest step you can take to eliminate waterfalls.

### Solution 2: Slaying N+1s with Query Batching

The N+1 problem isn't just for backends. It happens when a client makes one query to fetch a list, then makes *N* subsequent queries to fetch details for each item in that list.

**The Anti-Pattern:**

```javascript
const { data: posts } = useQuery(GET_POSTS);

posts.forEach(post => {
  // This triggers a new query for each post!
  const { data: author } = useQuery(GET_AUTHOR, { variables: { authorId: post.authorId } });
});
```

Modern GraphQL clients like Apollo Client solve this with **query batching**. By using a special link (like `BatchHttpLink`), the client can collect all the individual queries made within a short time window and send them to the server as a single HTTP request. The server handles them and returns an array of results.

This turns 1 (list) + N (details) requests into just one batched request, drastically reducing network overhead.

### Solution 3: Taming Large Datasets with Pagination

Never fetch an unbounded list. Pagination is non-negotiable for feeds, tables, or any large collection. While offset-based pagination (`page: 1, limit: 10`) is simple, **cursor-based pagination** is more robust for real-time systems, as it prevents items from being skipped or repeated when the list changes.

Here’s a typical cursor-based query:

```graphql
query PaginatedFeed($first: Int, $after: String) {
  feed(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        content
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

To fetch the next page, you simply pass the `endCursor` from the previous request as the `after` variable. This is the foundation of infinite scroll.

### Solution 4: Real-Time Strategies

Sometimes, you need data that updates without a page refresh. You have two primary options:

1.  **Polling:** The simplest strategy. Just tell your client to re-fetch a query every few seconds. It's great for data that changes frequently but not instantly, like a dashboard.

    ```javascript
    useQuery(GET_DASHBOARD_STATS, { pollInterval: 15000 }); // Refetch every 15s
    ```

2.  **Subscriptions:** For true real-time events like live chat or notifications, GraphQL Subscriptions are the answer. The client opens a persistent connection (usually via WebSockets) and listens for data pushed from the server.

    ```graphql
    subscription OnNewMessage($chatRoomId: ID!) {
      newMessage(chatRoomId: $chatRoomId) {
        id
        text
        author { name }
      }
    }
    ```

Subscriptions are more complex to set up but provide instant updates with minimal overhead.

### Conclusion

Moving beyond a basic `useQuery` is the first step toward mastering client-side performance. By using fragments for colocation, batching to reduce requests, and pagination for large datasets, you are no longer just *requesting* data—you are *architecting* its flow.

In Part 3, we'll explore how to make this flow even more efficient by **caching data and managing state intelligently**.
