---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/code-review
  - wiki/remediation
date_updated: 2026-08-02
confidence: high
executed: 2026-08-02
---

# Low-Severity Remediation Plan

**Source**: [[code-review-2026-08-02]] — findings L1–L5
**Status**: ✅ eseguito
**Estimated effort**: ~2 ore (5 findings, 7 file modifications, 1 file deletion)

---

## Overview

Remediation plan for 5 low-severity findings from the multi-agent code review. These are code cleanliness and consistency issues — no runtime bugs, no security holes (L1 is a hygiene concern, not an active exploit). Organized into 2 phases: quick wins first (L2, L4, L5), then architectural cleanup (L1, L3).

---

## Finding Summary

| # | Issue | Files | Risk | Est. |
|---|-------|-------|------|------|
| L1 | Access token in query string OAuth callback | `auth-routes.ts`, `OAuthCallback.tsx` | Low | 45m |
| L2 | Admin routes `res.status(500).json()` instead of `next(err)` | `admin.ts:50,70` | Low | 10m |
| L3 | Two diverging paths in `listSessions` (repo vs raw SQL) | `generation.ts`, `SessionRepository.ts`, `session-repository.ts` | Low | 45m |
| L4 | `ApiError` duplicated in `contracts/` — dead file | `contracts/src/shared.ts` (delete) | Low | 5m |
| L5 | Frontend DTOs diverge from `@flow-app/contracts` | `client.ts` | Low | 25m |

---

## Phase 1 — Quick Wins: Dead Code, Consistency, Error Flow

**Findings**: L2, L4, L5
**Files**: 4 modified, 1 deleted
**Risk**: Low
**Estimated**: 40 min

These are independent, low-risk changes with no cross-finding dependencies.

### Step 1: L4 — Delete dead `ApiError` file

**File**: `packages/contracts/src/shared.ts` (delete)
**Risk**: Low — zero imports reference this file

This file is an exact byte-for-byte duplicate of `packages/contracts/src/shared/index.ts`. All consumers import `ApiError` via `@flow-app/contracts` → `index.ts` → `./shared/index`. No import resolves to `./shared.ts`. Removing it eliminates ambiguity and prevents accidental drift between the two copies.

**Change**: Delete `packages/contracts/src/shared.ts`.

**Verification**: `tsc -p packages/contracts/tsconfig.json && tsc -p apps/backend/tsconfig.json && tsc -p apps/frontend/tsconfig.json` — 0 errors on all three.

---

### Step 2: L2 — Route admin errors through centralized error handler

**File**: `apps/backend/src/api/admin.ts`
**Risk**: Low — the error handler pattern already exists and is tested

Two catch blocks send `res.status(500).json(...)` directly, bypassing the centralized `errorHandler` middleware registered in `app.ts:122`. The error handler already has `ErrorMapper.toHttpStatus()` logic that:
1. Converts `DomainError` to proper HTTP status codes and `retryable` flags
2. Adds structured logging via Pino
3. Ensures consistent error response shapes (`{ error: { code, message, details, retryable } }`)

The inline `res.status(500).json()` responses are missing `retryable` and log with inconsistent structure.

**Change**:

```typescript
// ❌ admin.ts:50-52 — getJobs catch block
} catch (err) {
  log.error({ err }, 'admin_jobs_error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch queue stats' } });
}

// ✅ Replace with:
} catch (err) {
  next(err);
}

// ❌ admin.ts:70-72 — getHealth catch block
} catch (err) {
  log.error({ err }, 'admin_health_error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check health' } });
}

// ✅ Replace with:
} catch (err) {
  next(err);
}
```

**Note**: The `log.error({ err }, ...)` calls are removed because the centralized `errorHandler` already logs every error. Keeping both would double-log.

**Verification**: Verify that `getJobs` and `getHealth` route handlers are registered with proper `async (req, res, next)` signatures so Express 4 routes the error correctly. The function signatures already accept `next` — line 26: `getJobs: async (_req: Request, res: Response, next: NextFunction)` and line 56: `getHealth: async (_req: Request, res: Response, next: NextFunction)` — so no signature change needed.

---

### Step 3: L5 — Align frontend DTOs with `@flow-app/contracts`

**File**: `apps/frontend/src/api/client.ts`
**Risk**: Low — type-only change, zero runtime impact

The frontend defines local DTO interfaces (`SessionDTO`, `ArtifactDTO`, `MessageDTO`, `ConversationDTO`, etc.) that duplicate or diverge from the canonical types in `@flow-app/contracts`. Key divergence: `status: string` in frontend vs `status: SessionStatusDTO` (union of 7 string literals) in contracts. This loses type safety — any string passes type-check, but the API only returns 7 specific values.

