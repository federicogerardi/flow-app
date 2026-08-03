---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/implementation
  - wiki/usage
date_updated: 2026-08-04
phase: usage-quota
status: in_progress
source_count: 9
---

# Usage & Quota — Domain Implementation Plan

> Implements the [[Usage & Quota]] bounded context: aggregate root, child entity, value objects, repository, and monorepo wiring. DB migration (005) already exists.

## Objective

Convert the [[Usage & Quota]] bounded context from wiki-only design into runnable domain code. The DB migration (`005_quotas.sql`) creates `quotas` and `credit_transactions` tables. The `ErrorMapper` already maps `QUOTA_EXCEEDED → 429`. Zero domain code exists — `packages/domain/src/usage/` is missing entirely. This phase creates 10 new files and modifies 7 existing files.

## Design Authority

The canonical design lives in:
- [[Usage & Quota]] — bounded context description, consumption flow, plan system
- [[Quota]] — aggregate root structure, methods, events, repository interface
- [[Error Mapping (Domain to HTTP)]] — `QUOTA_EXCEEDED → 429` already mapped

Two intentional deviations from the wiki Quota entity page:

| Deviation | Wiki | Plan | Rationale |
|-----------|------|------|-----------|
| `saveWithLock()` | Not in wiki interface | Added to `QuotaRepository` | Concurrent credit consumption from parallel session completions requires optimistic locking. Pattern already used by `SessionRepository` and `WorkspaceRepository`. |
| `findCurrent()` return type | `Promise<Quota>` (non-null) | `Promise<Quota \| null>` | Repository finds, it doesn't create. Creation (`Quota.create()`) is a use case responsibility (`ensureQuotaUseCase`, future wiring). |

## Requirements

Two-track enforcement per user per billing period (`YYYY-MM`):

| Track | Limit (free) | Visible | Behavior when exceeded |
|-------|-------------|---------|----------------------|
| **Artifact Gate** | 1000/month | No (invisible) | Blocks ALL generations. Admin alert. |
| **Credit Quota** | 250/month | Yes (counter UI) | Blocks submit with message "Crediti esauriti. Si resettano il [date]." |

- Credit cost per tool: `tool.creditCost ?? 1` (from [[Tool as Static Configuration]])
- No rollover: unused credits do NOT carry to the next month
- Plan upgrade does NOT reset consumed counters — only the monthly reset does

## Architecture Changes

| Change | File | Description |
|--------|------|-------------|
| New bounded context | `packages/domain/src/usage/` | 9 new files: aggregate, entity, 4 VOs, errors, events, barrel |
| Wire domain exports | `packages/domain/src/index.ts` | Add `export * from './usage'` |
| Kysely types | `packages/infra-db/src/types.ts` | Add `QuotasTable`, `CreditTransactionsTable`, register in `DB` |
| New repository | `packages/infra-db/src/repositories/quota-repository.ts` | `KyselyQuotaRepository` |
| Wire infra exports | `packages/infra-db/src/index.ts` | Export `KyselyQuotaRepository` |
| Error mapper | `apps/backend/src/infrastructure/error-handler.ts` | Add `ARTIFACT_GATE_EXCEEDED` → 429 |
| App wiring | `apps/backend/src/server.ts` + `apps/backend/src/app.ts` | Instantiate repo, add to `AppDeps` |

## Implementation Steps

### Phase A — Domain: Value Objects (3 files)

**1. `Plan.ts`** — `PlanType` + `Plan` + `CreditAmount`
```typescript
// packages/domain/src/usage/value-objects/Plan.ts

// PlanType: currently 'free' only. 'pro' and 'enterprise' are future additions.
export class PlanType {
  private constructor(private readonly _value: 'free') {}
  static readonly Free = new PlanType('free');
  static from(value: string): PlanType { /* switch, throws InvalidPlanTypeError */ }
  equals(other: PlanType): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
}

// Plan config registry
const PLANS: Record<string, PlanConfig> = {
  free: { type: 'free', artifactLimit: 1000, creditLimit: 250, features: ['basic_tools'] },
};

// Plan: derives limits from PlanType
export class Plan {
  private constructor(private readonly config: PlanConfig) {}
  static free(): Plan { return new Plan(PLANS.free); }
  static fromType(type: PlanType): Plan { /* lookup PLANS[type.toString()] */ }
  get artifactLimit(): number { return this.config.artifactLimit; }
  get creditLimit(): number { return this.config.creditLimit; }
  get type(): PlanType { return PlanType.from(this.config.type); }
}

// CreditAmount: non-negative integer
export class CreditAmount {
  private constructor(private readonly _value: number) {}
  static from(value: number): CreditAmount { /* validates ≥ 0, throws InvalidCreditAmountError */ }
  equals(other: CreditAmount): boolean { return this._value === other._value; }
  toValue(): number { return this._value; }
}
```
- Dependencies: None
- Risk: Low
- DDD: Rule 4 — all three are class VOs with `private constructor`, `static from()`, `equals()`

