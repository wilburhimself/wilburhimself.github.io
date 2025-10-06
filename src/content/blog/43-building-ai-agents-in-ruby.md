---
title: 'Building a Production-Ready AI Agent Foundation in Ruby'
date: "October 6, 2025"
excerpt: 'Go beyond basic tutorials. This guide provides an A+ foundation for building secure, multi-turn AI agents in Ruby, integrating robust validation, cost controls, logging, and production-safe patterns.'
---

Most guides on "function calling" show a fragile proof-of-concept that would crumble in production. This guide provides a security-first, production-focused foundation for building real-world AI agents in Ruby.

We will build an agent that handles multi-turn conversations, validates all inputs with a complete, security-focused validator, manages errors gracefully, and integrates essential production patterns like cost controls, logging, and safe timeouts. This is the 80% you need to build on, with the battle-tested patterns included.

### The Core Challenge: From Toy to Tool

Letting an AI model execute code is inherently dangerous. A simple implementation quickly exposes critical risks:
- **Security Holes:** A cleverly prompted model could call unintended functions or pass malicious arguments.
- **Brittle Logic:** A single unexpected `nil` or malformed JSON from the LLM can crash the entire process.
- **Runaway Costs:** A looping agent can quickly incur significant costs without proper controls.
- **Incomplete Conversations:** Real tasks often require multiple steps (a "multi-turn" conversation), not just a single tool call.

Our design will tackle these challenges head-on.

---

### Step 1: The Tool Contract (The Registry)

Our architecture starts with a centralized, frozen registry. This is our single source of truth for what the agent is allowed to do, acting as a strict allow-list.

`app/services/agent/tool_registry.rb`:
```ruby
# frozen_string_literal: true

module Agent
  class ToolRegistry
    # Our explicit, frozen allow-list of tools.
    TOOLS = {
      "get_current_weather" => {
        service: WeatherService,
        method: :get_current_weather,
        description: "Get the current weather in a given location.",
        parameters: {
          type: :object,
          properties: {
            location: { type: :string, description: "The city and state, e.g. San Francisco, CA" },
            unit: { type: :string, enum: ["celsius", "fahrenheit"] }
          },
          required: ["location"]
        }
      }
      # Add other tools here...
    }.freeze

    def self.tool_definitions
      TOOLS.map do |name, config|
        {
          type: "function",
          function: {
            name: name,
            description: config[:description],
            parameters: config[:parameters]
          }
        }
      end
    end

    def self.find(tool_name)
      TOOLS[tool_name]
    end
  end
end
```

### Step 2: The Security Layer (A Complete Parameter Validator)

Never trust LLM output. This validator is our security gate. It works with string keys, validates types and enums, and returns a sanitized hash with symbolized keys, ensuring only expected arguments are passed to our methods.

`app/services/agent/parameter_validator.rb`:
```ruby
# frozen_string_literal: true

module Agent
  class ParameterValidator
    def self.validate(args, schema)
      schema[:required]&.each do |required_key|
        key = required_key.to_s
        raise ArgumentError, "Missing required parameter: #{required_key}" unless args.key?(key)
      end

      validated = {}
      schema[:properties].each do |prop_name, prop_schema|
        key = prop_name.to_s
        next unless args.key?(key)
        
        value = args[key]
        validate_type!(value, prop_schema[:type], key)
        validate_enum!(value, prop_schema[:enum], key) if prop_schema[:enum]
        
        validated[prop_name.to_sym] = value
      end
      
      validated
    end

    private

    def self.validate_type!(value, expected_type, field_name)
      valid = case expected_type.to_s
      when "string" then value.is_a?(String)
      when "number" then value.is_a?(Numeric)
      when "boolean" then [true, false].include?(value)
      when "object" then value.is_a?(Hash)
      when "array" then value.is_a?(Array)
      else
        raise ArgumentError, "Unknown type '#{expected_type}' in schema for parameter '#{field_name}'"
      end
      
      raise ArgumentError, "Parameter '#{field_name}' must be of type #{expected_type}" unless valid
    end

    def self.validate_enum!(value, allowed_values, field_name)
      return if allowed_values.map(&:to_s).include?(value.to_s)
      raise ArgumentError, "Parameter '#{field_name}' must be one of: #{allowed_values.join(', ')}"
    end
  end
end
```

> #### **A Note on `symbolize_names`**
> Early versions of this agent used `JSON.parse(..., symbolize_names: true)` for convenience. However, this creates a security vulnerability: a malicious actor could craft JSON with millions of unique keys, exhausting memory. Always parse untrusted input as strings first, then sanitize through a validator as shown above.

### Step 3: The Multi-Turn Agent with Cost Control & Logging

The agent's brain manages the conversation loop. It now correctly formats tool results, integrates logging, and tracks token usage to prevent runaway costs.

