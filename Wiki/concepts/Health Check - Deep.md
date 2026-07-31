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

# Health Check — Deep

> Deep health verification: database, Redis, BullMQ  
> `GET /health` (basic) + `GET /health/deep` (admin-only)

## Principle

`GET /health` is lightweight (no external calls) — Railway uses it for readiness probes (every 2 seconds). `GET /health/deep` verifies all critical dependencies — used by monitoring and admins.

## Light Health Check

```typescript
// apps/backend/src/routes/health.ts

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});
```

**No DB queries** — must respond in <1ms to avoid skewing Railway readiness probes.

## Deep Health Check

```typescript
// apps/backend/src/routes/health.ts

import { authenticate, requireRole } from '../middleware/auth';

router.get('/health/deep', authenticate, requireRole('admin'), async (_req, res) => {
  const checks: Record<string, HealthStatus> = {};

  // 1. Database
  try {
    await sql`SELECT 1`.execute(db);
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
  }

  // 2. Redis
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch (err) {
    checks.redis = 'error';
  }

  // 3. Database connection pool
  try {
    const pool = (db.getExecutor().adapter as any).pool;
    checks.dbPool = {
      status: 'ok',
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
  } catch {
    checks.dbPool = { status: 'unknown' };
  }

  // 4. BullMQ
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      sessionQueue.getWaitingCount(),
      sessionQueue.getActiveCount(),
      sessionQueue.getCompletedCount(),
      sessionQueue.getFailedCount(),
      sessionQueue.getDelayedCount(),
    ]);
    checks.bullmq = {
      status: 'ok',
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch {
    checks.bullmq = { status: 'error' };
  }

  // 5. LLM Gateway (OpenRouter)
  try {
    const start = Date.now();
    await llmGateway.ping();
    checks.llmGateway = { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    checks.llmGateway = { status: 'error' };
  }

  const allOk = Object.values(checks).every(c =>
    typeof c === 'string' ? c === 'ok' : c.status === 'ok'
  );

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks,
  });
});

type HealthStatus = 'ok' | 'error' | { status: string; [key: string]: unknown };
```

## Response Shape

```json
{
  "status": "healthy",
  "uptime": 86400,
  "memory": { "heapUsed": 125829120, "heapTotal": 268435456, "rss": 314572800 },
  "checks": {
    "database": "ok",
    "redis": "ok",
    "dbPool": { "status": "ok", "total": 20, "idle": 18, "waiting": 0 },
    "bullmq": { "status": "ok", "waiting": 2, "active": 3, "completed": 142, "failed": 0, "delayed": 0 },
    "llmGateway": { "status": "ok", "latencyMs": 45 }
  }
}
```

## Railway Configuration

```toml
# railway.toml

[service]
healthcheckPath = "/health"       # Light check (every 2s)

[deploy]
# Deep check is admin-only — not used for readiness probe
```

## Sources

- [[API Routes]] — health endpoint
- [[BullMQ Worker Wiring]] — queue monitoring
- [[LLM Gateway - OpenRouter]] — gateway ping
- [[Logging Strategy]] — structured logging with correlation ID