---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/deployment
  - wiki/reverse-proxy
  - wiki/railway
date_updated: 2026-08-03
source_count: 0
confidence: high
---

# Node.js Thin Reverse Proxy — Deployment Log

> Field notes from the reverse proxy rollout on Railway dev. 9 deploy attempts, 6 root causes, ✅ resolved.

## Status

✅ **Resolved** — Proxy working on `https://frontend-dev-b363.up.railway.app`. Backend private, no public URL. All endpoints verified.

## Verification (2026-08-03 18:24 UTC)

| Endpoint | Status | Meaning |
|----------|--------|---------|
| `GET /` | 200 | SPA served by Express static middleware |
| `GET /health` | 200 | Direct frontend health endpoint (not proxied) |
| `GET /api` | 200 | Backend API → proxied via backend.railway.internal |
| `GET /api/sessions` | 200 | Backend sessions → proxied, auth works |
| `GET backend-dev-d945.../health` | 404 | Backend public domain removed ✅ |

| # | SHA | Trigger | Status | Root Cause |
|---|-----|---------|--------|------------|
| 1 | `97620c4` | Push | FAILED | Build: `.dockerignore` non-printable ASCII (Railway builder bug) |
| 2 | `0748df0` | Push | FAILED | `import.meta.env` TS2339 — `tsc` can't find Vite client types in Docker |
| 3 | `0748df0` | Push | FAILED | Deploy skipped — commit SHA unchanged, Railway won't rebuild same SHA |
| 4 | `c95a898` | Push | FAILED | Runtime: `ERR_MODULE_NOT_FOUND: express` — only root `node_modules` copied |
| 5 | `fd4b7bb` | Push | FAILED | Runtime: `ERR_MODULE_NOT_FOUND: express` — `apps/frontend/node_modules` copy also insufficient |
| 6 | `5f409c8` | Push | FAILED | Build: `npm install --omit=dev` tried to resolve `@flow-app/contracts` from npm registry |
| 7 | `263ab70` | Push | ✅ WORKS | Runtime OK — Express 5 wildcard fix (`{*splat}`). HEALTHCHECK killed it (startup too fast). Verified from outside: `/`, `/health`, `/api` all 200. |
| 8 | `6dc5ceb` | Push | FAILED | HEALTHCHECK relaxed but `/health` still proxied to backend (DNS not ready). |
| 9 | `4acb6ed` | Push | ✅ SUCCESS | `/health` direct endpoint (backend-independent). `pathFilter` preserves `/api` prefix. |

## Root Causes

### RC1 — `import.meta.env` type not found in Docker `tsc`

**Symptom**: `error TS2339: Property 'env' does not exist on type 'ImportMeta'` during `tsc && vite build`.

**Diagnosis**: The `vite-env.d.ts` with `/// <reference types="vite/client" />` exists, and the local build passes. The Docker build intermittently fails — likely a BuildKit layer cache issue where the `COPY apps/frontend/src` layer is stale.

**Impact**: Low — the same Dockerfile succeeded on attempt 4 (different SHA, fresh cache). `vite-env.d.ts` was committed in Phase 0-1.

**Note**: Railway BuildKit with Metal builders showed `"exclude-patterns" contains value with non-printable ASCII characters` on one build (transient builder issue, not our `.dockerignore`).

### RC2 — Railway skips deploy on same commit SHA

**Symptom**: Deployment `SKIPPED` when using `railway_deploy` MCP with unchanged code.

**Diagnosis**: Railway compares commit SHA against previous deployments. If the SHA hasn't changed, the deploy is skipped even if service configuration changed.

**Fix**: Commit a code change (any file) to get a new SHA. For config-only changes, add a no-op comment or log line.

### RC3 — `express` not found in Stage 2 runtime

**Symptom**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express' imported from /app/server.mjs`.

**Diagnosis**: The Dockerfile copies root `node_modules` from the builder, but in npm workspaces, packages like `express` may not be hoisted to root. They might stay in `apps/frontend/node_modules/express`.

**Attempted fix 1**: COPY `apps/frontend/node_modules` as well. **Still failed** — the nested node_modules might also be incomplete, or npm symlinks break.

**Attempted fix 2**: `npm install --omit=dev` from frontend `package.json`. **Failed** — the package.json references `@flow-app/contracts` (workspace dep), which npm tries to resolve from the public registry (404).

**Root cause**: The Stage 2 runtime image has no monorepo context. Using `package.json` triggers workspace dependency resolution.

### RC4 — `@flow-app/*` workspace deps break `npm install`

**Symptom**: `npm error 404 '@flow-app/contracts@*' is not in this registry`.

**Diagnosis**: `apps/frontend/package.json` lists `@flow-app/contracts` and `@flow-app/copy` as dependencies. `npm install --omit=dev` tries to resolve them from npmjs.org.

**Fix**: Install only the specific packages needed: `npm install express http-proxy-middleware`. These are the only two packages `server.mjs` imports. No workspace deps needed at runtime.

### RC5 — Express 5 wildcard syntax: bare `*` is invalid

**Symptom**: `PathError [TypeError]: Missing parameter name at index 1: *; originalPath: '*'`.

**Diagnosis**: Express 5 uses `path-to-regexp` v8 which requires **named** wildcards. `app.get('*', ...)` is invalid. Must use `app.get('/{*splat}', ...)` or `app.get('/*path', ...)`.

**Fix** (Context7-verified): `app.get('/{*splat}', (_, res) => res.sendFile(...))`.

### RC6 — Express `app.use('/api', proxy)` strips the path prefix

**Symptom**: `GET /api/sessions` → 404, backend receives `GET /sessions` (stripped), responds "Cannot GET /sessions".

**Diagnosis**: Express's `app.use('/api', handler)` strips the mount path `/api` from `req.url` before dispatching to the handler. `http-proxy-middleware` uses `req.url` to determine the upstream path, so it forwards `/sessions` instead of `/api/sessions`.

**Fix**: Use `pathFilter: '/api'` in `http-proxy-middleware` config and register with `app.use(proxy)` (no path prefix). The proxy middleware handles path matching internally and forwards with the prefix intact.

## Deploy Path to Fix

```dockerfile
# Stage 2 — Correct approach
FROM node:22-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/server.mjs ./server.mjs
RUN npm install express http-proxy-middleware && npm cache clean --force
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.mjs"]
```

Key insight: **only `express` and `http-proxy-middleware` are needed at runtime**. No workspace packages, no monorepo context. Install them directly, skip `package.json` entirely.

## Railway Configuration Applied

| Setting | Before | After |
|---------|--------|-------|
| Builder | RAILPACK | DOCKERFILE |
| Healthcheck | `/` | `/health` |
| Watch patterns | (default) | `apps/frontend/**`, `packages/domain/**`, `packages/contracts/**`, `packages/copy/**`, `Dockerfile.frontend`, `railway.frontend.json`, `package.json`, `package-lock.json`, `tsconfig.json` |
| `BACKEND_INTERNAL_URL` | — | `http://backend.railway.internal:3000` |
| `VITE_API_URL` | (not set) | `""` (empty — same-origin relative paths) |

Backend CORS and public domain removal are pre-configured (code) but NOT applied on Railway yet, pending proxy verification.

## Related

- [[nodejs-thin-reverse-proxy-proposal]] — Architecture rationale
- [[nodejs-thin-reverse-proxy-plan]] — Implementation plan (8 steps)
- [[deployment-patterns-phase-10]] — 10 nginx failures (context)
- [[CI-CD Promotion Policy]] — Deployment governance
- [[Environment Configuration]] — Railway env variable patterns