---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/roadmap
  - wiki/implementation
date_updated: 2026-08-01
phase_count: 11
phases_complete: 5
phases_remaining: 6
---

# Implementation Roadmap — Rational Development Sequence (2026-08-01)

## Objective

Translate the current documentation baseline into an execution order that minimizes rework, validates value early, and keeps contracts/governance stable while code is introduced.

## Roadmap Principles

1. **Vertical slice first**: ship one end-to-end generation flow before expanding bounded contexts.
2. **Contract stability before feature breadth**: keep [[API Contract Baseline v1]] authoritative.
3. **Operational readiness from day one**: enforce [[Quality Gate Matrix]] and [[Definition of Done]] from the first implementation PR.
4. **Scoped expansion**: add collaboration and engagement contexts only after core async reliability is stable.

## Phase Plan

### Phase 0 — Foundation Bootstrap (Week 1)

Focus:

- Materialize monorepo runtime structure (`apps/backend`, `apps/frontend`, `packages/*`).
- Wire baseline tooling (typecheck, lint, tests, contract checks).
- Stand up local infrastructure with [[Docker Compose - Local Dev]].
- Fail-closed startup config using [[Environment Configuration]].

Exit criteria:

- Local development boots with 1–2 commands.
- CI required checks are active and blocking.

### Phase 1 — Core Async Generation Vertical Slice (Weeks 2–3)

Focus:

- `POST /api/tools/:toolKey/sessions` with idempotent replay contract.
- Worker execution pipeline from [[BullMQ Worker Wiring]].
- Runtime lifecycle consistency from [[Session Machine (XState v5)]].
- SSE progress stream (`session_started`, `step_completed`, `session_completed`, `session_failed`).
- Frontend integration via [[API Client + SSE Client]] and tool page state flow.

Canonical state semantics:

`draft -> ready -> queued -> running -> completed|failed|cancelled`

Exit criteria:

- One tool completes end-to-end in staging with deterministic status transitions.
- Idempotent replay validated (`201` create, `200` replay).

### Phase 2 — Reliability and Ops Hardening (Week 4) ✅

Focus:

- Implement and verify [[Concurrency & Conflict Policy]].
- Queue/worker stability thresholds from [[Job Queue - Monitoring and Stability]].
- Backend structured logging and error mapping consistency.
- Frontend telemetry baseline from [[Frontend Error Observability]].
- Data cleanup and retention jobs from [[Database Schema]].

Exit criteria:

- No duplicate terminal side effects under retries.
- Queue and error-rate SLOs are observable and alertable.

Implementation (2026-08-01, branch `feature/phase-2-reliability-ops`):

- `ConcurrencyError` class with `resourceId`, `expectedVersion`, `actualVersion` (mapped to `409`)
- `SessionRepository.saveWithLock()` — conditional `WHERE version = ?`, throws `ConcurrencyError` on zero-row update
- `KyselySessionRepository.saveWithLock()` — Kysely implementation with `numUpdatedRows === 0n` detection
- `ErrorMapper` updated — `ConcurrencyError` → `409` with structured response `{code, message, details, retryable}`
- Worker structured logging — `job_started`/`job_completed`/`job_failed` schema with `sessionId`, `durationMs`, `attempts`, `toolKey`, `stepCount`, `error`, `stack`
- Worker stall config — `lockDuration: 120s`, `stalledInterval: 30s`, `maxStalledCount: 2`
- `QueueHealthMonitor` — SLO checks (failure rate, queue depth, P95 latency, stalled jobs) with warning/critical thresholds
- `GET /admin/jobs` — queue stats + worker uptime + stability metrics
- `GET /admin/health` — health check endpoint returning status + active alerts
- `worker-process.ts` — SIGTERM graceful shutdown: `worker.pause()` → drain (30s timeout) → `worker.close()`
- `CleanupJob` — hourly scheduled cleanup for expired idempotency keys + snapshots >7 days

### Phase 3 — Workspace Collaboration (Weeks 5–6) ✅

Focus:

- Membership model rollout from [[Workspace Sharing]] and [[Workspace Permissions]].
- API + middleware role enforcement.
- Migration alignment for workspace ownership model.

Exit criteria:

- Owner/editor/viewer behavior is consistent across API and domain rules.
- Migration path is validated in staging with no data drift.

Implementation (2026-08-01, branch `feature/phase-3-workspace-collaboration`):

