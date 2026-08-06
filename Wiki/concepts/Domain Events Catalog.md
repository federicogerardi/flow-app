---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Domain Events Catalog

> Authoritative reference for all domain events in Flow App

## Architecture

Domain events are **immutable DTOs** defined in `packages/domain`. They are published by aggregate roots and consumed by handlers in `apps/backend`. The `DomainEventBus` (in-process, fire-and-forget) delivers them to subscribers.

```
Aggregate Root                  DomainEventBus                  Handlers
──────────────                  ──────────────                  ────────
Session.complete()              eventBus.publish()              ConsumeCreditsUseCase
  └── new SessionCompleted ───▶ SessionCompleted ────────────▶  UI progress (SSE)

                                ┌─ explicit user action ─┐
                                │  POST /api/artifacts/   │
                                │       :id/promote       │
                                └──▶ PromoteToAssetUseCase│
                                     (not eventBus-driven) │
```

## Event Index

| Event | Emitter | Consumers | Payload |
|-------|---------|-----------|---------|
| `SessionStarted` | [[Session]] | UI (SSE), Monitoring | sessionId, toolKey, workspaceId, userId |
| `StepCompleted` | [[Session]] | UI (SSE progress) | sessionId, stepNumber, stepLabel, artifactId |
| `SessionCompleted` | [[Session]] | [[Usage & Quota]], UI | sessionId, workspaceId, userId, toolKey, finalArtifact |

