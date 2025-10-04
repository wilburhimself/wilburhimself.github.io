---
title: 'Evaluating Your RAG System in Rails: From Anecdotal to Automated'
date: "October 4, 2025"
excerpt: "You've built a RAG system in Rails, but how do you know it's actually working well? This guide shows you how to move beyond 'it seems fine' to automated evaluation using LLM-as-a-judge and embedding comparisons. Learn to build a Rake task that measures faithfulness, relevancy, and correctness—and integrate it into your CI/CD pipeline to catch regressions before they reach production."
---

You've built a RAG (Retrieval-Augmented Generation) system in Rails, but a critical question remains: "How good is it, really?" Answering this with "it seems to work" isn't enough for a production system. This post provides a practical starting point for building an automated evaluation framework in Rails. We'll create a Rake task that uses an LLM-as-a-judge and embedding comparisons to score your system, giving you a data-driven approach to iteration and improvement.

Prerequisites
-------------

This guide assumes you have a working RAG system with the following components, which we will reference as abstract services:

*   **RagQueryService**: A service that takes a question and returns a generated answer along with the context used.
*   **EmbeddingService**: A service to generate embeddings for text.
*   **OpenAiService**: A client wrapper for making calls to an LLM provider.

Why Automated Evaluation is Worth the Effort
--------------------------------------------

While no evaluation framework is perfect, an automated pipeline is a significant step up from manual, anecdotal testing. It provides a baseline for:

*   **Objective Metrics**: Move from subjective feelings to consistent scores for metrics like faithfulness and correctness.
*   **Regression Detection**: Understand if a prompt change or new model version has degraded performance.
*   **Systematic Improvement**: A/B test different retrieval strategies and use data to decide on the winner.

Step 1: Curate Your Initial Evaluation Dataset
----------------------------------------------

The foundation of any good evaluation is a dataset. Starting with 30-50 high-quality, diverse questions is a reasonable first step, but be aware that for statistical significance in a production system, this set will need to grow into the hundreds.

For each question, provide a `ground_truth` answer. This is crucial for measuring correctness.

`lib/tasks/rag\_evaluation\_set.yml`
```yaml
    - question: "What is the Outbox Pattern and why is it useful?"
      ground_truth: "The Outbox Pattern ensures reliable, at-least-once message delivery in distributed systems by using a dedicated 'outbox' table in the same local transaction as your business logic, avoiding the need for distributed transactions."
    - question: "How can you improve the performance of a slow SQL query?"
      ground_truth: "Start by analyzing the query with EXPLAIN, then look for missing indexes, N+1 queries, or opportunities to rewrite the query to be more efficient. Caching can also be used for frequently accessed, slow-to-generate data."
```
Step 2: A More Comprehensive Metric Suite
-----------------------------------------

A robust evaluation uses multiple metrics. Here, we'll implement two types: LLM-based checks for qualitative aspects and an embedding-based check for semantic correctness.

`app/services/rag\_evaluator\_service.rb`
```ruby
    # frozen_string_literal: true
    
    class RagEvaluatorService
      # We use a temperature of 0 for evaluation to ensure deterministic and consistent scoring from the LLM.
      LLM_TEMPERATURE = 0.0
    
      def initialize(question:, generated_answer:, context:, ground_truth:)
        @question = question
        @generated_answer = generated_answer
        @context = context
        @ground_truth = ground_truth
        # These are abstractions for your app's actual services.
        @llm_client = OpenAiService.new
        @embedding_client = EmbeddingService.new
      end
    
      def evaluate
        llm_evals = evaluate_with_llm
        {
          faithfulness: llm_evals.dig(:faithfulness, "score").to_f,
          answer_relevancy: llm_evals.dig(:answer_relevancy, "score").to_f,
          answer_correctness: evaluate_correctness_with_embeddings
        }
      end
    
      private
    
      def evaluate_with_llm
        # In a real system, consider a more robust JSON parsing and validation library.
        # This prompt asks for multiple evaluations in one call to reduce latency and cost.
        prompt = format(
          multi_metric_evaluation_prompt,
          context: @context,
          question: @question,
          answer: @generated_answer
        )
        response = @llm_client.call(prompt: prompt, temperature: LLM_TEMPERATURE)
        JSON.parse(response)
      rescue JSON::ParserError => e
        Rails.logger.error "Failed to parse LLM evaluation response: #{e.message}"
        # Returning empty hashes ensures `dig` doesn't fail later.
        { faithfulness: {}, answer_relevancy: {} }
      end
    
      def evaluate_correctness_with_embeddings
        # This measures how semantically similar the generated answer is to the ground truth.
        return 0.0 if @generated_answer.blank? || @ground_truth.blank?
    
        generated_embedding = @embedding_client.generate(@generated_answer)
        truth_embedding = @embedding_client.generate(@ground_truth)
    
        # Calculate cosine similarity between the two embedding vectors
        cosine_similarity(generated_embedding, truth_embedding)
      end
    
      def cosine_similarity(vec_a, vec_b)
        dot_product = vec_a.zip(vec_b).sum { |a, b| a * b }
        magnitude_a = Math.sqrt(vec_a.sum { |x| x**2 })
        magnitude_b = Math.sqrt(vec_b.sum { |x| x**2 })
        dot_product / (magnitude_a * magnitude_b)
      rescue ZeroDivisionError, StandardError => e
        Rails.logger.error "Cosine similarity calculation failed: #{e.message}"
        0.0
      end
    
      def multi_metric_evaluation_prompt
        <<~PROMPT
          You are an expert evaluator. Your task is to assess a generated answer based on a provided context and question.
          Provide your assessment for each of the following metrics.
    
          **Context:**
          %{context}
    
          **Question:**
          %{question}
    
          **Generated Answer:**
          %{answer}
    
          Respond ONLY with a single JSON object with two top-level keys: "faithfulness" and "answer_relevancy".
          Each key should contain a JSON object with a "score" (float from 0.0 to 1.0) and "reasoning" (string).
    
          - **Faithfulness**: Is every claim in the generated answer supported by the context?
          - **Answer Relevancy**: Does the answer directly and completely address the user's question?
        PROMPT
      end
    end
```

