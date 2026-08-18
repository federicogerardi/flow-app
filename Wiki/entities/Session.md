---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-08-18
source_count: 7
---

# Session

> Aggregate Root — [[Content Generation]] context
>
> **⚠️ Implementation status (2026-08-07):** The code examples on this page represent the **target architecture** (classes, VOs, strongly-typed events). The current implementation is simpler:
> - IDs are `string`, not `SessionId`/`WorkspaceId`/`UserId` VOs
> - Timestamps are `Date`, not `DateTime` VO
> - `SessionStatus` is a class (`SessionStatus.Draft`/`.Ready`/etc.) — implemented per Rule 4
> - `apply()` accepts a typed `SessionEvent` union with per-field casts, validated against `SessionLifecycle.getValidTransition()`
> - `_artifacts: Artifact[]` exists on the Session entity (artifacts are loaded via `findById()` inner-join)
> - `createdAt: Date` is an immutable `readonly` field added 2026-08-07 — derived from DB column `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
>
> These were addressed in the Phase 9 VO conversion. The wiki page retains the target design for reference.

## Definition

A `Session` is a single execution of a [[Tool as Static Configuration|Tool]] pipeline within a [[Workspace]]. It orchestrates the ordered execution of `WorkflowStep`s, each producing an [[Artifact]]. The session is the unit of work from the user's perspective: they start a generation, see progress, and receive a final deliverable.

## Ubiquitous Language

- **Session** (not "Generation" or "Job") — the user-facing term for a generation run
- A Session **has** Artifacts, it **belongs to** a Workspace, it **follows** a Tool's step definition

## Lifecycle

```
draft → ready → queued → running → completed
                            ↓         ↓
                          failed   cancelled
```

| State | Meaning | Transition |
|-------|---------|------------|
| `draft` | Created, not yet configured | → `ready` on configure |
| `ready` | Inputs validated, ready for queue admission | → `queued` on queue admission |
| `queued` | Accepted and enqueued, waiting for worker pickup | → `running` on worker pickup |
| `running` | Steps executing asynchronously | → `completed` on final step done |
| `completed` | All steps done, final artifact produced | Terminal |
| `failed` | Error in any step | Terminal |
| `cancelled` | User cancelled mid-execution | Terminal |

## Invariants

All invariants are enforced by `SessionLifecycle` (domain-owned state machine — see below). The aggregate root has a single entry point `apply(event)` that validates every transition against the lifecycle definition. There are no duplicate guard methods — the lifecycle is the single source of truth.

- Cannot transition to `queued` unless `ready` and all required inputs satisfied — `QUEUE` event guarded by [[ReadinessPolicy]] (domain predicate, not XState)
- Cannot `complete` without a `final` Artifact — `SessionLifecycle` enforces `COMPLETE` only from `running` state with `hasArtifacts` guard
- Cannot `addArtifact()` when not in `running` state — `SessionLifecycle` rejects `ADD_ARTIFACT` from any non-`running` state
- Cannot `cancel()` from a terminal state — `SessionLifecycle` accepts `CANCEL` from `ready`, `queued`, and `running` (rejects from `draft` and all terminal states)
- `IdempotencyKey` uniqueness: same `(userId, workspaceId, toolKey, inputHash, promptSignature)` → same Session
- Step execution is strictly sequential — no skipping, no reordering (enforced by step index increment in `apply()`)

## Session Lifecycle — Domain-Owned State Machine

> **Architecture decision (Pattern B, 2026-07-31)**: The state machine is defined in the **domain** as pure data (`packages/domain/src/generation/session-lifecycle.ts`). XState in the application layer imports and executes it — it defines nothing.

### Lifecycle Definition (`packages/domain/src/generation/session-lifecycle.ts`)

```typescript
export const SessionLifecycle = {
  initialState: 'draft' as const,
  states: {
    draft:    { transitions: { CONFIGURE: { target: 'ready' } } },
    ready:    { transitions: { QUEUE: { target: 'queued' }, CANCEL: { target: 'cancelled' } } },
    queued:   { transitions: { WORKER_PICKUP: { target: 'running' }, CANCEL: { target: 'cancelled' } } },
    running:  { transitions: { ADD_ARTIFACT: { target: 'running' }, COMPLETE: { target: 'completed' }, FAIL: { target: 'failed' }, CANCEL: { target: 'cancelled' } } },
    completed: { type: 'final' as const },
    failed:    { type: 'final' as const },
    cancelled: { type: 'final' as const },
  },
  getValidTransition(from: SessionState, event: SessionEventType): SessionState | null { ... },
} as const;

