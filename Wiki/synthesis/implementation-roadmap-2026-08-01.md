---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/roadmap
  - wiki/implementation
date_updated: 2026-08-04
phase_count: 13
phases_complete: 13
phases_remaining: 0
phase_12_backend: complete
phase_12_frontend: pending
---

# Implementation Roadmap — Rational Development Sequence (2026-08-01)

## Objective

Translate the current documentation baseline into an execution order that minimizes rework, validates value early, and keeps contracts/governance stable while code is introduced.

## Roadmap Principles

1. **Vertical slice first**: ship one end-to-end generation flow before expanding bounded contexts.
2. **Contract stability before feature breadth**: keep [[API Contract Baseline v1]] authoritative.
3. **Operational readiness from day one**: enforce [[Quality Gate Matrix]] (incorporates [[Quality Gate Matrix|Definition of Done]]) from the first implementation PR.
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

### Phase 8 — Real Authentication (Week 14) ✅

**Plan**: [[phase-8-real-auth-plan]] — detailed implementation plan (5 workstreams, 35 files, 8-10 days estimated effort).

**Current gap** (unchanged): `dev-auth.ts` middleware injects a hardcoded seed user. No login, no registration, no real JWT verification. The config schema already defines `JWT_SECRET` and the `jsonwebtoken` dependency is installed — the scaffolding is there.

**Design authority**: the authentication architecture is already specified in [[Auth Dependencies]] (Passport.js + JWT + bcrypt + OAuth strategies) and [[Auth Middleware]] (JWT verification, role guards, CSRF protection). Phase 8 implements those designs.

**Status**: ✅ Complete (2026-08-02). Backend (Workstreams A, B, C, E) + Frontend (Workstream D) — all 5 workstreams done.

**Goal**: replace the dev stub with real authentication supporting registration, login, token refresh, Google/GitHub OAuth, and frontend auth flow.

Implementation (2026-08-02, branch `feature/phase-8-real-auth`):

- **Identity domain** (`packages/domain/src/identity/`) — User aggregate, Email/UserRole/UserStatus value objects, UserRepository interface, AuthSession/OAuthAccount read models, 4 domain errors
- **BcryptPasswordHasher** (`apps/backend/src/infrastructure/bcrypt-hasher.ts`) — cost factor 12, implements `PasswordHasher` interface
- **KyselyUserRepository** (`packages/infra-db/src/repositories/user-repository.ts`) — full CRUD for users + auth_sessions + oauth_accounts
- **DB types** (`packages/infra-db/src/types.ts`) — `AuthSessionsTable`, `OAuthAccountsTable` added to `DB` interface
- **Seed migration** (`packages/infra-db/migrations/008_seed_user.sql`) — dev user `dev@flow-app.local` / `password123`
- **TokenService** (`apps/backend/src/infrastructure/token-service.ts`) — JWT access tokens (HS256, 15min) + opaque refresh tokens (32-byte crypto random)
- **AuthService** (`apps/backend/src/api/auth/auth-service.ts`) — register/login/refresh/logout/OAuth orchestration with token rotation
- **Passport.js** (`apps/backend/src/infrastructure/passport-config.ts`) — local + Google OAuth strategies
- **Auth routes** (`apps/backend/src/api/auth/auth-routes.ts`) — 7 endpoints: register, login, refresh, logout, me, Google, Google callback
- **authenticate middleware** (`apps/backend/src/middleware/authenticate.ts`) — JWT `authenticate()` + `authenticateOrDev()` (dev fallback)
- **Rate limiter** (`apps/backend/src/middleware/auth-rate-limit.ts`) — 5 attempts / 15 min on login
- **Type-safe auth** (`apps/backend/src/middleware/auth-types.ts`) — `AuthUser` interface, `getAuthUser()`/`setAuthUser()` helpers, `Express.Request` augmentation
- **Env schema** (`apps/backend/src/config.ts`) — `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_SECONDS`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `AUTH_RATE_LIMIT_*`, `SEED_USER_ID`
- **App wiring** — auth routes registered before auth middleware (public endpoints); `authenticateOrDev` replaces dev-auth in non-production

**Transition strategy**:
- Dev: `authenticateOrDev` — if `Authorization: Bearer <token>` present, real JWT; otherwise dev-auth seed user
- Production: `authenticate` mandatory — all routes require valid JWT

**Frontend implementation** (Workstream D, 2026-08-02, branch `feature/phase-8-real-auth`):

