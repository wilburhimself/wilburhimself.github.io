---
title: 'Evaluating Your RAG System in Rails: From Anecdotal to Automated'
pubDate: 2025-10-04
description: 'A guide to building a robust, automated evaluation framework for your RAG system in Rails to ensure your AI features are not just clever, but correct.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/evaluating-rag-system-in-rails.png'
    alt: 'A diagram showing an automated evaluation pipeline for a RAG system.'
tags: ["ruby", "rails", "ai", "rag", "testing", "llm"]
---

You've built a RAG (Retrieval-Augmented Generation) system in Rails, and it feels like magic. But after the initial excitement, a critical question emerges: "How good is it, really?" Answering this with "it seems to work" isn't enough for a production system. We need objective, repeatable, and automated evaluation.

This post dives deep into building a robust evaluation framework for your RAG system directly within your Rails application. We'll move beyond simple smoke tests and create a Rake task that uses an LLM-as-a-judge to score your system on key metrics, giving you the confidence to iterate and improve.

### Why Automated Evaluation is Non-Negotiable

Anecdotal testing is where everyone starts, but it's a trap. It's time-consuming, subjective, and fails to catch subtle regressions. An automated evaluation pipeline, on the other hand, provides:

1.  **Objective Metrics:** Get consistent scores for `faithfulness`, `answer relevancy`, and `context precision`.
2.  **Regression Detection:** Did a prompt change or a new model version degrade performance? Your test suite will tell you instantly.
3.  **Systematic Improvement:** A/B test different retrieval strategies or generation prompts and use hard data to decide on the winner.
4.  **Stakeholder Confidence:** Replace "I think it's better" with "Our faithfulness score improved by 12% this week."

### Step 1: Curate Your Evaluation Dataset

The foundation of any good evaluation is a high-quality dataset. This doesn't need to be massive. Start with 10-20 representative questions your users might ask. For each, provide a "ground truth" answer that you would consider ideal.

Create a simple YAML file to store this dataset. It's easy to read, edit, and version control.

`lib/tasks/rag_evaluation_set.yml`:
```yaml
- question: "What is the Outbox Pattern and why is it useful?"
  ground_truth: "The Outbox Pattern ensures reliable, at-least-once message delivery in distributed systems by using a dedicated 'outbox' table in the same local transaction as your business logic, avoiding the need for distributed transactions."
- question: "How can you improve the performance of a slow SQL query?"
  ground_truth: "Start by analyzing the query with EXPLAIN, then look for missing indexes, N+1 queries, or opportunities to rewrite the query to be more efficient. Caching can also be used for frequently accessed, slow-to-generate data."
```

### Step 2: The "LLM-as-a-Judge" Evaluator Service

This is the core of our framework. We'll create a service that takes a question, the RAG-generated answer, and the retrieved context, then uses a separate LLM call to score the response.

`app/services/rag_evaluator_service.rb`:
```ruby
# frozen_string_literal: true

require 'json'

class RagEvaluatorService
  def initialize(question:, generated_answer:, context:)
    @question = question
    @generated_answer = generated_answer
    @context = context
    # Assumes you have an OpenAI client or a similar service wrapper
    @llm_client = OpenAiService.new
  end

  def evaluate
    {
      faithfulness: evaluate_metric(
        metric_name: "Faithfulness",
        prompt_template: faithfulness_prompt
      ),
      answer_relevancy: evaluate_metric(
        metric_name: "Answer Relevancy",
        prompt_template: answer_relevancy_prompt
      )
    }
  end

  private

  def evaluate_metric(metric_name:, prompt_template:)
    full_prompt = format(prompt_template, question: @question, answer: @generated_answer, context: @context)
    
    # Using a structured response format like JSON mode is highly recommended
    response = @llm_client.call(prompt: full_prompt, temperature: 0)
    
    JSON.parse(response)
  rescue JSON::ParserError, TypeError
    { "score" => 0, "reasoning" => "Failed to parse LLM response." }
  end

  def faithfulness_prompt
    <<~PROMPT
      You are an expert evaluator. Your task is to assess the **faithfulness** of a generated answer based on a provided context.
      The generated answer is considered faithful if all claims made in the answer are supported by the information in the context.

      **Context:**
      %{context}

      **Question:**
      %{question}

      **Generated Answer:**
      %{answer}

      Analyze the generated answer and determine if it is faithful to the context. Respond ONLY with a single JSON object containing two keys:
      1. "score": A float from 0.0 (not faithful at all) to 1.0 (fully faithful).
      2. "reasoning": A brief explanation for your score.
    PROMPT
  end

  def answer_relevancy_prompt
    <<~PROMPT
      You are an expert evaluator. Your task is to assess the **relevancy** of a generated answer to a given question.
      The answer is relevant if it directly addresses the user's question and provides a useful response.

      **Question:**
      %{question}

      **Generated Answer:**
      %{answer}

      Analyze the generated answer and determine how relevant it is to the question. Do not consider the context, only the question and answer. Respond ONLY with a single JSON object containing two keys:
      1. "score": A float from 0.0 (not relevant at all) to 1.0 (fully relevant).
      2. "reasoning": A brief explanation for your score.
    PROMPT
  end
end
```

