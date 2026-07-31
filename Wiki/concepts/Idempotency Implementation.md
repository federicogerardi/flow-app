---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Idempotency Implementation

> Atomic claim mechanism for `IdempotencyKey`  
> `apps/backend/src/infrastructure/idempotency.ts`

## Principle

`IdempotencyKey` is a Value Object in `packages/domain`. Its implementation ensures that identical generation requests return the same Session rather than creating duplicates and double-consuming credits. The claim must be **atomic** — no race condition between check and insert.

## Algorithm

```
1. Client sends POST /api/tools/:toolKey/sessions
2. Server computes IdempotencyKey: SHA-256(userId|workspaceId|toolKey|inputHash)
3. Server attempts atomic claim via Redis (primary) or PostgreSQL (fallback)
4. If claim succeeds → create new Session, store key→sessionId mapping
5. If claim fails (key exists) → return existing Session (HTTP 200, not 201)
```

## Redis Implementation (Primary)

Redis `SET NX` provides atomic "set if not exists" with automatic TTL-based cleanup.

**Graceful degradation**: if Redis is unavailable, fall back to PostgreSQL (see below). The system logs a warning and continues. Redis is the primary, PostgreSQL is the fallback — never a single point of failure for idempotency.

```typescript
// apps/backend/src/infrastructure/idempotency-store.ts

class RedisIdempotencyStore {
  constructor(private redis: Redis) {}

  async claim(keyHash: string, sessionId: string, ttlSeconds: number = 3600): Promise<{
    claimed: boolean;
    existingSessionId?: string;
  }> {
    // SET key value NX EX ttl → returns "OK" if created, null if key exists
    const result = await this.redis.set(
      `idempotency:${keyHash}`,
      sessionId,
      'EX', ttlSeconds,
      'NX'
    );

    if (result === 'OK') {
      return { claimed: true };
    }

    // Key already exists → return existing sessionId
    const existingSessionId = await this.redis.get(`idempotency:${keyHash}`);
    return { claimed: false, existingSessionId: existingSessionId ?? undefined };
  }
}
```

**Why Redis?** Single-threaded — `SET NX` is inherently race-condition-free. No locks needed.

---

## PostgreSQL Fallback

When Redis is unavailable (fail-closed: deny the operation), fall back to PostgreSQL with `INSERT ON CONFLICT`.

```typescript
// packages/infra-db/src/repositories/pg-idempotency-store.ts

class PgIdempotencyStore {
  constructor(private db: Kysely<DB>) {}

  async claim(keyHash: string, sessionId: string, ttlHours: number = 24): Promise<{
    claimed: boolean;
    existingSessionId?: string;
  }> {
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    const result = await this.db
      .insertInto('idempotency_keys')
      .values({ key_hash: keyHash, session_id: sessionId, expires_at: expiresAt })
      .onConflict((oc) => oc.column('key_hash').doNothing())
      .returning('session_id')
      .executeTakeFirst();

    if (result) {
      return { claimed: true };
    }

    // Key exists → fetch existing
    const existing = await this.db
      .selectFrom('idempotency_keys')
      .select('session_id')
      .where('key_hash', '=', keyHash)
      .executeTakeFirst();

    return { claimed: false, existingSessionId: existing?.session_id };
  }
}
```

---

## Integration in StartSessionUseCase

```typescript
// apps/backend/src/application/generation/start-session.usecase.ts

class StartSessionUseCase {
  constructor(
    private idempotency: IdempotencyStore,
    private sessionRepo: SessionRepository,
    private toolRegistry: ToolRegistry,
    private assetResolver: AssetResolver,
  ) {}

  async execute(cmd: StartSessionCommand): Promise<StartSessionResult> {
    // 1. Compute key
    const inputHash = this.hashInputs(cmd.inputs);
    const keyHash = IdempotencyKey.computeHash(
      cmd.userId, cmd.workspaceId, cmd.toolKey, inputHash
    );

    // 2. Check tool exists (fail fast before claiming)
    const tool = this.toolRegistry.get(cmd.toolKey);
    if (!tool) throw new ToolNotFoundError(cmd.toolKey);

    // 3. Acquire data (still needed even for existing sessions — to return tool info)
    const acquisitionData = await this.acquire(cmd, tool);

    // 4. Validate readiness (fail fast before claiming)
    const policy = ReadinessPolicy.from(tool);
    const readiness = policy.evaluate(acquisitionData);
    if (!readiness.isReady) throw new ReadinessError(readiness.missing);

    // 5. Create placeholder session ID for claim
    const sessionId = SessionId.generate();

    // 6. Atomic claim
    const claim = await this.idempotency.claim(keyHash, sessionId);

    if (!claim.claimed && claim.existingSessionId) {
      // Key already claimed → return existing session
      const existing = await this.sessionRepo.findById(claim.existingSessionId);
      if (existing) return { session: existing, tool, acquisitionData };
    }

    // 7. Create new session
    const session = Session.create(cmd.toolKey, cmd.workspaceId, cmd.userId);
    await this.sessionRepo.save(session);

    return { session, tool, acquisitionData };
  }
}
```

**Key design**: readiness check happens BEFORE the claim. If the user submits invalid data, no idempotency key is consumed. The claim only happens for valid, ready-to-start sessions.

---

## Cleanup

Expired keys are auto-cleaned:
- **Redis**: `EX` TTL handles it automatically
- **PostgreSQL**: periodic cleanup job:

```sql
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

Run as a cron or on a schedule (every hour).

## Sources

- [[IdempotencyKey]] — domain Value Object
- [[Database Schema]] — idempotency_keys table
- [[sources/PRD]] — FR-W02 (idempotency requirement)
- [[sources/USER-STORIES]] — US-GF04 (no duplicate content/credits)