---
type: entity
tags:
  - wiki/entity
  - wiki/generation
  - wiki/repository
date_updated: 2026-08-02
source_count: 3
---

# SessionRepository

Repository interface for the `Session` aggregate root. Defines persistence operations for sessions, idempotency keys, and XState snapshots.

## Interface

```typescript
export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByIdempotencyKeyHash(hash: string): Promise<Session | null>;
  findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]>;
  save(session: Session): Promise<void>;
  saveWithLock(session: Session, expectedVersion: number): Promise<void>;
  saveIdempotencyKey(hash: string, sessionId: string): Promise<void>;
  saveSnapshot(sessionId: string, snapshot: string): Promise<void>;
  loadSnapshot(sessionId: string): Promise<string | null>;
}
```

## Key design decisions

- `save()` persists ONLY the aggregate root (`sessions` table) and its owned entities (`artifacts` table) — per [[DDD Domain Design Rules#Rule 5 — Repository save persists ONLY the aggregate root and its owned entities|Rule 5]].
- `saveIdempotencyKey()` is a separate cross-cutting method — not a side-effect inside `save()`.
- `saveWithLock()` uses optimistic locking (`WHERE version = expectedVersion`), throws `ConcurrencyError` on 0 rows updated.
- `saveSnapshot()` / `loadSnapshot()` support crash recovery for long-running XState workers — per [[DDD Domain Design Rules#Pattern 17 — Snapshot-Based Crash Recovery|Pattern 17]].

## Implementation

Implemented by `KyselySessionRepository` in `packages/infra-db/src/repositories/session-repository.ts`.

## Sources

- [[DDD Domain Design Rules]]
- [[BullMQ Worker Wiring]]
- [[Idempotency]]