Step 3: The Rake Task Orchestrator
----------------------------------

This task now runs our expanded evaluation. Note the improved logging and error handling.

lib/tasks/rag.rake
```ruby
    require 'yaml'
    require 'table_print' # Gem for formatted console output
    
    namespace :rag do
      desc "Evaluates the RAG system against a predefined dataset"
      task evaluate: :environment do
        Rails.logger.info "Starting RAG evaluation..."
        dataset = YAML.load_file(Rails.root.join('lib', 'tasks', 'rag_evaluation_set.yml'))
        results = []
    
        # For large datasets, consider parallelizing these calls (e.g., with Parallel gem or background jobs)
        dataset.each_with_index do |item, index|
          question = item['question']
          ground_truth = item['ground_truth']
          
          rag_response = RagQueryService.ask(question)
          next if rag_response.answer.blank?
    
          scores = RagEvaluatorService.new(
            question: question,
            generated_answer: rag_response.answer,
            context: rag_response.context,
            ground_truth: ground_truth
          ).evaluate
    
          results << scores.merge(question: question.truncate(40))
          Rails.logger.info "Evaluated item #{index + 1}/#{dataset.size}"
        end
        
        puts "\n--- RAG Evaluation Report ---"
        tp(results, :question, :faithfulness, :answer_relevancy, :answer_correctness)
        
        # Calculate average scores
        avg_faithfulness = (results.sum { |r| r[:faithfulness] } / results.size).round(3)
        avg_relevancy = (results.sum { |r| r[:answer_relevancy] } / results.size).round(3)
        avg_correctness = (results.sum { |r| r[:answer_correctness] } / results.size).round(3)
        
        puts "\n--- Average Scores ---"
        puts "Faithfulness:      #{avg_faithfulness}"
        puts "Answer Relevancy:  #{avg_relevancy}"
        puts "Answer Correctness: #{avg_correctness}"
        puts "----------------------"
      end
    end
```

Step 4: A Nuanced Look at Interpreting Results
----------------------------------------------

Diagnosing issues is rarely a straight line. Here's a more realistic take:

*   **Low Faithfulness**: Often indicates hallucination, but could also mean the generation prompt is too loose. Try making it stricter: "Answer only with information from the context."
*   **Low Relevancy**: Could be a retrieval problem (bad context), but might also be a generation issue where the LLM misunderstands the user's intent despite good context.
*   **Low Correctness**: This is a strong signal. If faithfulness is high but correctness is low, your retrieved context is wrong. If faithfulness is low and correctness is low, the LLM is hallucinating. If both are high, you're in a good state!

Important Considerations & Limitations
--------------------------------------

This approach is a starting point, not a silver bullet. Be aware of the following:

*   **LLM-as-a-Judge is Not Free or Perfect**: It has a real cost per evaluation run and can have its own biases. The judge itself should be validated. Consider using a cheaper, faster model for judging if possible.
*   **Context Metrics**: We haven't implemented Context Precision or Context Recall, which measure the quality of your retrieval step. These are important but more complex, often requiring you to map which specific context chunks are needed for the ground truth answer.
*   **Setting Thresholds**: What is a "good" score? It's domain-specific. For a medical chatbot, you might demand >0.95 faithfulness. For a creative writing assistant, it might be lower. Start by establishing a baseline, and aim for consistent improvement.

Next Steps: Integrating with CI/CD
----------------------------------

To catch regressions, this evaluation should be automated. Here is a conceptual GitHub Actions workflow:

`.github/workflows/rag\_evaluation.yml`
```yaml
    name: RAG Evaluation
    
    on:
      pull_request:
        paths:
          - 'app/services/**'
          - 'config/prompts/**'
    
    jobs:
      evaluate:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Set up Ruby
            uses: ruby/setup-ruby@v1
            with:
              ruby-version: 3.2.2
              bundler-cache: true
    
          - name: Run RAG Evaluation
            env:
              RAILS_ENV: test
              OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
            run: |
              bundle exec rake rag:evaluate > evaluation_results.txt
    
          - name: Comment on PR
            uses: actions/github-script@v6
            with:
              script: |
                const fs = require('fs');
                const results = fs.readFileSync('evaluation_results.txt', 'utf8');
                github.rest.issues.createComment({
                  issue_number: context.issue.number,
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  body: `### RAG Evaluation Results\n\n\`\`\`\n${results}\n\`\`\`\n`
                });
```
This workflow runs the evaluation when prompts or services change and posts the results as a PR comment, providing immediate feedback.

This guide provides a more robust and honest framework for evaluating your RAG system. It's a journey that starts with a simple dataset and a few key metrics, and evolves into a critical part of your development lifecycle, ensuring your AI features are not just powerful, but also reliable and correct.