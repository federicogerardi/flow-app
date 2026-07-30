---
type: entity
tags:
  - wiki/entity
  - wiki/usage
date_updated: 2026-07-30
source_count: 2
---

# Quota

> Aggregate Root — [[Usage & Quota]] context

## Definition

Tracks credit limits and consumption per user per billing period. Supporting subdomain.

## Structure

- `quotaId: QuotaId`
- `userId: UserId` (reference to [[User]])
- `period: QuotaPeriod` (VO, e.g. `2026-08`)
- `limit: CreditAmount` (VO)
- `consumed: CreditAmount` (VO)
- Contains `CreditTransaction[]` entities

## Domain Service

- **QuotaEnforcer**: `canConsume(quota, amount) → boolean`

## Cross-Context Events

- Consumes `SessionCompleted` from [[Content Generation]] to deduct credits
- Emits `QuotaExceeded` when limit is reached (blocks new generations)

## Sources

- [[doodle/PRD]] — FR-W05 (two-level credits), FR-S05 (quota enforcement)
- [[doodle/USER-STORIES]] — US-W06, US-SC05, US-SC06