- `WorkspaceMembership` entity — `invite()`, `accept()`, `changeRole()`, `isOwner`, `isActive`
- `Workspace` aggregate — `_memberships` collection, `inviteMember()`, `acceptInvitation()`, `removeMember()`, `transferOwnership()`, `changeMemberRole()`, permission checks (`isOwner`, `canEdit`, `canView`, `getMemberRole`)
- Value Objects — `MembershipRole` (`owner|editor|viewer`), `MembershipStatus` (`invited|active`)
- Domain errors — `NotWorkspaceOwnerError`, `NotAWorkspaceMemberError`, `InsufficientWorkspacePermissionError`, `MemberAlreadyExistsError`, `CannotRemoveOwnerError`, `NotAnActiveMemberError`
- Domain events — `MemberInvited`, `MemberJoined`, `MemberRemoved`, `OwnershipTransferred`
- `WorkspaceRepository` interface — `findById()`, `findByMember()`, `save()`, `saveWithLock()`, `findMembership()`, `findPendingInvitations()`
- `KyselyWorkspaceRepository` — Kysely implementation with membership sync
- `requireWorkspaceRole()` middleware — HTTP guard with role check, admin bypass pattern
- API routes — 10 endpoints (workspaces CRUD, invitations, members, ownership transfer)
- Use cases — `InviteMemberUseCase`, `AcceptInvitationUseCase`, `TransferOwnershipUseCase`

### Phase 4 — Prompt Governance Runtime (Week 7)

Focus:

- Prompt/version contract enforcement with [[Prompt Versioning]] and [[Prompt Components]].
- Ensure idempotency signature remains stable with prompt identity.

Exit criteria:

- Prompt updates are traceable and replay-safe.

### Phase 5 — Expansion Tracks (Week 8+) ✅

Order:

1. [[Agent Chat]]
2. [[Gamification]]

Reasoning: chat has stronger direct workflow value and lower cross-context reward complexity than gamification.

Implementation (2026-08-01, branch `feature/phase-3-workspace-collaboration`):

- **Agent Chat bounded context** — Conversation aggregate, Message entity, 7 agent personas
- **Message entity** — `user()`, `agent()`, `system()` factories, immutable, append-only
- **Conversation aggregate** — `addMessage()`, `archive()`, auto-title from first message, `recentMessages(n)` for context window
- **7 agent personas** — strategist, copywriter, seo-specialist, ads-specialist, analyst, creative-director, email-marketer (static config)
- **ConversationRepository** — interface + `KyselyConversationRepository` with privacy scoping (`findByUserAndWorkspace`)
- **DB migration** — `007_conversations.sql` (conversations + messages tables)
- **6 API routes** — agents list, conversations CRUD, messages, archive
- **2 use cases** — `StartConversationUseCase`, `SendMessageUseCase`
- **Privacy invariant** — conversations private to creator, enforced at domain + API layers
- **Lint fix** — `migrate.ts` console.log → process.stdout/write (0 errors)

### Phase 6 — Real LLM Integration (Week 9-10) ✅

**Current gap**: the session worker returns `'Mock generated content'` and agent chat's `SendMessageUseCase` never generates AI replies. The entire value proposition is stubbed out.

**Design authority**: the LLM gateway architecture is already specified in [[LLM Gateway - OpenRouter]] — `LlmGateway` class using the OpenAI SDK (OpenRouter-compatible), 4 `ModelTier` values with primary/fallback model pairs, and cost tracking. Phase 6 implements that design, not reinvents it.

**Status**: 🟢 Implemented — all blockers cleared. `OPENROUTER_API_KEY` configured.

**Goal**: wire real LLM calls via OpenRouter to both the generation pipeline and agent chat, using the prompt governance runtime built in Phase 4.

Implementation (2026-08-01, branch `dev`):

- **LlmGateway** (`apps/backend/src/infrastructure/llm-gateway.ts`) — OpenAI SDK wrapper for OpenRouter API
  - `generate()` with primary model + fallback chain (429/503/500 → retryable)
  - Structured logging (`llm_generate_start`, `llm_generate_success`, `llm_generate_primary_failed`, `llm_generate_fallback`)
  - Token usage tracking (`promptTokens`, `completionTokens`, `totalTokens`)
  - Latency tracking per call

- **ModelRegistry** (`apps/backend/src/infrastructure/model-registry.ts`) — 4 `ModelTier` configs
  - `premium`: Claude Sonnet 4 / GPT-4o (16K tokens)
  - `balanced`: GPT-4o Mini / Gemini Flash (8K tokens)
  - `light`: Gemini Flash Lite / Llama 4 Maverick (4K tokens)
  - `search`: Gemini 2.5 Pro / Perplexity (8K tokens)

