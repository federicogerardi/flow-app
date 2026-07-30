---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/roadmap
date_updated: 2026-07-30
source_count: 0
---

# Backend → Frontend Startup Gaps

> Gap analysis: what's needed to go from architecture docs to running code.  
> Backend first, then frontend. Each item is a self-contained ingest task.

## Current Coverage

The wiki covers the **domain model** completely: 4 bounded contexts, 7 entities, 24 value objects, 3 domain services, 9 domain events, 4 repository interfaces, 11 tool configs, 1 XState session machine, 3 application services.

What's missing is the **infrastructure, API, and UI layer** — everything needed to turn the domain into a running application.

---

## Backend Gaps

### 🔴 P0 — Block `npm run dev`

#### B1: Database Schema

**Status**: ✅ Done — see [[Database Schema]]  
**Why needed**: Repository interfaces exist but zero table definitions.

**Output**:
- 15 tables: `sessions`, `artifacts`, `idempotency_keys`, `crawl_data`, `session_snapshots`, `workspaces`, `assets`, `users`, `auth_sessions`, `oauth_accounts`, `quotas`, `credit_transactions`, `llm_models`, `api_services`, `tool_step_bindings`
- 7 PostgreSQL enums, indexes on all FKs + query patterns
- Kysely `DB` type, 6 migration files
- ER diagram, column documentation per table

---

#### B2: API Routes

**Status**: ✅ Done — see [[API Routes]]  
**Why needed**: Application services exist but no HTTP routes.

**Output**:
- 45 routes: health, auth (5), workspaces (5), assets (5), generation (3 + SSE), artifacts (2), admin (9)
- Request/response shapes for every endpoint
- SSE event format: `session_started`, `step_completed`, `session_completed`, `session_failed`
- Error code catalog: 11 error codes mapped to HTTP statuses
- Mapping to Application Services and Domain Events

---

#### B3: BullMQ Worker Wiring

**Status**: ✅ Done — see [[BullMQ Worker Wiring]]  
**Why needed**: XState machine runs steps but BullMQ integration was undefined.

**Output**:
- Job enqueue from HTTP handler after `StartSessionUseCase`
- Worker lifecycle: load Session → build XState actor → configure → start → loop steps
- Per-step snapshot persistence to `session_snapshots` for crash recovery
- JobEventBridge: Redis pub/sub connecting worker progress to HTTP SSE emitter
- Graceful shutdown: pause worker, finish current step, persist, close (30s timeout)
- Retry policy: 3 attempts with exponential backoff
- Full lifecycle diagram from HTTP POST to SSE event

---

#### B4: SSE Emitter

**Status**: ❌ Not documented  
**Why needed**: Real-time progress from backend to frontend.

**Required output**:
- How `DomainEventBus` subscribers push to SSE connections
- SSE event format: `event: StepCompleted\ndata: {...}\n\n`
- Connection lifecycle: open on `SessionStarted`, close on `SessionCompleted | SessionFailed`
- Reconnection strategy for dropped connections

**Depends on**: `Domain Events Catalog.md`, `Session Machine (XState v5).md`

---

### 🟡 P1 — Needed to complete the flow

#### B5: Idempotency Algorithm

**Status**: ❌ Not documented  
**Why needed**: `IdempotencyKey` is a VO but the atomic claim mechanism is undefined.

**Required output**:
- Redis implementation: `SET idempotency:{key} {sessionId} NX EX 3600`
- PostgreSQL fallback: `INSERT INTO idempotency_keys ... ON CONFLICT DO NOTHING`
- Conflict response: return existing `sessionId` instead of creating new session

**Depends on**: `IdempotencyKey` VO, `StartSessionUseCase`

---

#### B6: Error → HTTP Mapping

**Status**: ❌ Not documented  
**Why needed**: Domain errors need HTTP status codes.

**Required output**:
- Error catalog: `ReadinessError` → 422, `ToolNotFoundError` → 404, `QuotaExceededError` → 429, `SessionNotFoundError` → 404
- Error response shape: `{ error: string, code: string, details?: unknown }`
- How domain exceptions propagate through application layer to HTTP layer

