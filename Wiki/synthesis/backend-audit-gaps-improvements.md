---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/review
date_updated: 2026-07-31
source_count: 0
---

# Backend Audit — Gaps & Improvements

> Exhaustive review of the backend architecture. What's missing, what can be improved.

---

## 🔴 CRITICAL — Missing, blocks production

### 1. File Storage Strategy

**Status**: ❌ N/A — files are ephemeral  
**Why**: Files are consumed immediately for LLM processing. The parsed content lives in memory during the session (XState context) and in `session_snapshots` JSONB for crash recovery. No persistent storage needed. Original binary files are discarded after parsing.

**Correction**: None. The current design is correct.

```typescript
// apps/backend/src/infrastructure/file-storage.ts

class FileStorage {
  constructor(private bucket: S3Client) {}

  async upload(key: string, content: Buffer, contentType: string): Promise<string> {
    // Upload to Railway bucket
    // Return URL or key for retrieval
  }

  async download(key: string): Promise<Buffer> {
    // Retrieve from bucket
  }

  async delete(key: string): Promise<void> {
    // Cleanup after session completion or expiration
  }
}
```

**Files stored**: briefing uploads, CSV data, context documents. Not artifacts (artifacts are TEXT in DB). Not crawl_data (raw API JSON stored as JSONB).

---

### 2. Migration Tooling

**Status**: ✅ Done — see [[Migration Tooling]]  
**Solution**: FileMigrationProvider + Kysely, `npm run migrate:up`, CI integration.

**Proposal**: `kysely-codegen` for type generation + manual migration script.

```json
// packages/infra-db/package.json
{
  "scripts": {
    "migrate:up": "tsx src/migrate.ts up",
    "migrate:down": "tsx src/migrate.ts down",
    "migrate:create": "tsx src/migrate.ts create",
    "codegen": "kysely-codegen --out-file src/types.ts"
  }
}
```

---

### 3. Deep Health Check

**Status**: ✅ Done — see [[Health Check - Deep]]  
**Solution**: `GET /health` (light, <1ms) + `GET /health/deep` (admin-only, DB/Redis/BullMQ/LLM checks). Containers are not restarted.

**Proposal**:

```typescript
router.get('/health', async (_req, res) => {
  const checks = await Promise.allSettled([
    db.selectFrom('sessions').select(sql`1`.as('ok')).executeTakeFirst(),
    redis.ping(),
  ]);

  const allOk = checks.every(c => c.status === 'fulfilled');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks: {
      database: checks[0].status === 'fulfilled' ? 'ok' : 'error',
      redis:    checks[1].status === 'fulfilled' ? 'ok' : 'error',
    },
    uptime: process.uptime(),
  });
});
```

---

### 4. File Upload Security

**Status**: ✅ Done — see [[File Upload Security]]  
**Solution**: multer memoryStorage, 10MB limit, MIME whitelist, mammoth/pdf-parse for parsing. Files ephemeral — parsed, then discarded.

**Impact**: A user could upload a 500MB file and saturate the worker's memory. Or a `.exe` renamed to `.txt`.

**Proposal**:

```typescript
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ['text/plain', 'text/markdown', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function validateFile(file: Express.Multer.File): void {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new ValidationError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`);
  }
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError(`File type ${file.mimetype} not allowed`);
  }
}
```

---

## 🟡 SIGNIFICANT — Improves reliability or developer experience

### 5. Graceful Degradation — Redis Down

**Status**: ✅ Applied — see [[Idempotency Implementation]]  
**Solution**: PostgreSQL fallback for idempotency. Rate limiting disabled. SSE → poll fallback.

**Proposal**: Fail-closed with PostgreSQL fallback where possible.

| Feature | Redis Down Behavior |
|---------|-------------------|
| BullMQ | In-memory fallback? No — too complex. **Reject new jobs**, existing sessions continue? |
| Idempotency | Fallback to PostgreSQL `INSERT ON CONFLICT` (already documented) |
| Rate limiting | **Temporarily disable** (log warning) — better no rate limit than no service |
| Event bridge (SSE) | SSE doesn't work. **Poll fallback** (already documented in Session List) |

---

### 6. Database Connection Pool Monitoring

**Status**: ✅ Applied — see [[Health Check - Deep]]  
**Solution**: `GET /health/deep` returns pool stats (total, idle, waiting).

**Proposal**: Expose metrics in the health check or in a separate endpoint.

```typescript
router.get('/health/deep', authenticate, requireRole('admin'), async (_req, res) => {
  const pool = (db as any).pool;
  res.json({
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
    redis: { connected: redis.status === 'ready' },
    bullmq: {
      waiting: await sessionQueue.getWaitingCount(),
      active: await sessionQueue.getActiveCount(),
      failed: await sessionQueue.getFailedCount(),
    },
  });
});
```

---

### 7. Artifact Size Management

**Status**: ✅ Applied — see [[Artifact]]  
**Solution**: `MAX_ARTIFACT_SIZE=500KB` constraint, 500 char preview, full download via dedicated endpoint. An LLM can generate very long output (video scripts, blog articles).

**Proposal**:

- **Application limit**: `MAX_ARTIFACT_SIZE = 500KB`. If the LLM produces larger output, truncate or fail.
- **Preview**: only the first 500 characters in `SessionListItemDTO.lastArtifactPreview`.
- **Full download**: only via `GET /api/artifacts/:id/download`.
- **Future**: for very large outputs (>1MB), move to object storage instead of TEXT.

---

### 8. Session Cleanup

**Status**: ✅ Applied — see [[Database Schema]] Retention Policy  
**Solution**: 90d completed, 30d failed, cascade cleanup, hourly cron. `crawl_data` associated with expired sessions takes up space.

**Proposal**: Retention policy.

| Data | Retention | Cleanup |
|------|-----------|---------|
| Sessions (completed) | 90 days | Soft delete or archive |
| Sessions (failed) | 30 days | Delete |
| Crawl data | Follow session retention | Cascade delete |
| Session snapshots | Follow session retention | Cascade delete |
| Idempotency keys | 24h TTL | Auto-expire (already implemented) |
| Refresh tokens | 7 days | Already implemented |

```sql
-- Cron job (every hour)
DELETE FROM session_snapshots WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM crawl_data WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'completed' AND created_at < NOW() - INTERVAL '90 days'
);
```

---

### 9. Structured Prompt Template Validation

**Status**: ✅ Applied — see [[LLM Gateway - OpenRouter]] Prompt Validation section  
**Solution**: Startup check — fail-fast if any template is missing. Server refuses to start.

```typescript
// apps/backend/src/infrastructure/prompt-loader.ts

