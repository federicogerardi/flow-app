---
type: concept
tags:
  - wiki/concept
  - wiki/domain-value-object
date_updated: 2026-07-31
source_count: 3
confidence: high
---

# IdempotencyKey

> Value Object — idempotency key to guarantee exactly-once execution

## Definition

`IdempotencyKey` is an immutable value object that prevents duplicate execution of a [[Session Machine (XState v5)|generation session]]. It guarantees that the same input produces the same result without consuming duplicate credits.

> **Type-design audit (2026-07-31)**: Fixed format — `workspaceId` was incorrectly omitted from the key format on this concept page while the implementation page ([[Idempotency Implementation]]) and [[Database Schema]] both include it. This page now matches the authoritative implementation: `{userId}:{workspaceId}:{toolKey}:{contentHash}`.

## Format

```
{userId}:{workspaceId}:{toolKey}:{contentHash}
```

Example: `usr_a1b2:ws_c3d4:landing-page:sha256_abc123`

The key is **workspace-scoped**: the same user with the same toolKey and inputs but different workspace produces a different idempotency key. This is intentional — idempotency is per workspace, not global.

## Structure

```typescript
// packages/domain/src/generation/value-objects/IdempotencyKey.ts

class IdempotencyKey {
  private constructor(
    readonly userId: UserId,
    readonly workspaceId: WorkspaceId,
    readonly toolKey: ToolKey,
    readonly inputHash: string,
  ) {}

  static from(
    userId: UserId,
    workspaceId: WorkspaceId,
    toolKey: ToolKey,
    inputs: Record<string, unknown>,
  ): IdempotencyKey {
    return new IdempotencyKey(
      userId,
      workspaceId,
      toolKey,
      IdempotencyKey.computeHash(inputs),
    );
  }

  /** SHA-256 of (userId|workspaceId|toolKey|inputHash) — used as storage key */
  static computeHash(
    userId: string,
    workspaceId: string,
    toolKey: string,
    inputHash: string,
  ): string { /* ... */ }

  toString(): string {
    return `${this.userId}:${this.workspaceId}:${this.toolKey}:${this.inputHash}`;
  }
}
```

## Behavior

- **First request**: executes normally, saves idempotency key → result in Redis (24h TTL) with PostgreSQL fallback
- **Duplicate request**: returns cached result without executing

## Persistence

| Layer | Mechanism | TTL |
|-------|-----------|-----|
| Redis | `SET key value NX EX 86400` | 24h |
| PostgreSQL (fallback) | `INSERT INTO idempotency_keys ON CONFLICT DO NOTHING` | 7d |

## Sources

- [[Idempotency Implementation]] — Full implementation
- [[Database Schema]] — Table `idempotency_keys`
- [[LLM Gateway - OpenRouter]] — Where it's used to avoid duplicate API calls