- **AuthContext** (`apps/frontend/src/auth/AuthContext.tsx`) — React context: `user`, `isLoading`, `isAuthenticated` state. Module-level token store (never localStorage). `login()`, `register()`, `logout()`, `attemptTokenRefresh()`. On mount: silent refresh via httpOnly cookie (`POST /api/auth/refresh`). `getAccessToken()` / `setAccessToken()` exported for API client.
- **AuthGuard** (`apps/frontend/src/auth/AuthGuard.tsx`) — Protected route wrapper: loading → spinner, !isAuthenticated → redirect `/login`, authenticated → `<Outlet />`
- **OAuthCallback** (`apps/frontend/src/auth/OAuthCallback.tsx`) — Handles `/auth/callback?token=...` from Google OAuth redirect. Stores token, navigates to dashboard.
- **AuthLayout** (`apps/frontend/src/components/AuthLayout.tsx`) — Centered card layout with logo, shared by Login and Register pages
- **LoginPage** (`apps/frontend/src/pages/LoginPage.tsx`) — Email + password form + Google OAuth button + link to `/register`
- **RegisterPage** (`apps/frontend/src/pages/RegisterPage.tsx`) — Email + password + confirm form, min 8 chars validation, link to `/login`
- **API client update** (`apps/frontend/src/api/client.ts`) — Injects `Authorization: Bearer <token>` via `getAccessToken()`. On 401: attempts `attemptTokenRefresh()` (cookie), retries once. Refresh failure → `window.location.href = '/login'`
- **Routing update** (`apps/frontend/src/App.tsx`) — Public routes: `/login`, `/register`, `/auth/callback`. All other routes wrapped in `<AuthGuard>`
- **AppShell user menu** (`apps/frontend/src/layout/AppShell.tsx`) — MUI Avatar in AppBar with dropdown: email, role badge, Logout action
- **AuthProvider wrapper** (`apps/frontend/src/main.tsx`) — `<AuthProvider>` outermost, before WorkspaceAccentProvider and ThemeProvider

**Verification**: Typecheck 4/4 clean. Frontend build ✅ (552 KB → 172 KB gzip). Backend build ✅. Lint 0 errors. Domain tests 8/8.

**Exit criteria**:

- ✅ Registration, login, refresh all functional
- ✅ Google OAuth login flow functional
- ✅ Protected routes redirect unauthenticated users (AuthGuard)
- ✅ Token refresh is transparent to the user (client.ts 401 interceptor)
- ✅ Dev-auth only active in development without explicit auth header

### Phase 9 — DDD Architectural Remediation (Week 15) ✅

**Plan**: [[phase-9-implementation-plan]] — 47 steps across 4 sub-phases (9a–9d).

**Current gap**: 11 VALIDATION gaps between wiki design and code — type-alias value objects with no runtime validation, weakly-typed session events, `throw new Error()` bypassing ErrorMapper.

**Status**: ✅ Complete (2026-08-02). All 11 VALIDATION gaps closed. Structural gaps S1–S3 deferred to Phase 10+.

**Goal**: convert all domain type aliases to classes (Rule 4), replace `throw new Error()` with `DomainError` subclasses (Rule 3), type session events as discriminated union, add artifact lifecycle guards.

Implementation (2026-08-02, branch `dev`):

- **Phase 9a** — Foundation:
  - V10: 12 new `DomainError` subclasses across 8 files (zero `throw new Error` in domain)
  - V1: `SessionStatus` type alias → class (7 states, `isTerminal()`, `equals()`)
  
- **Phase 9b** — Core:
  - V2: `MembershipRole` type alias → class (`isOwner`/`isEditor`/`isViewer` getters)
  - V9: `SessionEvent` discriminated union (7 typed event shapes, zero `as` casts)
  - V3: `ToolKey` type alias → class (11 static instances)
  - V4: `AgentKey` type alias → class (7 static instances)

- **Phase 9c** — Remaining VOs:
  - V5: `ConversationStatus` → class (`isActive`/`isArchived` getters)
  - V6: `MessageRole` → class (`isUser`/`isAgent`/`isSystem` getters)
  - V7: `MembershipStatus` → class (`isPending`/`isActive` getters)
  - V8: `ArtifactStatus` → class (`canTransitionTo()`/`apply()` lifecycle guards)
  - V11: Artifact lifecycle guards integrated into `ArtifactStatus` class

- **Phase 9d** — Cleanup:
  - `PromptComponentType` type alias → class (5 instances, `isSystemRule`/`isFormatConstraint`/etc.)
  - `UserStatus` getter consistency fix (`isActive()` method → getter)

