---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-07-30
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

**Why in-process, not Redis?** All contexts live in the same Railway deploy (single process). No serialization overhead, no network hop, no additional point of failure. The interface stays the same if we ever extract to microservices.

## Key Events

| Event | Emitted By | Consumed By | Purpose |
|-------|-----------|-------------|---------|
| `SessionCompleted` | [[Session]] | [[Workspace & Assets]] | [[Asset Promotion]] |
| `SessionCompleted` | [[Session]] | [[Usage & Quota]] | Credit consumption |
| `SessionStarted` | [[Session]] | UI (SSE) | Real-time progress |
| `StepCompleted` | [[Session]] | UI (SSE) | Step progress |
| `AssetCreated` | [[Workspace]] | UI | Knowledge Panel refresh |

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
    readonly sessionId: SessionId,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
    readonly finalArtifact: Artifact,
  ) {}
}
```

Events are **immutable DTOs** — no behavior, just data. They carry all information the consumer needs so no callback to the source aggregate is required.

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow, event bridge
- [[sources/PRD]] — Idempotency, audit trail
- [[sources/STARTUP]] — Domain rules
- [[sources/USER-STORIES]] — SSE progress, real-time updates