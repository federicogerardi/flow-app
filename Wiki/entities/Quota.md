---
type: entity
tags:
  - wiki/entity
  - wiki/usage
date_updated: 2026-07-31
source_count: 2
---

# Quota

> Aggregate Root — [[Usage & Quota]] context

## Definition

`Quota` tracks two independent consumption limits per user per billing period:

| Track | Scope | Limit | Purpose | Visible |
|-------|-------|-------|---------|---------|
| **Artifact Gate** | Per Artifact | 1000/month | Invisible anti-abuse | No |
| **Credit Quota** | Per Session | 250/month (free plan) | User consumption | Yes |

I due binari operano indipendentemente: superare il gate blocca TUTTE le generazioni (abuse detection). Esaurire i crediti blocca le generazioni ma l'utente vede quanti crediti ha e quando si resettano.

> **Type-design audit (2026-07-31)**: Fixed `plan` from `readonly` to `private _plan` with getter — `upgradePlan()` needs to mutate it. Added `ReadonlyArray<CreditTransaction>` exposure to prevent external mutation of the transaction log. Added positive-value guard to `addCredits()`. Internal counters (`_artifactLimit`, `_artifactCount`, `_creditLimit`, `_creditConsumed`) remain raw `number` — consider upgrading to `CreditAmount` VO for compile-time non-negative guarantee.

## Structure

```typescript
class Quota {
  constructor(
    readonly quotaId: QuotaId,
    readonly userId: UserId,
    readonly period: QuotaPeriod,       // YYYY-MM
    private _plan: Plan,                // ✅ private with getter (was readonly — fixed 2026-07-31)

    // Artifact gate (anti-abuse, invisible)
    private _artifactLimit: number,     // 1000
    private _artifactCount: number,     // consumed this period

    // Credit quota (user-facing)
    private _creditLimit: number,       // 250 for free plan
    private _creditConsumed: number,    // consumed this period

    private _transactions: CreditTransaction[],
  ) {}
}
```

## Plan

```typescript
// packages/domain/src/usage/value-objects/Plan.ts

type PlanType = 'free';

interface PlanConfig {
  type: PlanType;
  artifactLimit: number;
  creditLimit: number;
  features: string[];
}

const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    type: 'free',
    artifactLimit: 1000,
    creditLimit: 250,
    features: ['basic_tools'],
  },
  // future:
  // pro: {
  //   type: 'pro',
  //   artifactLimit: 5000,
  //   creditLimit: 1000,
  //   features: ['basic_tools', 'priority_queue', 'export_pdf'],
  // },
};

class Plan {
  private constructor(private readonly config: PlanConfig) {}

  static free(): Plan { return new Plan(PLANS.free); }

  get artifactLimit(): number { return this.config.artifactLimit; }
  get creditLimit(): number { return this.config.creditLimit; }
  get type(): PlanType { return this.config.type; }
}
```

## Methods

