---
title: Using Service Objects in Ruby on Rails
date: '2019-03-16T23:46:37.121Z'
---

Once an application reaches certain size, questions about architecture begin to appear. Rails follows a Model View Controller organization and rules exists for clean code:

* No **Fat Models** - don't allow them to get bloated
* Keep **views** dumb - don't put any logic in there
* Keep **controllers** skinny - don't put too much there

And it raises the first question: Where do I put all that code?

### Introducing service objects

Service objects can be a class or a module in Ruby that perform an action and can help take out logic
from other areas of the MVC structure. For a simple example, let's say we have a controller like this:

```ruby
class PostsController < ApplicationController
  def create
    @title = params[:title]
    @content = params[:content]
    @post = Post.new(title: @title, content: @content)
    if @post.save
      flash.notice = 'Post saved'
      render @post
    else
      flash.alert = flash_error_message(@post)
      redirect_to :new
    end
  end
end
```

Extracting some of this into a service object is easy once you understand the design pattern.

- create a `services` folder in the Rails' `app` folder
- create the service object file, in this example `create_post.rb`
- extract the functionality to the `CreatePost` class/module
- reload the Rails app and try it

### Service objects as modules

Using a module approach I created a service that looks very much like a factory design pattern.

```ruby
module CreatePost
  class << self
    def execute(params)
      title = params[:title]
      content = params[:content]
      post = Post.new(title: title, content: content)
    end
  end
end
```

Which in turn made the controller a lot more manageable.

```ruby
class PostsController < ApplicationController
  def create
    @post = CreatePost.execute(params)
    if @post.save
      flash.notice = 'Post saved'
      render @post
    else
      flash.alert = flash_error_message(@post)
      redirect_to :new
    end
  end
end
```

### Service objects as classes

In some cases we need to store instance variables and other methods, if so, we use classes. Using a class, our code could be rewritten as:

```ruby
class CreatePost
  def initialize(params)
    @title = params[:title]
    @content = params[:content]
  end

  def call
    Post.new(title: @title, content: @content)
  end
end
```

The code of the controller would be

```ruby
class PostsController < ApplicationController
  def create
    @post = CreatePost.new(params).call
    if @post.save
      flash.notice = 'Post saved'
      render @post
    else
      flash.alert = flash_error_message(@post)
      redirect_to :new
    end
  end
end
```

### Organizing service objects with modules

When we start using services our `services` folder tends to grow a lot. We can manage this growth by creating a modular structure using folders and modules.

The `services` folder can reflect the variety of service objects and it's different uses in our app. We group them in namespaces using Ruby modules.

```ruby
module Post
  module Build
    def self.call(params)
      title = params[:title]
      content = params[:content]
      Post.new(title: title, content: content)
    end
  end
end
```

To achieve this we have to place them in folders that reflects our module structure to let Rails load them.

```
services/post/build.rb
services/post/update.rb
services/comments/build.rb
...
```

This way our use of service objects can scale with the growth of our app.
