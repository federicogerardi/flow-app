---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-07-31
source_count: 4
---

# Session

> Aggregate Root — [[Content Generation]] context

## Definition

A `Session` is a single execution of a [[Tool as Static Configuration|Tool]] pipeline within a [[Workspace]]. It orchestrates the ordered execution of `WorkflowStep`s, each producing an [[Artifact]]. The session is the unit of work from the user's perspective: they start a generation, see progress, and receive a final deliverable.

## Ubiquitous Language

- **Session** (not "Generation" or "Job") — the user-facing term for a generation run
- A Session **has** Artifacts, it **belongs to** a Workspace, it **follows** a Tool's step definition

## Lifecycle

```
draft → ready → running → completed
                    ↓         ↓
                  failed   cancelled
```

| State | Meaning | Transition |
|-------|---------|------------|
| `draft` | Created, not yet configured | → `ready` on configure |
| `ready` | Inputs validated, ready to start | → `running` on start |
| `running` | Steps executing asynchronously | → `completed` on final step done |
| `completed` | All steps done, final artifact produced | Terminal |
| `failed` | Error in any step | Terminal |
| `cancelled` | User cancelled mid-execution | Terminal |

## Invariants

All invariants are enforced by `SessionLifecycle` (domain-owned state machine — see below). The aggregate root has a single entry point `apply(event)` that validates every transition against the lifecycle definition. There are no duplicate guard methods — the lifecycle is the single source of truth.

- Cannot transition to `running` unless `ready` and all required inputs satisfied — `START` event guarded by [[ReadinessPolicy]] (domain predicate, not XState)
- Cannot `complete` without a `final` Artifact — `SessionLifecycle` enforces `COMPLETE` only from `running` state with `hasArtifacts` guard
- Cannot `addArtifact()` when not in `running` state — `SessionLifecycle` rejects `ADD_ARTIFACT` from any non-`running` state
- Cannot `cancel()` when not in `running` state — `SessionLifecycle` rejects `CANCEL` from any non-`running` state
- `IdempotencyKey` uniqueness: same `(userId, workspaceId, toolKey, inputHash)` → same Session
- Step execution is strictly sequential — no skipping, no reordering (enforced by `Artifact.stepNumber` being a `StepNumber` VO)

## Session Lifecycle — Domain-Owned State Machine

> **Architecture decision (Pattern B, 2026-07-31)**: The state machine is defined in the **domain** as pure data (`packages/domain/src/generation/session-lifecycle.ts`). XState in the application layer imports and executes it — it defines nothing. This eliminates the double-enforcement redundancy (entity guards + XState guards) and makes the domain the single source of truth for all valid transitions.

### Lifecycle Definition (packages/domain)

```typescript
// packages/domain/src/generation/session-lifecycle.ts
// ⬅️ DOMAIN LAYER — single source of truth for Session state transitions
// Zero dependencies. Plain TypeScript object. Framework-agnostic.

export const SessionLifecycle = {
  initialState: 'draft' as const,
  states: {
    draft: {
      transitions: {
        CONFIGURE: { target: 'ready' },
      },
    },
    ready: {
      transitions: {
        START:  { target: 'running' },
        CANCEL: { target: 'cancelled' },
      },
    },
    running: {
      transitions: {
        ADD_ARTIFACT: { target: 'running' },
        COMPLETE:     { target: 'completed' },
        FAIL:         { target: 'failed' },
        CANCEL:       { target: 'cancelled' },
      },
    },
    completed: { type: 'final' as const },
    failed:    { type: 'final' as const },
    cancelled: { type: 'final' as const },
  },
} as const;

// Derived type — exhaustiveness-checked by TypeScript
export type SessionState = keyof typeof SessionLifecycle.states;
export type SessionEventType = {
  [S in SessionState]: keyof (typeof SessionLifecycle.states)[S] extends { transitions: infer T }
    ? keyof T
    : never;
}[SessionState];

export function getValidTransition(
  from: SessionState,
  event: SessionEventType,
): SessionState | null {
  const state = SessionLifecycle.states[from];
  if (!('transitions' in state)) return null;
  return (state.transitions as Record<string, { target: string }>)[event]?.target ?? null;
}
```

> **SessionStatus derives from SessionLifecycle**: The `SessionStatus` value object must be derived from `SessionState` (i.e., `keyof typeof SessionLifecycle.states`) to guarantee compile-time consistency. There are NOT two independent enumerations — `SessionStatus` is a type alias or const mapping from `SessionLifecycle.states`. Adding a state to `SessionLifecycle` automatically adds it to `SessionStatus`. No drift possible.

### Aggregate Root — Single Entry Point