function validateAllTemplates(): void {
  const missing: string[] = [];

  for (const tool of Object.values(toolRegistry)) {
    for (const step of tool.steps) {
      const systemPath = `prompts/${step.prompt.template}/system.md`;
      const userPath   = `prompts/${step.prompt.template}/user.md`;

      if (!fs.existsSync(systemPath)) missing.push(systemPath);
      if (!fs.existsSync(userPath))   missing.push(userPath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`FATAL: Missing prompt templates:\n${missing.join('\n')}`);
  }
}
```

---

## 🟢 NICE-TO-HAVE — Improves developer experience

### 10. Docker Compose for Local Dev

**Status**: ✅ Done — see [[Docker Compose - Local Dev]]  
**Solution**: `docker compose up -d` → PostgreSQL 16 + Redis 7 in 30 seconds.

```yaml
# docker-compose.yml (root)

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: flow_app
      POSTGRES_PASSWORD: flow_app
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7
    ports: ['6379:6379']

volumes:
  pgdata:
```

```bash
docker compose up -d   # starts PostgreSQL + Redis
npm run dev             # starts backend + frontend
```

### 11. Seed Data

**Status**: ✅ Done — see [[Seed Data]]  
**Solution**: `npm run seed` → 2 users, 2 workspaces, assets, quotas, models. Demo credentials documented.

Script to populate the DB with test data for local development.

```typescript
// packages/infra-db/src/seed.ts

async function seed() {
  // 1. Create test user
  const user = await db.insertInto('users').values({
    email: 'dev@flowapp.com',
    password_hash: await bcrypt.hash('password123', 12),
    role: 'admin',
  }).returning('id').executeTakeFirst();

  // 2. Create test workspace
  const workspace = await db.insertInto('workspaces').values({
    user_id: user!.id,
    name: 'Test Workspace',
  }).returning('id').executeTakeFirst();

  // 3. Create test quota
  await db.insertInto('quotas').values({
    user_id: user!.id,
    period: '2026-08',
    artifact_limit: 1000,
    artifact_count: 0,
    credit_limit: 250,
    credit_consumed: 0,
  }).execute();

  // 4. Create test LLM models
  // ...
}

seed().then(() => process.exit(0));
```

### 12. API Documentation (OpenAPI)

**Status**: ✅ Done — see [[API Documentation - OpenAPI]]  
**Solution**: `zod-to-openapi` auto-generates OpenAPI 3.1 from Zod schemas. Swagger UI at `GET /api/docs`.

Generate `openapi.json` from Express routes for interactive documentation (Swagger UI).

**Proposal**: `zod-to-openapi` — since we already use Zod for validation, we can auto-generate the OpenAPI schema.

---

## Priority Summary

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1 | File Storage (Railway bucket) | 🔴 Critical | Medium |
| 2 | Migration Tooling | 🔴 Critical | Small |
| 3 | Deep Health Check | 🔴 Critical | Small |
| 4 | File Upload Security | 🔴 Critical | Small |
| 5 | Graceful Degradation (Redis) | 🟡 Significant | Large |
| 6 | DB Pool Monitoring | 🟡 Significant | Small |
| 7 | Artifact Size Management | 🟡 Significant | Small |
| 8 | Session Cleanup | 🟡 Significant | Medium |
| 9 | Prompt Template Validation | 🟡 Significant | Small |
| 10 | Docker Compose | 🟢 Nice-to-have | Small |
| 11 | Seed Data | 🟢 Nice-to-have | Small |
| 12 | API Documentation | 🟢 Nice-to-have | Medium |

---

## What We're NOT Forgetting

✅ Domain model — complete (4 BC, 7 entity, 24 VO, 3 DS, 9 events)  
✅ DDD compliance — reviewed and fixed (15 fixes applied)  
✅ Database schema — 15 tables, 7 enums, Kysely types  
✅ API routes — 45 endpoints with SSE  
✅ BullMQ — worker, retry, crash recovery, monitoring  
✅ LLM Gateway — OpenRouter with tier mapping and fallback  
✅ Auth — Passport.js + bcrypt + Helmet + rate limiting  
✅ Testing — Vitest v4, Supertest, MSW, coverage thresholds  
✅ Logging — Pino, correlation ID, redaction  
✅ Frontend — 17 components, MUI v6, ToolPage machine, Session List  
✅ Copy — centralized packages/copy  
✅ DI — manual wiring, testable  
✅ Quota — two-track system (artifact gate + credits) + Plan