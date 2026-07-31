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

Track and enforce two independent consumption limits per user per billing period:

| Track | What it counts | Limit (free) | Visibility | Block |
|---------|-----------|---------------|------------|--------|
| **Artifact Gate** | Every `Artifact` created | 1000/month | Invisible | Blocks ALL generations |
| **Credit Quota** | Every `Session` completed | 250/month | Visible (counter UI) | Blocks submit with message |

The two tracks are independent. The gate is exclusively anti-abuse. Credits are the user-facing mechanism.

## Aggregate Root

**[[Quota]]** — per-user, per-period. Contains `CreditTransaction[]` entities.

## Key Concepts

### Artifact Gate

- Counts every `Artifact` created (not every `Session`)
- Hard limit: 1000/month for the free plan
- Invisible to the user — silent until triggered
- If exceeded: all generations blocked, admin alert
- Automatic reset on the first of the month
- **Not purchasable, not extendable**

### Credit Quota

- Counts every completed `Session`
- Per-tool cost configurable in [[Tool as Static Configuration|ToolDefinition.creditCost]] (default: 1)
- 250 credits/month for the free plan
- Visible to the user: counter in UI, usage percentage
- If exhausted: submit blocked with message "Credits exhausted. They reset on [date]"
- Automatic reset on the first of the month
- **Future**: purchasable, higher plans (pro, enterprise) with more credits

## Plan System

| Plan | Artifact Gate | Credit Limit | Features |
|------|--------------|-------------|----------|
| `free` | 1000/month | 250/month | Basic tools |
| `pro` (future) | 5000/month | 1000/month | + Priority queue, PDF export |
| `enterprise` (future) | ∞ | 5000/month | + Custom models, SSO, API access |

The plan is a `Plan` Value Object associated with the `User`. It determines the default limits. Plan upgrade does not reset consumed counters — only the monthly reset does.

## Consumption Flow

```
Session.complete()
  │
  ▼
ConsumeCreditsUseCase (SessionCompleted handler)
  │
  ├── 1. Load tool → creditCost = tool.creditCost ?? 1
  │
  ├── 2. Artifact Gate check:
  │     quota.canCreateArtifact()?
  │       NO  → ArtifactGateExceeded (blocks everything)
  │       YES → quota.consumeArtifact() (for each artifact in the session)
  │
  └── 3. Credit check:
        quota.canConsumeCredits(creditCost)?
          NO  → QuotaExceeded (blocks submit)
          YES → quota.consumeCredits(creditCost, sessionId)
                  └── CreditConsumed event → UI counter update
```

## Domain Services

- **QuotaEnforcer**: `canConsumeCredits(quota, amount) → boolean`

## Repository Interface

```typescript
interface QuotaRepository {
  findByUserAndPeriod(userId: UserId, period: QuotaPeriod): Promise<Quota | null>;
  save(quota: Quota): Promise<void>;
}
```

## Sources

- [[sources/PRD]] — FR-W05 (two-level credits), FR-S05
- [[sources/USER-STORIES]] — US-W06, US-SC05, US-SC06