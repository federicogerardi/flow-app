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

## Format

```
{userId}:{toolKey}:{contentHash}
```

Example: `usr_a1b2:landing-page:sha256_abc123`

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