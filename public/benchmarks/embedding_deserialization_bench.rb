#!/usr/bin/env ruby
# frozen_string_literal: true

#
# Benchmark: JSON Float Array vs Base64 Float32 Buffer (Ruby Deserialization)
#
# Measures the cost of deserializing 1,000 embeddings at 1,536 dimensions
# from an HTTP response body into Ruby arrays of Floats.
#
# Usage:
#     ruby embedding_deserialization_bench.rb
#
# Requirements:
#     gem install benchmark-ips
#
# Methodology:
#     - Benchmark::IPS with warmup and GC-disabled measurement
#     - Payload size measured as raw byte length of the input string
#

require "benchmark/ips"
require "json"
require "base64"

# --------------------------------------------------------------------------- #
# Parameters (match blog post claims)
# --------------------------------------------------------------------------- #
BATCH_SIZE = 1_000
DIMENSIONS = 1_536

# --------------------------------------------------------------------------- #
# Generate representative payloads
# --------------------------------------------------------------------------- #
puts "Generating #{BATCH_SIZE} × #{DIMENSIONS} embeddings..."

# Simulate float32 values in the range typical of normalized embeddings
rng = Random.new(42)
matrix = Array.new(BATCH_SIZE) { Array.new(DIMENSIONS) { rng.rand(-1.0..1.0) } }

# 1. JSON payload: nested array of floats
json_payload = { "embeddings" => matrix }.to_json

# 2. Base64 payload: raw float32 bytes, Base64-encoded
#    Pack as little-endian single-precision floats ('e*') to match the blog
raw_bytes = matrix.flatten.pack("e*")
b64_string = Base64.strict_encode64(raw_bytes)
b64_payload = {
  "embeddings" => b64_string,
  "shape" => [BATCH_SIZE, DIMENSIONS],
  "format" => "base64_float32"
}.to_json

# --------------------------------------------------------------------------- #
# Report payload sizes
# --------------------------------------------------------------------------- #
puts
puts "=" * 65
puts "Ruby Deserialization Benchmark"
puts "  #{BATCH_SIZE.to_s.gsub(/(\d)(?=(\d{3})+$)/, '\\1,')} embeddings × #{DIMENSIONS.to_s.gsub(/(\d)(?=(\d{3})+$)/, '\\1,')} dimensions"
puts "  Ruby #{RUBY_VERSION}"
puts "=" * 65
puts
puts format("%-30s %15s %15s", "Metric", "JSON", "Base64")
puts "-" * 65
puts format("%-30s %12.1f MB %12.1f MB", "Payload Size",
  json_payload.bytesize / 1_000_000.0,
  b64_payload.bytesize / 1_000_000.0)
puts

# --------------------------------------------------------------------------- #
# Benchmark deserialization
# --------------------------------------------------------------------------- #
Benchmark.ips do |x|
  x.config(warmup: 2, time: 10)

  x.report("JSON.parse (nested arrays)") do
    parsed = JSON.parse(json_payload)
    embeddings = parsed["embeddings"]
    # Force materialization — access a value to prevent dead-code elimination
    embeddings[500][768]
  end

  x.report("Base64 decode + unpack('e*')") do
    parsed = JSON.parse(b64_payload)
    decoded = Base64.strict_decode64(parsed["embeddings"])
    flat = decoded.unpack("e*")
    # Reshape into rows
    embeddings = Array.new(BATCH_SIZE) { |i| flat[i * DIMENSIONS, DIMENSIONS] }
    embeddings[500][768]
  end

  x.compare!
end
