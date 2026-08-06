---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/deployment
  - wiki/reverse-proxy
date_updated: 2026-08-06
source_count: 0
confidence: high
---

# Node.js Thin Reverse Proxy — Implementation Plan

> Execution plan derived from [[nodejs-thin-reverse-proxy-proposal]]. 8 steps, ~1h estimated.

## Status (2026-08-06)

✅ **Complete** — All 8 steps executed. Backend public domain removed (2026-08-06). Proxy verified on Railway dev.

SPA + `/api/*` + `/health` routed through frontend proxy via `backend.railway.internal:3000`. CORS disabled on backend. Zero public surface on backend service.

Deploy log with 9 attempts and 6 root causes: [[reverse-proxy-deploy-log]].

## Architecture (Final)

```
Browser → https://frontend-dev-b363.up.railway.app (server.mjs proxy)
           ├─ /, /*        → dist/ (SPA statica)
           └─ /api/*, /health → proxy → http://backend.railway.internal:3000
                                      (private network only, no public domain)
```

## Prerequisites

- [x] Branch: `feature/thin-reverse-proxy` → committed directly to `dev`
- [x] Backend Railway service has `backend.railway.internal:3000` reachable from frontend service
- [x] Backend public domain ~~noted~~ **removed** (step 8)

## Step 1 — Install proxy dependencies in frontend ✅

**File**: `apps/frontend/package.json`

Add two production dependencies:

```json
"express": "^5.2.0",
"http-proxy-middleware": "^3.0.5"
```

**Action**:
```bash
npm install --workspace=apps/frontend express http-proxy-middleware
```

> `express` is already a transitive dep via the backend workspace. Explicit install ensures it's available when the frontend Docker image copies root `node_modules`.

## Step 2 — Create the thin proxy server ✅

**File**: `apps/frontend/server.mjs` (NEW)

Create the ~30-line Express server that serves the SPA and proxies `/api` + `/health`:

```js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const app = express();

app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/health', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use(express.static(resolve(__dirname, 'dist')));
app.get('*', (_, res) => res.sendFile(resolve(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Frontend proxy listening on :${PORT}`));
```

**Key behaviors**:
- `changeOrigin: true` → rewrites the `Host` header to match `BACKEND_URL`, so the backend sees requests as if they originated from the proxy itself.
- The backend has no public URL (private Railway network only) — no external client can reach it directly. CORS middleware can be safely disabled.
- `/health` proxied to backend (frontend has no health endpoint of its own; Railway healthcheck pings the backend via the proxy).
- SPA fallback (`get '*'`) catches all non-API routes for client-side routing.

## Step 3 — Update Dockerfile.frontend ✅

**File**: `Dockerfile.frontend`

Two changes to Stage 1 (builder) and Stage 2 (runtime).

### Stage 1 — add server.mjs to build context

After the existing `COPY apps/frontend/src apps/frontend/src`, add:

```dockerfile
COPY apps/frontend/server.mjs apps/frontend/
```

Full Stage 1 diff context:

```dockerfile
COPY apps/frontend/vite.config.ts apps/frontend/
COPY apps/frontend/index.html apps/frontend/
COPY apps/frontend/src apps/frontend/src
COPY apps/frontend/server.mjs apps/frontend/          # ← NEW

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=apps/frontend
```

### Stage 2 — replace serve with Node proxy

Replace the entire Stage 2 with:

```dockerfile
# ── Stage 2: SPA + Node.js reverse proxy ──────────────────────────────────────
FROM node:22-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/server.mjs ./server.mjs
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.mjs"]
```

**Changes from current**:
| Before | After |
|--------|-------|
| `RUN npm install -g serve@14` | Removed |
| `COPY dist ./dist` | COPY dist + server.mjs + node_modules |
| `CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]` | `CMD ["node", "server.mjs"]` |
| No HEALTHCHECK | HEALTHCHECK (mirrors `Dockerfile.backend`) |
| No non-root user | `USER nodejs` (mirrors `Dockerfile.backend`) |

> `node_modules` from builder contains `express` and `http-proxy-middleware` (installed at monorepo root via `npm ci` in Stage 1).

## Step 4 — Update railway.frontend.json ✅

**File**: `railway.frontend.json`

Switch from RAILPACK builder to DOCKERFILE, and update the start command:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.frontend"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 15,
    "restartPolicyType": "ALWAYS",
    "restartPolicyMaxRetries": 5
  }
}
```

**Changes from current**:
| Before | After |
|--------|-------|
| `builder: "RAILPACK"` | `builder: "DOCKERFILE"` |
| `buildCommand: "npm run build..."` | `dockerfilePath: "Dockerfile.frontend"` |
| `startCommand: "npm run preview..."` | Removed (CMD in Dockerfile) |

