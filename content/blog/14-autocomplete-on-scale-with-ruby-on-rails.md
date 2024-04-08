---
title: Autocomplete at Scale - How Tries and Partitioning Can Unlock Blazing-Fast Search in Ruby on Rails
date: 2024-04-07
---

As software engineers, we're constantly striving to build applications that are not only feature-rich, but also lightning-fast, even in the face of ever-growing datasets. And when it comes to implementing search functionality - particularly the coveted autocomplete feature - the challenge of maintaining performance can be a real thorn in our sides.

Enter the humble trie data structure. This unassuming tree-like construct holds the key to unlocking highly efficient prefix-based searches, making it an ideal choice for powering autocomplete in our Ruby on Rails applications. But as our user base grows and our databases swell to the millions, we need to go beyond the basic trie implementation to ensure that our search remains speedy and responsive.

In this post, we'll explore a series of performance-focused optimizations that will allow us to harness the power of tries to build an autocomplete solution that can scale to meet the demands of even the most data-hungry applications.

### The Trie: A Refresher
At its core, a trie is a tree-like data structure where each node represents a character in a word or phrase. The beauty of a trie lies in its ability to perform prefix-based searches with lightning-fast speed, making it a perfect fit for autocomplete functionality.

Here's a simple implementation of a trie in Ruby:

```ruby
class Trie
  def initialize
    @root = {}
  end

  def insert(word)
    node = @root
    word.each_char do |char|
      node[char] = {} unless node.key?(char)
      node = node[char]
    end
    node[:is_end_of_word] = true
  end

  def search(word)
    node = @root
    word.each_char do |char|
      return false unless node.key?(char)
      node = node[char]
    end
    node.key?(:is_end_of_word)
  end
end
```

In this example, each node in the trie is represented as a hash, with the keys being the characters and the values either another hash (representing a child node) or a boolean flag indicating the end of a word.

### Lazy Loading: Minimizing the Initial Impact
While a trie-based autocomplete solution offers impressive performance benefits, the initial setup cost can be a concern, especially when dealing with large datasets. Imagine having to load millions of words into the trie when your application starts up - that's a surefire way to slow down your application's launch time and potentially overwhelm your server's memory.

To address this, we can implement a lazy loading approach, where we only populate the trie as needed, rather than loading everything upfront. Here's how it might look in a Ruby on Rails context:

```ruby
class Word < ApplicationRecord
  class << self
    def trie
      @@trie ||= begin
        trie = Trie.new
        find_each { |word| trie.insert(word.name) }
        trie
      end
    end
  end
end
```

In this implementation, the trie is initialized when the Word.trie method is first called. The find_each method is used to fetch the words from the database in batches, rather than loading them all at once. This helps minimize the initial memory footprint and startup time of the application.

In this implementation, the trie is initialized when the `Word.trie` method is first called. The `find_each` method is used to fetch the words from the database in batches, rather than loading them all at once. This helps minimize the initial memory footprint and startup time of the application.

### Batch Processing: Keeping the Trie Fresh
While lazy loading can help with the initial setup, as new words are added to the database, we need to ensure that the trie is kept up-to-date. One way to do this is to update the trie in batches, rather than performing individual updates for each new word.

```ruby
class Word < ApplicationRecord
  class << self
    BATCH_SIZE = 10_000

    def trie
      @@trie ||= begin
        trie = Trie.new
        offset = 0
        loop do
          words = pluck(:name).offset(offset).limit(BATCH_SIZE)
          break if words.empty?
          words.each { |word| trie.insert(word) }
          offset += BATCH_SIZE
        end
        trie
      end
    end
  end
end
```

In this example, we're loading the words in batches of 10,000 records at a time, using the `offset` and `limit` methods to fetch the data in chunks. This approach can be further optimized by using a background job to load the data asynchronously, ensuring that the main application remains responsive.

### Partitioning: Distributing the Load
As the size of your dataset continues to grow, even the batch processing approach may not be enough to maintain optimal performance. This is where partitioning the trie can be a game-changer.

Instead of a single trie, we can create a partitioned trie, where each partition is responsible for a subset of the data. This allows us to distribute the load and improve the overall performance of the autocomplete functionality.

```ruby
class Word < ApplicationRecord
  class << self
    def trie
      @@trie ||= begin
        trie = PartitionedTrie.new
        find_each { |word| trie.insert(word.name) }
        trie
      end
    end
  end
end

class PartitionedTrie
  def initialize
    @tries = Hash.new { |h, k| h[k] = Trie.new }
  end

  def insert(word)
    @tries[word[0]].insert(word)
  end

  def autocomplete(prefix, page: 1, per_page: 10)
    trie = @tries[prefix[0]]
    trie.autocomplete(prefix, page: page, per_page: per_page)
  end
end
```

In this implementation, we use a `PartitionedTrie` class that maintains a hash of individual tries, partitioned by the first letter of the word. When inserting a word, we route it to the appropriate trie based on the first letter. When performing an autocomplete search, we only need to search the trie for the first letter of the prefix, which can significantly improve the performance for large datasets.

You can further optimize the partitioning strategy based on your data distribution and access patterns. For example, you could partition by the first two letters, or use a more sophisticated hashing scheme to distribute the load more evenly.

By combining the power of tries with performance-focused optimizations like lazy loading, batch processing, and partitioning, you can build an autocomplete solution that can handle even the largest of datasets with ease.

This approach not only ensures that your users enjoy a lightning-fast search experience, but it also helps to keep your application's resource utilization in check, even as your user base continues to grow.

So, if you're looking to take your Ruby on Rails application's search capabilities to the next level, don't hesitate to embrace the humble trie. With the right optimizations, it can be the key to unlocking blazing-fast autocomplete functionality
