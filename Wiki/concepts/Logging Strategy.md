---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
  - wiki/governance
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Logging Strategy

> Structured JSON logging with Pino — zero overhead, Railway-native  
> `apps/backend/src/infrastructure/logger.ts`

## Principle

**One logger, one format, one destination.** Pino writes structured JSON to `stdout`. Railway captures stdout natively — no log shippers, no Elasticsearch, no sidecar containers. In development, `pino-pretty` makes it human-readable.

---

## Dependencies

| Package | Context7 Library ID | Purpose |
|---------|-------------------|---------|
| `pino` | `/pinojs/pino` | Core logger — super fast, all natural JSON |
| `pino-http` | `/pinojs/pino-http` | Express middleware — auto request/response logging |
| `pino-pretty` | — (pino ecosystem) | Dev-only human-readable formatting |

### What we DON'T add

| ❌ Not added | Why |
|-------------|-----|
| `winston` | 2× slower, verbose API, larger dependency |
| `morgan` | Replaced by `pino-http` (more features, structured output) |
| `bunyan` | Legacy, pino is the spiritual successor |
| `pino-elasticsearch` | Railway handles log aggregation |
| `pino-opentelemetry-transport` | P2 — future observability |
| `debug` | Replaced by pino `trace` level |

---

## Logger Configuration

```typescript
// apps/backend/src/infrastructure/logger.ts

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  name: 'flow-app',
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),

  // Redact sensitive data — NEVER logged, even at trace level
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'authHeaderValue',     // API service credentials
    ],
    censor: '[REDACTED]',
    remove: false,           // keep key, censor value
  },

  // Production: raw JSON to stdout (Railway captures it)
  // Development: pretty-print via pino-pretty
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
  ),

  // Base fields on every log line
  base: {
    env: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version,
  },

  // Serializers: control what gets logged from objects
  serializers: {
    err: pino.stdSerializers.err,          // error stack trace
    req: pino.stdSerializers.req,          // request (method, url, headers)
    res: pino.stdSerializers.res,          // response (statusCode)
  },

  // Timestamp in ISO 8601
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

---

## HTTP Middleware

```typescript
// apps/backend/src/infrastructure/logger.ts

import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

export const httpLogger = pinoHttp({
  logger, // reuse the configured pino instance

  // Correlation ID — propagate or generate
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'] as string;
    if (existing) return existing;

    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  // Auto log level based on status code
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400)        return 'warn';
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  // Custom error message
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} (${err?.message ?? 'unknown'})`,

  // Attach user context if available
  customProps: (req, res) => ({
    userId: (req as any).user?.sub,
    correlationId: req.id,
  }),

  // Don't log health checks (noise reduction)
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
```

### Express Integration

```typescript
// apps/backend/src/app.ts

import express from 'express';
import { httpLogger, logger } from './infrastructure/logger';

const app = express();

// 1. HTTP logger — first middleware
app.use(httpLogger);

// 2. Attach child logger to request
app.use((req, _res, next) => {
  (req as any).log = logger.child({ reqId: req.id });
  next();
});

// 3. Routes
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
```

---

## Child Loggers — Context Propagation

```typescript
// apps/backend/src/application/generation/start-session.usecase.ts

class StartSessionUseCase {
  async execute(cmd: StartSessionCommand): Promise<StartSessionResult> {
    const log = logger.child({
      userId: cmd.userId,
      workspaceId: cmd.workspaceId,
      toolKey: cmd.toolKey,
      correlationId: cmd.correlationId,
    });

    log.info('Starting session');

    try {
      const result = await this.createSession(cmd);
      log.info({ sessionId: result.session.sessionId }, 'Session created');
      return result;
    } catch (error) {
      log.error({ err: error }, 'Failed to start session');
      throw error;
    }
  }
}
```

```typescript
// apps/backend/src/generation/worker/session-worker.ts

async function processSessionJob(job: Job<SessionJobData>): Promise<void> {
  const sessionId = job.data.sessionId;
  const session = await sessionRepo.findById(sessionId);

  const log = logger.child({
    sessionId,
    toolKey: session?.toolKey,
    attempt: job.attemptsMade + 1,
  });

  log.info('Job started');

  const startTime = Date.now();

  try {
    await executeSessionWorkflow(job);
    log.info({ durationMs: Date.now() - startTime }, 'Job completed');
  } catch (error) {
    log.error({ err: error, durationMs: Date.now() - startTime }, 'Job failed');
    throw error;
  }
}
```