**Env vars to add on Railway frontend service**:
```
BACKEND_INTERNAL_URL=http://backend.railway.internal:3000
VITE_API_URL=           (empty — same-origin relative paths)
```

## Step 5 — Make backend CORS optional ✅

**Files**: `apps/backend/src/config.ts`, `apps/backend/src/app.ts`

Currently `CORS_ORIGIN` is validated as `z.string().url()` — an empty string fails validation. Since the backend has no public URL (private Railway network only), external clients cannot reach it directly. All traffic goes through the frontend proxy, making CORS checks unnecessary.

### config.ts — accept empty CORS_ORIGIN

```typescript
CORS_ORIGIN: z.string().default('http://localhost:5173'),
```

Change from `z.string().url()` to `z.string()` — removes the URL format requirement. Empty string means "no CORS."

### app.ts — conditionally apply CORS middleware

```typescript
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin, credentials: true }));
}
```

> When `CORS_ORIGIN=""` (Railway behind proxy), the `cors` middleware is skipped entirely. Local dev (`CORS_ORIGIN=http://localhost:5173`) keeps existing behavior.

## Step 6 — Local verification ✅ (tsc + vite build passes)

```bash
# Build the Docker image
docker build -f Dockerfile.frontend -t flow-app-frontend .

# Run with backend reachable
docker run --rm -p 3000:3000 \
  -e BACKEND_INTERNAL_URL=http://host.docker.internal:3000 \
  -e PORT=3000 \
  flow-app-frontend

# Verify
curl http://localhost:3000/           # → index.html (SPA)
curl http://localhost:3000/health     # → proxied to backend /health
curl http://localhost:3000/api/sessions  # → proxied to backend
curl http://localhost:3000/nonexistent   # → index.html (SPA fallback)
```

## Step 7 — Deploy to Railway ✅

1. Push branch `feature/thin-reverse-proxy` to GitHub
2. Railway auto-deploys the frontend service (GitHub integration)
3. Verify on the deployed URL:
   - `GET /` → SPA loads
   - `GET /api/sessions` → returns data (proxied)
   - `GET /health` → 200 OK (proxied)
   - SSE: start a session and verify `EventSource('/api/sessions/.../events')` receives events
   - Login: OAuth flow works (httpOnly cookies, same-origin)
4. Check Railway frontend logs: `Frontend proxy listening on :3000`

## Step 8 — Remove backend public domain ✅ (2026-08-06)

Once verified:

1. **Railway backend service** → Settings → Networking:
   - Remove public domain (make service private/internal only) ✅
2. **Railway backend service** → Variables:
   - Set `CORS_ORIGIN=` (empty string)
3. **Verify again**: all `/api/*` and `/health` requests still work (now going through `backend.railway.internal:3000` only)

**Verification (2026-08-06)**:
- `GET /health` via frontend proxy → `{"status":"ok","proxy":"http://backend.railway.internal:3000"}` ✅
- `GET /api` via frontend proxy → `{"message":"Flow App API","version":"0.0.1"}` ✅
- `GET backend-dev-cfc8.up.railway.app/health` → 404 (domain removed) ✅

## Rollback Plan

If the proxy fails in production:

1. Revert `railway.frontend.json` to RAILPACK + `npm run preview`
2. Revert `Dockerfile.frontend` to Stage 2 with `serve -s`
3. Re-enable backend public domain
4. Restore `CORS_ORIGIN` to frontend public URL on backend

No frontend source code changes — rollback is purely infrastructure.

## Files Changed (Summary)

| File | Action | Lines |
|------|--------|-------|
| `apps/frontend/package.json` | Add `express` + `http-proxy-middleware` | +2 deps |
| `apps/frontend/server.mjs` | **NEW** — thin proxy server | +17 |
| `Dockerfile.frontend` | Stage 1: copy server.mjs; Stage 2: rewrite | ~25 changed |
| `railway.frontend.json` | Switch to DOCKERFILE builder | ~10 changed |
| `apps/backend/src/config.ts` | `CORS_ORIGIN`: relax URL validation | 1 line |
| `apps/backend/src/app.ts` | Conditional CORS middleware | ~4 lines |
| Railway frontend vars | Add `BACKEND_INTERNAL_URL`, clear `VITE_API_URL` | 2 vars |
| Railway backend vars | Set `CORS_ORIGIN=""` | 1 var |

**Total**: 6 files changed, 1 new file, ~60 lines net.

## Related

- [[nodejs-thin-reverse-proxy-proposal]] — Architecture rationale and trade-offs
- [[reverse-proxy-deploy-log]] — Deployment attempts, root causes, fixes
- [[synthesis/deployment-patterns-phase-10]] — 10 failed nginx attempts (context)
- [[Environment Configuration]] — Railway env var patterns
- [[Docker Compose - Local Dev]] — Unchanged local dev setup
