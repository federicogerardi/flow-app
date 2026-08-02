---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-08-02
source_count: 5
---

# Session

> Aggregate Root — [[Content Generation]] context
>
> **⚠️ Implementation status (2026-08-02):** The code examples on this page represent the **target architecture** (classes, VOs, strongly-typed events). The current implementation is simpler:
> - IDs are `string`, not `SessionId`/`WorkspaceId`/`UserId` VOs
> - Timestamps are `Date`, not `DateTime` VO
> - `SessionStatus` is a `type` alias (`'draft' | 'ready' | ...`), not a class with `SessionStatus.Draft`/`.Ready` instances
> - `apply()` accepts `{ type: SessionEventType; [key: string]: unknown }` with per-field casts, not the strongly-typed `SessionEvent` union shown below
> - The `_artifacts` array doesn't exist on the current Session entity (artifacts are tracked via Artifact table)
>
> These are tracked as [[rule-4-vo-debt|Rule 4 VO debt]] and [[session-lifecycle|SessionLifecycle integration debt]]. The wiki page retains the target design for reference.

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
- Cannot `cancel()` when not in `running` state — `SessionLifecycle` rejects `CANCEL` from any non-`running` state
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
  ) { ... }

  static create(
    toolKey: ToolKey,
    workspaceId: string,
    userId: string,
    idempotencyKeyHash: string,
  ): Session {
    return new Session(randomUUID(), toolKey, workspaceId, userId,
      idempotencyKeyHash, 'draft', 0, null, null, null, null, 1);
  }

  static reconstitute(
    sessionId: string, toolKey: ToolKey, workspaceId: string,
    userId: string, idempotencyKeyHash: string, status: SessionStatus,
    currentStepIndex: number, startedAt: Date | null, completedAt: Date | null,
    errorCode: string | null, errorMessage: string | null, version: number,
  ): Session {
    return new Session(sessionId, toolKey, workspaceId, userId,
      idempotencyKeyHash, status, currentStepIndex, startedAt, completedAt,
      errorCode, errorMessage, version);
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
}

export class InvalidSessionStateError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(readonly currentState: SessionStatus, readonly attemptedEvent: SessionEventType) {
    super(`Cannot apply "${attemptedEvent}" in state "${currentState}"`);
  }
}
```

> **Implementation notes (2026-08-02):**
> - IDs are `string`, not branded VO classes. `SessionId`/`WorkspaceId`/`UserId` do not exist as domain types.
> - `SessionStatus` is a `type` alias (`'draft' | 'ready' | ...`), not a class. Tracked in [[rule-4-vo-debt]].
> - `apply()` accepts `{ type: SessionEventType; [key: string]: unknown }` with per-field casts — not a strongly-typed discriminated union.
> - Domain events are plain objects `{ eventType, occurredAt, aggregateId }` — no typed payload classes.
> - No `_artifacts` array on the aggregate. Artifacts are queried separately from the DB artifact table.
> - `CONFIGURE` sets `_startedAt`, not `WORKER_PICKUP` — temporal semantics differ from aspirational design.
> - The `default` case returns `null` silently — unknown events are swallowed.

## Internal Entities

- **[[Artifact]]** (1:N) — one per step. The last one is the final deliverable.

## Domain Events Emitted

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `SessionStarted` | Transition to `running` | UI (SSE), Monitoring |
| `StepCompleted` | Each artifact produced | UI progress, [[XState Integration|XState machine]] |
| `SessionCompleted` | Final artifact created | [[Workspace & Assets]] (promotion), [[Usage & Quota]] (credits) |
| `SessionFailed` | Error in any step | UI, Monitoring |

## Relationships

- Follows a [[Tool as Static Configuration|Tool]]'s step definition (`toolKey`)
- Belongs to a [[Workspace]] (`workspaceId`) — Workspace receives the final [[Artifact]] as [[Asset]] on completion
- Contains [[Artifact]] entities (one per step, last = final deliverable)
- Triggers [[Asset Promotion]] on completion

## Sources

- [[sources/APP-CONCEPT]] — Tool catalog, architecture, BE-Driven workflow
- [[sources/PRD]] — Functional requirements FR-W01 to FR-W09
- [[sources/STARTUP]] — Domain definitions, Artifact vs Asset
- [[sources/USER-STORIES]] — US-T01 to US-T10, US-GF01 to US-GF09
- [[rule-4-vo-debt]] — Pre-existing VO type alias debt affecting this entity
