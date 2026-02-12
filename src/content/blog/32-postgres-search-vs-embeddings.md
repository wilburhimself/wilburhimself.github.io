---
title: "Postgres Full-Text Search vs. Embeddings: A Practical Guide"
date: "2025-09-06"
excerpt: "Most teams reach for embeddings before they need them, wiring up pgvector when Postgres’s full-text search would have done the job. If your users are just looking for “caching” and expect to find “Rails caching strategies,” full-text search is fast, precise, and already built in. Where embeddings shine is when meaning matters more than exact words, like an e-commerce query for “summer outfit” that should return linen shirts and beach dresses. The key isn’t choosing one tool over the other, but knowing when Postgres alone is enough and when a hybrid approach gives you the semantic nuance users actually need."
tags: ["postgres", "search", "database", "rails", "ruby"]
---

Lately I've been discussing a lot about how teams are adding embeddings to their stacks before really trying Postgres's full text search. Basically it starts with complaints about how "search is not working well enough" and ending with a complex vector setup, higher costs, and not much better results anyway.

The reality is: Postgres has a powerful and battle tested built in search engine. Most of the time it's exactly what you need. Embeddings only become valuable when you need **semantic understanding** and not simply keyword matching.

So, how do you know when to rely on Postgres, when to add Embeddings, and when to combine both?

---

## Start with Postgres

For most applications, Postgres built-in search can take you very far. A blog search is the classic example: Users type a keyword like "caching", and the search engine pulls post with "cache pollution" and "Rails caching strategies" immediately.

You can write in few lines:

```ruby
# migration
add_column :articles, :tsv, :tsvector add_index  :articles, :tsv, using: :gin

Article.where("tsv @@ plainto_tsquery('english', ?)", "caching patterns")
```

These queries are fast, cheap and precise. "Do I actually need more than this?" is the best question to ask before reaching for embeddings.

---

## Where Embeddings Fit

Now imagine you’re building an e-commerce search. A user types “summer outfit”, but none of your product descriptions actually use that phrase. They say “linen shirt,” “beach dress,” “cotton shorts.” Keyword search misses the connection.

This is where embeddings shine. They map words and sentences into a shared vector space, so “summer outfit” ends up close to “linen shirt.” That’s semantic search in action: not just matching strings, but capturing meaning.

But embeddings come with cost. You need to generate vectors, store them, and query them efficiently. At scale, that adds real latency and money.

---

## Hybrid: The Best of Both

The most pragmatic pattern I’ve seen is **hybrid retrieval**. Postgres handles the broad strokes — filtering and narrowing down candidates, and embeddings refine the order.

Think of it like a funnel:

1. Postgres fetches 100 promising candidates with full-text search.
2. Embeddings rerank those candidates by semantic similarity.
3. The user sees the best 10.

In Rails, it might look like this:

```ruby
# Step 1: lexical candidates
candidates = Article.where("tsv @@ plainto_tsquery('english', ?)", query).limit(100)

# Step 2: semantic rerank
emb_q = embed(query) # external API call
candidates.sort_by do |article|
  cosine_similarity(article.embedding, emb_q)
end.take(10)
```

This way, Postgres does the heavy lifting, and embeddings only touch a small slice of data.

---

## A Simple Framework

When I evaluate search problems, I use three questions:

1. **Precision first**: Can Postgres alone satisfy 80% of queries? If yes, stop there.

2. **Semantic need**: Do users ask in ways that keywords can’t cover? If yes, add embeddings.

3. **Cost curve**: Can the system handle embedding storage and latency? If not, stick to lexical.

It’s rarely about “Postgres _or_ embeddings.” The better question is: _How can each do the job it’s best at?_

---

I’ve seen engineers burn weeks wiring up pgvector for problems that Postgres solved out of the box. Full-text search isn’t glamorous, but it’s efficient, reliable, and already in your database.

Embeddings are powerful, no doubt. But they’re a tool for when you actually need semantic nuance, not a default. Start with Postgres, measure, and only bring vectors into the mix when the data (and the users) demand it.
