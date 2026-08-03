---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/deployment
  - wiki/reverse-proxy
  - wiki/frontend
  - wiki/railway
date_updated: 2026-08-03
source_count: 0
confidence: high
---

# Node.js Thin Reverse Proxy — Architecture Proposal

> Proposal to replace the current backend-public-URL + CORS pattern with a Node.js reverse proxy on the frontend service, enabling backend on internal Railway DNS only.

## Context

[[synthesis/deployment-patterns-phase-10]] documents the current architecture and 10+ failed nginx reverse proxy attempts:

```
Browser → <frontend-public-url>    (serve -s, static SPA)
Browser → <backend-public-url>     (Express API, CORS, VITE_API_URL baked at build-time)
```

The goal is to eliminate the backend public URL entirely — the backend should be reachable only at `backend.railway.internal:3000`. The browser cannot resolve `*.railway.internal`, so a **server-side reverse proxy** is required on the frontend service.

## Architectures Evaluated

### A. nginx on frontend service (tried, 10 failures)

```
Browser → frontend (nginx:${PORT})
           ├─ /       → static files (dist/)
           └─ /api/*  → proxy_pass http://backend.railway.internal:3000
```

All 10 failures documented in [[synthesis/deployment-patterns-phase-10]] are **configuration errors**, not architectural impossibilities. However, nginx configuration is fragile in the Railway context (dynamic `PORT`, `default.conf` conflicts, `envsubst` templating, resolver behavior). Debugging nginx on Railway is slow — each attempt requires a full deploy cycle.

| Failure | Root cause | Fix known? |
|---------|-----------|------------|
| `default.conf` overwrites template | nginx base image ships a default config | `rm /etc/nginx/conf.d/default.conf` |
| `listen 80` instead of `listen ${PORT}` | Railway dynamic port | `envsubst` on template |
| `backend.railway.internal` not resolvable | Resolver misconfiguration | No resolver needed for `proxy_pass` |
| Builder stays RAILPACK | CLI bug, only MCP works | Use `RAILWAY_DOCKERFILE_PATH` env var |
| `npm prune` removes symlinks | Monorepo workspace deps | Irrelevant for nginx (no Node) |
| `serve -s` doesn't reverse proxy | SPA catch-all | Replaced by nginx |
| `vite preview` not production | Dev server limitations | Replaced by nginx |
| `tsx` for ESM | Node ESM extensionless imports | Backend concern only |

**Verdict**: viable, but fragile. Same stack risk with nginx configuration vs. the rest of the codebase.

### B. Node.js thin proxy ✅ (recommended)

```
Browser → frontend (Node.js express on ${PORT})
           ├─ GET /*        → express.static(dist/) + SPA fallback
           ├─ GET /api/*    → http-proxy → http://backend.railway.internal:3000
           └─ GET /health   → http-proxy → http://backend.railway.internal:3000/health
```

A thin Node.js server (~30 lines) serves the built SPA and proxies API calls to the internal backend. Same Docker image as the rest of the project (`node:22-alpine`), same runtime, same config patterns (`process.env`).

### C. Monolith (backend serves frontend)

```
Browser → backend (express on :3000)
           ├─ GET /api/*    → API routes
           ├─ GET /health   → health check
           └─ GET /*        → express.static(frontend/dist/)
```

One Railway service instead of two. Backend Express serves the SPA from `apps/frontend/dist/`.

**Rejected**: couples frontend and backend deploys, prevents independent scaling, increases blast radius on backend changes.

### D. Dedicated nginx service (third Railway service)

```
Browser → nginx (public)
           ├─ /       → proxy_pass http://frontend.railway.internal:3000
           └─ /api/*  → proxy_pass http://backend.railway.internal:3000

frontend (private) — serve -s dist
backend  (private) — Express
```

**Rejected**: 3 services for a small team, extra operational overhead, cost.

