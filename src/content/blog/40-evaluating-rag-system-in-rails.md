---
title: 'A Guide to Production-Ready RAG Evaluation in Rails'
pubDate: 2025-10-04
description: 'A production-focused guide to building a robust, automated RAG evaluation framework in Rails with detailed code for metrics, parallelization, and CI/CD integration.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/evaluating-rag-system-in-rails.png'
    alt: 'A diagram showing an automated evaluation pipeline for a RAG system.'
tags: ["ruby", "rails", "ai", "rag", "testing", "llm", "observability", "devops"]
---

You've built a RAG system in Rails, but a critical question remains: "How good is it, really?" This guide provides a production-focused starting point for building an automated evaluation framework. We'll create a parallelized Rake task using an LLM-as-a-judge and embedding comparisons, and integrate it into CI/CD to catch regressions before they hit production.

### Prerequisites

This guide assumes you have:
*   A working RAG system with a `RagQueryService`.
*   An `EmbeddingService` that returns vectors from a model like `text-embedding-3-small`.
*   An `OpenAiService` client for an LLM provider.
*   Gems like `parallel` and `linalg` in your Gemfile for performance and calculations.

### Step 1: Curate and Version Your Evaluation Dataset

Start with 30-50 diverse questions and grow this set over time. For traceability, version your dataset files (e.g., `rag_eval_set_v2.yml`).

`db/rag_eval_set_v1.yml`:
```yaml
- question: "What is the Outbox Pattern?"
  ground_truth: "The Outbox Pattern ensures reliable message delivery by saving messages to a database table as part of the local transaction, then publishing them from that table asynchronously."
```

### Step 2: A Production-Grade Evaluator Service

A robust service needs to handle errors, validate data, and perform correct calculations.

`app/services/rag_evaluator_service.rb`:
```ruby
# frozen_string_literal: true
require 'linalg' # For vector calculations

class RagEvaluatorService
  LLM_TEMPERATURE = 0.0

  def initialize(question:, generated_answer:, context:, ground_truth:)
    @question = question
    @generated_answer = generated_answer
    @context = context
    @ground_truth = ground_truth
    @llm_client = OpenAiService.new
    @embedding_client = EmbeddingService.new
  end

  def evaluate
    llm_evals = evaluate_with_llm
    {
      faithfulness: parse_score(llm_evals.dig(:faithfulness, "score")),
      answer_relevancy: parse_score(llm_evals.dig(:answer_relevancy, "score")),
      answer_correctness: evaluate_correctness_with_embeddings
    }
  end

  private

  def evaluate_with_llm
    # Correctly interpolate variables into the prompt
    prompt = format(
      multi_metric_evaluation_prompt, 
      context: @context, 
      question: @question, 
      answer: @generated_answer
    )
    # For transient errors, consider a gem like `retriable`
    response = @llm_client.call(prompt: prompt, temperature: LLM_TEMPERATURE)
    JSON.parse(response)
  rescue JSON::ParserError => e
    Rails.logger.error "RAG-Eval: Failed to parse LLM evaluation response: #{e.message}"
    {}
  end

  def evaluate_correctness_with_embeddings
    return 0.0 if @generated_answer.blank? || @ground_truth.blank?
    generated_embedding = @embedding_client.generate(@generated_answer)
    truth_embedding = @embedding_client.generate(@ground_truth)
    cosine_similarity(generated_embedding, truth_embedding)
  end

  def cosine_similarity(vec_a, vec_b)
    # Most embedding APIs return vectors; the calculation is done in your code.
    Linalg::DMatrix.rows([vec_a, vec_b]).cosine_similarity[0, 1]
  rescue StandardError => e
    Rails.logger.error "RAG-Eval: Cosine similarity failed: #{e.message}"
    0.0
  end

  def parse_score(score)
    # Validate that the score is a float within the expected range.
    parsed_score = Float(score) rescue nil
    return 0.0 unless parsed_score && parsed_score.between?(0.0, 1.0)
    parsed_score
  end

  def multi_metric_evaluation_prompt
    <<~PROMPT
      You are an expert evaluator... Respond ONLY with a single JSON object with two top-level keys: "faithfulness" and "answer_relevancy". Each key should contain a JSON object with a "score" (float from 0.0 to 1.0) and "reasoning" (string).

      **Context:**
      %{context}

      **Question:**
      %{question}

      **Generated Answer:**
      %{answer}

      - **Faithfulness**: Is every claim in the generated answer supported by the context?
      - **Answer Relevancy**: Does the answer directly and completely address the user's question?
    PROMPT
  end
end
```

### Step 3: A Parallelized Rake Task

To speed up evaluation, we'll use the `parallel` gem to make concurrent requests.

`lib/tasks/rag.rake`:
```ruby
require 'yaml'
require 'table_print'
require 'parallel'

namespace :rag do
  desc "Evaluates the RAG system against a predefined dataset"
  task evaluate: :environment do
    puts "Starting RAG evaluation..."
    dataset = YAML.load_file(Rails.root.join('db', 'rag_eval_set_v1.yml'))
    results = []

    # Use `map` to collect results, `in_threads` for I/O-bound tasks
    results = Parallel.map(dataset, in_threads: 4) do |item|
      rag_response = RagQueryService.ask(item['question'])
      next if rag_response.answer.blank?

      RagEvaluatorService.new(
        question: item['question'],
        ground_truth: item['ground_truth'],
        generated_answer: rag_response.answer,
        context: rag_response.context
      ).evaluate.merge(question: item['question'][0..45] + '...')
    end.compact

    # --- Reporting and Thresholds ---
    puts "\n--- RAG Evaluation Report ---"
    tp(results, :question, :faithfulness, :answer_relevancy, :answer_correctness)

    avg_scores = {
      faithfulness: (results.sum { |r| r[:faithfulness] } / results.size).round(3),
      correctness: (results.sum { |r| r[:answer_correctness] } / results.size).round(3)
    }

    puts "\n--- Average Scores ---"
    puts "Faithfulness: #{avg_scores[:faithfulness]}"
    puts "Correctness:  #{avg_scores[:correctness]}"
    puts "----------------------"

    # Operationalize thresholds for CI/CD
    faithfulness_threshold = 0.75
    if avg_scores[:faithfulness] < faithfulness_threshold
      raise "Faithfulness score #{avg_scores[:faithfulness]} is below the #{faithfulness_threshold} threshold!"
    end
  end
end
```

### Step 4: Nuanced Interpretation & Cost

*   **Diagnosis:** A high correctness score but low faithfulness score is a great result—it means your LLM is smart, but you need to improve your retrieval to provide the right context.
*   **Cost:** Be mindful of cost. For a 50-question dataset using GPT-4 as a judge, a single evaluation run could cost ~$0.50-$1.00. Using a cheaper model for the judge (like GPT-3.5-Turbo) can significantly reduce this.

### Step 5: CI/CD Integration

This updated workflow correctly references the repo name and will fail the build if the Rake task raises an error due to a threshold breach.

`.github/workflows/rag_evaluation.yml`:
```yaml
name: RAG Evaluation
on:
  pull_request:
    paths: ['app/services/**', 'config/prompts/**', 'db/rag_eval_set_*.yml']
jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: 3.2.2, bundler-cache: true }

      - name: Run RAG Evaluation
        env:
          RAILS_ENV: test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: bundle exec rake rag:evaluate
```

### Conclusion

This production-focused approach provides a more robust framework for RAG evaluation. By parallelizing workloads, validating data, operationalizing thresholds, and being mindful of costs, you can create a reliable feedback loop that drives meaningful improvements to your AI features.