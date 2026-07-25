---
title: "AISpec: RSpec for AI Behavior, Not AI Outputs"
date: "July 26, 2026"
tags: ["ruby", "rails", "ai-engineering", "testing", "aispec", "llm"]
excerpt: "LLM outputs vary, but system rules shouldn't. AISpec brings invariant contracts, confidence intervals, and Rails-native testing to your LLM pipeline."
---

Standard RSpec assertions expect exact values: `expect(user.name).to eq("Alice")`.

LLMs break that contract immediately. Run a prompt three times at temperature 0.2, and you get three different phrasing variations.

When teams add AI features to Rails apps, they usually fall into one of two patterns:

- Writing brittle regex assertions that shatter whenever the model picks a synonym or shifts sentence structure.
- Offloading evals to a third-party SaaS dashboard that runs weekly batch jobs—completely disconnected from local `bundle exec rspec` runs and CI pipelines.

Neither scale for production. Forget testing word-for-word string matches. You need to enforce what the AI pipeline is permitted, required, or blocked from doing.

I built **[AISpec](https://github.com/wilburhimself/aispec)** to solve this for Ruby and Rails. It's an open-source gem that brings invariant behavioral contracts, statistical confidence bounds, and native RSpec assertions into your test suite.

---

## Behavioral invariants vs. static text assertions

Traditional code lives in a deterministic space. LLMs operate probabilistically, but your product constraints are still binary.

An LLM feature needs to satisfy two types of bounds:

```
                    ┌─────────────────────────────────────┐
                    │     LLM Application Constraints     │
                    └──────────────────┬──────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌─────────────────────────┐                           ┌─────────────────────────┐
│  Deterministic Bounds   │                           │   Probabilistic Bounds  │
├─────────────────────────┤                           ├─────────────────────────┤
│ • Valid JSON Schema     │                           │ • Semantic Relevance    │
│ • Strict Latency Budget │                           │ • Empathetic Tone       │
│ • Max Cost ($/call)     │                           │ • Factual Grounding     │
│ • Tool Calling Sequence │                           │ • LLM-as-a-Judge Score  │
│ • System Prompt Privacy │                           └─────────────────────────┘
└─────────────────────────┘
```

Deterministic bounds are pass/fail. The response either matches your JSON schema or it doesn't. Execution finished under 2,500ms, or it blew past your budget. The app called `fetch_account_status` before `process_refund`, or it failed the sequence.

Probabilistic bounds grade response quality. An LLM judge evaluates whether the output stays factual against provided context or hits the expected tone threshold.

AISpec unifies both under a single contract file.

---

## Defining behavioral contracts in AISpec

Contracts live in YAML files alongside your codebase. You declare the provider, model, input dataset, and invariant rules.

Here is a contract for a customer support bot (`contracts/support.yml`):

```yaml
version: 1
name: support-bot

model:
  provider: openai
  model: gpt-4o

dataset:
  path: datasets/support_cases.yml

contracts:
  # Structural & Formatting Constraints
  - type: json
    schema: ["status", "ticket_id", "message"]

  - type: citation_format

  # Operational Constraints
  - type: max_latency
    value: 2500

  - type: cost
    max: 0.03

  # Safety & Tooling Constraints
  - type: must_not_reveal_system_prompt
  
  - type: tool_order
    order: ["fetch_account_status", "process_refund"]

  # Probabilistic Quality Criteria (LLM-as-a-Judge)
  - type: judge
    prompt: |
      The response must be polite, accurate to our refund policy, and concise.
    threshold: 0.85
```

You can also use inline shorthand rules:

```yaml
contracts:
  - must_return_valid_json
  - latency < 2500ms
  - cost < $0.03
  - confidence >= 0.85
```

Run `aispec run contracts/support.yml` from your terminal to execute the dataset and check every rule:

```bash
$ aispec run contracts/support.yml

Running 12 contracts for support-bot (openai / gpt-4o)...

Case #1 (Input: "How do I request a refund?")
  PASS  json: Output is valid JSON matching target schema
  PASS  citation_format: Response contains valid citation formatting
  PASS  max_latency: Latency 142.0ms <= 2500ms
  PASS  cost: Cost $0.0018 <= $0.0300
  PASS  must_not_reveal_system_prompt: System prompt protected
  PASS  tool_order: Tool sequence [fetch_account_status, process_refund] matched
  PASS  judge: Score 0.94 (threshold 0.85): Response accurate and empathetic

Overall
  Passed: 12/12 (100.0%)
  Confidence Interval: 95.0% CI [75.8%, 100.0%]
  Mean Latency: 142.0ms
  Total Cost: $0.0036
  Variance: Low
  Recommendation: Stable
```

AISpec computes a Wilson score 95% confidence interval and tracks variance across runs. If small sample sizes or wild output swings threaten reliability, AISpec flags the instability before bad prompt edits land in production.

---

## Benchmarking across models

Switching from `gpt-4o` to `claude-3-5-sonnet` or a local `llama3` instance usually feels like guesswork. You swap model names, run a few manual prompts, and hope nothing broke.

AISpec lets you benchmark candidate models against your exact contract suite in one terminal command:

```bash
$ aispec compare gpt-4o claude-3-5-sonnet llama3
```

| Model                     | Success Rate | 95% Confidence CI | Cost / Run | Mean Latency | Variance |
| :------------------------ | :----------: | :---------------: | :--------: | :----------: | :------: |
| **gpt-4o**                |  **98.2%**   |  [92.1%, 99.7%]   |  $0.0024   |     1.1s     |   Low    |
| **claude-3-5-sonnet**     |  **97.5%**   |  [91.0%, 99.3%]   |  $0.0042   |     1.4s     |   Low    |
| **llama3 (Ollama local)** |  **91.0%**   |  [82.4%, 95.6%]   |  $0.0000   |     0.8s     | Moderate |

This shifts model selection from subjective vibe checks to clear metrics. You instantly see whether a cheaper or open-weights model meets your latency and safety budgets.

---

## Rails integration

AI evals shouldn't require a separate Python toolchain or external dashboard. In a Rails application, your behavioral contracts belong right inside `spec/contracts/`.

### 1. Initializer and custom assertions

Set default providers and register custom domain rules in `config/initializers/aispec.rb`:

```ruby
# config/initializers/aispec.rb
AISpec.configure do |config|
  config.default_provider = ENV.fetch("AISPEC_PROVIDER", "openai")
  config.default_model    = "gpt-4o"
  config.judge_provider   = "openai"
  config.judge_model       = "gpt-4o"
  config.timeout           = 30
end

# Register domain-specific assertions using the AISpec plugin DSL
AISpec.plugin do
  assertion :valid_tenant_isolation do |response, context, _options|
    tenant_id = context[:tenant_id]
    contains_tenant = response[:output].include?("Tenant: #{tenant_id}")
    
    [
      contains_tenant,
      contains_tenant ? "Output correctly bound to Tenant #{tenant_id}" : "Security Violation: Missing Tenant #{tenant_id}"
    ]
  end
end
```

### 2. Running contracts in RSpec

Run your YAML contracts directly inside standard RSpec tests:

```ruby
# spec/contracts/support_contract_spec.rb
require "rails_helper"

RSpec.describe "Support Bot Behavioral Contract", type: :contract do
  it "satisfies safety, format, and cost invariant budgets" do
    contract_path = Rails.root.join("spec/contracts/support.yml")
    runner        = AISpec::Core::Runner.new(contract_path)
    
    results = runner.run
    stats   = results[:statistics].summary

    # Enforce zero assertion failures
    expect(stats[:failed_assertions]).to eq(0), -> {
      failures = results[:runs].flat_map { |r| r[:assertion_results].reject(&:passed?).map(&:message) }
      "Contract Violations:\n#{failures.join("\n")}"
    }

    # Enforce statistical quality bounds
    expect(stats[:success_rate]).to be >= 95.0
    expect(stats[:mean_latency]).to be <= 2500.0
    expect(stats[:total_cost]).to be <= 0.05
  end
end
```

---

## Continuous verification in GitHub Actions

Because AISpec outputs JSON, JUnit XML, and Markdown tables, you can run contract checks on every pull request using GitHub Actions:

```yaml
# .github/workflows/ai_contracts.yml
name: AI Behavioral Verification

on: [push, pull_request]

jobs:
  verify-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - name: Execute AISpec Contracts
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          bundle exec aispec run contracts/support.yml --format markdown --output pr_comment.md

      - name: Post Behavioral Report to Pull Request
        if: github.event_name == 'pull_request'
        uses: marooned/actions-comment-pull-request@v2
        with:
          filePath: pr_comment.md
```

When someone modifies a prompt in a pull request, CI comments with a table showing whether latency jumped, costs rose, or score bounds failed.

---

AI tooling makes writing code easy, but maintaining system reliability remains the real work.

Without explicit behavioral boundaries, every prompt change introduces risk. Defining invariant rules—schema checks, latency budgets, tool sequences, and statistical thresholds—turns unpredictable model outputs into reliable system components.

Check out **[AISpec on GitHub](https://github.com/wilburhimself/aispec)** or run `gem install aispec` to add behavioral specs to your Rails application.

