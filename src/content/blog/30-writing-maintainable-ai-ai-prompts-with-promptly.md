---
title: "How I Built Promptly: Solving AI Prompt Management at Scale"
date: "2025-08-18"
excerpt: "The moment I realized we had a problem was when our QA engineer asked, 'How do we know if someone accidentally changed how the AI behaves?' We had prompts scattered across a dozen files, each slightly different, with no way to test or version them. It hit me: we were making the same mistakes Rails solved 15 years ago with hardcoded strings. AI prompts aren't just text, they're critical business logic that shapes user experience. So I built Promptly to bring Rails conventions to AI development, treating prompts like the first-class citizens they should be. The result? 60% faster AI feature development and actual regression testing for AI behavior. Sometimes the best solutions aren't about new technology; they're about applying proven patterns to new problems."
---

Earlier this year, I was architecting AI-powered onboarding emails for a Rails application serving thousands of users. What started as a simple `OpenAI.chat(...)` integration quickly revealed a fundamental scaling problem that most teams building AI features will face.

## The Breaking Point

Within two weeks of launch, our AI implementation had become unmaintainable:

**Technical Debt Accumulation:**
- Prompt logic scattered across 12+ controllers and background jobs
- Duplicate prompts with slight variations consuming development cycles
- No version control or testing strategy for AI behavior changes
- Localization requirements (Spanish, Portuguese) breaking existing patterns
- QA unable to regression-test AI output reliability

**The Real Problem:** We were treating AI prompts like throwaway code instead of the critical business logic they actually represent.

## The Architecture Solution

Drawing from Rails' proven conventions, I built [Promptly](https://github.com/wilburhimself/promptly)—a gem that applies MVC patterns to AI prompt management.

**Key Design Decisions:**
- **Template-based architecture** using ERB/Liquid (familiar to Rails developers)
- **Convention over configuration** following Rails directory structures
- **Built-in I18n support** for multi-language AI applications
- **Test-driven development** enabling RSpec assertions on AI output

```ruby
# Before: Scattered prompt logic
OpenAI.chat(messages: [{ role: "system", content: "Hello #{user.name}, welcome..." }])

# After: Structured, maintainable templates
# app/prompts/welcome_email.erb
Hello <%= @user.name %>, welcome to our service!
We're excited to have you join.

# In your service:
render_prompt("welcome_email", user: @user)
```

## Production Impact
### Measurable Improvements:

- **Development velocity:** Reduced AI feature implementation time by ~60%
- **Maintainability:** Centralized 40+ scattered prompts into organized templates
- **Reliability:** Enabled regression testing for AI behavior changes
- **Localization:** Seamless I18n integration across 3 languages
- **Team collaboration:** Non-technical stakeholders can now review/edit prompts

### The Strategic Insight
Most Rails teams are building AI features like it's 2005—hardcoding strings, ignoring maintainability patterns we solved decades ago. But AI prompts aren't just strings; they're critical business logic that determine user experience and product behavior.

Promptly doesn't solve every AI challenge, but it solves the foundational one: making AI prompts as maintainable as the rest of your Rails application.

### Technical Leadership Decision
Rather than building a complex AI orchestration platform, I focused on one specific pain point that every Rails team adopting AI will encounter. The gem intentionally follows Rails conventions developers already understand, reducing adoption friction while providing immediate value.

**Current traction:** Open-sourced with growing adoption in the Rails community, addressing a gap that affects teams at every stage of AI integration.

### Next Steps
Future development priorities based on production feedback:

- Prompt versioning and rollback capabilities
- Enhanced testing utilities for AI behavior validation
- Integration with semantic search and vector databases

---

Try Promptly if you're building AI features in Rails. It's designed to prevent prompt technical debt before it starts.

Interested in discussing AI architecture patterns or Rails scaling challenges? Connect with me on [LinkedIn](https://linkedin.com/in/wilbursuero).