**2. `QuotaPeriod.ts`**
```typescript
// packages/domain/src/usage/value-objects/QuotaPeriod.ts
export class QuotaPeriod {
  private constructor(private readonly _value: string) {}
  static from(value: string): QuotaPeriod { /* validates YYYY-MM regex, throws InvalidQuotaPeriodError */ }
  static current(): QuotaPeriod { /* new Date() → YYYY-MM */ }
  equals(other: QuotaPeriod): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
}
```
- Dependencies: None
- Risk: Low

**3. `TransactionReason.ts`**
```typescript
// packages/domain/src/usage/value-objects/TransactionReason.ts
// Maps to PostgreSQL enum: transaction_reason
export class TransactionReason {
  private constructor(private readonly _value: 'generation' | 'admin_grant' | 'purchase' | 'plan_upgrade') {}
  static readonly Generation = new TransactionReason('generation');
  static readonly AdminGrant = new TransactionReason('admin_grant');
  static readonly Purchase = new TransactionReason('purchase');
  static readonly PlanUpgrade = new TransactionReason('plan_upgrade');
  static from(value: string): TransactionReason { /* switch, throws InvalidTransactionReasonError */ }
  equals(other: TransactionReason): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): string { return this._value; }
}
```
- Dependencies: None
- Risk: Low

### Phase B — Domain: Child Entity (1 file)

**4. `CreditTransaction.ts`**
```typescript
// packages/domain/src/usage/entities/CreditTransaction.ts
export class CreditTransaction {
  private constructor(
    readonly id: string,
    readonly quotaId: string,
    readonly amount: number,
    readonly reason: TransactionReason,
    readonly sessionId: string | null,
    readonly createdAt: Date,
  ) {}

  static create(quotaId: string, amount: number, reason: TransactionReason, sessionId?: string): CreditTransaction {
    return new CreditTransaction(randomUUID(), quotaId, amount, reason, sessionId ?? null, new Date());
  }

  static reconstitute(id: string, quotaId: string, amount: number, reason: TransactionReason, sessionId: string | null, createdAt: Date): CreditTransaction {
    return new CreditTransaction(id, quotaId, amount, reason, sessionId, createdAt);
  }
}
```
- Dependencies: Step 3 (TransactionReason)
- Risk: Low
- DDD: Rule 6 — `create()` for new, `reconstitute()` for DB hydration

### Phase C — Domain: Aggregate Root (1 file)

