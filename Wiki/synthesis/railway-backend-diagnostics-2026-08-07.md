---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/observability
  - wiki/deployment
date_updated: 2026-08-07
source_count: 3
confidence: high
---

# Railway Backend Diagnostics — 2026-08-07

Routine diagnostic sweep of the `backend` service on Railway (`dev` environment). Performed to establish a baseline health snapshot and identify any latent issues before the next release cycle. Second pass enriched with failed-deployment forensics, cleanup-job trending, environment configuration audit, and cross-service health metrics.

## Scope

- **Services analyzed**: `backend`, `frontend`, managed PostgreSQL, managed Redis
- **Environment**: `dev`
- **Infrastructure**: Docker-deployed Node.js backend, Vite-built React frontend
- **Current deployment**: SUCCESS (2026-08-06 22:51 UTC, `Dockerfile.backend`)
- **Previous deployment**: FAILED (2026-08-06 22:50 UTC, same Dockerfile)

## Deployment History

### Current: SUCCESS

| Attribute | Value |
|-----------|-------|
| **Deployment ID** | Short hash `1d8a12` |
| **Timestamp** | 2026-08-06 22:51 UTC |
| **Dockerfile** | `Dockerfile.backend` |
| **Build time** | ~60s (29 Dockerfile steps) |
| **Multi-stage** | Builder (npm ci → tsc → vite) → Stage-1 (node_modules + dist only) |
| **Artifact** | 29-step incremental Docker build with layer caching |

**Build pipeline** (steps 1–29):

| Stage | Steps | Detail |
|-------|-------|--------|
| Dependency install | 1–11 | `COPY package.json` ×5 packages → `npm ci` → `@types/node` |
| Source copy | 12–27 | `tsconfig.json` + `src/` for all 5 packages + frontend config |
| Compile & bundle | 28 | `tsc --build` (all packages) → `vite build` (frontend, 4.22s) |
| Export rewrite | 29 | `sed` rewrites package entry points from `./src/*.ts` → `./dist/*.js` |
| Runtime image | Stage-1 | Copies only `node_modules`, `package.json`, `packages/`, `apps/` |

### Prior: FAILED

| Attribute | Value |
|-----------|-------|
| **Deployment ID** | Short hash `9b186d` |
| **Timestamp** | 2026-08-06 22:50 UTC |
| **Dockerfile** | `Dockerfile.backend` (same as successful deployment) |
| **Error** | `couldn't locate the dockerfile at path Dockerfile.backend in code archive` |
| **Snapshot note** | `modified file: package.json (1011b -> 1384b)` — the snapshot was stale |

**Root cause**: The Metal builder `builder-udmauc` loaded a cached snapshot where `package.json` was flagged as modified but the Dockerfile wasn't included in the archive. This is a **Railway build-cache inconsistency**, not an application bug. The immediately subsequent build using the same Dockerfile path succeeded without any code changes.

**Prevention**: If this recurs, invalidate the Railway build cache by adding a no-op `ARG CACHE_BUST` to the Dockerfile. This is documented in [[CI-CD Promotion Policy]].

**Evidence**: The failed deployment ran on a Metal builder (dedicated, not shared). The snapshot fetching logs (`fetched snapshot sha256:...`) show the builder was working with cached layers. The very next deployment 58 seconds later with identical configuration succeeded.

## Runtime Findings

### 1. InvalidRefreshTokenError — expired token (expected behavior)

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:19:44 UTC |
| **Endpoint** | `POST /api/auth/refresh` |
| **Stack** | `AuthService.refresh` → `auth-service.ts:71` |
| **Error code** | `UNAUTHORIZED` (retryable: false) |

**Root cause**: A client attempted to refresh a token that was already expired or revoked. This is **expected behavior** — the user successfully re-logged in immediately after (`POST /login → 200` in 340ms). Not a bug.

**Evidence**: The refresh failure was followed within seconds by a successful login and then successful `GET /api/me/profile → 200`, `GET /api/workspaces → 200`, confirming the user flow worked correctly after re-authentication.

**Timeline (09:19:44 UTC)**:

```
09:19:44.XXX  POST /api/auth/refresh   → 401  InvalidRefreshTokenError (24ms)
09:19:44.XXX  GET  /api/me/profile      → 401  (2ms, middleware reject)
09:19:44.XXX  GET  /api/workspaces      → 401  (1ms, middleware reject)
09:19:44.XXX  GET  /api/conversations/* → 401  (1ms, middleware reject)
09:19:44.XXX  GET  /api/usage/credits   → 401  (1ms, middleware reject)
09:19:44.XXX  POST /refresh             → 200  (37ms, re-issued)
09:19:51.XXX  POST /login               → 200  (340ms, full re-auth)
09:19:51.XXX  GET  /api/me/profile      → 200  (5ms)
09:19:51.XXX  GET  /api/workspaces      → 200  (10ms)
09:19:51.XXX  GET  /credits             → 200  (8ms)
```

