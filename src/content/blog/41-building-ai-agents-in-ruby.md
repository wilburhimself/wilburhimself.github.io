---
title: 'More Than a Chatbot: Building AI Agents in Ruby with Function Calling'
pubDate: 2025-10-05
description: 'A guide to building powerful AI agents in pure Ruby by leveraging LLM function calling.'
author: 'Wilbur Suero'
image:
    url: 'https://wilbur.io/images/posts/building-ai-agents-in-ruby.png'
    alt: 'A robot hand interacting with a Ruby on Rails logo.'
tags: ["ruby", "rails", "ai", "agents", "llm"]
---

Modern LLMs can do more than just generate text; they can interact with your application's tools. This article explores the concept of "function calling" to build powerful AI agents in pure Ruby. We'll walk through a practical example of defining tools (Ruby methods), presenting them to the model, and securely executing the model's chosen function, turning your Rails application from a passive data source into an active participant in task completion.

### Defining Your Tools

First, we need to define the Ruby methods that the LLM can call. These should be simple, well-defined methods.

```ruby
# app/services/weather_service.rb
class WeatherService
  def self.get_current_weather(location:, unit: "fahrenheit")
    # ... implementation to fetch weather data ...
    { temperature: "72", unit: unit, conditions: "Sunny" }.to_json
  end
end
```

### Presenting Tools to the Model

Next, we need to format this method signature in a way the LLM can understand. This is typically done via a JSON schema that you send with your API request.

```ruby
# Code showing how to define the tool for the LLM API
tools = [
  {
    type: "function",
    function: {
      name: "get_current_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "The city and state, e.g. San Francisco, CA" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] }
        },
        required: ["location"]
      }
    }
  }
]
```

### Executing the Function

Finally, when the model responds with a request to call a function, your code needs to parse the response and execute the appropriate Ruby method.

```ruby
# Logic to parse the LLM response and call the correct method
response = # ... LLM API call ...
if response.tool_calls
  tool_call = response.tool_calls.first
  function_name = tool_call.function.name
  arguments = JSON.parse(tool_call.function.arguments)

  # In a real app, you'd use a more robust dispatching mechanism
  if function_name == "get_current_weather"
    WeatherService.get_current_weather(**arguments.symbolize_keys)
  end
end
```

By combining Ruby's powerful metaprogramming with LLM function calling, you can create sophisticated agents that automate complex tasks.
