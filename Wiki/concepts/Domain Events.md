---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-08-18
source_count: 4
confidence: high
---

# Domain Events

> Architectural pattern — cross-context communication

> **Catalog**: See [[Domain Events Catalog]] for the complete event reference (schemas, payloads, subscribers, flow diagram).

## Principle

Domain Events are immutable facts about something that happened in the domain. They are the primary mechanism for communication **between bounded contexts** without coupling them directly.

## Where They Live

| Layer | What | Where |
|-------|------|-------|
| **Domain** | Event class definitions (DTO) | `packages/domain/src/<context>/domain-events/` |
| **Application** | `DomainEventBus` implementation | `apps/backend/src/infrastructure/event-bus.ts` |
| **Application** | Event handlers (subscribers) | `apps/backend/src/application/handlers/` |

The domain defines **what events exist**. The application defines **how they're published and handled**.

## EventBus Design

In-process `EventEmitter` — fire-and-forget, non-blocking:

```typescript
class DomainEventBus {
  publish<T extends DomainEvent>(event: T): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      void handler(event).catch(err =>
        logger.error({ err, eventType: event.eventType }, 'EventHandler failed')
      );
    }
  }
}
```

**Why in-process, not Redis?** All contexts can run in the same deploy at early stage. In-process delivery has low overhead and simpler operations. The interface stays stable if we later extract to separate services.

## Delivery Semantics

- Current mode: **at-most-once in-process dispatch** (fire-and-forget handlers).
- Handler requirement: all side effects must be idempotent (`SessionCompleted` can be retried safely by consumer logic).
- Failure handling: handler errors are logged with event type + aggregate id.

For higher reliability (split-service topology), adopt **transactional outbox + relay worker**:

1. Persist domain change and outbox event in the same DB transaction.
2. Relay publishes to queue/topic.
3. Consumers apply idempotent processing with dedupe keys.

This migration path is intentionally documented now to prevent coupling to in-memory delivery semantics.

## Phase 3 — Outbox/Inbox Delivery Contract

When reliability mode is enabled (split-service topology), event delivery follows this sequence:

1. Aggregate transition commits in DB.
2. Same transaction inserts one row in `outbox_events`.
3. Relay worker publishes unpublished outbox rows to queue/topic.
4. Consumer writes `inbox_consumers` dedupe record before side effects.
5. Side effect executes once; duplicate deliveries are no-op due to unique dedupe constraint.

### Publisher Rules

- Each domain event must include `eventType`, `eventVersion`, `aggregateId`, `occurredAt`.
- `dedupeKey` must be deterministic (`eventType:aggregateId:version`).
- Outbox relay marks `published_at` only after broker acknowledgement.

### Consumer Rules

- Processing is idempotent by design.
- Any transient failure is retried with backoff.
- Poison messages move to DLQ after max attempts and require manual replay.

## Key Events

| Event | Emitted By | Consumed By | Purpose |
|-------|-----------|-------------|---------|
| `SessionCompleted` | [[Session]] | [[Usage & Quota]] | Credit consumption |
| `SessionStarted` | SSE worker layer | UI (SSE) | Real-time progress |
| `StepCompleted` | SSE worker layer | UI (SSE) | Step progress |
| `AssetCreated` | [[Workspace]] (deferred) | UI | Knowledge Panel refresh |

> **Note**: [[Asset Promotion]] is **not** driven by `SessionCompleted`. Promotion is explicit (`POST /api/artifacts/:id/promote` → `PromoteToAssetUseCase`). The event-driven `SessionCompleted → PromoteToAssetUseCase` wiring is deferred. `AssetCreated` is likewise not yet published (see [[Asset Promotion]]).

## Event Structure

```typescript
interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: DateTime;
  readonly aggregateId: string;
}

class SessionCompleted implements DomainEvent {
  readonly eventType = 'SessionCompleted';
  readonly occurredAt = DateTime.now();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly toolKey: string,
    readonly finalArtifactId: string,
  ) {}
}
```

Events are **immutable DTOs** — no behavior, just data. They carry all information the consumer needs so no callback to the source aggregate is required.

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow, event bridge
- [[sources/PRD]] — Idempotency, audit trail
- [[sources/STARTUP]] — Domain rules
- [[sources/USER-STORIES]] — SSE progress, real-time updates
