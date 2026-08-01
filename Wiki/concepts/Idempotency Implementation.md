---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-01
source_count: 5
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
2. Server computes IdempotencyKey: SHA-256(userId|workspaceId|toolKey|inputHash|promptSignature)
3. Server attempts atomic claim via Redis (primary) or PostgreSQL (fallback)
4. If claim succeeds → create new Session, store key→sessionId mapping
5. If claim fails (key exists) → return existing Session (HTTP 200, not 201)
```

## Canonical Constants

```typescript
const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24h
```

TTL is unified across stores to avoid behavior drift.

## Redis Implementation (Primary)

Redis `SET NX` provides atomic "set if not exists" with automatic TTL-based cleanup.

**Graceful degradation**: if Redis is unavailable, fall back to PostgreSQL (see below). The system logs a warning and continues. Redis is the primary, PostgreSQL is the fallback — never a single point of failure for idempotency.

```typescript
// apps/backend/src/infrastructure/idempotency-store.ts

class RedisIdempotencyStore {
  constructor(private redis: Redis) {}

  async claim(keyHash: string, sessionId: string, ttlSeconds: number = IDEMPOTENCY_TTL_SECONDS): Promise<{
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

When Redis is unavailable, fall back to PostgreSQL with `INSERT ON CONFLICT`.

Because `idempotency_keys.session_id` references `sessions.id`, PostgreSQL fallback must be executed in one transaction where the Session row exists before key insertion.

```typescript
// packages/infra-db/src/repositories/pg-idempotency-store.ts

class PgIdempotencyStore {
  constructor(private db: Kysely<DB>) {}

  async claimOrCreate(
    keyHash: string,
    createSession: (tx: Kysely<DB>, sessionId: string) => Promise<void>,
  ): Promise<{ claimed: boolean; sessionId: string }> {
    return this.db.transaction().execute(async (tx) => {
      const existing = await tx
        .selectFrom('idempotency_keys')
        .select('session_id')
        .where('key_hash', '=', keyHash)
        .executeTakeFirst();

      if (existing?.session_id) {
        return { claimed: false, sessionId: existing.session_id };
      }

      const sessionId = SessionId.generate().value;
      await createSession(tx, sessionId); // session exists first (FK-safe)

      await tx
        .insertInto('idempotency_keys')
        .values({
          key_hash: keyHash,
          session_id: sessionId,
          expires_at: sql`NOW() + INTERVAL '24 hours'`,
        })
        .execute();

      return { claimed: true, sessionId };
    });
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
    const promptSignature = this.buildPromptSignature(cmd.toolKey);
    const keyHash = IdempotencyKey.computeHash(
      cmd.userId, cmd.workspaceId, cmd.toolKey, inputHash, promptSignature
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

    // 5. Atomic claim or create (store-specific implementation behind one contract)
    const result = await this.idempotency.claimOrCreate(keyHash, async (sessionId) => {
      const session = Session.createWithId(
        sessionId,
        cmd.toolKey,
        cmd.workspaceId,
        cmd.userId,
        keyHash,
      );
      await this.sessionRepo.save(session);
      return session;
    });

    return { session: result.session, tool, acquisitionData };
  }
}
```

**Key design**: readiness check happens BEFORE the claim. If the user submits invalid data, no idempotency key is consumed. The claim only happens for valid, ready-to-start sessions.

## Deterministic Contract

To avoid race conditions and drift between stores:

1. Compute one canonical key hash from user/workspace/tool/input/prompt signature.
2. Check if key already exists; return existing session when present.
3. For new requests, bind exactly one `sessionId` to the key.
4. Persist session and key mapping atomically according to store constraints:
   - Redis primary: claim first (`SET NX`) then persist session; on persistence failure, release claim.
   - PostgreSQL fallback: create session and key row in the same transaction (FK-safe).

This guarantees a single canonical `sessionId` for identical requests across retries.

---

## Cleanup

Expired keys are auto-cleaned:
- **Redis**: `EX` TTL handles it automatically
- **PostgreSQL**: periodic cleanup job:

```sql
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

Run as a cron or on a schedule (every hour). TTL target is 24 hours.

## Sources

- [[IdempotencyKey]] — domain Value Object
- [[Database Schema]] — idempotency_keys table
- [[sources/PRD]] — FR-W02 (idempotency requirement)
- [[sources/USER-STORIES]] — US-GF04 (no duplicate content/credits)
- [[API Contract Baseline v1]] — canonical replay semantics
