---
title: "🚨 Introducing GemGuard: Automated Security for Ruby Gems (Scan, SBOM, Typosquat, Auto-Fix)"
date: "2025-08-11"
excerpt: "GemGuard is my attempt to make Ruby security less of a chore and more of a natural part of development. It scans your Gemfile.lock against OSV.dev and the Ruby Advisory Database, flags typosquat risks, and can even generate SBOMs in SPDX or CycloneDX formats. If it finds a vulnerable gem, it’ll suggest or apply safe upgrades, and because it’s designed with CI/CD in mind, you can drop it into your workflow without slowing things down."
tags: ["ruby", "security", "gems", "tooling", "open-source"]
---

**Links:**

- GitHub: [github.com/wilburhimself/gem_guard](https://github.com/wilburhimself/gem_guard)
- RubyGems: [rubygems.org/gems/gem_guard](https://rubygems.org/gems/gem_guard)

---

## TL;DR

- ✅ Scan dependencies for known vulnerabilities (OSV.dev + Ruby Advisory DB)
- 🕵️ Detect typosquat packages before they bite
- 📜 Generate SPDX / CycloneDX SBOMs
- 🛠 Auto-fix vulnerable gems safely
- ⚡ Clean CLI + CI-ready
- **Version:** 1.1.x

---

## Why GemGuard?

Because security shouldn’t be an afterthought. It should be:

- **Pragmatic** – only what matters, no noise
- **Fast** – instant feedback in dev or CI
- **Integrated** – works with your normal Ruby workflow

---

## What is GemGuard?

GemGuard is a lightweight Ruby security tool that:

- Scans your `Gemfile.lock` for known vulnerabilities
- Detects typosquat risks via fuzzy matching
- Generates SBOMs (SPDX and CycloneDX)
- Auto-fixes vulnerable gems with safe version upgrades
- Plays nicely with CI/CD

---

#### Installation

```bash
# Add to your Gemfile (recommended for projects)
gem "gem_guard", "~> 1.1"

# Or install globally
gem install gem_guard
```

#### Verify:

```bash
gem_guard version
# => 1.1.x
```

#### Quick Start

Scan your project:

```bash
gem_guard scan
# ✅ No vulnerabilities found!
# or exits non‑zero if issues are found
```

#### Detect typosquats:

```bash
gem_guard typosquat
# No potential typosquat dependencies found.
```

#### Generate an SBOM:

```bash
gem_guard sbom --format spdx --output sbom.spdx.json
gem_guard sbom --format cyclonedx --output bom.cdx.json
```

#### Auto‑Fix Vulnerabilities

Preview (dry run):

```bash
gem_guard fix --dry-run
```

### Apply fixes (creates a Gemfile.lock backup by default):

```bash
gem_guard fix
# 📦 Created backup: Gemfile.lock.backup.2025...
# ✅ Updated nokogiri to 1.18.9
# 🔄 Running bundle install to update lockfile...
```

Options:

- `--interactive`: confirm each update
- `--no-backup`: skip lockfile backup
- `--gemfile`, --lockfile: custom paths

Tip: Re-scan after fixing

```bash
gem_guard scan
```

#### Clean CLI

```bash
gem_guard --help
# config, scan, typosquat, sbom, fix, version
```

#### Exit codes:

- 0: success / no vulns
- 1: vulnerabilities found
- 2: errors (e.g., missing files)

### CI/CD Integration (GitHub Actions)

```yaml
name: security-scan
on: [push, pull_request]
jobs:
  gemguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3"
          bundler-cache: true
      - run: gem install gem_guard
      - run: gem_guard scan --format json > gemguard-report.json
      - run: gem_guard typosquat --format json > typosquat-report.json
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: gemguard-reports
          path: |
            gemguard-report.json
            typosquat-report.json
```

Fail builds on vulnerabilities (default behavior). If you want non-blocking scans (e.g., on main), wrap with || true or use matrix strategies.

#### Configuration

Create .gemguard.yml:

```yaml
lockfile: Gemfile.lock
output:
  format: table # table | json
typosquat:
  similarity_threshold: 0.82
  risk_levels:
    high: 0.9
    medium: 0.85
```

View current config:

```bash
gem_guard config --show
```

### Why GemGuard?

- Minimal setup, zero noise
- Pragmatic defaults, sensible exit codes
- Works offline for typosquat via fallback popular gems
- Well-tested (RSpec), standardrb formatting
- Designed for CI from day 1

### How It Compares

- Bundler Audit: great for advisories; GemGuard adds typosquat + SBOM + auto-fix
- OSV-Scanner: broad ecosystem; GemGuard is Ruby-first with tighter UX and auto-fix
- Trivy/Grype: container focus; GemGuard slots into pure-Ruby pipelines easily

Use GemGuard standalone or alongside your existing stack.

### Roadmap

- Enriched advisories (GHSA/CVE links, CVSS)
- Optional dependency graph visualizations
- Interactive TUI
- More fix strategies and guards

### Contribute / Feedback

- Issues/PRs welcome: add tests, keep it minimal and intention-revealing
- Prefer failing test → minimal fix → refactor
- Security disclosures: see SECURITY.md

### Try It Now

```bash
gem install gem_guard
gem_guard scan
gem_guard typosquat
gem_guard fix --dry-run
```

If this helps you ship safer Ruby apps with less fuss, drop a ❤️ and share!

— Built for Rubyists who like fast feedback, clean CLIs, and reliable automation.

Issues and PRs welcome → [github.com/wilburhimself/gem_guard](https://github.com/wilburhimself/gem_guard)