**5. `Quota.ts`**
```typescript
// packages/domain/src/usage/entities/Quota.ts
export class Quota {
  private _transactions: CreditTransaction[];
  private _version: number;

  private constructor(
    readonly quotaId: string,
    readonly userId: string,
    readonly period: QuotaPeriod,
    private _plan: Plan,
    private _artifactLimit: number,
    private _artifactCount: number,
    private _creditLimit: number,
    private _creditConsumed: number,
    readonly createdAt: Date,
    version: number,
    transactions: CreditTransaction[],
  ) {
    this._version = version;
    this._transactions = transactions;
  }

  static create(userId: string, period: QuotaPeriod, plan: Plan): Quota {
    return new Quota(randomUUID(), userId, period, plan, plan.artifactLimit, 0, plan.creditLimit, 0, new Date(), 1, []);
  }

  static reconstitute(/* all fields verbatim from DB */): Quota { /* pass-through */ }

  // --- Artifact Gate ---
  canCreateArtifact(): boolean { return this._artifactCount < this._artifactLimit; }

  consumeArtifact(): void {
    if (!this.canCreateArtifact()) {
      throw new ArtifactGateExceededError(this._artifactLimit, this._artifactCount);
    }
    this._artifactCount++;
  }

  // --- Credit Quota ---
  canConsumeCredits(amount: number): boolean {
    return this._creditConsumed + amount <= this._creditLimit;
  }

  consumeCredits(amount: number, sessionId: string): DomainEvent {
    if (!this.canConsumeCredits(amount)) {
      throw new QuotaExceededError(this._creditLimit, this._creditConsumed + amount);
    }
    this._creditConsumed += amount;
    const transaction = CreditTransaction.create(this.quotaId, amount, TransactionReason.Generation, sessionId);
    this._transactions.push(transaction);
    this._version++;
    return {
      eventType: 'CreditConsumed',
      occurredAt: new Date(),
      aggregateId: this.quotaId,
      userId: this.userId,
      amount,
      sessionId,
      remainingCredits: this.remainingCredits,
    };
  }

  // --- Future ---
  addCredits(amount: CreditAmount, reason: TransactionReason): void {
    if (amount.toValue() <= 0) throw new InvalidCreditAmountError('Credit amount must be positive');
    this._creditLimit += amount.toValue();
    const transaction = CreditTransaction.create(this.quotaId, amount.toValue(), reason);
    this._transactions.push(transaction);
    this._version++;
  }

  upgradePlan(newPlan: Plan): void {
    this._plan = newPlan;
    this._creditLimit = newPlan.creditLimit;
    this._artifactLimit = newPlan.artifactLimit;
    this._version++;
  }

  // --- Queries ---
  get plan(): Plan { return this._plan; }
  get transactions(): ReadonlyArray<CreditTransaction> { return this._transactions; }
  get remainingCredits(): number { return Math.max(0, this._creditLimit - this._creditConsumed); }
  get remainingArtifacts(): number { return Math.max(0, this._artifactLimit - this._artifactCount); }
  get creditUsagePercent(): number { return Math.round((this._creditConsumed / this._creditLimit) * 100); }
  get artifactCount(): number { return this._artifactCount; }
  get creditConsumed(): number { return this._creditConsumed; }
  get version(): number { return this._version; }
}
```
- Dependencies: Steps 1–4 (all VOs + CreditTransaction)
- Risk: Medium — concurrent `consumeCredits()` from parallel session completions can exceed limit. Mitigation: `saveWithLock()` with optimistic locking in the repository.
- DDD: Rule 7 — canonical aggregate template (`private constructor`, `_version`, `ReadonlyArray`, business methods return `DomainEvent`)

### Phase D — Domain: Errors (1 file)

**6. `errors.ts`**
```typescript
// packages/domain/src/usage/errors.ts
export class QuotaExceededError extends DomainError {
  readonly code = 'QUOTA_EXCEEDED';
  readonly retryable = false;
  constructor(limit: number, attempted: number) {
    super(`Credit quota exceeded: limit ${limit}, attempted ${attempted}`);
  }
}

export class ArtifactGateExceededError extends DomainError {
  readonly code = 'ARTIFACT_GATE_EXCEEDED';
  readonly retryable = false;
  constructor(limit: number, current: number) {
    super(`Artifact gate exceeded: limit ${limit}, current ${current}`);
  }
}

export class QuotaNotFoundError extends DomainError {
  readonly code = 'QUOTA_NOT_FOUND';
  readonly retryable = false;
  constructor(userId: string, period: string) {
    super(`Quota not found for user ${userId} in period ${period}`);
  }
}
```
- `QUOTA_EXCEEDED` already mapped to 429 in `ErrorMapper`. `ARTIFACT_GATE_EXCEEDED` needs wiring.
- Dependencies: None
- Risk: Low

### Phase E — Domain: Events (1 file)