- **LlmErrors** (`apps/backend/src/infrastructure/llm-errors.ts`) — Domain error hierarchy
  - `LlmGatewayError` → `502` (already mapped in ErrorMapper)
  - `LlmRateLimitError` → 429, `LlmTimeoutError` → 504, `LlmUnavailableError` → 503

- **Config** — `OPENROUTER_BASE_URL`, `OPENROUTER_APP_NAME`, `LLM_DEFAULT_TIMEOUT_MS` added to env schema

- **Session worker wiring** — `executeStep` actor replaced mock with:
  - `ContextEnricher.enrich()` for user prompt from acquisition data + previous step results
  - `PromptComposer.compose()` with tool's `StepPromptDefinition` (templateId + components)
  - Fallback: if template not found, uses step label as system prompt

- **Agent chat wiring** — `SendMessageUseCase` now generates AI replies:
  - Composes persona system prompt + conversation history (last 20 messages)
  - Calls `LlmGateway.generate()` with `balanced` tier
  - Creates `Message.agent()` with token usage and model ID
  - Graceful fallback message on LLM failure

- **Server + worker wiring** — `LlmGateway`, `PromptComposer`, `PromptTemplateRepository` wired through `AppDeps` and `SessionWorkerDeps`

- **Bug fix** — `PromptVersion.from('1')` → `'1.0.0'` in `default-components.ts` (was crashing on startup)

**Goal**: wire real LLM calls via OpenRouter to both the generation pipeline and agent chat, using the prompt governance runtime built in Phase 4.

**Tasks expected**:

1. **Implement `LlmGateway`** — as designed in [[LLM Gateway - OpenRouter]]
   - `apps/backend/src/infrastructure/llm-gateway.ts` — OpenAI SDK wrapper for OpenRouter API
   - `apps/backend/src/infrastructure/model-registry.ts` — `ModelTier` → primary/fallback model IDs
   - Token usage tracking (`inputTokens`, `outputTokens`, `modelId`) from OpenRouter response headers
   - Cost estimation per call (OpenRouter provides per-request cost)
   - Config via `OPENROUTER_API_KEY` (already defined in env schema)

2. **Session worker LLM wiring** — replace hardcoded mock in `session-worker.ts` `executeStep`
   - Use `PromptComposer` from Phase 4 to build the full prompt from the tool's `StepDefinition`
   - Pass composed prompt to `LlmGateway.generate()` with the `ModelTier` from `StepDefinition`
   - Parse structured output via Zod schemas (tool-specific, TypeScript-native)
   - Error fallback: primary model → tier fallback model → `fallbackOutput` from `StepDefinition`

3. **Agent chat LLM wiring** — implement assistant reply generation in `SendMessageUseCase`
   - Compose persona system prompt + conversation history (last N messages)
   - Call `LlmGateway.generate()` with `balanced` tier
   - Create `Message.agent()` domain object with the response
   - Persist both user and agent message atomically

4. **Token budget control** — per-session and per-conversation token limits
   - `TOKEN_BUDGET_MAX_TOTAL` (default 100K)
   - `TOKEN_BUDGET_WARNING_THRESHOLD` (default 80%)
   - Prevent run-away costs with hard cap

5. **Error resilience** — model unavailable, timeout, rate limit
   - `LLMUnavailableError`, `LLMRateLimitError`, `LLMTimeoutError` domain errors
   - Exponential backoff + circuit breaker for provider outages
   - Graceful degradation to the `fallbackOutput` in `StepDefinition`

**Exit criteria**:

- Session worker generates real AI content using composed prompts
- Agent chat returns real AI replies from persona-tuned system prompts
- Token tracking is accurate and budgets are enforced
- Model swap is a config change (per [[LLM Gateway - OpenRouter]] model registry)

### Phase 7 — Frontend MVP (Week 11-13) ✅ — [Implementation Plan](frontend-mvp-plan-2026-08-01.md)

**Plan**: [[frontend-mvp-plan-2026-08-01]] — detailed scope, component inventory, route map, implementation order.

**Current gap**: the frontend is a single `<h1>` with MUI dependencies installed but zero components. The API client, SSE client, and SWR hooks are wired and functional — the UI just needs to be built on top of them.

Implementation (2026-08-01, branch `dev`):