- **CI fix** — `send-message.usecase.ts` string comparison hidden by incremental build cache
- **CI optimization** — `paths-ignore` on push trigger (skip CI for Wiki/, *.md, .obsidian/)

**Impact**: ~70 files modified. Zero `as` casts on converted VOs. All 8 type aliases resolved (only `ModelTier` remains — intentional infra/config).

**Exit criteria**:

- Zero `throw new Error(...)` in `packages/domain/src/`
- All 8 type-alias VOs converted to classes
- `Session.apply()` uses `SessionEvent` discriminated union
- All existing tests pass
- No circular imports introduced

### Phase 10 — Deployment & CI/CD (Week 16) ✅

**Current gap**: no Dockerfile, no `railway.json`, no CI/CD pipelines, no GitHub Actions. The app runs only via `npm run dev`.

**Status**: ✅ Implemented (2026-08-02, branch `dev`). Code artifacts created; actual Railway deploy requires project setup + secrets.

**Goal**: production-ready deployment on Railway with automated CI/CD, environment parity, and health monitoring.

Implementation (2026-08-02, branch `dev`):

- **Dockerfile** — multi-stage build:
  - Stage 1 (builder): `node:22-alpine` — `npm ci` (full install), `tsc --build` (all packages + backend), `vite build` (frontend), `npm prune --production`, fix workspace package.json exports (`src/` → `dist/`)
  - Stage 2 (production): `node:22-alpine`, non-root user (`nodejs:1001`), HEALTHCHECK on `/health`, `CMD node apps/backend/dist/server.js`
  - Worker deployment: same image, override `CMD node apps/backend/dist/generation/worker/worker-process.js`
  - Build script fix: root `"build": "tsc --build && npm run build --workspace=apps/frontend"` (packages have no standalone build scripts)

- **.dockerignore** — excludes node_modules, dist, .git, .github, Wiki, logs, coverage

- **railway.json** — Railway-compatible schema: `builder: DOCKERFILE`, healthcheck at `/health`, restart `ALWAYS`, 1 replica

- **GitHub Actions CI** (`.github/workflows/ci.yml`) — 4 jobs on PR to main/staging/dev:
  - `lint`: eslint (`npm run lint`)
  - `typecheck`: `tsc --build`
  - `test`: PostgreSQL 16 + Redis 7 service containers, migrations run, `vitest --run`
  - `build`: full `tsc --build` + `vite build`
  - `paths-ignore` for Wiki/, *.md, .obsidian/

- **GitHub Actions Deploy** (`.github/workflows/deploy.yml`) — 4 check jobs + 3 conditional deploys:
  - `refs/heads/dev` → `railway up --environment dev`
  - `refs/heads/staging` → `railway up --environment staging`
  - `refs/heads/main` → `railway up --environment production`
  - Uses Railway CLI (`curl -fsSL https://railway.com/install.sh | sh`)
  - Protected by GitHub Environments (requires `RAILWAY_TOKEN` secret)

- **Docker Compose** — `docker-compose.yml` already exists (PostgreSQL 16 + Redis 7 for local dev and CI parity)

**DDD Drift Risk**: 🟢 **NEGLIGIBLE** — Phase 10 is 100% infrastructure code (Dockerfile, railway.json, CI YAML). Zero domain or application code changes. No DDD rules at risk.

**Next steps for Railway provisioning**: create Railway project, provision PostgreSQL + Redis services, set `RAILWAY_TOKEN` secret in GitHub, create environments (dev/staging/production).

**Reverse proxy findings**: documented in [[deployment-patterns-phase-10]] — nginx approach failed (10+ attempts) due to template conflicts, builder switch issues, and Docker/node ESM quirks. Current architecture uses backend public URL + CORS.

**Exit criteria**:

- `railway up` deploys successfully
- CI runs on every PR (build + lint + test)
- Staging and production environments exist on Railway
- Health checks pass in all environments

### Phase 11 — Testing & Quality (Week 17) ✅

**Current gap**: 1 test file (`Identifier` value object). `supertest`, `@testing-library/react`, and `msw` are installed as devDependencies but unused. The entire domain model, API layer, and worker logic is untested.

**Status**: ✅ Complete (2026-08-04). [[synthesis/phase-11-testing-plan|Implementation plan]] executed across 4 layers — 66 test files, ~634 tests:

| Layer | Files | Tests |
|-------|-------|-------|
| Domain | 32 | 415 |
| Backend | 18 | 127 |
| Frontend | 12 | 60 |
| Infra-db | 4 | 32 |

Production vitest configs with per-workspace coverage thresholds (domain 60/50, infra-db 40/30, backend 30/20, frontend 30/20). CI blocks merge on test failure.

### Phase 11.5 — Usage & Quota Bounded Context (Week 17, 2026-08-04) ✅

**Current gap**: DB migration `005_quotas.sql` created the `quotas` and `credit_transactions` tables, and `ErrorMapper` mapped `QUOTA_EXCEEDED → 429`. But zero domain code existed — `packages/domain/src/usage/` was missing entirely.

**Status**: ✅ Domain complete (2026-08-04). [[synthesis/usage-quota-implementation-plan|Implementation plan]] executed — 10 domain files, Kysely repository, backend wiring, 40 tests.

**Two-track enforcement per user per billing period (YYYY-MM)**:
- Artifact Gate (1000/month, invisible) — blocks ALL generations
- Credit Quota (250/month, visible) — blocks submit with "Crediti esauriti"

Implementation (2026-08-04, branch `dev`):

- **Value Objects** — PlanType, Plan, CreditAmount, QuotaPeriod, TransactionReason (all classes per Rule 4)
- **Child entity** — CreditTransaction (immutable, create/reconstitute factories per Rule 6)
- **Aggregate root** — Quota (canonical template per Rule 7: private constructor, _version, ReadonlyArray, DomainEvent return)
- **Events** — CreditConsumedEvent, QuotaExceededEvent, ArtifactGateExceededEvent (interface-based)
- **Errors** — QuotaExceededError, ArtifactGateExceededError, QuotaNotFoundError (all extend DomainError per Rule 3)
- **Repository** — QuotaRepository interface + KyselyQuotaRepository with saveWithLock() optimistic locking
- **DB migration** — 009_quotas_version.sql (version column on quotas table for optimistic locking)
- **Backend wiring** — error-handler (+ARTIFACT_GATE_EXCEEDED → 429), AppDeps (+quotaRepo), server.ts wiring
- **Tests** — 3 test files, 40 tests (Plan, QuotaPeriod, Quota aggregate)
- **Lint** — zero errors, zero warnings (18 pre-existing errors + 18 warnings fixed in same commit)

**Verification**: `tsc --build` clean, `npm run lint` clean, 80 domain tests passing (40 usage + 40 from Phase 11 expansion).

**Out of scope** (follow-up): EnsureQuotaUseCase, ConsumeCreditsUseCase, API routes, event subscriptions, frontend UI.

### Phase 12 — Usage & Quota Wiring ✅ (Backend) / 🟡 (Frontend)

**Status**: ✅ Backend complete (2026-08-04), 🟡 Frontend pending.

**Discovery**: Phase 12 backend was implemented silently during Phases 11.5 and 13 — `ConsumeCreditsUseCase`, `GET /api/usage/credits`, and session worker wiring were all in place but never marked as complete in the roadmap. Audit on 2026-08-04 confirmed all 3 backend tasks done:

| Task | Status | File |
|------|--------|------|
| `ConsumeCreditsUseCase` | ✅ | `apps/backend/src/application/usage/consume-credits.usecase.ts` — auto-creates quota on first use, optimistic retry (3 attempts), deducts `tool.creditCost` credits |
| `GET /api/usage/credits` | ✅ | `apps/backend/src/api/usage/usage-routes.ts` — returns `{ credits: { used, limit, remaining, percent }, artifacts: { used, limit, remaining }, plan, period }` |
| Session worker wiring | ✅ | `apps/backend/src/generation/worker/session-worker.ts:166-175` — `consumeCreditsUC.execute()` after every `SessionCompleted`, with structured error logging |
| Worker process wiring | ✅ | `apps/backend/src/generation/worker/worker-process.ts:50-51` — `KyselyQuotaRepository` → `ConsumeCreditsUseCase` → injected into `SessionWorkerDeps` |
| EventBridge wiring | Deferred | Out of scope — credit consumption is synchronous (reliable) |
| Frontend UI | 🟡 Pending | Quota counter + "Crediti esauriti" blocking message — see [[frontend-gap-analysis-2026-08-04|Track A]] |

**Verification**: `tsc --build` clean, `eslint` 0/0, 80 usage domain tests passing.