**7. `domain-events/index.ts`**
```typescript
// packages/domain/src/usage/domain-events/index.ts
export interface CreditConsumedEvent extends DomainEvent {
  eventType: 'CreditConsumed';
  aggregateId: string;
  userId: string;
  amount: number;
  sessionId: string;
  remainingCredits: number;
}

export interface QuotaExceededEvent extends DomainEvent {
  eventType: 'QuotaExceeded';
  aggregateId: string;
  userId: string;
  limit: number;
  attempted: number;
}

export interface ArtifactGateExceededEvent extends DomainEvent {
  eventType: 'ArtifactGateExceeded';
  aggregateId: string;
  userId: string;
  artifactLimit: number;
  artifactCount: number;
}
```
- Pattern: interface-based events matching [[Workspace]] style (not class-based like [[Session]] events). Simpler, zero runtime overhead.
- Dependencies: None
- Risk: Low

### Phase F — Domain: Barrel Export + Wiring (2 files)

**8. `index.ts`** (`packages/domain/src/usage/index.ts`)
```typescript
export { Quota } from './entities/Quota';
export { CreditTransaction } from './entities/CreditTransaction';
export { Plan, PlanType, CreditAmount, InvalidPlanTypeError, InvalidCreditAmountError } from './value-objects/Plan';
export type { PlanTypeValue } from './value-objects/Plan';
export { QuotaPeriod, InvalidQuotaPeriodError } from './value-objects/QuotaPeriod';
export { TransactionReason, InvalidTransactionReasonError } from './value-objects/TransactionReason';
export type { QuotaRepository } from './repositories/QuotaRepository';
export { QuotaExceededError, ArtifactGateExceededError, QuotaNotFoundError } from './errors';
export type { CreditConsumedEvent, QuotaExceededEvent, ArtifactGateExceededEvent } from './domain-events';
```
- Pattern: follows `packages/domain/src/workspace/index.ts` structure exactly

**9. Wire into `packages/domain/src/index.ts`**
- Add `export * from './usage';` after `export * from './identity';`
- Dependencies: Step 8
- Risk: Low — Usage has zero imports from other bounded contexts (no circular dependency possible)

### Phase G — Database Types (1 file)

**10. Kysely table types** (`packages/infra-db/src/types.ts`)
```typescript
export type TransactionReason = 'generation' | 'admin_grant' | 'purchase' | 'plan_upgrade';

export interface QuotasTable {
  id: string;
  user_id: string;
  period: string;
  plan_type: Generated<string>;
  artifact_limit: number;
  artifact_count: Generated<number>;
  credit_limit: number;
  credit_consumed: Generated<number>;
  created_at: Generated<Date>;
}

export interface CreditTransactionsTable {
  id: string;
  quota_id: string;
  amount: number;
  reason: TransactionReason;
  session_id: string | null;
  created_at: Generated<Date>;
}

// Add to DB interface:
export interface DB {
  // ... existing tables
  quotas: QuotasTable;
  credit_transactions: CreditTransactionsTable;
}
```
- Migration `005_quotas.sql` already exists — these types match the table shapes exactly
- Dependencies: None
- Risk: Low

### Phase H — Domain: Repository Interface (1 file)

**11. `QuotaRepository`** (`packages/domain/src/usage/repositories/QuotaRepository.ts`)
```typescript
import type { Quota } from '../entities/Quota';

export interface QuotaRepository {
  findByUserAndPeriod(userId: string, period: string): Promise<Quota | null>;
  findCurrent(userId: string): Promise<Quota | null>;
  save(quota: Quota): Promise<void>;
  saveWithLock(quota: Quota, expectedVersion: number): Promise<void>;
}
```
- `findCurrent()` returns `null` if no quota exists for current month — creation is a use case responsibility
- `saveWithLock()` for optimistic locking on concurrent credit consumption (not in original wiki design — added for safety)
- Dependencies: Step 5 (Quota type)
- Risk: Low

### Phase I — Infrastructure: Kysely Repository (1 file)

**12. `KyselyQuotaRepository`** (`packages/infra-db/src/repositories/quota-repository.ts`)

Implements `QuotaRepository` following the exact pattern of `KyselyWorkspaceRepository`:
- `findByUserAndPeriod()`: SELECT from `quotas` + `credit_transactions`, maps snake_case → camelCase, calls `Quota.reconstitute()`
- `findCurrent()`: delegates to `findByUserAndPeriod(userId, QuotaPeriod.current().toString())`
- `save()`: INSERT ON CONFLICT (user_id, period) DO UPDATE on `quotas`, then upsert `credit_transactions` (INSERT ON CONFLICT (id) DO NOTHING — transactions are append-only)
- `saveWithLock()`: wraps in `db.transaction()`, UPDATE `quotas` with `WHERE version = expectedVersion`, throws `ConcurrencyError` if `numUpdatedRows === 0n`
- Private helper `syncTransactions()` for batch upsert (matching `syncMemberships()` pattern)
- Dependencies: Steps 5, 10, 11
- Risk: Medium — DB integration must handle `ON CONFLICT` correctly. `credit_transactions` uses `ON CONFLICT (id) DO NOTHING` since transactions are insert-only.
- DDD: Rule 5 — `save()` persists only the aggregate root table + owned entity table