```typescript
// packages/domain/src/generation/entities/Session.ts

class Session {
  private _artifacts: Artifact[];

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
    readonly idempotencyKey: IdempotencyKey,
    private _status: SessionStatus,
    private _currentStepIndex: StepNumber,
    readonly createdAt: DateTime = DateTime.now(),
    // Timestamps are private — set only by apply(), exposed via getters.
    // They are NOT readonly in the constructor because apply() mutates them.
    private _startedAt: DateTime | null = null,
    private _completedAt: DateTime | null = null,
  ) {}

  static create(
    toolKey: ToolKey,
    workspaceId: WorkspaceId,
    userId: UserId,
    idempotencyKey?: IdempotencyKey,
  ): Session {
    return new Session(
      SessionId.generate(),
      toolKey,
      workspaceId,
      userId,
      idempotencyKey ?? IdempotencyKey.generate(userId, workspaceId, toolKey),
      SessionStatus.Draft,
      StepNumber.of(0),
    );
  }

  /**
   * Single entry point for ALL state transitions.
   * Validates against SessionLifecycle (domain definition).
   * Returns the domain event to be published by the caller.
   * XState calls this — it does NOT duplicate the transition logic.
   *
   * DDD principles enforced here:
   * - Aggregate operates only on its own state (no external lookups).
   * - isLast and stepLabel are passed in the event, not looked up from ToolRegistry.
   * - Timestamps are set by the aggregate, not by the caller.
   */
  apply(event: SessionEvent): DomainEvent | null {
    const from = this._status as SessionState;
    const target = getValidTransition(from, event.type);
    if (!target) {
      throw new InvalidSessionStateError(
        `Invalid transition: ${from} → ${event.type}`
      );
    }

    switch (event.type) {
      case 'CONFIGURE':
        this._status = SessionStatus.Ready;
        return null; // internal transition — no domain event

      case 'START':
        this._status = SessionStatus.Running;
        this._startedAt = DateTime.now(); // ← aggregate manages its own temporal invariants
        return new SessionStarted(this.sessionId, this.toolKey,
          this.workspaceId, this.userId);

      case 'ADD_ARTIFACT': {
        this._artifacts.push(event.artifact);
        this._currentStepIndex = event.artifact.stepNumber;
        // isLast and stepLabel are passed by the caller (XState has the ToolDefinition).
        // The aggregate does NOT call getTool() — it operates only on its own state.
        return new StepCompleted(
          this.sessionId,
          event.artifact.stepNumber,
          event.stepLabel,          // ← passed in, not looked up
          event.artifact.artifactId,
          event.isLast,             // ← passed in, not computed via getTool()
        );
      }

      case 'COMPLETE': {
        // Explicit narrowing — no non-null assertion
        const final = this.finalArtifact;
        if (!final) {
          throw new InvalidSessionStateError('Cannot complete: no artifacts produced');
        }
        this._status = SessionStatus.Completed;
        this._completedAt = DateTime.now(); // ← aggregate manages its own temporal invariants
        return new SessionCompleted(this.sessionId, this.toolKey,
          this.workspaceId, this.userId,
          { artifactId: final.artifactId, content: final.content });
      }

      case 'FAIL':
        this._status = SessionStatus.Failed;
        return new SessionFailed(this.sessionId, this.toolKey,
          this._currentStepIndex, event.errorCode, event.errorMessage);

      case 'CANCEL':
        this._status = SessionStatus.Cancelled;
        return new SessionCancelled(this.sessionId, this._currentStepIndex);

      default:
        throw new InvalidSessionStateError(`Unknown event: ${(event as any).type}`);
    }
  }

  // Getters — expose immutable views of private mutable state
  get status(): SessionStatus { return this._status; }
  get currentStepIndex(): StepNumber { return this._currentStepIndex; }
  get artifacts(): ReadonlyArray<Artifact> { return this._artifacts; }
  get startedAt(): DateTime | null { return this._startedAt; }
  get completedAt(): DateTime | null { return this._completedAt; }
  get finalArtifact(): Artifact | undefined {
    return this._artifacts[this._artifacts.length - 1];
  }
}

// Event union — one type per lifecycle transition.
// ADD_ARTIFACT carries isLast + stepLabel so the aggregate never calls getTool().
// This keeps the aggregate self-contained: it operates only on its own state.
type SessionEvent =
  | { type: 'CONFIGURE' }
  | { type: 'START' }
  | { type: 'ADD_ARTIFACT'; artifact: Artifact; isLast: boolean; stepLabel: string }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; errorCode: string; errorMessage: string }
  | { type: 'CANCEL' };
```

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