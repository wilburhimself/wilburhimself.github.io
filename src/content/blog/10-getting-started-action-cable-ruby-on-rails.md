---
title: "Getting started with ActionCable in Ruby on Rails - An Introduction"
date: "February 20, 2023"
excerpt: "Real-time web applications leverage ActionCable and WebSockets through comprehensive implementation covering Rails API setup, React integration, Redis configuration, and channel creation. Bidirectional communication patterns enable chat applications, live updates, and collaborative features in modern web development."
---

ActionCable is a powerful feature in Ruby on Rails that allows developers to build real-time web applications using WebSockets. With ActionCable, you can create channels that handle bidirectional communication between the client and the server in real time. This tutorial will provide an introduction to ActionCable and guide you through creating a simple chat application.

**Step 1: Create a new Rails app and install the necessary dependencies**

First, create a new Rails app with the `--api` flag to generate an API-only application:

    rails new chat_app --api

Then, add the necessary gems to the `Gemfile`:

    # Gemfile
    gem 'rack-cors'
    gem 'redis'
    gem 'redis-rails'
    gem 'puma'

Install the gems:

    bundle install

**Step 2: Create a new React app using create-react-app**

Next, create a new React app inside the Rails app using `create-react-app`:

    cd chat_app
    npx create-react-app client

This will create a new React app inside the `client` directory.

**Step 3: Set up CORS and configure Redis for ActionCable**

To allow Cross-Origin Resource Sharing (CORS) between the Rails server and the React client, add the following code to `config/initializers/cors.rb`:

    # config/initializers/cors.rb
    Rails.application.config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :put, :patch, :delete, :options, :head], expose: ['access-token', 'expiry', 'token-type', 'uid', 'client']
      end
    end

Also, configure Redis for ActionCable in `config/cable.yml`:

    # config/cable.yml
    development:
      adapter: redis
      url: redis://localhost:6379/1

**Step 4: Create a new channel**

Create a new channel called `chat_channel` using the Rails generator:

    rails generate channel Chat

This will create a new `chat_channel.rb` file in `app/channels` with the following code:

    # app/channels/chat_channel.rb
    class ChatChannel < ApplicationCable::Channel
      def subscribed
        stream_from "chat_channel"
      end
    
      def unsubscribed
        # Any cleanup needed when channel is unsubscribed
      end
    end

This channel subscribes to the `chat_channel` stream and defines the `subscribed` method to stream messages from this channel.

**Step 5: Update the** `routes.rb` **file**

Add the following code to `config/routes.rb`:

    # config/routes.rb
    Rails.application.routes.draw do
      resources :chat_rooms, only: [:index, :create]
      mount ActionCable.server => '/cable'
    end

This code sets up the routes for the chat rooms and mounts the ActionCable server at the `/cable` endpoint.

**Step 6: Create a new controller**

Create a new controller called `chat_rooms_controller.rb`:

    rails generate controller ChatRooms index create

This will create a new `chat_rooms_controller.rb` file in `app/controllers` with the following code:

    # app/controllers/chat_rooms_controller.rb
    class ChatRoomsController < ApplicationController
      def index
        @messages = Message.all
      end
    
      def create
        ActionCable.server.broadcast "chat_channel", message: params[:message], user: "anonymous"
        Message.create(content: params[:message], user: "anonymous")
        redirect_to chat_rooms_path
      end

This controller defines the `index` method to display the chat room and the `create` method to broadcast the new message to the `chat_channel` stream and create a new `Message` object.

**Step 7: Update the** `App.js` **file in the React client**

In the React client, update the `App.js` file in the `src` directory with the following code:

    import React, { useState, useEffect } from 'react';
    import logo from './logo.svg';
    import './App.css';
    import ChatRoom from './ChatRoom';
    import ActionCableConsumer from 'react-actioncable-provider';
    
    function App() {
      const [messages, setMessages] = useState([]);
    
      useEffect(() => {
        fetch('/chat_rooms')
          .then(response => response.json())
          .then(data => setMessages(data));
      }, []);
    
      const handleReceivedMessage = (response) => {
        setMessages([...messages, response]);
      }
    
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1>React + Rails Chat App</h1>
          </header>
          <div className="Chat-room">
            <ActionCableConsumer
              channel={{ channel: 'ChatChannel' }}
              onReceived={handleReceivedMessage}
            />
            <ChatRoom messages={messages} />
          </div>
        </div>
      );
    }
    
    export default App;

This code sets up the `App` component to fetch the initial list of messages from the server and render a `ChatRoom` component with an `ActionCableConsumer` to listen for new messages.

**Step 8: Create a new** `ChatRoom` **component**

Create a new `ChatRoom.js` file in the `src` directory with the following code:

    import React, { useState } from 'react';
    
    function ChatRoom({ messages }) {
      const [message, setMessage] = useState('');
    
      const handleChange = (event) => {
        setMessage(event.target.value);
      }
    
      const handleSubmit = (event) => {
        event.preventDefault();
        fetch('/chat_rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ message: message })
        });
        setMessage('');
      }
    
      return (
        <div className="Chat-room-container">
          <div className="Chat-messages">
            {messages.map((message, index) => (
              <div key={index} className="Chat-message">
                <p className="Chat-message-content">{message.content}</p>
                <p className="Chat-message-user">{message.user}</p>
              </div>
            ))}
          </div>
          <form className="Chat-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={handleChange}
              placeholder="Type your message here"
            />
            <button type="submit">Send</button>
          </form>
        </div>
      );
    }
    
    export default ChatRoom;

This code defines the `ChatRoom` component to render the list of messages and a form to send new messages.

**Step 9: Start the servers**

Start the Rails server:

    rails s

And start the React client server:

    cd client
    npm start

Visit [`http://localhost:3000`](http://localhost:3000) in your browser to see the chat app in action!

**Conclusion**

In this tutorial, we walked through the process of setting up ActionCable in a Ruby on Rails API and creating a React front-end to send and receive real-time messages. We used `create-react-app` to create a new React app and `react-actioncable-provider` to handle the WebSocket connection and receive new messages.

By now, you should have a good understanding of how ActionCable works and how to use it to build real-time applications with Ruby on Rails and React.

To learn more about ActionCable, check out the official Rails documentation at [**https://guides.rubyonrails.org/action\_cable\_overview.html**](https://guides.rubyonrails.org/action_cable_overview.html). For more information about React and `create-react-app`, visit [**https://reactjs.org/**](https://reactjs.org/) and [**https://create-react-app.dev/**](https://create-react-app.dev/).

Thank you for reading!