`app/services/agent/runner.rb`:
```ruby
# frozen_string_literal: true

module Agent
  class Runner
    MAX_ITERATIONS = 5
    MAX_TOKENS_PER_RUN = 4000

    def initialize(llm_client: nil, logger: Rails.logger)
      @llm_client = llm_client || DefaultLlmClient.new
      @logger = logger
      @total_tokens_used = 0
    end

    def run(initial_prompt)
      messages = [{ role: "user", content: initial_prompt }]

      MAX_ITERATIONS.times do |i|
        @logger.info("Agent loop iteration: #{i + 1}")
        
        response_data = @llm_client.call_with_tools(messages: messages, tools: ToolRegistry.tool_definitions)
        
        @total_tokens_used += response_data.dig("usage", "total_tokens") || 0
        raise "Token limit exceeded for this run" if @total_tokens_used > MAX_TOKENS_PER_RUN

        message = response_data.dig("choices", 0, "message")
        messages << message

        if message["tool_calls"]
          tool_results = process_tool_calls(message["tool_calls"])
          messages.concat(tool_results)
        else
          return message["content"] || "Agent finished without a final response."
        end
      end

      raise "Agent exceeded max iterations"
    end

    private

    def process_tool_calls(tool_calls)
      tool_calls.map do |call|
        tool_name = call.dig("function", "name")
        tool_config = ToolRegistry.find(tool_name)
        
        @logger.info("Agent wants to call tool: #{tool_name}")
        start_time = Time.now

        result_content = if tool_config.nil?
          { error: "Unknown tool: #{tool_name}" }.to_json
        else
          begin
            arguments = JSON.parse(call.dig("function", "arguments"))
            validated_args = ParameterValidator.validate(arguments, tool_config[:parameters])
            
            result = tool_config[:service].public_send(tool_config[:method], **validated_args)
            result.to_json
          rescue JSON::ParserError
            { error: "Invalid JSON arguments" }.to_json
          rescue ArgumentError => e
            { error: "Validation failed: #{e.message}" }.to_json
          end
        end
        
        @logger.info("Tool #{tool_name} completed in #{Time.now - start_time}s")
        { tool_call_id: call["id"], role: "tool", content: result_content }
      end
    end
  end
end
```

### Step 4: A Production-Safe LLM Client

Your client needs to handle real-world network issues. Using the HTTP client's native timeout is safer than Ruby's generic `Timeout` module.

`app/services/agent/default_llm_client.rb`:
```ruby
# frozen_string_literal: true

require 'httparty'

module Agent
  class DefaultLlmClient
    include HTTParty
    base_uri 'https://api.openai.com/v1'

    def initialize(api_key: ENV.fetch('OPENAI_API_KEY'))
      @headers = {
        "Authorization" => "Bearer #{api_key}",
        "Content-Type" => "application/json"
      }
    end

    def call_with_tools(messages:, tools:)
      body = { model: "gpt-4-turbo", messages: messages, tools: tools, tool_choice: "auto" }.to_json
      
      response = self.class.post(
        "/chat/completions",
        headers: @headers,
        body: body,
        timeout: 30 # Use the HTTP client's native timeout
      )
      
      raise "API Error: #{response.code} #{response.body}" unless response.success?
      response.parsed_response
    end
  end
end
```
> #### **A Note on Timeouts**
> While Ruby's `Timeout.timeout` is tempting, it uses thread interruption, which can leave network resources like HTTP connections in a broken, inconsistent state. For production code, always prefer the native timeout option provided by your HTTP client library (`timeout: 30` in HTTParty's case).

### Step 5: High-Fidelity Testing

Our test now verifies the agent's internal conversation history, ensuring the tool's raw JSON result is correctly passed back to the LLM for the next turn.

`spec/services/agent/runner_spec.rb`:
```ruby
require 'rails_helper'

RSpec.describe Agent::Runner do
  let(:mock_llm_client) { instance_double(Agent::DefaultLlmClient) }
  let(:logger) { instance_double(Logger, info: nil) }
  let(:agent) { Agent::Runner.new(llm_client: mock_llm_client, logger: logger) }
  let(:weather_result) { { temp: 72, unit: "fahrenheit" } }

  it "correctly dispatches a tool and uses its result to get a final answer" do
    # 1. LLM asks to call the weather tool
    weather_tool_call_response = { "choices" => [{ "message" => {
      "role" => "assistant", "tool_calls" => [{
        "id" => "call_123", "type" => "function", "function" => {
          "name" => "get_current_weather",
          "arguments" => '{"location": "Boston, MA", "unit": "fahrenheit"}'
        }
      }]
    }}], "usage" => { "total_tokens" => 100 }}
    
    # 2. LLM receives the tool's raw JSON output and generates the final answer
    final_answer_response = { "choices" => [{ "message" => {
      "role" => "assistant", "content" => "The weather in Boston is 72°F."
    }}], "usage" => { "total_tokens" => 50 }}

    # Expect the first call with the initial prompt
    expect(mock_llm_client).to receive(:call_with_tools)
      .with(hash_including(messages: [hash_including(role: "user")]))
      .and_return(weather_tool_call_response)

    # Expect the second call, now including the tool result in the message history
    expect(mock_llm_client).to receive(:call_with_tools)
      .with(hash_including(messages: array_including(
        hash_including(role: "tool", tool_call_id: "call_123", content: weather_result.to_json)
      )))
      .and_return(final_answer_response)

    # Expect our WeatherService to be called with validated, symbolized arguments
    expect(WeatherService).to receive(:get_current_weather)
      .with(location: "Boston, MA", unit: "fahrenheit")
      .and_return(weather_result)

    result = agent.run("What is the weather in Boston?")
    expect(result).to eq("The weather in Boston is 72°F.")
  end
end
```

### Next Steps on the Path to Production

This foundation is robust. To make it fully production-hardened, the final step is adding retry logic.

**Example retry with exponential backoff:**
```ruby
# In your Gemfile:
# gem 'retries'

# In your LLM Client:
require 'retries'

def call_with_tools(messages:, tools:)
  with_retries(max_tries: 3, base_sleep_seconds: 1, max_sleep_seconds: 5, rescue: [HTTParty::Error, SystemCallError]) do
    # ... your self.class.post call ...
  end
end
```

By building on this secure, observable, and resilient foundation, you can confidently deploy sophisticated AI agents that are both powerful and reliable.