export type SessionState = keyof typeof SessionLifecycle.states;
export type SessionEventType = /* derived from SessionLifecycle.states transitions */;
```

### Aggregate Root (`packages/domain/src/generation/entities/Session.ts`)

```typescript
export class Session {
  private _status: SessionStatus;
  private _currentStepIndex: number;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _errorCode: string | null;
  private _errorMessage: string | null;
  private _version: number;
  private _artifacts: Artifact[];

  private constructor(
    readonly sessionId: string,
    readonly toolKey: ToolKey,
    readonly workspaceId: string,
    readonly userId: string,
    readonly idempotencyKeyHash: string,
    status: SessionStatus,
    currentStepIndex: number,
    startedAt: Date | null,
    completedAt: Date | null,
    errorCode: string | null,
    errorMessage: string | null,
    version: number,
    artifacts: Artifact[] = [],
    readonly createdAt: Date = new Date(),
  ) { ... }

  static create(
    toolKey: ToolKey,
    workspaceId: string,
    userId: string,
    idempotencyKeyHash: string,
  ): Session {
    return new Session(randomUUID(), toolKey, workspaceId, userId,
      idempotencyKeyHash, 'draft', 0, null, null, null, null, 1, [], new Date());
  }

  static reconstitute(
    sessionId: string, toolKey: ToolKey, workspaceId: string,
    userId: string, idempotencyKeyHash: string, status: SessionStatus,
    currentStepIndex: number, startedAt: Date | null, completedAt: Date | null,
    errorCode: string | null, errorMessage: string | null, version: number,
    artifacts: Artifact[] = [], createdAt: Date,
  ): Session {
    return new Session(sessionId, toolKey, workspaceId, userId,
      idempotencyKeyHash, status, currentStepIndex, startedAt, completedAt,
      errorCode, errorMessage, version, artifacts, createdAt);
  }

  /**
   * Single entry point for ALL state transitions.
   * Validates against SessionLifecycle.getValidTransition().
   * Returns DomainEvent | null for the caller to publish.
   */
  apply(event: { type: SessionEventType; [key: string]: unknown }): DomainEvent | null {
    const nextState = SessionLifecycle.getValidTransition(this._status, event.type);
    if (!nextState) {
      throw new InvalidSessionStateError(this._status, event.type);
    }
    this._status = nextState;
    this._version++;

    switch (event.type) {
      case 'CONFIGURE':
        this._startedAt = new Date();
        return null;
      case 'QUEUE':
      case 'WORKER_PICKUP':
        return null;
      case 'ADD_ARTIFACT':
        this._currentStepIndex++;
        return null;
      case 'COMPLETE':
        this._completedAt = new Date();
        return { eventType: 'SessionCompleted', occurredAt: new Date(), aggregateId: this.sessionId };
      case 'FAIL':
        this._errorCode = (event.errorCode as string) ?? 'UNKNOWN';
        this._errorMessage = (event.errorMessage as string) ?? 'Unknown error';
        this._completedAt = new Date();
        return { eventType: 'SessionFailed', occurredAt: new Date(), aggregateId: this.sessionId };
      case 'CANCEL':
        this._completedAt = new Date();
        return { eventType: 'SessionCancelled', occurredAt: new Date(), aggregateId: this.sessionId };
      default:
        return null;
    }
  }

  // Getters
  get status(): SessionStatus { return this._status; }
  get currentStepIndex(): number { return this._currentStepIndex; }
  get startedAt(): Date | null { return this._startedAt; }
  get completedAt(): Date | null { return this._completedAt; }
  get errorCode(): string | null { return this._errorCode; }
  get errorMessage(): string | null { return this._errorMessage; }
  get version(): number { return this._version; }
  get artifacts(): readonly Artifact[] { return this._artifacts; }
  // createdAt is a readonly constructor field — auto-accessible (no getter needed)
}

