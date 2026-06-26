---
title: "Lessons from Leading a Production Incident (Triage under Pressure)"
date: "June 20, 2026"
tags: [leadership, operations, observability, resilience]
excerpt: "When the database CPU spikes to 99% or your background job queue has a backlog of 200,000 tasks, your engineering skills are only half the battle. Leadership during an incident is about command, communication, and systematic triage. Here is what I've learned from managing production fires."
---

When the database CPU spikes to 99%, or your background job queue accumulates a backlog of 200,000 tasks, your raw coding skills are only half the battle. 

Under the pressure of an outage, standard developer behavior defaults to panic. People start changing configurations randomly, running queries that degrade performance further, or arguing about root causes in Slack.

Leading a team through a critical incident requires a distinct operating model. Here is the framework I use to restore service quickly, keep stakeholders aligned, and prevent the same fire from rekindling.

---

## 1. Establish an Incident Commander (IC)

The single biggest mistake during an outage is having a headless team. Five engineers trying to solve the problem in five different directions will actively step on each other's toes.

- **The Commander Role:** The Incident Commander does not write code or run queries. Their job is coordination. They assign specific tasks, track timelines, and manage communication.
- **Clear Delegation:** Assign one engineer to inspect the database logs, one to look at the application server APM, and one to draft the customer-facing status updates.
- **Silence the Noise:** Keep the main incident channel clear. Technical exploration should happen in a separate sub-thread or zoom room, with findings reported back to the IC.

---

## 2. Triage: Stop the Bleeding Before Finding the Cause

In medicine, you stop the bleeding before diagnosing the chronic illness. In software engineering, you mitigate the impact before debugging the stack trace.

- **Mitigation Actions:** 
  - If a bad release caused the issue, rollback immediately. Do not try to "hotfix forward" unless a rollback is physically impossible.
  - If traffic is overwhelming the system, activate rate limiters, degrade non-critical services (e.g., turn off search autocompletion or non-essential API endpoints), or scale up web dynos/instances.
  - If a background worker queue is clogged, pause the queue, route low-priority jobs to a temporary backlog, and focus resources on processing high-priority transactions.

---

## 3. Communication: Keep Stakeholders Informed

Product managers, account executives, and executives are anxious during an outage because they are in the dark. If you don't communicate, they will constantly interrupt the engineering team asking for updates.

- **The Heartbeat Rule:** Post a status update every 15 to 30 minutes, even if there is no new technical progress. A simple *"We are currently investigating a database connection pool exhaustion; next update in 20 minutes"* is enough to build trust and protect the engineering team's focus.
- **Keep it Simple:** Translate technical details into business impact. Explain *who* is affected and *what* is degraded.

---

## 4. The Blameless Post-Mortem

Once the system is stable, the incident isn't over. You must hold a post-mortem within 48 hours while details are fresh.

- **Focus on the System, Not the Person:** The goal is never to find who made the mistake. The goal is to ask: *Why did the system allow a single person to take down production?*
- **Actionable Corrective Items:** Every post-mortem must result in concrete, prioritized tickets:
  - *"Add database CPU alarms at 80%."*
  - *"Implement query timeouts on the report-generation service."*
  - *"Automate release checks to verify migration indexes."*