**Depends on**: All domain error types, `Application Services.md`

---

#### B7: Dependency Injection Setup

**Status**: ❌ Not documented  
**Why needed**: Application services have 3-4 constructor dependencies each.

**Required output**:
- DI approach: manual factory functions vs container (awilix, tsyringe)
- Wiring diagram: which service depends on which repository/gateway
- Per-request vs singleton lifetime decisions

**Depends on**: `Application Services.md`, repository interfaces

---

### 🟢 P2 — Before deploy

#### B8: Auth Middleware

**Status**: ❌ Not documented  
**Why needed**: `Identity & Access` BC exists but middleware is undefined.

**Required output**: JWT validation, role guard (`admin` vs `member`), session validation, CSRF protection

#### B9: Environment Config

**Status**: ❌ Not documented  
**Why needed**: Backend needs env vars to start.

**Required output**: `DATABASE_URL`, `REDIS_URL`, `LLM_API_KEY`, `SERPAPI_KEY`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT`, `NODE_ENV`

---

## Frontend Gaps

### 🔴 P0 — Block `npm run dev`

#### F1: ToolPage Machine (XState v5)

**Status**: ✅ Done — see [[ToolPage Machine (XState v5)]]  
**Why needed**: The frontend needs a state machine to drive the tool UI workflow.

**Output**:
- 8 states: draftEmpty → configuring → ready → submitting → running → completed → failed → cancelled
- 2 actors: `submitSession` (POST via fetch), `subscribeToSSE` (EventSource via fromCallback)
- React integration with `useMachine` hook and state → UI derivation function
- Component tree: ToolPage → SetupPanel, KnowledgePanel, FeedbackPanel, SessionSummary, ErrorPanel
- CTA policy: 6 UI states with correct button behavior per state
- Guards: `canSubmit` (mirrors backend ReadinessPolicy), `isStillDraft`

---

### 🟡 P1 — Needed to complete the flow

#### F2: Contracts Package Structure

**Status**: ❌ Not documented  
**Why needed**: FE and BE need shared types.

**Required output**:
- `packages/contracts/src/` structure
- API DTOs: `StartSessionRequest`, `StartSessionResponse`, `SessionStatusResponse`
- SSE event types: `StepCompletedEvent`, `SessionCompletedEvent`, `SessionFailedEvent`
- Shared enums: `ToolKey`, `AssetType`, `SessionStatus`
- Compile-time parity guard between FE and BE types

**Depends on**: `packages-domain Structure.md`, API routes (B2)

#### F3: API + SSE Client

**Status**: ❌ Not documented  
**Why needed**: Frontend needs to call the backend.

**Required output**:
- HTTP client: fetch wrapper with auth headers, error handling
- SSE client: `EventSource` with reconnection, event parsing
- React hooks: `useSession(sessionId)`, `useSSE(sessionId)`

---

### 🟢 P2 — Before deploy

#### F4: ReadinessSnapshot UI

**Status**: ❌ Not documented  
**Why needed**: Users need to see what's missing before they can start.

#### F5: Component Tree

**Status**: ❌ Not documented  
**Why needed**: React component architecture.

**Required output**: `ToolPageTemplate`, `SetupPanel`, `KnowledgePanel`, `ToolFeedbackPanel`, `SessionSummary`, `ArtifactDownload`

#### F6: State → UI Derivation

**Status**: ❌ Not documented  
**Why needed**: 8 canonical UI states → which components render.

---

## Coverage Summary

| Layer | Items | P0 | P1 | P2 |
|-------|-------|----|----|-----|
| Backend | 9 | 4 | 3 | 2 |
| Frontend | 6 | 1 | 2 | 3 |
| **Total** | **15** | **5** | **5** | **5** |

## Ingestion Order

```
B1 → B2 → B3 → F1    (P0: unblock npm run dev)
B4 → B5 → B6 → B7    (P1: complete the flow)
F2 → F3               (P1: frontend integration)
B8 → B9 → F4 → F5 → F6 (P2: production readiness)
```