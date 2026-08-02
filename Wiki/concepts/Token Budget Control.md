---
type: concept
tags:
  - wiki/concept
  - wiki/llm
  - wiki/cost-control
date_updated: 2026-08-02
source_count: 3
confidence: high
---

# Token Budget Control

Controls per-session and per-conversation token consumption to prevent run-away LLM costs. Enforces hard caps with warning thresholds.

## Design

- `TOKEN_BUDGET_MAX_TOTAL` — hard cap on total tokens per entity (default: 100K)
- `TOKEN_BUDGET_WARNING_THRESHOLD` — percentage of cap that triggers a warning (default: 80%)
- Budgets are enforced at the application layer before each LLM call
- Exceeding the hard cap stops generation and returns a controlled error

## Referenced By

- [[implementation-roadmap-2026-08-01]] — Phase 6 task 4
- [[LLM Gateway - OpenRouter]] — gateway integration point

## Sources

- [[API Contract Baseline v1]]
- [[LLM Gateway - OpenRouter]]
- [[implementation-roadmap-2026-08-01]]