- **Theme** (`src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`) — light/dark from [[Design Tokens]], MUI v6 createTheme
- **AppShell** (`src/layout/AppShell.tsx`) — MUI AppBar + Drawer + Outlet layout
- **Routing** (`src/App.tsx`) — 5 routes via react-router v7 (BrowserRouter + Routes + nested Route)
- **4 shared components** — PageHeader, EmptyState, ErrorState, LoadingSkeleton
- **DashboardPage** — tool grid + recent sessions list (SWR-powered)
- **ToolPage** — dynamic form from toolKey + submit → POST /api/tools/:toolKey/sessions
- **SessionPage** — SSE-powered status + progress bar + artifact rendering
- **ConversationPage** — chat interface with agent reply display
- **API client** — expanded: listWorkspaces, getConversation, sendMessage, listAgents, getArtifact, etc.
- **Hook fix** — `useWorkspaces()` bug fixed (was calling `listSessions()`)
- **Backend endpoints** — `GET /api/sessions` + `GET /api/artifacts/:id` added
- **SessionRepository** — `findByWorkspace()` method added (interface + Kysely impl)
- **Context7 verified** — React Router v7 canonical import `"react-router"`, MUI v6 Grid2 + `size` prop, `@mui/icons-material@6.x`
- **Bug fix** — ESM import hoisting caused `SEED_USER_ID` to be read before `dotenv.config()` ran (documented in [[log]])

**Goal**: deliver a functional SPA covering the full user workflow: workspace selection → session configuration → live generation progress → results review → agent chat refinement.

**Tasks expected**:

1. **Routing & layout** — react-router v7 with protected routes
   - `/dashboard` → session/workspace overview
   - `/workspaces/:id` → workspace detail + member management
   - `/workspaces/:id/sessions/new` → session creation wizard
   - `/workspaces/:id/sessions/:id` → session detail with live progress
   - `/workspaces/:id/conversations/:id` → agent chat panel

2. **Dashboard page** — list recent sessions, workspaces, quick-start buttons
   - SWR-powered data fetching from existing API client
   - Session status badges (draft/queued/running/completed/failed)

3. **Session creation wizard** — multi-step form configuring generation inputs
   - Step 1: select tool/template
   - Step 2: input form fields (target audience, goals, brand guidelines, etc.)
   - Step 3: review & start

4. **Live generation progress** — SSE-powered real-time pipeline view
   - Step-by-step progress indicator (animated pipeline)
   - Completed artifacts appear as they finish (not all at once)
   - Error states with retry option

5. **Results review** — display generated content with diff/compare
   - Formatted artifact rendering (markdown → HTML)
   - Copy-to-clipboard, download as file

6. **Agent chat panel** — conversational refinement interface
   - Agent persona selector (7 agents from Phase 5)
   - Chat message list with streaming (for real generation feel)
   - Message send + auto-scroll

7. **Workspace management UI** — members, roles, invites
   - Invite by email, role selector (owner/editor/viewer)
   - Member list with role badges

**Tech choices**:

- **MUI v6** (already installed) for design system — AppBar, Drawer, Cards, Stepper
- **SWR** (already installed) for data fetching
- **SSE client** (already implemented in `sse-client.ts`) for real-time events
- **zustand** or **jotai** for client-side state (lightweight, no boilerplate)

**Exit criteria**:

- Full workflow: dashboard → create session → watch generation → review results
- Agent chat sends/receives messages (real LLM responses from Phase 6)
- Workspace CRUD with member management
- Responsive (desktop primary, tablet acceptable)

### Phase 8 — Real Authentication (Week 14)

**Current gap**: `dev-auth.ts` middleware injects a hardcoded seed user. No login, no registration, no real JWT verification. The config schema already defines `JWT_SECRET` and the `jsonwebtoken` dependency is installed — the scaffolding is there.

**Design authority**: the authentication architecture is already specified in [[Auth Dependencies]] (Passport.js + JWT + bcrypt + OAuth strategies) and [[Auth Middleware]] (JWT verification, role guards, CSRF protection). Phase 8 implements those designs.

**Goal**: replace the dev stub with real authentication supporting registration, login, token refresh, Google/GitHub OAuth, and frontend auth flow.

**Tasks expected**:

1. **User entity** — extend existing `User` aggregate with password hashing
   - `bcrypt` for password storage (cost factor 12)
   - `User.register()` and `User.verifyPassword()` domain methods

2. **Passport.js integration** — as designed in [[Auth Dependencies]]
   - `passport-local` strategy for email/password login
   - `passport-google-oauth2` strategy for Google OAuth
   - `passport-oauth2` strategy for GitHub OAuth
   - JWT issuance after successful Passport authentication

