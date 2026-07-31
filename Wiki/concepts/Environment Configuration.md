---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Environment Configuration

> All environment variables required to run Flow App  
> `apps/backend/.env`

## Variables

### Database

```bash
DATABASE_URL=postgresql://user:password@host:5432/flow_app
PG_POOL_MAX=20          # Kysely connection pool size
```

### Redis

```bash
REDIS_URL=redis://host:6379
```

Used by: BullMQ (job queue), idempotency (atomic claim), rate limiting, session cache.

### LLM Gateway

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_TIMEOUT=60000  # ms
```

Used by: [[LLM Gateway - OpenRouter|LlmGateway]].

### Model Overrides (Optional)

```bash
# Override default model per tier without redeploy
LLM_MODEL_PREMIUM=anthropic/claude-sonnet-4-20250514
LLM_MODEL_BALANCED=openai/gpt-4o-mini
LLM_MODEL_LIGHT=google/gemini-2.0-flash-lite-001
LLM_MODEL_SEARCH=google/gemini-2.5-pro-preview-05-06
```

### Authentication

```bash
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=15m              # access token lifetime
REFRESH_TOKEN_EXPIRES_DAYS=7    # refresh token lifetime
CSRF_SECRET=<random-32-char-string>
```

### OAuth (Optional)

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://app.flowapp.com/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://app.flowapp.com/auth/github/callback
```

### Server

```bash
PORT=3000
NODE_ENV=development            # 'development' | 'production' | 'test'
CORS_ORIGIN=http://localhost:5173
```

### Rate Limiting

```bash
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_MAX_REQUESTS=100     # per window per IP
```

### External APIs (Tool-specific)

```bash
SERPAPI_KEY=...                  # for ai-overview-analysis tool
```

Additional API keys are configured via the `/admin/api-services` CRUD — the `authHeaderValue` is stored encrypted in PostgreSQL, not in env vars. Only the default SerpAPI key is in env.

### Railway (Production)

```bash
# Auto-injected by Railway
DATABASE_URL=${{ Postgres.DATABASE_URL }}
REDIS_URL=${{ Redis.REDIS_URL }}

# Configured via Railway dashboard
OPENROUTER_API_KEY=...
JWT_SECRET=...
CSRF_SECRET=...
SERPAPI_KEY=...
CORS_ORIGIN=https://app.flowapp.com
NODE_ENV=production
```

## .env.example

```bash
# apps/backend/.env.example

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flow_app
PG_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379

# LLM Gateway
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_TIMEOUT=60000

# Auth
JWT_SECRET=change-me-to-a-random-64-char-string
JWT_EXPIRES_IN=15m
CSRF_SECRET=change-me-to-a-random-32-char-string

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# External APIs
SERPAPI_KEY=

# OAuth (optional — leave empty to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Startup Validation

```typescript
// apps/backend/src/config.ts

function validateConfig(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPENROUTER_API_KEY',
    'JWT_SECRET',
    'CSRF_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`FATAL: ${key} is not set. Server refuses to start.`);
    }
  }
}

validateConfig();
```

**Fail-closed**: the server refuses to start if any required variable is missing. No silent misconfiguration in production.

## Sources

- [[Database Schema]] — DATABASE_URL
- [[BullMQ Worker Wiring]] — REDIS_URL
- [[LLM Gateway - OpenRouter]] — OPENROUTER_*
- [[Auth Middleware]] — JWT_SECRET, CSRF_SECRET
- [[API Routes]] — PORT, CORS_ORIGIN
- [[Logging Strategy]] — LOG_LEVEL, LOG_PRETTY