**What exists in contracts today:**

| Contracts export | Maps to frontend need |
|------------------|----------------------|
| `SessionDTO` | List item (basic fields only) |
| `SessionDetailDTO extends SessionDTO` | Detail view (full fields + artifacts) |
| `SessionListItemDTO` | List items (slightly different shape) |
| `SessionStatusDTO` | Status union type |
| `ArtifactDTO extends ArtifactListItemDTO` | Full artifact with content |
| `ArtifactListItemDTO` | Artifact in list context |

**Which frontend DTOs can migrate now:**

| Frontend DTO | Replace with | Notes |
|-------------|-------------|-------|
| `SessionDTO` | `SessionDetailDTO` from contracts | Frontend DTO is actually a detail shape, not a list shape |
| `ArtifactDTO` | `ArtifactDTO` from contracts | Near-identical shape; contracts has stricter `status` type |
| `SessionListResponse` | Keep local (extends `PaginatedResponse<SessionListItemDTO>`) | Contracts doesn't define this wrapper |

**Which must stay local for now:**

| Frontend DTO | Reason |
|-------------|--------|
| `WorkspaceDTO` | Not in contracts yet → add `// TODO: migrate to @flow-app/contracts` |
| `MessageDTO` | Not in contracts yet → add `// TODO: migrate to @flow-app/contracts` |
| `ConversationDTO` | Not in contracts yet → add `// TODO: migrate to @flow-app/contracts` |
| `ConversationListItemDTO` | Not in contracts yet → add `// TODO: migrate to @flow-app/contracts` |
| `AgentDTO` | Not in contracts yet → add `// TODO: migrate to @flow-app/contracts` |
| `SessionListResponse` | Thin wrapper — contracts has `PaginatedResponse<T>` |

**Change — imports**:

```typescript
// Add to existing import from @flow-app/contracts (line 1):
import type {
  ApiError,
  SessionDetailDTO,
  ArtifactDTO as ContractArtifactDTO,
} from '@flow-app/contracts';
```

**Change — remove local definitions**:

```typescript
// ❌ Remove local SessionDTO (lines 6-18)
// ❌ Remove local ArtifactDTO (lines 25-33)
// ✅ Use SessionDetailDTO and ContractArtifactDTO from imports instead
```

**Change — update usage sites**:

```typescript
// Line 166 — startSession() return type
// ❌ { session: SessionDTO; replayed: boolean }
// ✅ { session: SessionDetailDTO; replayed: boolean }

// Line 170 — getSession() return type  
// ❌ SessionDTO
// ✅ SessionDetailDTO

// Line 186 — getArtifact() return type
// ❌ ArtifactDTO
// ✅ ContractArtifactDTO
```

**Change — annotate remaining local DTOs**:

Add `// TODO: migrate to @flow-app/contracts once DTOs are defined there` above each remaining local DTO block:
- `WorkspaceDTO` (line 36)
- `MessageDTO` (line 45)
- `ConversationDTO` (line 54)
- `ConversationListItemDTO` (line 66)
- `AgentDTO` (line 78)

**Verification**: `tsc -p apps/frontend/tsconfig.json` — 0 errors. Also verify consumers that import types from `client.ts` still work. Check via grep:

```bash
rg "from ['\"].*client['\"]" apps/frontend/src/
```

Expected: only `api` instance imports (not type imports — all types are consumed via return type inference).

---

## Phase 2 — Architectural Cleanup: OAuth Hygiene + Query Consistency

**Findings**: L1, L3
**Files**: 5 modified
**Risk**: Low for L1, Medium for L3 (repo interface change touches domain + infra layers)
**Estimated**: 90 min

These require coordinated backend + frontend changes or interface modifications.

### Step 4: L1 — Prevent access token leakage in proxy logs

**Files**: 
- `apps/backend/src/api/auth/auth-routes.ts` (line 199)
- `apps/frontend/src/auth/OAuthCallback.tsx` (lines 10-28)

**Risk**: Low — the redirect flow is already correct; this adds defense-in-depth

