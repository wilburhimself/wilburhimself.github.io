#!/usr/bin/env python3
"""
Benchmark: JSON Float Array vs Base64 Float32 Buffer (Python Serialization)

Measures the cost of serializing 1,000 embeddings at 1,536 dimensions
from a NumPy array into an HTTP-ready payload.

Usage:
    python embedding_serialization_bench.py

Requirements:
    pip install numpy

Methodology:
    - 1,000 iterations per format via timeit
    - GC disabled during measurement
    - Payload size measured as raw byte length of the serialized string
"""

import base64
import gc
import json
import sys
import timeit

import numpy as np


# --------------------------------------------------------------------------- #
# Parameters (match blog post claims)
# --------------------------------------------------------------------------- #
BATCH_SIZE = 1_000
DIMENSIONS = 1_536
ITERATIONS = 1_000

# --------------------------------------------------------------------------- #
# Generate a representative embedding matrix
# --------------------------------------------------------------------------- #
rng = np.random.default_rng(42)
embeddings = rng.standard_normal((BATCH_SIZE, DIMENSIONS)).astype(np.float32)


# --------------------------------------------------------------------------- #
# Serialization functions
# --------------------------------------------------------------------------- #
def serialize_json():
    """Standard pattern: numpy → Python list → JSON string."""
    return json.dumps({"embeddings": embeddings.tolist()})


def serialize_base64():
    """Binary pattern: numpy → raw bytes → Base64 string inside JSON."""
    raw = embeddings.tobytes()
    encoded = base64.b64encode(raw).decode("ascii")
    return json.dumps({
        "embeddings": encoded,
        "shape": list(embeddings.shape),
        "format": "base64_float32",
    })


# --------------------------------------------------------------------------- #
# Measure payload sizes (single run)
# --------------------------------------------------------------------------- #
json_payload = serialize_json()
b64_payload = serialize_base64()

json_size = len(json_payload.encode("utf-8"))
b64_size = len(b64_payload.encode("utf-8"))

# --------------------------------------------------------------------------- #
# Time each serializer with GC disabled
# --------------------------------------------------------------------------- #
gc.disable()

json_time = timeit.timeit(serialize_json, number=ITERATIONS)
b64_time = timeit.timeit(serialize_base64, number=ITERATIONS)

gc.enable()

# --------------------------------------------------------------------------- #
# Report
# --------------------------------------------------------------------------- #
json_avg_ms = (json_time / ITERATIONS) * 1_000
b64_avg_ms = (b64_time / ITERATIONS) * 1_000
size_reduction = (1 - b64_size / json_size) * 100
time_reduction = (1 - b64_avg_ms / json_avg_ms) * 100

print("=" * 65)
print("Python Serialization Benchmark")
print(f"  {BATCH_SIZE:,} embeddings × {DIMENSIONS:,} dimensions")
print(f"  {ITERATIONS:,} iterations, GC disabled")
print(f"  NumPy {np.__version__}, Python {sys.version.split()[0]}")
print("=" * 65)
print()
print(f"{'Metric':<30} {'JSON':>15} {'Base64':>15} {'Δ':>10}")
print("-" * 70)
print(f"{'Payload Size':<30} {json_size / 1_000_000:>12.1f} MB {b64_size / 1_000_000:>12.1f} MB {size_reduction:>+8.1f}%")
print(f"{'Avg Serialization Time':<30} {json_avg_ms:>12.1f} ms {b64_avg_ms:>12.1f} ms {time_reduction:>+8.1f}%")
total_label = f"Total Time ({ITERATIONS:,} iters)"
print(f"{total_label:<30} {json_time:>12.3f} s  {b64_time:>12.3f} s ")
print()
print("Interpretation:")
print(f"  Base64 payloads are {size_reduction:.0f}% smaller.")
print(f"  Base64 serialization is {time_reduction:.0f}% faster.")