> **Note**: `PromoteToAssetUseCase` is NOT wired to `SessionCompleted` via `eventBus`. Promotion is explicit — the user clicks "Promote to Asset" in the UI, which calls `POST /api/artifacts/:id/promote`. Asset promotion via domain event is deferred. See [[Asset Promotion#Implementation Status]].
| `SessionFailed` | [[Session]] | UI, Monitoring | sessionId, stepNumber, errorCode, errorMessage |
| `SessionCancelled` | [[Session]] | UI | sessionId, cancelledAt |
| `AssetCreated` | [[Workspace]] | UI (Knowledge Panel) | workspaceId, assetId, assetType |
| `AssetUpdated` | [[Workspace]] | UI | workspaceId, assetId, assetType |
| `QuotaExceeded` | [[Quota]] | UI, Session gate | userId, period, limit, consumed |
| `CreditConsumed` | [[Quota]] | Audit trail | userId, amount, sessionId |

---

## Event Definitions

### `SessionStarted`

```typescript
// packages/domain/src/generation/domain-events/SessionStarted.ts

class SessionStarted implements DomainEvent {
  readonly eventType = 'SessionStarted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
  ) {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `SessionId` | Session identifier |
| `toolKey` | `ToolKey` | Reference to the [[Tool as Static Configuration|ToolDefinition]] |
| `workspaceId` | `WorkspaceId` | Owning workspace |
| `userId` | `UserId` | User who started the generation |

**Trigger**: `Session.apply({ type: 'WORKER_PICKUP' })` — transition `queued → running`

**Consumers**:
- UI: starts SSE connection for real-time progress
- Monitoring: tracks job start

---

### `StepCompleted`

```typescript
class StepCompleted implements DomainEvent {
  readonly eventType = 'StepCompleted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly stepNumber: StepNumber,
    readonly stepLabel: string,
    readonly artifactId: ArtifactId,
    readonly isLast: boolean,
  ) {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `SessionId` | Current session |
| `stepNumber` | `StepNumber` | Ordinal of the completed step |
| `stepLabel` | `string` | Human-readable label |
| `artifactId` | `ArtifactId` | Produced artifact |
| `isLast` | `boolean` | Is it the last step? (prepares UI for closing) |

**Trigger**: `Session.addArtifact(artifact)` — after each completed step

**Consumers**:
- UI: updates progress bar, shows completed step card

---

### `SessionCompleted`

```typescript
class SessionCompleted implements DomainEvent {
  readonly eventType = 'SessionCompleted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
    readonly finalArtifact: {
      readonly artifactId: ArtifactId;
      readonly content: ArtifactContent;
    },
  ) {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `SessionId` | Completed session |
| `toolKey` | `ToolKey` | Tool used (to determine if promotable) |
| `workspaceId` | `WorkspaceId` | Target workspace |
| `userId` | `UserId` | User (for credit consumption) |
| `finalArtifact` | `{ artifactId, content }` | Final artifact (id + content only, not the entire object) |

**Trigger**: `Session.complete()` — last step completed successfully

**Consumers**:

| Handler | Action |
|---------|--------|
| `PromoteToAssetUseCase` | If `toolKey` is an asset tool, calls `Workspace.addAsset()` |
| `ConsumeCreditsUseCase` | Calls `Quota.consume()` to deduct credits |
| UI (SSE) | Notifies completion, enables download and promotion button |

**Cross-context contract**: the payload must contain everything consumers need. No consumer should call `SessionRepository.findById()` — the event is self-sufficient.

---

### `SessionFailed`

```typescript
class SessionFailed implements DomainEvent {
  readonly eventType = 'SessionFailed';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly failedAtStep: StepNumber,
    readonly errorCode: string,
    readonly errorMessage: string,
  ) {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `SessionId` | Failed session |
| `toolKey` | `ToolKey` | Tool being executed |
| `failedAtStep` | `StepNumber` | Step where the error occurred |
| `errorCode` | `string` | Error code (e.g. `LLM_TIMEOUT`, `API_RATE_LIMITED`) |
| `errorMessage` | `string` | Human-readable message for UI |

**Trigger**: Error in any step (LLM timeout, API down, parsing failed)

**Consumers**:
- UI: shows error with actionable message and retry button
- Monitoring: alert if error rate > threshold

---

### `SessionCancelled`

```typescript
class SessionCancelled implements DomainEvent {
  readonly eventType = 'SessionCancelled';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly cancelledAtStep: StepNumber,
  ) {}
}
```

**Trigger**: User calls cancel during `running`

**Consumers**: UI (removes progress indicator)

---

### `AssetCreated`

```typescript
class AssetCreated implements DomainEvent {
  readonly eventType = 'AssetCreated';
  readonly occurredAt: DateTime;

  constructor(
    readonly workspaceId: WorkspaceId,
    readonly assetId: AssetId,
    readonly assetType: AssetType,
    readonly source: AssetSource,
  ) {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workspaceId` | `WorkspaceId` | Container workspace |
| `assetId` | `AssetId` | New asset |
| `assetType` | `AssetType` | Type (brief, brand-voice, persona, angle) |
| `source` | `AssetSource` | `generated` | `uploaded` | `manual` |

**Trigger**: `Workspace.addAsset()` — after asset creation

**Consumers**:
- UI: updates Knowledge Panel, shows notification

---

### `AssetUpdated`

```typescript
class AssetUpdated implements DomainEvent {
  readonly eventType = 'AssetUpdated';
  readonly occurredAt: DateTime;

  constructor(
    readonly workspaceId: WorkspaceId,
    readonly assetId: AssetId,
    readonly assetType: AssetType,
  ) {}
}
```

**Trigger**: Asset content modified

**Consumers**: UI (refresh Knowledge Panel)

---

### `QuotaExceeded`

```typescript
class QuotaExceeded implements DomainEvent {
  readonly eventType = 'QuotaExceeded';
  readonly occurredAt: DateTime;

  constructor(
    readonly userId: UserId,
    readonly period: QuotaPeriod,
    readonly limit: CreditAmount,
    readonly consumed: CreditAmount,
  ) {}
}
```

**Trigger**: `Quota.consume()` when `consumed >= limit`

**Consumers**:
- UI: blocks "Generate" button, shows quota exhausted warning
- Notification: email/alert admin

---

### `CreditConsumed`

```typescript
class CreditConsumed implements DomainEvent {
  readonly eventType = 'CreditConsumed';
  readonly occurredAt: DateTime;

  constructor(
    readonly userId: UserId,
    readonly amount: CreditAmount,
    readonly sessionId: SessionId,
    readonly remaining: CreditAmount,
  ) {}
}
```

**Trigger**: `Quota.consume()` after credit deduction

**Consumers**:
- UI: updates credit counter in workspace
- Audit trail: `quota_history` in PostgreSQL

---

## Event Flow — Complete Sequence

```
SessionMachine (XState)
│
├── ready → queued
│   └── queue admission accepted
│
├── queued → running
│   └── publish SessionStarted
│         ├── UI: open SSE
│         └── Monitoring: track job
│
├── running: executingStep → stepCompleted (× N-1)
│   └── publish StepCompleted × (N-1)
│         └── UI: update progress bar
│
├── running: executingStep → stepCompleted (last step)
│   ├── publish StepCompleted (isLast: true)
│   │     └── UI: last step completed
│   └── publish SessionCompleted
│         ├── PromoteToAssetUseCase
│         │     └── Workspace.addAsset()
│         │           └── publish AssetCreated
│         │                 └── UI: update Knowledge Panel
│         ├── ConsumeCreditsUseCase
│         │     └── Quota.consume()
│         │           ├── publish CreditConsumed
│         │           │     └── UI: update counter
│         │           └── (if quota exceeded) publish QuotaExceeded
│         │                 └── UI: block new generations
│         └── UI: show final result, download
│
└── (error)
    └── publish SessionFailed
          └── UI: show error + retry
```

---

## Implementation

### Base Interface

```typescript
// packages/domain/src/shared/domain-event.ts

interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: DateTime;
}
```

### EventBus

```typescript
// apps/backend/src/infrastructure/event-bus.ts

class DomainEventBus {
  private handlers = new Map<string, EventHandler[]>();

  publish<T extends DomainEvent>(event: T): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      void (handler as EventHandler<T>)(event).catch(err =>
        logger.error({ err, eventType: event.eventType }, 'EventHandler failed')
      );
    }
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }
}

export const eventBus = new DomainEventBus();
```

### Subscription Bootstrap

```typescript
// apps/backend/src/application/handlers/bootstrap.ts

export function bootstrapEventHandlers(): void {
  eventBus.subscribe('SessionCompleted', async (e: SessionCompleted) => {
    await promoteToAssetUseCase.execute(e);
  });

  eventBus.subscribe('SessionCompleted', async (e: SessionCompleted) => {
    await consumeCreditsUseCase.execute(e);
  });
}
```

## Rules

1. **Events are immutable DTOs** — no logic, only data
2. **Self-sufficient payload** — the consumer must never call a repository to complete the information
3. **Fire-and-forget** — the publisher does not wait for consumers. If a handler fails, log and continue
4. **No guaranteed ordering** — two handlers of the same event can execute in any order
5. **Events in the domain, bus in the application layer** — `packages/domain` defines the classes, `apps/backend` delivers them

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow, event bridge
- [[sources/PRD]] — Idempotency, audit trail, observability
- [[sources/STARTUP]] — Domain rules
- [[sources/USER-STORIES]] — SSE progress, real-time updates