**Problem**: After Google OAuth succeeds, the backend redirects to `/auth/callback?token=<JWT>&expiresIn=<N>`. Reverse proxies (NGINX, Railway's edge, Cloudflare) log the full URL including query string by default. An access token in proxy logs is a credential leak — even if the token is short-lived (15 min), it's valid for that window.

**Fix strategy — two-part defense**:

**Part A — Backend: Add response headers to limit leakage surface**

Add two headers to the redirect response at line 196-200:

```typescript
// Before the redirect:
res.setHeader('Cache-Control', 'no-store');
res.setHeader('Referrer-Policy', 'no-referrer');

res.cookie(REFRESH_COOKIE, authResult.refreshToken, REFRESH_COOKIE_OPTIONS);
const frontendUrl = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
res.redirect(
  `${frontendUrl}/auth/callback?token=${authResult.accessToken}&expiresIn=${authResult.expiresIn}`,
);
```

`Cache-Control: no-store` prevents intermediate caches from storing the redirect URL. `Referrer-Policy: no-referrer` prevents the token from leaking via the `Referer` header when the browser loads `/auth/callback`.

**Part B — Frontend: Strip token from browser history immediately**

In `OAuthCallback.tsx`, after extracting the token from `window.location.search`, immediately clean the URL:

```typescript
// Line 10 — add cleanup:
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Strip token from browser history (prevents back-button leakage)
window.history.replaceState({}, '', window.location.pathname);

// ... rest of existing logic (store token, navigate)
```

**Why not use a one-time code exchange?** A code-exchange pattern (backend generates short-lived single-use code → frontend calls `POST /api/auth/exchange` with code → gets token in response body) would be the ideal fix. However, this adds:
- New database table or Redis key for code storage
- New API endpoint + use case
- Additional round-trip latency on login

For a low-severity finding, the header + history cleanup is the pragmatic defense-in-depth approach. The token is already short-lived (15 min), httpOnly refresh cookie provides the long-lived session, and the frontend stores the access token only in module-level memory (never localStorage). The real risk is proxy log retention, which the headers mitigate.

> **Future improvement**: If security requirements tighten, implement the code-exchange pattern. Add a `GET /api/auth/oidc-callback` endpoint that sets an httpOnly cookie with an opaque code, redirects to `/auth/callback?code=<opaque>`, and the frontend calls `POST /api/auth/token` with the code to get the JWT in the response body.

**Verification**:
1. Run OAuth flow in dev — confirm redirect works and token is available in memory
2. Check browser dev tools: after callback, `window.location.search` should be empty (stripped by `replaceState`)
3. Check response headers: `Cache-Control: no-store` and `Referrer-Policy: no-referrer` present on the 302 redirect

---

### Step 5: L3 — Unify `listSessions` query paths

**Files**:
- `packages/domain/src/generation/repositories/SessionRepository.ts` — add `findAll` to interface
- `packages/infra-db/src/repositories/session-repository.ts` — implement `findAll`
- `apps/backend/src/api/generation.ts` — refactor `listSessions` to use single code path

**Risk**: Medium — domain interface change requires infra-db implementation update; both must compile together

**Problem**: `listSessions` in `generation.ts:13-52` has two code paths with different behavior:

| Aspect | `workspaceId` present | `workspaceId` absent |
|--------|----------------------|---------------------|
| Data source | `sessionRepo.findByWorkspace()` | `db.selectFrom('sessions')` raw SQL |
| Status filter | ✅ `{ status, limit }` passed | ❌ No status filter |
| Mapping | `s.toString()` on VOs | Raw DB column names (`r.status`, `r.tool_key`) |
| Artifacts | Not loaded | Not loaded |
| Type safety | Domain objects | Raw `unknown` shape |

Three divergences: filtering (status ignored in raw path), mapping (VO `.toString()` vs raw column names), data source (repo vs raw Kysely).

**Fix — Add `findAll` to the repository interface**:

```typescript
// packages/domain/src/generation/repositories/SessionRepository.ts
export interface SessionRepository {
  // ... existing methods ...
  /**
   * Find sessions matching the given filters. When no workspaceId is provided,
   * returns sessions across all workspaces (intended for admin/monitoring use).
   */
  findAll(filters?: SessionFilters): Promise<Session[]>;
}
```

The existing `SessionFilters` interface already supports optional `workspaceId`, `status`, `limit`, and `offset` — no new type needed.

**Fix — Implement `findAll` in the Kysely repository**:

```typescript
// packages/infra-db/src/repositories/session-repository.ts
async findAll(filters?: SessionFilters): Promise<Session[]> {
  let query = this.db.selectFrom('sessions');

  if (filters?.workspaceId) {
    query = query.where('workspace_id', '=', filters.workspaceId);
  }
  if (filters?.status) {
    query = query.where('status', '=', filters.status as DBSessionStatus);
  }

  const rows = await query
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0)
    .execute();

  return rows.map((row) =>
    Session.reconstitute(
      row.id,
      ToolKey.from(row.tool_key),
      row.workspace_id,
      row.user_id,
      row.idempotency_key_hash,
      SessionStatus.from(row.status),
      row.current_step_index,
      row.started_at,
      row.completed_at,
      row.error_code,
      row.error_message,
      row.version,
    ),
  );
}
```

This is essentially `findByWorkspace` generalized — the `workspace_id` filter is now optional instead of required. The `findByWorkspace` method can be refactored to delegate to `findAll`:

```typescript
async findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]> {
  return this.findAll({ ...filters, workspaceId });
}
```

**Fix — Refactor `listSessions` to use single code path**:

```typescript
// apps/backend/src/api/generation.ts — listSessions (replaces lines 13-52)
listSessions: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Number(req.query.limit) || 50;

    const sessions = workspaceId
      ? await sessionRepo.findByWorkspace(workspaceId, { status, limit })
      : await sessionRepo.findAll({ status, limit });

    return res.json({
      data: sessions.map((s) => ({
        id: s.sessionId,
        toolKey: s.toolKey.toString(),
        workspaceId: s.workspaceId,
        status: s.status.toString(),
        createdAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
      })),
      total: sessions.length,
    });
  } catch (error) {
    next(error);
  }
},
```

**Changes from current behavior**:
- ✅ `status` filter now works in both paths (previously ignored in raw SQL path)
- ✅ Consistent mapping — always uses `s.toolKey.toString()` and `s.status.toString()`
- ✅ Consistent JSON shapes — no more `r.tool_key` vs `s.toolKey`
- ✅ Type-safe — Kysely row types are no longer exposed to the API layer
- ⚠️ Martin Fowler: the `findAll` path without `workspaceId` returns sessions from all workspaces — ensure this is only called from admin routes or add authorization check

**Verification**:
1. `tsc -p packages/domain/tsconfig.json` — 0 errors (interface change)
2. `tsc -p packages/infra-db/tsconfig.json` — 0 errors (implementation)
3. `tsc -p apps/backend/tsconfig.json` — 0 errors (consumer)
4. Run existing tests: `cd apps/backend && pnpm test` (if any session list tests exist)

---

## Testing Strategy

| Finding | Test type | What to verify |
|---------|-----------|---------------|
| L1 | Manual E2E | OAuth flow: redirect works, token in memory, URL cleaned |
| L2 | Unit | Error handler is called (not `res.status`) on admin route failure |
| L3 | Integration | `listSessions` with and without `workspaceId`, with and without `status` filter |
| L4 | Build | `tsc` passes on all 3 packages |
| L5 | Build | `tsc -p apps/frontend/tsconfig.json` passes; type-check consumers |

---

## Risks & Mitigations

- **Risk (L3)**: `findAll` without `workspaceId` returns cross-workspace data
  - **Mitigation**: The raw SQL path already does this (no `workspace_id` WHERE clause). The refactored path is behaviorally identical. Future: add a `requireAdmin` check or default to requiring `workspaceId`.

- **Risk (L5)**: `SessionDetailDTO` from contracts doesn't match frontend API response shape exactly
  - **Mitigation**: The frontend already receives detail-shaped data from `getSession()`. If the API response has extra fields not in `SessionDetailDTO`, the TypeScript structural type system won't complain (excess properties are allowed on the receiving side). If fields are missing, `tsc` will catch it.

- **Risk (L1)**: `window.history.replaceState` could interfere with React Router
  - **Mitigation**: `replaceState` is called before `navigate()`, which also uses `{ replace: true }`. The two `replace` operations target different browser APIs (`history` vs React Router's internal state) — no conflict.

---

## Success Criteria

- [ ] L4: `packages/contracts/src/shared.ts` deleted; `tsc` passes on all packages
- [ ] L2: Both admin catch blocks use `next(err)`; error responses follow the centralized format
- [ ] L5: `SessionDTO` and `ArtifactDTO` imported from `@flow-app/contracts`; other DTOs annotated with TODO; `tsc -p apps/frontend` passes
- [ ] L1: OAuth redirect includes `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; frontend strips query string immediately
- [ ] L3: `listSessions` uses repository for both paths; `findAll` added to interface + implementation; `findByWorkspace` delegates to `findAll`
- [ ] All `tsc` builds pass with 0 errors
- [ ] No regression in OAuth login flow, session listing, admin endpoints, or API client type inference

---

## Sources

- [[code-review-2026-08-02]]
- [[DDD Domain Design Rules]]
- [[API Contract Baseline v1]]
- [[Auth Dependencies]]