3. **Auth endpoints** — `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`
   - Access token (15 min) + refresh token (7 days, httpOnly cookie)
   - Rate limiting on login (5 attempts / 15 min)

4. **Auth middleware** — replace `dev-auth.ts` with real JWT verification per [[Auth Middleware]]
   - `Bearer` token extraction from `Authorization` header
   - `jwt.verify()` with algorithm check (HS256)
   - User lookup from decoded `sub` claim
   - Conditional: use dev-auth only when `NODE_ENV === 'development' && !req.headers.authorization`

5. **Frontend auth flow** — login/register/OAuth pages, protected routes
   - Login form → store access token in memory (not localStorage)
   - Axios/fetch interceptor for token refresh on 401
   - `AuthContext` for current user state
   - Google/GitHub OAuth buttons

6. **Workspace privacy** — enforce `userId` scope on all queries
   - Already implemented in domain layer (Phase 3)
   - Auth middleware provides the real userId instead of the seed

**Exit criteria**:

- Registration, login, refresh all functional
- Google OAuth login flow functional
- Protected routes redirect unauthenticated users
- Token refresh is transparent to the user
- Dev-auth only active in development without explicit auth header

### Phase 9 — Deployment & CI/CD (Week 15)

**Current gap**: no Dockerfile, no `railway.json`, no CI/CD pipelines, no GitHub Actions. The app runs only via `npm run dev`.

**Goal**: production-ready deployment on Railway with automated CI/CD, environment parity, and health monitoring.

**Tasks expected**:

1. **Dockerfile** — multi-stage build for both frontend and backend
   - Stage 1: build frontend (Vite → static assets)
   - Stage 2: build backend (TypeScript → Node.js)
   - Stage 3: production image (Node 22-alpine, minimal deps)

2. **Railway config** — `railway.json` with service definitions
   - `backend` service (Express on port 3000, health check `/health`)
   - `worker` service (BullMQ worker process, same image, different start command)
   - PostgreSQL + Redis via Railway managed services
   - Environment-specific configs (dev/staging/production)

3. **GitHub Actions CI/CD** — automated build, test, deploy pipeline
   - PR → build + lint + test (vitest)
   - Merge to `dev` → deploy to Railway dev environment
   - Merge to `staging` → deploy to Railway staging environment
   - Merge to `main` → deploy to Railway production environment (manual approval gate)

4. **Environment config** — parity across environments
   - `.env.example` with all required vars documented
   - `NODE_ENV`-specific config loading
   - Secrets via Railway variable references (never in repo)

5. **Health monitoring** — production observability
   - Railway health checks on `/health`
   - `QueueHealthMonitor` alerts (already built in Phase 2)
   - Structured logging (already built with pino)

**Exit criteria**:

- `railway up` deploys successfully
- CI runs on every PR (build + lint + test)
- Staging and production environments exist on Railway
- Health checks pass in all environments

### Phase 10 — Testing & Quality (Week 16)

**Current gap**: 1 test file (`Identifier` value object). `supertest`, `@testing-library/react`, and `msw` are installed as devDependencies but unused. The entire domain model, API layer, and worker logic is untested.

**Goal**: achieve meaningful test coverage across the stack, focusing on domain logic, API contracts, and critical paths. Not aiming for 100% — targeting confidence in the areas that matter most.

**Tasks expected**:

1. **Domain entity tests** — unit tests for all aggregates and value objects
   - `Session`, `Workspace`, `Conversation`, `Message`, `Artifact`
   - State transitions, invariants, error conditions
   - Idempotency key behavior, optimistic locking

2. **Repository integration tests** — test Kysely repositories against real PostgreSQL
   - Test container or `docker-compose` DB
   - CRUD operations, optimistic locking conflicts, transaction rollback
   - Row-level privacy (conversations scoped to user)

3. **API endpoint tests** — supertest against Express app
   - All endpoints: generation, workspaces, agent chat, admin
   - Idempotency replay, error responses, SSE events
   - Auth middleware behavior (dev + real)

4. **Worker tests** — BullMQ job processing
   - Job completion, retry, failure paths
   - Stalled job detection
   - Graceful shutdown behavior

5. **Critical path E2E** — one happy-path test per bounded context
   - Session creation → polling → artifact retrieval
   - Workspace creation → invite → accept → role check
   - Agent chat: start conversation → send message → receive reply