### Step 3: The Rake Task to Run It All

Now, let's build the Rake task that orchestrates the process. It will read the dataset, query your RAG system, call the evaluator, and print a report.

`lib/tasks/rag.rake`:
```ruby
require 'yaml'
require 'table_print'

namespace :rag do
  desc "Evaluates the RAG system against a predefined dataset"
  task evaluate: :environment do
    puts "Starting RAG evaluation..."
    dataset = YAML.load_file(Rails.root.join('lib', 'tasks', 'rag_evaluation_set.yml'))
    results = []
    total_scores = { faithfulness: 0.0, answer_relevancy: 0.0 }

    dataset.each do |item|
      question = item['question']
      
      # 1. Query your own RAG system
      # This service should return the answer and the context it used.
      rag_response = RagQueryService.ask(question)

      # 2. Evaluate the response
      evaluator = RagEvaluatorService.new(
        question: question,
        generated_answer: rag_response.answer,
        context: rag_response.context
      )
      scores = evaluator.evaluate

      # 3. Store results
      faithfulness_score = scores.dig(:faithfulness, "score").to_f
      relevancy_score = scores.dig(:answer_relevancy, "score").to_f
      total_scores[:faithfulness] += faithfulness_score
      total_scores[:answer_relevancy] += relevancy_score

      results << {
        question: question,
        faithfulness: faithfulness_score,
        relevancy: relevancy_score,
        reasoning: scores.dig(:faithfulness, "reasoning")
      }
      print "."
    end
    
    puts "

--- RAG Evaluation Report ---"
    tp(results, :question, :faithfulness, :relevancy, :reasoning)

    avg_faithfulness = (total_scores[:faithfulness] / dataset.size).round(3)
    avg_relevancy = (total_scores[:answer_relevancy] / dataset.size).round(3)

    puts "
--- Average Scores ---"
    puts "Faithfulness:     #{avg_faithfulness}"
    puts "Answer Relevancy: #{avg_relevancy}"
    puts "----------------------"
  end
end
```

### Interpreting and Using the Results

Running `bundle exec rake rag:evaluate` will now give you a clear, actionable report.

*   **Low Faithfulness Score?** Your generation prompt might be too creative and is "hallucinating" details not present in the context. Try making the prompt stricter, e.g., "Answer the question based *only* on the provided context."
*   **Low Relevancy Score?** This often points to a retrieval problem. The context being pulled isn't relevant enough to the question, forcing the generator to produce a generic or incorrect answer. You may need to fine-tune your embedding strategy or retrieval algorithm.
*   **Tracking Over Time:** Store these average scores after each run. You can save them to a CSV file or a database table. This creates a historical record of your system's performance, allowing you to see trends and validate that your changes are having a positive impact.

By investing a few hours in building this framework, you transform RAG development from a guessing game into an engineering discipline. You can now iterate with confidence, backed by data that proves you're moving in the right direction.
