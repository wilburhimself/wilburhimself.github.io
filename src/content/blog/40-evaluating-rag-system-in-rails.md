---
title: 'A Production-Minded Guide to RAG Evaluation in Rails'
pubDate: 2025-10-04
description: 'An advanced guide to building a robust, automated RAG evaluation framework in Rails, with production-minded code for metrics, parallelization, and CI/CD integration.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/evaluating-rag-system-in-rails.png'
    alt: 'A diagram showing an automated evaluation pipeline for a RAG system.'
tags: ["ruby", "rails", "ai", "rag", "testing", "llm", "observability", "devops"]
---

You've built a RAG system, but how do you ensure it's production-ready? This guide provides a production-minded approach to building an automated evaluation framework. We'll create a parallelized Rake task that uses an LLM-as-a-judge and embedding comparisons, and integrate it into CI/CD to catch regressions. This is a starting point—production deployment would also need robust monitoring and alerting.

### Prerequisites

This guide assumes you have:
*   A `RagQueryService` and an `OpenAiService` client.
*   An `EmbeddingService`. The quality of the `answer_correctness` metric depends heavily on your model choice (e.g., `text-embedding-3-small` offers a good balance of performance and cost).
*   Gems like `parallel` and `retriable` in your Gemfile.

### Step 1: Curate and Version Your Dataset

Start with 30-50 diverse questions and grow this set over time. For traceability, version your dataset files (e.g., `rag_eval_set_v2.yml`).

`db/rag_eval_set_v1.yml`:
```yaml
- question: "What is the Outbox Pattern?"
  ground_truth: "The Outbox Pattern ensures reliable message delivery by saving messages to a database table as part of the local transaction, then publishing them from that table asynchronously."
```

### Step 2: The Evaluator Service

This service includes manual cosine similarity, retry logic, and timeouts.

`app/services/rag_evaluator_service.rb`:
```ruby
# frozen_string_literal: true

class RagEvaluatorService
  LLM_TEMPERATURE = 0.0
  LLM_TIMEOUT = 30 # seconds

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
    prompt = format(multi_metric_evaluation_prompt, context: @context, question: @question, answer: @generated_answer)
    
    Retriable.retriable(tries: 3, base_interval: 1) do
      response = @llm_client.call(prompt: prompt, temperature: LLM_TEMPERATURE, timeout: LLM_TIMEOUT)
      return JSON.parse(response)
    end
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
    dot_product = vec_a.zip(vec_b).sum { |a, b| a * b }
    mag_a = Math.sqrt(vec_a.sum { |x| x**2 })
    mag_b = Math.sqrt(vec_b.sum { |x| x**2 })
    dot_product / (mag_a * mag_b)
  rescue ZeroDivisionError, StandardError => e
    Rails.logger.error "RAG-Eval: Cosine similarity failed: #{e.message}"
    0.0
  end

  def parse_score(score)
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

### Step 3: The Rake Task

This version handles failures, calculates averages safely, and persists results.

`lib/tasks/rag.rake`:
```ruby
require 'yaml'
require 'table_print'
require 'parallel'
require 'csv'

namespace :rag do
  desc "Evaluates the RAG system against a predefined dataset"
  task evaluate: :environment do
    EVAL_THREADS = ENV.fetch('RAG_EVAL_THREADS', 4).to_i
    FAITHFULNESS_THRESHOLD = ENV.fetch('RAG_FAITH_THRESHOLD', 0.75).to_f
    RESULTS_CSV_PATH = Rails.root.join('tmp', 'rag_evaluation_history.csv')

    puts "Starting RAG evaluation with #{EVAL_THREADS} threads..."
    dataset = YAML.load_file(Rails.root.join('db', 'rag_eval_set_v1.yml'))

    all_results = Parallel.map(dataset, in_threads: EVAL_THREADS) do |item|
      question = item['question']
      rag_response = RagQueryService.ask(question)
      
      if rag_response.answer.blank?
        { error: 'No answer generated', question: question }
      else
        RagEvaluatorService.new(
          question: question,
          ground_truth: item['ground_truth'],
          generated_answer: rag_response.answer,
          context: rag_response.context
        ).evaluate.merge(question: question)
      end
    end

    successes = all_results.reject { |r| r[:error] }
    failures = all_results.select { |r| r[:error] }

    puts "\n--- RAG Evaluation Report ---"
    tp(successes, :question, :faithfulness, :answer_relevancy, :answer_correctness)

    if failures.any?
      puts "\n--- Failures ---"
      tp(failures, :question, :error)
    end

    return puts "\nNo successful results to analyze." if successes.empty?

    avg_scores = {
      faithfulness: (successes.sum { |r| r[:faithfulness] } / successes.size).round(3),
      correctness: (successes.sum { |r| r[:answer_correctness] } / successes.size).round(3)
    }

    puts "\n--- Average Scores ---"
    puts "Faithfulness: #{avg_scores[:faithfulness]}"
    puts "Correctness:  #{avg_scores[:correctness]}"
    puts "----------------------"

    # Persist results for trend analysis
    CSV.open(RESULTS_CSV_PATH, 'a') do |csv|
      csv << [Time.now.iso8601, avg_scores[:faithfulness], avg_scores[:correctness]]
    end

    if avg_scores[:faithfulness] < FAITHFULNESS_THRESHOLD
      raise "Faithfulness score #{avg_scores[:faithfulness]} is below the #{FAITHFULNESS_THRESHOLD} threshold!"
    end
  end
end
```

### Step 4: CI/CD with PR Comments

This workflow now includes the PR comment step to provide immediate feedback.

`.github/workflows/rag_evaluation.yml`:
```yaml
name: RAG Evaluation
on:
  pull_request:
    paths: ['app/services/**', 'db/rag_eval_set_*.yml']
jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: 3.2.2, bundler-cache: true }

      - name: Run RAG Evaluation
        id: evaluation
        env:
          RAILS_ENV: test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: bundle exec rake rag:evaluate > ${{ runner.temp }}/evaluation_results.txt

      - name: Comment on PR with Results
        if: always() # Always run this step, even if the evaluation fails
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync(`${process.env.RUNNER_TEMP}/evaluation_results.txt`, 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### RAG Evaluation Results\n\n<details><summary>Click to expand</summary>\n\n```\n${results}\n```\n\n</details>`
            });
```

### Conclusion

This production-minded approach provides a more robust framework for RAG evaluation. By handling failures gracefully, parallelizing workloads, persisting results for trend analysis, and operationalizing thresholds, you can create a reliable feedback loop that drives meaningful improvements to your AI features.
