---
title: "How I Built a RAG System in Rails Using Nomic Embeddings and OpenAI"
date: "2025-07-18"
excerpt: "RAG doesn’t have to mean heavyweight infrastructure. In this post, I show how I wired up a lean Retrieval-Augmented Generation pipeline inside a Rails app using Nomic for embeddings, PgVector for search, and OpenAI for generation. The result is a flexible system: open-source at the embedding layer, powerful where it counts, and simple enough to extend without vendor lock-in."
tags: ["ai", "rails", "rag", "postgres", "ruby"]
---

Retrieval-Augmented Generation (RAG) is a practical way to bring your own data into LLM workflows. Instead of fine-tuning, you give the model context that makes its answers specific and trustworthy.

In this post, I’ll walk through how I wired up a RAG pipeline inside a Rails app using:

- **Nomic embeddings** (open-source, high-quality, self-hostable)
- **PgVector** for vector search
- **OpenAI** for response generation

The result is a system that feels light, flexible, and doesn’t lock you into one vendor.

---

## 🧠 What Is RAG, Really?

Think of RAG as a two-step handshake:

1. **Find the right data** → Embed the query, search your knowledge base, and pull back relevant snippets.
2. **Generate with context** → Hand both the query and those snippets to an LLM so it answers with precision.

It looks like this:

```
[ User Question ]
↓
[ Embed with Nomic ]
↓
[ Vector Search in PgVector ]
↓
[ Retrieve Relevant Chunks ]
↓
[ Assemble Prompt ]
↓
[ Generate Answer with OpenAI ]
```

This avoids heavy fine-tuning and keeps your system adaptable.

---

## 🧰 The Stack

- **Rails** → Controllers, persistence, orchestration
- **FastAPI** → Lightweight Python service serving Nomic embeddings
- **Nomic Embedding Model** → For semantic search
- **PgVector** → PostgreSQL extension for vector queries
- **OpenAI GPT-4 / GPT-3.5** → Generation step

---

## 🛠 Step 1: Running Nomic Locally

I wanted to avoid API costs and limits, so I served embeddings locally via FastAPI and `sentence-transformers`:

```python
from fastapi import FastAPI, Request
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer("nomic-ai/nomic-embed-text-v2-moe")

@app.post("/embed")
async def embed(req: Request):
    data = await req.json()
    input_text = data["input"]
    embedding = model.encode(input_text).tolist()
    return { "embedding": embedding }
```

This internal API cleanly replaces OpenAI’s `/embeddings`.

### 📄 Step 2: Chunk and Store Data

Split content into short passages (~100–300 words). Embed each passage and store it in Postgres with `pgvector`:

```
CREATE EXTENSION IF NOT EXISTS vector;
```

```ruby
class AddEmbeddingToDocuments < ActiveRecord::Migration[7.1]
  def change
    add_column :documents, :embedding, :vector, limit: 768 # Nomic v2-moe size
  end
end
```

### 🤖 Step 3: Embed Queries

Your Rails controller can call the FastAPI service:

```ruby
def get_embedding(text)
  response = Faraday.post(
    "http://localhost:8000/embed",
    { input: text }.to_json,
    "Content-Type" => "application/json"
  )
  JSON.parse(response.body)["embedding"]
end
```

Use the same embedding model for both queries and documents — consistency matters.

### 🔍 Step 4: Vector Search

Find the closest matches with cosine similarity:

```
Document.order("embedding <-> cube(array[?])", query_vector).limit(5)
```

These top matches form the “knowledge pack” for the LLM.

### 🧾 Step 5: Prompt Assembly

Concatenate the retrieved passages into the prompt:

```
client.chat(
  parameters: {
    model: "gpt-4",
    messages: [
      { role: "system", content: "Answer using the provided context." },
      { role: "user", content: build_contextual_prompt(user_input, top_chunks) }
    ]
  }
)
```

### ✅ Why Nomic for Embeddings?

- Open-source and multilingual
- Runs locally → no token limits, no vendor lock-in
- Solid benchmarks ([MTEB](https://huggingface.co/mteb)) and practical retrieval quality

### 💡 Why Still Use OpenAI?

For me, the generation step is where OpenAI models shine. By decoupling the embedding layer, I get flexibility: I can swap LLMs later without rebuilding the pipeline.

### 🧠 Takeaways

- RAG doesn’t need to be a heavyweight system.
- Pairing open-source embeddings with OpenAI generation creates a powerful hybrid.
- With Rails + PgVector, vector search feels like a natural extension of your existing app.

If you’re new to RAG, start small. Build the pipeline end-to-end with one document table and a FastAPI service. Don’t overengineer at first, once you see it work on a toy dataset, scaling to production is mostly a matter of indexing and monitoring.
