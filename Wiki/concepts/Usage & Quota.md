---
type: concept
tags:
  - wiki/concept
  - wiki/usage
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# Usage & Quota

> Supporting Bounded Context — `packages/domain/src/usage/`

## Responsibility

Track and enforce credit consumption per user per billing period. Supporting subdomain — important for business operations but not a core differentiator.

## Aggregate Root

**[[Quota]]** — credit limit and consumption tracking for a user in a billing period.

## Key Concepts

- **Two-level credits**: artifact gate (anti-abuse, invisible to user) + credit consumption only on final step
- **QuotaEnforcer** domain service: checks `remaining >= amount` before allowing generation
- Consumes `SessionCompleted` domain events from [[Content Generation]]
- Emits `QuotaExceeded` when limit reached

## Sources

- [[doodle/PRD]] — FR-W05, FR-S05
- [[doodle/USER-STORIES]] — US-W06, US-SC05, US-SC06