**13. Wire into `packages/infra-db/src/index.ts`**
- Add `export { KyselyQuotaRepository } from './repositories/quota-repository';`
- Dependencies: Step 12
- Risk: Low

### Phase J — Backend Wiring (3 files)

**14. ErrorMapper** (`apps/backend/src/infrastructure/error-handler.ts`)
```typescript
case 'ARTIFACT_GATE_EXCEEDED':
case 'QUOTA_EXCEEDED':
  return 429;
```
- `QUOTA_EXCEEDED` already exists at line 36; `ARTIFACT_GATE_EXCEEDED` is new
- Dependencies: None
- Risk: Low

**15. Add `quotaRepo` to `AppDeps`** (`apps/backend/src/app.ts`)
```typescript
import type { QuotaRepository } from '@flow-app/domain';
export interface AppDeps {
  // ... existing deps
  quotaRepo: QuotaRepository;
}
```
- Dependencies: Step 11
- Risk: Low

**16. Instantiate in `server.ts`** (`apps/backend/src/server.ts`)
```typescript
import { KyselyQuotaRepository } from '@flow-app/infra-db';

const quotaRepo = new KyselyQuotaRepository(db);

const app = createApp({
  // ... existing deps
  quotaRepo,
});
```
- Dependencies: Steps 12, 15
- Risk: Low

### Phase K — Wiki Alignment (2 files)

**17. Update `overview.md`**

Three changes:
1. Move Phase 11 from "Planned (Phase 11–12)" to Completed table
2. Update "Critical Gaps (remaining)" — remove "Near-zero tests" (no longer true), add Usage & Quota gap
3. Update Usage & Quota row in the bounded contexts table: `🔴 Planned` → `🟡 In Progress` (domain done, wiring pending)

**18. Update `Wiki/index.md`** (optional — if entity/concept pages were created or modified)

## Files Summary

### New Files (13)

| # | File | Type |
|---|------|------|
| 1 | `packages/domain/src/usage/value-objects/Plan.ts` | VO × 3 |
| 2 | `packages/domain/src/usage/value-objects/QuotaPeriod.ts` | VO |
| 3 | `packages/domain/src/usage/value-objects/TransactionReason.ts` | VO |
| 4 | `packages/domain/src/usage/entities/CreditTransaction.ts` | Child Entity |
| 5 | `packages/domain/src/usage/entities/Quota.ts` | Aggregate Root |
| 6 | `packages/domain/src/usage/errors.ts` | Error classes |
| 7 | `packages/domain/src/usage/domain-events/index.ts` | Event interfaces |
| 8 | `packages/domain/src/usage/repositories/QuotaRepository.ts` | Repository interface |
| 9 | `packages/domain/src/usage/index.ts` | Barrel export |
| 10 | `packages/infra-db/src/repositories/quota-repository.ts` | Kysely impl |
| 11 | `packages/domain/src/usage/__tests__/Plan.test.ts` | Domain test |
| 12 | `packages/domain/src/usage/__tests__/QuotaPeriod.test.ts` | Domain test |
| 13 | `packages/domain/src/usage/__tests__/Quota.test.ts` | Domain test |

### Modified Files (7)

| # | File | Change |
|---|------|--------|
| 14 | `Wiki/overview.md` | Phase 11 → Completed, gaps update |
| 15 | `packages/domain/src/index.ts` | + `export * from './usage'` |
| 16 | `packages/infra-db/src/types.ts` | + `QuotasTable`, `CreditTransactionsTable` |
| 17 | `packages/infra-db/src/index.ts` | + `KyselyQuotaRepository` export |
| 18 | `apps/backend/src/infrastructure/error-handler.ts` | + `ARTIFACT_GATE_EXCEEDED` → 429 |
| 19 | `apps/backend/src/app.ts` | + `quotaRepo` to `AppDeps` |
| 20 | `apps/backend/src/server.ts` | + `KyselyQuotaRepository` instantiation |