```typescript
class Quota {
  // Artifact gate
  canCreateArtifact(): boolean {
    return this._artifactCount < this._artifactLimit;
  }

  consumeArtifact(): void {
    if (!this.canCreateArtifact()) {
      throw new ArtifactGateExceededError(this._artifactLimit, this._artifactCount);
    }
    this._artifactCount++;
  }

  // Credit quota
  canConsumeCredits(amount: number): boolean {
    return this._creditConsumed + amount <= this._creditLimit;
  }

  consumeCredits(amount: number, sessionId: SessionId): CreditConsumed {
    if (!this.canConsumeCredits(amount)) {
      throw new QuotaExceededError(this._creditLimit, this._creditConsumed + amount);
    }
    this._creditConsumed += amount;

    const transaction = new CreditTransaction(
      CreditTransactionId.generate(),
      amount,
      TransactionReason.Generation,
      sessionId,
    );
    this._transactions.push(transaction);

    // Check if quota is now exhausted
    if (this._creditConsumed >= this._creditLimit) {
      return new CreditConsumed(this.userId, amount, sessionId, this.remainingCredits);
      // Also publishes QuotaExceeded if remainingCredits === 0
    }

    return new CreditConsumed(this.userId, amount, sessionId, this.remainingCredits);
  }

  // Future: add credits (purchased or admin granted)
  addCredits(amount: CreditAmount, reason: TransactionReason): void {
    if (amount <= 0) throw new ValidationError('Credit amount must be positive');
    this._creditLimit += amount;
    this._transactions.push(
      new CreditTransaction(CreditTransactionId.generate(), amount, reason)
    );
  }

  // Future: plan upgrade
  upgradePlan(newPlan: Plan): void {
    this._plan = newPlan;
    this._creditLimit = newPlan.creditLimit;
    this._artifactLimit = newPlan.artifactLimit;
    // Note: consumed counters do NOT reset on upgrade — only on period reset
  }

  // Queries
  get plan(): Plan { return this._plan; }
  get transactions(): ReadonlyArray<CreditTransaction> { return this._transactions; }
  get remainingCredits(): number {
    return Math.max(0, this._creditLimit - this._creditConsumed);
  }

  get remainingArtifacts(): number {
    return Math.max(0, this._artifactLimit - this._artifactCount);
  }

  get creditUsagePercent(): number {
    return Math.round((this._creditConsumed / this._creditLimit) * 100);
  }
}
```

## Monthly Reset

At the start of each month, the system creates a new `Quota` for the new period:

```typescript
// Called on first access of the month (or by cron)
async function ensureQuotaForPeriod(userId: UserId, period: QuotaPeriod): Promise<Quota> {
  const existing = await quotaRepo.findByUserAndPeriod(userId, period);
  if (existing) return existing;

  const user = await userRepo.findById(userId);
  const plan = user.plan ?? Plan.free();

  const quota = Quota.create(userId, period, plan);
  await quotaRepo.save(quota);

  return quota;
}
```

**Reset policy**: no rollover. Unused credits do NOT carry to the next month. Artifact gate counter always resets to 0.

## Future: Credit Top-ups

```typescript
// Future endpoint: POST /api/credits/purchase
class PurchaseCreditsUseCase {
  async execute(cmd: PurchaseCreditsCommand): Promise<void> {
    const quota = await quotaRepo.findCurrent(cmd.userId);

    // Process payment (Stripe, etc.)
    const payment = await paymentGateway.charge(cmd.amount, cmd.paymentMethod);

    // Add credits to current period
    quota.addCredits(payment.credits, TransactionReason.Purchase);

    await quotaRepo.save(quota);

    eventBus.publish(new CreditsPurchased(cmd.userId, payment.credits));
  }
}
```

## Value Objects

| VO | Description |
|----|-------------|
| `QuotaId` | Unique identifier |
| `QuotaPeriod` | `YYYY-MM` string |
| `CreditAmount` | int ≥ 0 |
| `TransactionReason` | `generation`, `admin_grant`, `purchase` (future), `plan_upgrade` (future) |
| `PlanType` | `free` (future: `pro`, `enterprise`) |

## Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `CreditConsumed` | `quota.consumeCredits()` | UI (counter update), Audit trail |
| `QuotaExceeded` | Credits exhausted | UI (block submit), Notification |
| `ArtifactGateExceeded` | Artifact gate exceeded | UI (block all generation), Admin alert |
| `CreditsPurchased` (future) | Payment completed | UI, Audit |

## Repository Interface

```typescript
interface QuotaRepository {
  findByUserAndPeriod(userId: UserId, period: QuotaPeriod): Promise<Quota | null>;
  findCurrent(userId: UserId): Promise<Quota>;             // current month
  save(quota: Quota): Promise<void>;
}
```

## Sources

- [[sources/PRD]] — FR-W05 (two-level credits), FR-S05 (quota enforcement)
- [[sources/USER-STORIES]] — US-W06, US-SC05, US-SC06