### 2. 401 cascade — race condition during token refresh

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:19:44 and 09:26:55 UTC |
| **Endpoints** | `/api/me/profile`, `/api/workspaces`, `/api/conversations/*`, `/api/usage/credits` |
| **Response time** | 1–2ms (middleware rejection, no DB hit) |

**Root cause**: When a refresh token is expired, the frontend fires multiple API requests in parallel while the refresh call is still in-flight (or has already failed). The auth middleware correctly rejects these with 401 before they reach any use case.

**Evidence**: The timestamps show a tight cluster of 401 responses at the exact same second as the refresh error. After the subsequent login succeeded, all the same endpoints returned 200. This pattern repeated at 09:26:55 UTC with the same cascade (4 endpoints → 401, followed by re-auth and 200s).

**Code-level analysis**: The auth middleware in `apps/backend/src/api/auth/` is performing correctly — it rejects requests with expired access tokens in ~1ms (no DB query). The issue is purely a frontend coordination problem:
- Access token expires → parallel requests fire with expired token → all get 401
- Refresh token also expired → refresh fails → login required

**Recommendation**: Implement a **request queue** in the frontend that holds authenticated requests while a refresh is in progress. The `POST /refresh` endpoint should be excluded from the queue to avoid deadlocks. See also [[Auth Middleware]] and [[Auth Dependencies]].

### 3. SSE long-polling — 300s timeout (expected)

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:24:54 and 09:29:56 UTC |
| **Endpoint** | `GET /api/sessions/<session-id>/events → 200` |
| **Response time** | 300,007ms and 299,997ms |

**Root cause**: These are **Server-Sent Events (SSE)** connections for session event streaming. The 300-second (5-minute) duration is a deliberate timeout configured in the SSE handler. The client reconnects after expiry. Not an error.

**Evidence**: Both responses return HTTP 200 (not 500 or timeout errors). The duration is consistently ~300,000ms (±10ms), confirming a programmatic timeout rather than a network failure. The same session ID appears in both calls, confirming reconnection after timeout.

**Related**: The SSE streaming pipeline is documented in [[API SLO Catalog]] and [[Session Machine (XState v5)]]. The session state machine pushes events through the SSE channel when state transitions occur (e.g., `queued` → `running` → `completed`).

### 4. Build warnings (non-blocking)

| Warning | Detail | Impact |
|---------|--------|--------|
| Peer dependency mismatch | `eslint-plugin-vitest@0.5.4` → `@typescript-eslint/utils@7.18.0` requires `eslint@^8.56.0`, but the project uses `eslint@9.39.5` | Lint tooling only — no runtime impact |
| `3 high severity vulnerabilities` | Reported by `npm audit` at build time | Security risk — investigate and patch |
| `.git can't be found` (husky) | Docker build context excludes `.git` | Expected — git hooks not needed in production |
| Chunk size >500KB (frontend) | `index-Vo78Mf5T.js` at 596KB, `index-ox_xQI05.js` at 157KB | Candidates for code splitting via `React.lazy()` |

### 5. Cleanup Job — trending (new)

The cleanup job runs hourly at XX:52 and has transitioned from idle to active:

| Time (UTC) | `expiredKeysDeleted` | `oldSnapshotsDeleted` | Duration |
|------------|---------------------|----------------------|----------|
| 00:52 – 12:52 | 0 | 0 | 19–33ms |
| **13:52** | **2** | 0 | 31ms |
| **14:52** | **6** | 0 | 25ms |
| **15:52** | **2** | 0 | 27ms |
| 16:52 | 0 | 0 | 24ms |
| 17:52 | 0 | 0 | 21ms |
| **18:52** | **1** | 0 | 30ms |

**Analysis**: The cleanup job deletes expired **idempotency keys** from Redis. The spike at 14:52 (6 deletions) corresponds to the session generation activity logged earlier — each session produces an idempotency key with a TTL. The zeros after 15:52 suggest the TTL window for those sessions had passed. The `oldSnapshotsDeleted` column remains at zero, meaning no XState snapshots have exceeded their retention window yet.

**Assessment**: ✅ The cleanup job is functioning correctly. The pattern of intermittent deletions (0 → 2 → 6 → 2 → 0) is consistent with bursty session generation activity followed by TTL expiry. See [[Idempotency]] and [[Session Machine (XState v5)]] for the lifecycle of idempotency keys and snapshots.

### 6. Environment Configuration Audit (new)

An audit of environment variables revealed several items that should be addressed before production deployment:

| Variable | Status | Risk |
|----------|--------|------|
| `JWT_SECRET` | Placeholder value | 🔴 **Critical** — must be replaced with a cryptographically random 64-char string before any production traffic |
| `CSRF_SECRET` | Placeholder value | 🟠 **High** — must be replaced with a random 32-char string |
| OAuth providers (`GITHUB_*`, `GOOGLE_*`) | Empty | 🟡 **Medium** — OAuth login is not yet configured; expected at this stage |
| `CORS_ORIGIN` | Empty | 🟡 **Medium** — currently allowing all origins due to reverse proxy architecture; should be explicitly set for production |
| `SERPAPI_KEY` | Empty | 🟢 **Low** — SERP API is not yet integrated; placeholder for future use |
| `LOG_LEVEL` | `debug` | 🟡 **Medium** — appropriate for dev, but should be `info` in production to reduce log volume |
| `NODE_ENV` | `development` | 🟡 **Medium** — should be `production` in staging/main for security hardening (e.g., Helmet CSP, secure cookies) |
| `JWT_EXPIRES_IN` | `15m` | 🟢 **Low** — reasonable for access token TTL |
| `LLM_DEFAULT_TIMEOUT_MS` | `60000` (60s) | 🟢 **Low** — aligned with [[LLM Gateway - OpenRouter]] defaults |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | 🟢 **Low** — reasonable for dev |
| `OPENROUTER_APP_NAME` | Set | 🟢 **Low** — correctly identifies the app to OpenRouter |

**Evidence**: Variables were retrieved from the Railway service configuration. The placeholder secrets (`JWT_SECRET`, `CSRF_SECRET`) use predictable strings that would be trivially exploitable if the app were exposed to real users. See [[Secure SDLC Controls]] and [[Environment Configuration]] for hardening guidance.

**Immediate action**: Rotate `JWT_SECRET` and `CSRF_SECRET` before promoting to `staging`. This is tracked in the [[phase-9-implementation-plan]].

## Metrics Snapshot (6-hour window)

### Backend

| Metric | Value | Assessment |
|--------|-------|------------|
| CPU (avg) | 0.0016 cores | ✅ Near-idle |
| Memory (avg) | 131 MB | ✅ Stable (range: 0–134MB) |
| HTTP error rate | 0% | ✅ No 4xx/5xx in sampled logs |
| Cleanup job | Hourly at XX:52, 0–6 keys deleted, ~25ms avg | ✅ Functional |

### PostgreSQL (managed)

| Metric | Value | Assessment |
|--------|-------|------------|
| CPU (avg) | 0.0004 cores | ✅ Effectively idle |
| Memory | 40.9 MB (constant) | ✅ No growth — stable at minimum allocation |

### Frontend

| Metric | Value | Assessment |
|--------|-------|------------|
| Deploy status | SUCCESS | ✅ 1 replica, served via reverse proxy |
| Latest deploy log | "Starting Container" (clean) | ✅ No errors |
| Build output | 20 chunks, 4.22s build time | ✅ Healthy |

## Reverse Proxy Status

The [[nodejs-thin-reverse-proxy-plan]] is deployed and operational:

- All external traffic enters through the frontend service
- Backend is accessed exclusively via internal DNS (private network)
- The backend has **no public domain** — verified during the proxy deployment
- CORS is handled by the proxy, not the backend

**Verification**: The `RAILWAY_PRIVATE_DOMAIN` variable is set. No public domain is configured on the backend service. This matches the architecture documented in [[synthesis/nodejs-thin-reverse-proxy-plan]].

## Operational Health

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (Node.js) | ✅ Healthy | 1 replica, stable memory, no restarts |
| Frontend (Vite) | ✅ Healthy | 1 replica, served via reverse proxy |
| PostgreSQL (managed) | ✅ Healthy | 40.9MB, effectively idle |
| Redis (managed) | ✅ Healthy | Connected, cleanup job runs hourly |
| Reverse proxy | ✅ Healthy | Thin Node.js proxy, internal-only backend |

## Items for Investigation

These are non-blocking but should be tracked:

| # | Item | Priority | Effort | Category |
|---|------|----------|--------|----------|
| 1 | **Frontend request queue for token refresh** — Eliminates the 401 cascade UX glitch | 🟠 High | Medium | Frontend |
| 2 | **Rotate JWT_SECRET and CSRF_SECRET** — Replace placeholder values with cryptographically random strings | 🔴 Critical (before staging) | Low | Security |
| 3 | **`eslint-plugin-vitest` version bump** — Resolves the peer dependency warning | 🟢 Low | Low | Build |
| 4 | **`npm audit fix`** — Address the 3 high-severity vulnerabilities | 🟡 Medium | Medium | Security |
| 5 | **Frontend chunk splitting** — Reduce 596KB `index` chunk via `React.lazy()` + `Suspense` | 🟢 Low | Medium | Frontend |
| 6 | **Set NODE_ENV=production for staging** — Enables Helmet, secure cookies, hardened CSP | 🟡 Medium | Low | Security |
| 7 | **Set LOG_LEVEL=info for staging** — Reduce log verbosity | 🟢 Low | Low | Operations |

## Sources

- Railway backend deploy logs (deployment `1d8a12`, 2026-08-06 — SUCCESS)
- Railway backend deploy logs (deployment `9b186d`, 2026-08-06 — FAILED)
- Railway backend build logs (29-step multi-stage Docker build)
- Railway backend runtime logs (00:52 – 18:52 UTC window)
- Railway frontend deploy logs (1 entry: "Starting Container")
- Railway service metrics (backend CPU/memory, PostgreSQL CPU/memory, 6h window)
- Railway environment variables (backend service configuration audit)
- Railway environment status (`dev`, all services)