## DDD Compliance Checklist

| Rule | Requirement | Status |
|------|-----------|--------|
| Rule 1 | No `as any` to access private fields | ✅ All mutations via named methods on Quota |
| Rule 3 | All errors extend `DomainError` | ✅ QuotaExceededError, ArtifactGateExceededError, QuotaNotFoundError |
| Rule 4 | Constrained VOs are classes | ✅ PlanType (1 value), Plan, QuotaPeriod, TransactionReason (4 values), CreditAmount (non-negative) |
| Rule 5 | `save()` persists only aggregate root + owned entities | ✅ QuotasTable + CreditTransactionsTable only |
| Rule 6 | `create()` / `reconstitute()` factories | ✅ Quota.create() / Quota.reconstitute(); CreditTransaction.create() / CreditTransaction.reconstitute() |
| Rule 7 | Canonical aggregate template | ✅ `private constructor`, `_version`, `ReadonlyArray`, `DomainEvent` return type |

## Out of Scope (Follow-up Phases)

These are intentionally excluded from this phase to keep the plan focused on domain + persistence:

| Item | Why Excluded | Future Phase |
|------|-------------|-------------|
| `EnsureQuotaUseCase` (create quota on first access) | Needs `UserRepository` integration | Quota wiring phase |
| `ConsumeCreditsUseCase` (SessionCompleted handler) | Needs `SessionCompleted` event subscription | Quota wiring phase |
| API routes (`GET /api/usage`, `GET /api/usage/credits`) | Not needed until Frontend quota UI is built | Quota wiring phase |
| `CreditConsumed` event publishing to EventBridge | Needs `JobEventBridge` dependency | Quota wiring phase |
| Frontend quota counter UI | Separate frontend task | Frontend quota phase |

## Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Concurrent `consumeCredits()` from parallel session completions exceeds limit | Medium | Data corruption | `saveWithLock()` with optimistic locking on `_version`. Retry loop in future `ConsumeCreditsUseCase`. |
| R2 | `saveWithLock()` on quotas has no consumer yet (no use case calls it) | Low | Dead code | Acceptable — wiring comes in follow-up phase. Repository is correct and tested. |
| R3 | `credit_transactions` INSERT ON CONFLICT behavior | Low | Duplicate transactions | `ON CONFLICT (id) DO NOTHING` — UUID generation guarantees uniqueness. |
| R4 | `QuotaPeriod.current()` timezone edge at month boundary | Low | Wrong period for midnight sessions | Uses server local time. Acceptable — quota periods are coarse (monthly), 1-hour skew is irrelevant. |

## Success Criteria

- [ ] `tsc --build` passes with zero errors (all domain + infra types resolve)
- [ ] `npm run lint` passes with zero errors
- [ ] Domain unit tests pass: `Plan` (3 cases), `QuotaPeriod` (4 cases), `Quota` (10+ cases)
- [ ] Repository integration test: save + findByUserAndPeriod round-trip against real PostgreSQL
- [ ] `packages/domain/src/index.ts` exports all Usage types without circular imports
- [ ] `packages/infra-db/src/index.ts` exports `KyselyQuotaRepository`
- [ ] `server.ts` boots with `quotaRepo` wired (no runtime crashes)
- [ ] `overview.md` Phase 11 status corrected

## Sources

- [[overview]] — Implementation status, planned phases
- [[Usage & Quota]] — Bounded context specification, consumption flow
- [[Quota]] — Aggregate root design, methods, events, repository interface
- [[implementation-roadmap-2026-08-01]] — Phase plan and DDD drift risks
- [[phase-11-testing-plan]] — Completed testing baseline (66 files, 634 tests)
- [[DDD Domain Design Rules]] — Rules 1–7 for domain code governance
- [[Error Mapping (Domain to HTTP)]] — `QUOTA_EXCEEDED → 429` already mapped
- [[Tool as Static Configuration]] — `creditCost` per tool
- [[Database Schema]] — Migration 005 (quotas + credit_transactions)