6. **CI enforcement** — quality gates
   - Tests must pass for PR merge
   - Coverage threshold: 60% domain, 40% infra, 30% API (minimums)

**Exit criteria**:

- All domain entity tests pass
- API smoke tests for all route groups
- Worker job lifecycle tests
- CI blocks merge on test failure

### Phase 11 — Gamification (Week 17+)

**Current gap**: gamification was deferred from Phase 5. It's the engagement layer — points, achievements, leaderboards — that makes the platform sticky for teams.

**Goal**: add a cross-context gamification system that rewards productive usage patterns without creating perverse incentives.

**Tasks expected**:

1. **Points system** — `GamificationEvent` domain events
   - Session completed → +10 pts
   - Artifact approved → +5 pts
   - Workspace invite accepted → +3 pts
   - Agent chat interaction → +1 pt
   - Configurable point values per action type

2. **Achievements & badges** — milestone-based unlocks
   - "First Session" → complete 1 session
   - "Power User" → complete 50 sessions
   - "Team Player" → join 3 workspaces
   - "Prompt Master" → use all 7 agent personas
   - Badge display in user profile

3. **Leaderboards** — workspace-scoped and global
   - Weekly/monthly points ranking
   - Opt-in visibility (privacy-first)
   - Avoid gamification pressure (no negative consequences)

4. **Gamification repository** — `GamificationRepository` interface + Kysely impl
   - Points ledger (append-only, auditable)
   - Achievements table
   - Leaderboard queries

5. **Event-driven wiring** — consume domain events from Phase 1-5
   - `SessionCompleted` → award points
   - `MembershipAccepted` → award points
   - `MessageAdded` → award points
   - Use BullMQ for async gamification processing (don't block main flow)

**Exit criteria**:

- Points awarded on key actions
- Achievements unlock and display
- Leaderboards update daily
- Gamification events are async (don't slow down core workflows)

## Cross-Phase Non-Negotiables

- No merge without passing [[Quality Gate Matrix]] required checks.
- No API mutation without contract update in [[API Documentation - OpenAPI]].
- No naming drift from canonical queue lifecycle (`QUEUE` / `WORKER_PICKUP`, `canQueue`).
- No production promotion without [[CI-CD Promotion Policy]] gates.

## Risk Register (Top 7)

1. **Scope expansion too early**
   - Mitigation: phase gates and feature flags for non-core contexts.
2. **Contract drift under parallel delivery**
   - Mitigation: OpenAPI diff + typed contract enforcement in CI.
3. **Async reliability regressions**
   - Mitigation: replay/idempotency tests, snapshot recovery, queue SLO guardrails.
4. **Governance bypass pressure**
   - Mitigation: documented exception workflow and expiration policy.
5. **LLM cost overruns** (Phase 6)
   - Mitigation: token budgets with hard caps, per-session limits, provider cost tracking.
6. **Frontend complexity creep** (Phase 7)
   - Mitigation: MUI design system constraints, component library audit before custom builds, MVP-first mindset.
7. **Auth implementation delay** (Phase 8)
   - Mitigation: dev-auth continues working during frontend build, auth is additive not blocking.

## Recommended Immediate Backlog Order

1. Bootstrap + CI guardrails ✅
2. Core session vertical slice ✅
3. Reliability hardening ✅
4. Workspace sharing ✅
5. Prompt governance runtime ✅
6. Agent chat ✅
7. **Real LLM integration** (Phase 6) — unblocking the core value prop
8. **Frontend MVP** (Phase 7) — users need an interface
9. **Real authentication** (Phase 8) — replace dev stub
10. **Deployment & CI/CD** (Phase 9) — get it live
11. **Testing & quality** (Phase 10) — build confidence
12. **Gamification** (Phase 11) — engagement layer

## Referenced Pages

- [[API Contract Baseline v1]]
- [[Quality Gate Matrix]]
- [[Definition of Done]]
- [[CI-CD Promotion Policy]]
- [[Session Machine (XState v5)]]
- [[BullMQ Worker Wiring]]
- [[Concurrency & Conflict Policy]]
- [[Frontend Error Observability]]
- [[Workspace Sharing]]
- [[Workspace Permissions]]
- [[Prompt Versioning]]
- [[Prompt Components]]
- [[PromptComposer]]
- [[Agent Chat]]
- [[Gamification]]
- [[LLM Gateway - OpenRouter]]
- [[Auth Dependencies]]
- [[Auth Middleware]]
- [[Testing Strategy]]
- [[Token Budget Control]]
- [[Railway Deployment Config]]