export class InvalidSessionStateError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(readonly currentState: SessionStatus, readonly attemptedEvent: SessionEventType) {
    super(`Cannot apply "${attemptedEvent}" in state "${currentState}"`);
  }
}
```

> **Implementation notes (2026-08-18):**
> - IDs are `string`, not branded VO classes. `SessionId`/`WorkspaceId`/`UserId` do not exist as domain types.
> - `SessionStatus` is a **class** (`SessionStatus.Draft`/`.Ready`/…), with `SessionStatusValue` as the union of literal strings — implemented per Rule 4.
> - `apply()` returns a minimal inline event `{ eventType, occurredAt, aggregateId }`. The rich payload classes (e.g. `SessionCompleted` with `finalArtifactId`) live in `packages/domain/src/generation/domain-events/` and are constructed by the publishing (application/worker) layer.
> - `_artifacts` exists on the aggregate (loaded via `findById()` inner-join).

## Internal Entities

- **[[Artifact]]** (1:N) — one per step. The last one is the final deliverable.

## Domain Events Emitted

> **Note**: `SessionStarted` is NOT emitted by the domain entity's `apply()` method (returns `null` for `WORKER_PICKUP`). It is published as an SSE event by the session worker layer after `WORKER_PICKUP` is applied and the session transitions to `running`.

| Event | Trigger | Emitted by | Consumers |
|-------|---------|------------|-----------|
| `SessionCompleted` | `apply('COMPLETE')` | Domain entity | [[Usage & Quota]] (credits). [[Workspace & Assets]] promotion is **explicit** (API call), not event-driven |
| `SessionFailed` | `apply('FAIL')` | Domain entity | UI, Monitoring |
| `SessionCancelled` | `apply('CANCEL')` | Domain entity | UI |
| `SessionStarted` | Worker picks up job | SSE worker layer (not domain entity) | UI (SSE live status) |
| `StepCompleted` | Each artifact produced | SSE worker layer (not domain entity) | UI progress, [[Session Machine (XState v5)|XState machine]] |

## Relationships

- Follows a [[Tool as Static Configuration|Tool]]'s step definition (`toolKey`)
- Belongs to a [[Workspace]] (`workspaceId`) — Workspace receives the final [[Artifact]] as [[Asset]] on completion
- Contains [[Artifact]] entities (one per step, last = final deliverable)
- Final [[Artifact]] is promotable to [[Asset]] via [[Asset Promotion]] (explicit user action — not automatic on completion)

## Repository

```typescript
export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByArtifactId(artifactId: string): Promise<Session | null>;
  findByIdempotencyKeyHash(hash: string): Promise<Session | null>;
  findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]>;
  findAll(filters?: SessionFilters): Promise<Session[]>;
  findLastArtifactsBySessionIds(sessionIds: string[]): Promise<Map<string, Artifact>>;
  save(session: Session): Promise<void>;
  saveWithLock(session: Session, expectedVersion: number): Promise<void>;
  saveIdempotencyKey(hash: string, sessionId: string): Promise<void>;
  saveSnapshot(sessionId: string, snapshot: string): Promise<void>;
  loadSnapshot(sessionId: string): Promise<string | null>;
}
```

Key design decisions:
- `save()` persists ONLY the aggregate root (`sessions` table) and its owned entities (`artifacts` table) — per [[DDD Domain Design Rules#Rule 5 — Repository save persists ONLY the aggregate root and its owned entities|Rule 5]].
- `saveIdempotencyKey()` is a separate cross-cutting method — not a side-effect inside `save()`.
- `saveWithLock()` uses optimistic locking (`WHERE version = expectedVersion`), throws `ConcurrencyError` on 0 rows updated.
- `saveSnapshot()` / `loadSnapshot()` support crash recovery for long-running XState workers.
- `findLastArtifactsBySessionIds()` batch-queries the last artifact per session within the aggregate boundary.
- Implemented by `KyselySessionRepository` in `packages/infra-db/src/repositories/session-repository.ts`.

## Sources

- [[sources/APP-CONCEPT]] — Tool catalog, architecture, BE-Driven workflow
- [[sources/PRD]] — Functional requirements FR-W01 to FR-W09
- [[sources/STARTUP]] — Domain definitions, Artifact vs Asset
- [[sources/USER-STORIES]] — US-T01 to US-T10, US-GF01 to US-GF09
- [[DDD Domain Design Rules]] — Repository design rules
- [[BullMQ Worker Wiring]] — Worker integration
- [[Idempotency]] — Idempotency key patterns
