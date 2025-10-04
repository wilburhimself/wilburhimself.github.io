---
title: 'A Guide to Building AI Agents in Ruby with Function Calling'
pubDate: 2025-10-05
description: 'A practical guide to building AI agents in Ruby by leveraging LLM function calling, with a focus on security, robustness, and testing.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/building-ai-agents-in-ruby.png'
    alt: 'A robot hand interacting with a Ruby on Rails logo.'
tags: ["ruby", "rails", "ai", "agents", "llm", "security"]
---

Modern LLMs can do more than just generate text; they can interact with your application's tools, turning passive systems into active agents. This guide explores how to leverage "function calling" in Ruby to build these agents, focusing on a robust, secure, and scalable approach.

We'll move beyond a simple proof-of-concept to a design that considers the real-world complexities of security, error handling, and testing.

### A Security-First Mindset is Essential

Before writing a single line of code, we must acknowledge the primary risk: **letting an AI model execute code is inherently dangerous.** A compromised or cleverly prompted model could attempt to call unintended functions or pass malicious arguments. Your design must be built on a foundation of security:

1.  **Explicit Allow-listing:** Only a pre-approved list of methods should ever be callable by the agent.
2.  **Strong Parameter Validation:** Treat arguments from the LLM with the same suspicion as user input. Sanitize and validate everything.
3.  **Principle of Least Privilege:** The agent should operate with the minimum permissions necessary. If it only needs to read data, don't give it write access.

### Step 1: Defining and Registering Callable Tools

Instead of scattering tool definitions, let's create a centralized registry. This makes our system more organized and secure.

`app/services/agent/tool_registry.rb`:
```ruby
# frozen_string_literal: true

module Agent
  class ToolRegistry
    # Our explicit allow-list of tools.
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

### Step 2: A Robust Agent Service with a Dispatcher

Next, we'll build an agent service that uses this registry to securely dispatch calls. This avoids a fragile, hard-to-maintain `if/elsif` chain.

`app/services/agent/runner_service.rb`:
```ruby
# frozen_string_literal: true

module Agent
  class RunnerService
    def initialize(prompt)
      @prompt = prompt
      @llm_client = OpenAiService.new # Your LLM client abstraction
    end

    def run
      response = @llm_client.call_with_tools(
        prompt: @prompt,
        tools: ToolRegistry.tool_definitions
      )

      # In a more advanced agent, this could be a loop
      if response.tool_calls.any?
        process_tool_calls(response.tool_calls)
      else
        response.text_content # Final answer
      end
    end

    private

    def process_tool_calls(tool_calls)
      tool_call = tool_calls.first # Keeping it simple for this example
      tool_name = tool_call.function.name

      tool_config = ToolRegistry.find(tool_name)
      unless tool_config
        return { error: "LLM attempted to call an unknown tool: #{tool_name}" }.to_json
      end

      begin
        arguments = JSON.parse(tool_call.function.arguments, symbolize_names: true)
        # Here you would add strong validation of the arguments
        
        service = tool_config[:service]
        method = tool_config[:method]

        # Securely dispatch the call
        service.public_send(method, **arguments)
      rescue JSON::ParserError
        { error: "LLM provided invalid arguments for #{tool_name}." }.to_json
      rescue ArgumentError => e
        { error: "Incorrect arguments for #{tool_name}: #{e.message}" }.to_json
      end
    end
  end
end
```

This design is far more robust. It relies on our `ToolRegistry` as a single source of truth and includes basic error handling for unknown tools or malformed arguments.

### Step 3: Testing Your Agent

How do you test a system that depends on a non-deterministic LLM? You mock the dependency.

Using RSpec, you can write tests that ensure your dispatcher works correctly by providing a canned LLM response.

`spec/services/agent/runner_service_spec.rb`:
```ruby
require 'rails_helper'

RSpec.describe Agent::RunnerService do
  it "correctly dispatches a known tool with valid arguments" do
    # Mock the LLM client response
    mock_llm_response = double('LLMResponse', tool_calls: [
      double('ToolCall', function: double('Function', 
        name: "get_current_weather", 
        arguments: { location: "Boston, MA" }.to_json
      ))
    ])
    allow_any_instance_of(OpenAiService).to receive(:call_with_tools).and_return(mock_llm_response)

    # Expect our WeatherService to be called correctly
    expect(WeatherService).to receive(:get_current_weather).with(location: "Boston, MA")

    Agent::RunnerService.new("What is the weather in Boston?").run
  end

  it "handles calls to unknown tools gracefully" do
    mock_llm_response = double('LLMResponse', tool_calls: [
      double('ToolCall', function: double('Function', name: "delete_database", arguments: "{}"))
    ])
    allow_any_instance_of(OpenAiService).to receive(:call_with_tools).and_return(mock_llm_response)

    result = Agent::RunnerService.new("...").run
    expect(JSON.parse(result)["error"]).to include("unknown tool")
  end
end
```

### Conclusion: Power with Responsibility

Function calling is a powerful paradigm that allows you to build sophisticated, task-oriented AI agents. However, this power demands a disciplined and security-first approach. By centralizing tool definitions, building a robust dispatcher, handling errors gracefully, and testing your logic with mocked data, you can harness this capability responsibly and effectively in your Rails applications.