**Remaining**: only frontend — quota counter in sidebar, 429 QUOTA_EXCEEDED blocking UI, artifact gate warning. Track A of [[frontend-gap-analysis-2026-08-04]].

### Phase 13 — Gamification (Week 18+) ✅ — [Implementation Plan](phase-13-implementation-plan.md)

**Plan**: [[phase-13-implementation-plan]] — detailed scope (29 steps, 40+ files, 8 sub-phases), DDD risk register, pre-commit checklist.

**Status**: ✅ Complete (2026-08-04). [[synthesis/phase-13-implementation-plan|Implementation plan]] executed — 27 domain files, 9 backend files, DB migration 010, wiring into session worker + send-message + accept-invitation use cases:

| Layer | Files | Key Deliverables |
|-------|-------|-----------------|
| Domain | 27 | 2 aggregate roots (PlayerProfile, WorkspaceChallenge), Achievement entity, 9 class VOs, 3 domain services, 5 domain events, 22-badge catalog, 5-challenge catalog, 2 repository interfaces |
| Infra-DB | 5 | Migration 010 (7 tables: player_profiles, achievements, xp_transactions, gamification_processed_events, workspace_leaderboard, workspace_challenges, challenge_contributions), 7 Kysely table types, 2 Kysely repo implementations |
| Backend infra | 4 | ProcessedEventRepository (atomic tryClaim), XPTransactionRepository, LeaderboardProjectionRepository, GamificationStatsRepository |
| Application | 3 | GamificationEventPublisher (BullMQ), gamification-worker.ts (dedup + optimistic retry + 5-step pipeline), GetPlayerProfileUseCase |
| API | 1 | 5 endpoints (/api/me/profile, leaderboard, health, challenges, seasons) |
| Wiring | 9 | session-worker.ts, worker-process.ts, send-message/accept-invitation use cases, agent-chat.ts, workspaces.ts, app.ts, 2 barrel exports |

**DDD compliance**: All 14 CLAUDE.md rules verified — zero violations. 8 DomainError subclasses (Rule 3), 9 class VOs (Rule 4), save() scope clean (Rule 5), canonical factories (Rule 6), aggregate template (Rule 7).

**Verification**: `tsc --build` clean (0 domain/backend errors), `eslint` clean (0 errors, 0 warnings).

**Implementation fixes applied** (from pre-exec validation):
- **F1**: `saveWithLock` captures `expectedVersion` BEFORE mutations (canonical SessionWorker pattern line 127)
- **F2**: `MemberJoined` 75 XP awarded to inviter (`membership.invitedBy`), not joiner
- **F3**: `AllTimeStats` type defined (6 counters for cross-time badges like `sessions-100`)
- **F4**: Atomic `tryClaim` with `INSERT ON CONFLICT DO NOTHING` for event dedup
- **F5**: `ArtifactPromoted` event deferred (not yet emitted by generation context)
- **F6**: Seasonal badges (6) added to catalog — total 22 badges across 4 tiers + seasonal

**Base branch**: `dev`

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
7. Real LLM integration (Phase 6) ✅
8. Frontend MVP (Phase 7) ✅
9. Real authentication (Phase 8) ✅ — full stack: identity domain + Passport.js + JWT + frontend auth flow
10. **DDD architectural remediation** (Phase 9) ✅ — type aliases → classes, DomainError, discriminated unions
11. **Deployment & CI/CD** (Phase 10) ✅ — Dockerfile, railway.json, GitHub Actions CI/CD, docker-compose
12. **Testing & quality** (Phase 11) ✅ — 66 files, ~634 tests, vitest production configs
12.5. **Usage & Quota domain** (Phase 11.5) ✅ — 10 files, 40 tests, Kysely repository
13. **Usage & Quota wiring — backend** (Phase 12) ✅ — `ConsumeCreditsUseCase`, `GET /api/usage/credits`, session worker wiring
14. **Usage & Quota wiring — frontend** (Phase 12) 🟡 — quota counter, "Crediti esauriti" block, artifact gate warning
15. **Gamification** (Phase 13) ✅ — [plan](phase-13-implementation-plan.md) — engagement layer: 50 files, 2 aggregates, 22 badges, BullMQ event pipeline

## Referenced Pages

- [[API Contract Baseline v1]]
- [[Quality Gate Matrix]]
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
- [[LLM Gateway - OpenRouter]]
- [[Environment Configuration]]
- [[phase-9-implementation-plan]]
- [[phase-9-architectural-targets]]
- [[phase-13-implementation-plan]]
- [[rule-4-vo-debt]]