---

## Log Levels

| Level | When | Production | Development |
|-------|------|-----------|-------------|
| `trace` | Function entry/exit, variable dumps | ❌ suppressed | ✅ active |
| `debug` | Step-by-step workflow details | ❌ suppressed | ✅ active |
| `info` | Normal operations: job started, request completed, session created | ✅ default | ✅ active |
| `warn` | Recoverable issues: rate limited, fallback used, retry | ✅ active | ✅ active |
| `error` | Errors: job failed, LLM timeout, 500 responses | ✅ active | ✅ active |
| `fatal` | Unrecoverable: DB connection lost, Redis down | ✅ active | ✅ active |

### Level per component

```typescript
// Per-component level override via env
// LOG_LEVEL=info
// LOG_LEVEL_BULLMQ=debug
// LOG_LEVEL_LLM=info

const workerLogger = logger.child(
  { component: 'bullmq' },
  { level: process.env.LOG_LEVEL_BULLMQ ?? logger.level }
);
```

---

## Log Schema — What Gets Logged

### HTTP Request

```json
{
  "level": 30,
  "time": "2026-07-30T10:00:00.000Z",
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "uuid",
  "req": { "method": "POST", "url": "/api/tools/blog-post/sessions" },
  "res": { "statusCode": 201 },
  "responseTime": 45.2,
  "msg": "POST /api/tools/blog-post/sessions → 201"
}
```

### Domain Operation

```json
{
  "level": 30,
  "time": "2026-07-30T10:00:01.000Z",
  "userId": "uuid",
  "workspaceId": "uuid",
  "toolKey": "blog-post",
  "sessionId": "uuid",
  "msg": "Session created"
}
```

### Job Lifecycle

```json
{
  "level": 30,
  "time": "2026-07-30T10:00:02.000Z",
  "sessionId": "uuid",
  "toolKey": "blog-post",
  "attempt": 1,
  "durationMs": 45000,
  "stepCount": 3,
  "tokensUsed": 4200,
  "msg": "Job completed"
}
```

### LLM Call

```json
{
  "level": 20,
  "time": "2026-07-30T10:00:01.500Z",
  "sessionId": "uuid",
  "stepNumber": 2,
  "model": "openai/gpt-4o-mini",
  "latencyMs": 3200,
  "promptTokens": 1800,
  "completionTokens": 400,
  "msg": "LLM call completed"
}
```

### Error

```json
{
  "level": 50,
  "time": "2026-07-30T10:00:03.000Z",
  "sessionId": "uuid",
  "err": {
    "type": "LlmGatewayError",
    "message": "Rate limited by OpenRouter",
    "stack": "...",
    "code": "RATE_LIMITED"
  },
  "msg": "Job failed"
}
```

---

## Redaction Rules

```typescript
// What is NEVER logged, even at trace level:

// ✅ Configured in logger.redact.paths:
// - password, passwordHash, token, accessToken, refreshToken
// - apiKey, secret, authorization headers
// - authHeaderValue (API service credentials)
// - cookie headers
// - JWT tokens in request headers

// Additionally, in application code:
logger.info({ apiKey: 'sk-1234' })     // → "[REDACTED]"
logger.info({ user: { password: 'x' } }) // → { user: { password: "[REDACTED]" } }
```

---

## Railway Integration

Pino writes JSON to `stdout`. Railway captures container stdout automatically — no configuration needed:

```
Pino stdout → Railway Log Stream → Railway Dashboard / CLI
```

```bash
# Query logs in Railway
railway logs --service backend
railway logs --service backend --level error
railway logs --service backend --since 30m
```

---

## Governance

| Rule | Enforcement |
|--------|-------------|
| **No `console.log`** | ESLint `no-console: error` (allow `console.error` only) |
| **Use `logger.info`, not `console.log`** | Code review |
| **No sensitive data in logs** | Pino redaction + code review |
| **Every use case/worker has a child logger** | Mandatory pattern |
| **Every log has a descriptive message** | `logger.info({ sessionId }, 'Session created')` |
| **Correlation ID always present** | `pino-http` middleware guarantees it |
| **Health check not logged** | `autoLogging.ignore: /health` |

---

## Sources

- [[BullMQ Worker Wiring]] — worker logging integration
- [[Job Queue - Monitoring and Stability]] — structured logging schema
- [[Error Mapping (Domain to HTTP)]] — error logging in middleware
- [[sources/PRD]] — NFR-O01 (structured logging with correlation ID)