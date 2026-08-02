---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/domain-value-object
  - wiki/idempotency
date_updated: 2026-08-02
source_count: 8
confidence: high
---

# Idempotency

> Atomic claim mechanism guaranteeing exactly-once session creation. Covers the `IdempotencyKey` value object, Redis + PostgreSQL implementation, and how prompt versioning affects the key contract.

## Definition

`IdempotencyKey` is a value object that prevents duplicate execution of a [[Session Machine (XState v5)|generation session]]. It guarantees that the same input produces the same result without consuming duplicate credits. The claim must be **atomic** — no race condition between check and insert.

## Key Format

```
{userId}:{workspaceId}:{toolKey}:{contentHash}:{templateVersionsHash}
```

The key is **workspace-scoped**: the same user with the same toolKey and inputs but different workspace produces a different idempotency key. The `templateVersionsHash` pins the prompt version, ensuring a template update triggers a new session even with identical user inputs.

### Why include the template version?

Changing the template version changes generation behavior. If the version were excluded, retrying with identical inputs after a template update would silently return old artifacts. Including the version ensures "same inputs → same behavior → same result."

```typescript
// packages/domain/src/generation/value-objects/IdempotencyKey.ts

class IdempotencyKey {
  static generate(params: IdempotencyKeyParams): IdempotencyKey {
    const components = [
      params.userId,
      params.workspaceId,
      params.toolKey,
      params.inputHash,           // hash of all user inputs
      params.templateVersions,    // hash of (stepLabel:version) pairs
    ].join('|');
    return new IdempotencyKey(sha256(components));
  }
}
```

### `"latest"` resolution

`"latest"` is always resolved to a concrete version at key generation time. The idempotency key never stores `"latest"` — it always contains **pinned versions**.

```typescript
// In key generation:
if (version === 'latest') {
  const concreteVersion = await promptRepo.listVersions(templateId);
  version = concreteVersion[concreteVersion.length - 1].value; // pin it
}
```

| Scenario | Same key? | Correct? |
|----------|-----------|----------|
| Same inputs, no template change | ✅ Yes | Cached session returned |
| Same inputs, template updated | ❌ No | New session with updated prompt |
| Same inputs, `"latest"` changed | ❌ No (resolved differently) | New session |
| One input field changed | ❌ No (inputHash differs) | New session |

## Canonical Constants

```typescript
const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24h — unified across stores
```

## Algorithm

```
1. Client sends POST /api/tools/:toolKey/sessions
2. Server computes IdempotencyKey: SHA-256(userId|workspaceId|toolKey|inputHash|templateVersions)
3. Server attempts atomic claim via Redis (primary) or PostgreSQL (fallback)
4. If claim succeeds → create new Session, store key→sessionId mapping (HTTP 201, replayed: false)
5. If claim fails → return existing Session (HTTP 200, replayed: true)
```

Readiness checks happen **before** the claim. Invalid data never consumes an idempotency key.

## Redis Implementation (Primary)

Redis `SET NX` provides atomic "set if not exists" with automatic TTL. Single-threaded — inherently race-condition-free.

```typescript
class RedisIdempotencyStore {
  async claim(keyHash: string, sessionId: string, ttlSeconds = IDEMPOTENCY_TTL_SECONDS) {
    const result = await this.redis.set(
      `idempotency:${keyHash}`,
      sessionId,
      'EX', ttlSeconds,
      'NX'  // Only set if key does not exist
    );
    if (result === 'OK') return { claimed: true };
    const existingSessionId = await this.redis.get(`idempotency:${keyHash}`);
    return { claimed: false, existingSessionId };
  }
}
```

**Graceful degradation**: if Redis is unavailable, fall back to PostgreSQL. The system logs a warning and continues. Redis is the primary, PostgreSQL is the fallback — never a single point of failure.

## PostgreSQL Fallback

When Redis is unavailable, uses `INSERT ON CONFLICT` in a transaction. Because `idempotency_keys.session_id` references `sessions.id`, the session row is created first (FK-safe order).

```typescript
class PgIdempotencyStore {
  async claimOrCreate(keyHash: string, createSession: (tx, id) => Promise<void>) {
    return this.db.transaction().execute(async (tx) => {
      const existing = await tx
        .selectFrom('idempotency_keys')
        .select('session_id')
        .where('key_hash', '=', keyHash)
        .executeTakeFirst();
      if (existing?.session_id) return { claimed: false, sessionId: existing.session_id };

      const sessionId = SessionId.generate().value;
      await createSession(tx, sessionId); // session exists before key (FK-safe)
      await tx.insertInto('idempotency_keys')
        .values({ key_hash: keyHash, session_id: sessionId, expires_at: sql`NOW() + INTERVAL '24 hours'` })
        .execute();
      return { claimed: true, sessionId };
    });
  }
}
```

## Integration in StartSessionUseCase

```typescript
class StartSessionUseCase {
  async execute(cmd: StartSessionCommand): Promise<StartSessionResult> {
    // 1. Compute key with resolved template versions
    const keyHash = IdempotencyKey.generate({ userId, workspaceId, toolKey, inputHash, templateVersions });

    // 2. Check tool exists (fail fast)
    const tool = this.toolRegistry.get(cmd.toolKey);
    if (!tool) throw new ToolNotFoundError(cmd.toolKey);

    // 3. Validate readiness (fail fast — before claim)
    const readiness = ReadinessPolicy.from(tool).evaluate(acquisitionData);
    if (!readiness.isReady) throw new ReadinessError(readiness.missing);

    // 4. Atomic claim or create
    const { session, claimed } = await this.idempotency.claimOrCreate(keyHash, async (id) => {
      const session = Session.createWithId(id, cmd.toolKey, cmd.workspaceId, cmd.userId, keyHash);
      await this.sessionRepo.save(session);
      return session;
    });
    return { session, tool, replayed: !claimed };
  }
}
```

## Persistence

| Layer | Mechanism | TTL |
|-------|-----------|-----|
| Redis (primary) | `SET key value NX EX 86400` | 24h |
| PostgreSQL (fallback) | `INSERT INTO idempotency_keys ON CONFLICT DO NOTHING` | 7d |

### Key storage

The `sessionRepository.saveIdempotencyKey()` method persists the key separately from `save()` (per Rule 5 — no side-effects in repository `save()`).

## Cleanup

- **Redis**: `EX` TTL handles it automatically
- **PostgreSQL**: hourly cleanup job:

```sql
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

## Development Opt-Out

For development environments only, an opt-out flag excludes the template version from the key:

```bash
# .env (dev only — never set in production)
IDEMPOTENCY_INCLUDE_PROMPT_VERSION=false
```

A startup check enforces this flag is absent in production.

## Deterministic Contract

1. Compute one canonical key hash from user/workspace/tool/input/prompt signature
2. Check if key already exists; return existing session when present
3. For new requests, bind exactly one `sessionId` to the key
4. Persist session and key mapping atomically per store constraints

## Sources

- [[sources/PRD]] — FR-W02 (idempotency requirement)
- [[sources/USER-STORIES]] — US-GF04 (no duplicate content/credits)
- [[Database Schema]] — idempotency_keys table
- [[Session Machine (XState v5)]] — session lifecycle integration
- [[API Contract Baseline v1]] — canonical replay semantics (201 vs 200)
- [[Prompt Versioning]] — template versions in the key
- [[Tool as Static Configuration]] — ToolDefinition.steps provides version info
- [[prompting-mechanics-proposal]] — version-hash interaction resolved
