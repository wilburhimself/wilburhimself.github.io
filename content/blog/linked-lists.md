---
slug: /linked-lists
title: Linked lists
date: 2023-02-14
---

A linked list is a data structure that consists of a sequence of nodes, where each node stores a value and a reference to the next node in the sequence. The first node in a linked list is known as the head node, and the last node is referred to as the tail node. The tail node usually has a reference to `nil` indicating the end of the list. Linked lists provide an alternative to arrays, with advantages and disadvantages in terms of performance, memory usage, and ease of use. The linked list data structure is widely used in many applications, such as implementing dynamic data structures like stacks and queues, and representing graphs and trees. In this post, we will go over the different operations that can be performed on linked lists and provide practical code examples in Ruby.

We'll be using Ruby to illustrate the concepts, but the same principles can be applied to other programming languages.

# **Basic Linked List Structure**

Here's an example of a basic linked list in Ruby:

```ruby
class Node
  attr_accessor :value, :next_node

  def initialize(value, next_node = nil)
    @value = value
    @next_node = next_node
  end
end

class LinkedList
  attr_accessor :head

  def initialize(head = nil)
    @head = head
  end
end
```

In this example, the `Node` class represents each node in the linked list and the `LinkedList` class represents the entire list. The `head` attribute of the `LinkedList` class is a reference to the first node in the list.

# **Linked List Operations**

Now that we have a basic understanding of linked lists, let's discuss the different operations that can be performed on them.

## **Insertion**

Inserting a node into a linked list involves creating a new node and making it the new head of the list.

```ruby
def insert_at_head(value)
  node = Node.new(value, @head)
  @head = node
end
```

## **Deletion**

Deleting a node from a linked list involves removing the node from the list and updating the references of the surrounding nodes.

```ruby
def delete_at_head
  return nil if @head.nil?
  deleted_node = @head
  @head = @head.next_node
  deleted_node.value
end
```

## **Search**

Searching for a node in a linked list involves starting at the head and following the references of each node until the desired node is found.

```ruby
def find(value)
  current_node = @head
  while current_node
    return current_node if current_node.value == value
    current_node = current_node.next_node
  end
  nil
end
```

## **Practical Uses of Linked Lists**

Linked lists are used in many different applications, including:

* Storing elements in a dynamic data structure

* Implementing queues and stacks

* Solving problems involving the manipulation of elements in a sequence


# **Rspec Tests**

Here are some Rspec tests to confirm that the linked list operations are working as expected:

```ruby
require 'rspec'

describe LinkedList do
  let(:linked_list) { LinkedList.new }
  let(:node) { Node.new(1) }

  describe "#insert_at_head" do
    it "inserts a node at the head of the list" do
      linked_list.insert_at_head(node)
      expect(linked_list.head).to eq(node)
    end
  end

  describe "#delete_at_head" do
    it "deletes the head node of the list" do
      linked_list.insert_at_head(node)
      linked_list.delete_at_head
      expect(linked_list.head).to be_nil
    end

    it "returns the value of the deleted node" do
      linked_list.insert_at_head(node)
      expect(linked_list.delete_at_head).to eq(node.value)
    end
  end

  describe "#find" do
    it "returns the node with the specified value" do
      linked_list.insert_at_head(node)
      result = linked_list.find(node.value)
      expect(result).to eq(node)
    end

    it "returns nil if the node with the specified value is not found" do
      result = linked_list.find(node.value)
      expect(result).to be_nil
    end
  end
end
```

In this post, I covered the basics of linked lists and the different operations that can be performed on them. I also showed how linked lists can be used in real-world applications and provided Rspec tests to confirm that our linked list operations are working correctly.

I hope this post has helped you understand the basics of linked lists and the various operations that can be performed on them. If you have any questions or if you'd like to share your implementation of linked lists in another programming language, feel free to leave a comment below.
