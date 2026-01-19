---
title: "How to recursively delete node_modules folders"
date: "2026-01-18"
tags: ["cli", "bash", "node"]
---

### Problem

I needed to free up disk space by deleting all `node_modules` folders in a directory and its subdirectories.

### Solution

This command finds all directories named `node_modules` and executes `rm -rf` on them.

```bash
find . -name "node_modules" -type d -exec rm -rf {} +
```

### Why It Matters

This is a quick and effective way to clean up old projects without manually navigating into each one. The `+` at the end is more efficient than `;` because it groups the found paths into a single `rm` command.
