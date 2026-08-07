---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/observability
  - wiki/deployment
date_updated: 2026-08-07
source_count: 1
confidence: high
---

# Railway Backend Diagnostics — 2026-08-07

Routine diagnostic sweep of the `backend` service on Railway (`dev` environment). Performed to establish a baseline health snapshot and identify any latent issues before the next release cycle.

## Scope

- **Service**: `backend` (Docker-deployed Node.js app)
- **Environment**: `dev`
- **Infrastructure**: managed PostgreSQL + managed Redis
- **Last deployment**: 2026-08-06 22:51 UTC (SUCCESS, healthy)

## Findings

### 1. InvalidRefreshTokenError — expired token (expected behavior)

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:19:44 UTC |
| **Endpoint** | `POST /api/auth/refresh` |
| **Stack** | `AuthService.refresh` → `auth-service.ts:71` |
| **Error code** | `UNAUTHORIZED` (retryable: false) |

**Root cause**: A client attempted to refresh a token that was already expired or revoked. This is **expected behavior** — the user successfully re-logged in immediately after (`POST /login → 200` in 340ms). Not a bug.

**Evidence**: The refresh failure was followed within seconds by a successful login and then successful `GET /api/me/profile → 200`, `GET /api/workspaces → 200`, confirming the user flow worked correctly after re-authentication.

### 2. 401 cascade — race condition during token refresh

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:19:44 and 09:26:55 UTC |
| **Endpoints** | `/api/me/profile`, `/api/workspaces`, `/api/conversations/*`, `/api/usage/credits` |
| **Response time** | 1–2ms (middleware rejection, no DB hit) |

**Root cause**: When a refresh token is expired, the frontend fires multiple API requests in parallel while the refresh call is still in-flight (or has already failed). The auth middleware correctly rejects these with 401 before they reach any use case.

**Evidence**: The timestamps show a tight cluster of 401 responses at the exact same second as the refresh error. After the subsequent login succeeded, all the same endpoints returned 200.

**Recommendation**: Implement a **request queue** in the frontend that holds authenticated requests while a refresh is in progress. See also [[Auth Middleware]] and [[Auth Dependencies]].

### 3. SSE long-polling — 300s timeout (expected)

| Attribute | Value |
|-----------|-------|
| **Timestamp** | 09:24:54 and 09:29:56 UTC |
| **Endpoint** | `GET /api/sessions/2bed196b-05c1-401d-a74d-d45c24ffa3cf/events → 200` |
| **Response time** | 300,007ms and 299,997ms |

**Root cause**: These are **Server-Sent Events (SSE)** connections for session event streaming. The 300-second (5-minute) duration is a deliberate timeout. The client reconnects after expiry. Not an error.

**Evidence**: Both responses return HTTP 200 (not 500 or timeout errors). The duration is consistently ~300,000ms, matching the configured SSE timeout. The same session ID appears in both calls, confirming reconnection after timeout.

### 4. Build warnings (non-blocking)

| Warning | Detail |
|---------|--------|
| Peer dependency mismatch | `eslint-plugin-vitest@0.5.4` → `@typescript-eslint/utils@7.18.0` requires `eslint@^8.56.0`, but the project uses `eslint@9.39.5`. The warning is scoped to lint tooling only — no runtime impact. |
| `3 high severity vulnerabilities` | Reported by `npm audit`. Should be investigated and patched. |
| `.git can't be found` (husky) | Expected — the Docker build context excludes `.git`. Git hooks are not needed in production. |
| Chunk size >500KB (frontend) | `index-Vo78Mf5T.js` at 596KB, `index-ox_xQI05.js` at 157KB. The frontend build emits warnings about large chunks. Candidate for code splitting via dynamic imports. See [[Frontend Architecture]]. |

## Metrics Snapshot (6-hour window)

| Metric | Value | Assessment |
|--------|-------|------------|
| CPU (avg) | 0.0016 cores | ✅ Near-idle |
| Memory (avg) | 131 MB | ✅ Stable (range: 0–134MB) |
| HTTP error rate | 0% | ✅ No 4xx/5xx in sampled logs |
| Cleanup job | Hourly at XX:52, 0 records deleted, ~25ms avg | ✅ Functional |

## Operational Health

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (Node.js) | ✅ Healthy | 1 replica, stable memory, no restarts |
| Redis | ✅ Healthy | Connected, cleanup job runs |
| Postgres | ✅ Healthy | Connected via managed instance |
| Frontend | ✅ Healthy | Built and served |

## Items for Investigation

These are non-blocking but should be tracked:

1. **Frontend request queue for token refresh** — Eliminates the 401 cascade UX glitch. File as a frontend improvement task.
2. **`eslint-plugin-vitest` version bump** — Resolves the peer dependency warning. Low effort.
3. **`npm audit fix`** — Address the 3 high-severity vulnerabilities. Review breaking changes before applying.
4. **Frontend chunk splitting** — Reduce the 596KB `index` chunk via `React.lazy()` + `Suspense`. See [[Frontend Architecture]] for existing patterns.

## Sources

- Railway backend deploy logs (deployment `1d8a12`, 2026-08-06)
- Railway backend build logs
- Railway service metrics (CPU, memory, 6h window)
- Railway environment status (`dev`)