## Solution B — Detailed Design

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Railway Private Network                         │
│                                                  │
│  ┌──────────────┐       ┌──────────────────┐    │
│  │  Frontend     │       │  Backend          │    │
│  │  (public)     │──/api─▶│  (private)        │    │
│  │  Node proxy   │       │  Express :3000    │    │
│  │  :${PORT}     │       │  CORS disabled    │    │
│  │  serve SPA    │       │  JWT + cookies    │    │
│  └──────────────┘       └──────────────────┘    │
│         ▲                                        │
│         │ public URL                             │
│  ┌──────┴───────┐                                │
│  │  Browser     │                                │
│  │  same-origin │                                │
│  │  /api/*      │                                │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

### Configuration

**Frontend env vars** (Railway service):
```
BACKEND_INTERNAL_URL=http://backend.railway.internal:3000
PORT=3000
```

**Backend env vars** (Railway service):
```
CORS_ORIGIN=   (empty — no CORS needed, same-origin via proxy)
# No public domain — service is private
```

**Vite build**:
```
VITE_API_URL=   (empty string — all API calls are same-origin relative paths)
```

### server.mjs (~30 lines)

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

### Dockerfile.frontend (updated)

```dockerfile
# Stage 1: Build SPA
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/copy/package.json ./packages/copy/
COPY packages/domain/package.json ./packages/domain/
COPY packages/infra-db/package.json ./packages/infra-db/
RUN npm ci
COPY apps/frontend/ ./apps/frontend/
COPY packages/ ./packages/
COPY tsconfig.json tsconfig.base.json ./
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=apps/frontend

# Stage 2: SPA + Node.js reverse proxy
FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/server.mjs ./server.mjs
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.mjs"]
```

### Changes to existing files

| File | Change |
|------|--------|
| `Dockerfile.frontend` | Stage 2: replace `serve -s dist` with Node proxy (`server.mjs`) |
| `apps/frontend/server.mjs` | **New file** — thin Express + http-proxy-middleware |
| `apps/frontend/package.json` | Add `express` and `http-proxy-middleware` to dependencies |
| `railway.frontend.json` | `builder: "DOCKERFILE"`, `startCommand: "node server.mjs"`, `RAILWAY_DOCKERFILE_PATH: "Dockerfile.frontend"` |
| `apps/frontend/vite.config.ts` | No change — dev proxy already handles `/api` → `localhost:3000` |
| `apps/frontend/src/api/client.ts` | No change — `VITE_API_URL=""` → same-origin relative paths |
| `apps/frontend/src/api/sse-client.ts` | No change — already uses relative paths |
| `apps/frontend/src/auth/AuthContext.tsx` | No change — same-origin, httpOnly cookies work automatically |
| Backend Railway service | Remove public domain, set `CORS_ORIGIN=""` |

### No changes required

- **Frontend source code**: `client.ts`, `sse-client.ts`, `AuthContext.tsx` — all use relative paths or respect `VITE_API_URL=""`.
- **Vite dev proxy**: already proxies `/api` → `http://localhost:3000`. Dev experience unchanged.
- **Backend source code**: CORS middleware already handles empty `CORS_ORIGIN` (falls back to no CORS). JWT httpOnly cookies are same-origin by default.
- **SSE**: `EventSource('/api/sessions/.../events')` — same-origin, no CORS preflight needed.

## Trade-offs

| Pro | Contro |
|-----|--------|
| Same stack (Node.js) — zero new syntax | Container slightly heavier than nginx (~50MB vs ~10MB) |
| Runtime config via env vars, not build-time | One extra Node process per frontend replica |
| Fixes all 10 nginx failures at once | `http-proxy-middleware` adds ~200KB to deps |
| Dev/prod parity — Vite dev proxy mirrors prod proxy | Slightly less performant than nginx for static file serving (negligible for B2B traffic) |
| Backend fully private — no public URL, no CORS | |
| Same Dockerfile pattern as backend (`node:22-alpine`, non-root user, HEALTHCHECK) | |
| SSE works trivially — same-origin, no CORS preflight | |
| Debuggable with `console.log` — no nginx log spelunking | |

## Implementation Plan

| Step | Action | Duration |
|------|--------|----------|
| 1 | Install `express` + `http-proxy-middleware` in `apps/frontend/package.json` | 5 min |
| 2 | Create `apps/frontend/server.mjs` | 10 min |
| 3 | Update `Dockerfile.frontend` (Stage 2) | 10 min |
| 4 | Update `railway.frontend.json` (DOCKERFILE builder + startCommand) | 5 min |
| 5 | Verify: `docker build -f Dockerfile.frontend .` + `docker run -e BACKEND_INTERNAL_URL=...` | 15 min |
| 6 | Deploy to Railway dev, verify proxy + SSE | 10 min |
| 7 | Remove backend public domain on Railway | 2 min |
| 8 | Set `CORS_ORIGIN=""` on backend | 2 min |

**Total**: ~1 hour

## Related

- [[synthesis/deployment-patterns-phase-10]] — Context: current architecture + 10 nginx failures
- [[synthesis/nodejs-thin-reverse-proxy-plan]] — Implementation plan (8 steps, 6 files, ~1h)
- [[Environment Configuration]] — Railway env vars
- [[API Client + SSE Client]] — Frontend API communication
- [[Docker Compose - Local Dev]] — Local dev setup (unchanged)
- [[CI-CD Promotion Policy]] — Deployment pipeline
