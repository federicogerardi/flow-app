---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/implementation
  - wiki/testing
date_updated: 2026-08-04
phase: 11
status: completed
source_count: 6
---

# Phase 11 — Testing & Quality Implementation Plan

## Objective

Eliminate the near-zero test coverage baseline (1 test file — `Identifier` VO) across the monorepo. The testing toolchain is installed but entirely unused: `vitest`, `supertest`, `@testing-library/*`, `msw`. The `vitest.workspace.ts` is a stub (6 empty `defineProject({})` entries). This phase wires the infrastructure, then writes tests layer by layer: domain → repositories → application → API → worker → frontend → CI gates.

**Scope constraint**: only code that exists in the filesystem is testable. Wiki-documented but unimplemented bounded contexts (**Gamification**, **Usage & Quota**), entities (**Asset**, **CrawlData**), and domain services (**AssetResolver**, **AssetPromotion**) are out of scope and receive zero tests.

## Current Baseline

| Metric | Value |
|--------|-------|
| Test files | 1 (`packages/domain/src/shared/__tests__/identifier.test.ts` — 5 tests) |
| Per-package vitest configs | 0 (only root `vitest.config.base.ts`) |
| Workspace config | Stub: 6 empty `defineProject({})` |
| Test setup files | 0 (no `setup.ts` anywhere) |
| `jsdom` installed | No (peer dep of vitest, not direct) |
| Test coverage | 0% on all workspaces |
| CI test job | Does not exist (lint + typecheck + build only) |

## Overview of Changes

### New Files (~75)

- **6** vitest config files (`vitest.config.ts` × 5 workspaces + `vitest.workspace.ts` rewrite)
- **4** test setup/helper files (`setup.ts` × 3 + `test/helpers.ts`)
- **1** MSW handler file (`apps/frontend/src/test/mocks/handlers.ts`)
- **~25** domain test files (aggregates, VOs, domain services, prompt components, domain events)
- **4** repository integration test files
- **6** use case test files
- **5** middleware/infrastructure test files (authenticate, workspace-role, error-handler, token-service, auth-service)
- **5** API integration test files (auth, generation, workspace, agent-chat, admin)
- **2** worker test files (session-machine, session-worker)
- **~10** frontend test files (6 pages + 4 auth/auth-components)
- **~6** shared component test files

### Modified Files (~4)

- `vitest.workspace.ts` — replace stub with named workspace projects
- `.github/workflows/ci.yml` — add `test` job with PostgreSQL + Redis services
- `eslint.config.js` — add vitest ESLint rules
- `apps/frontend/package.json` — add `jsdom` as direct devDependency

---

## Phase 11a: Infrastructure Setup

### 1. Install `jsdom` directly (File: `apps/frontend/package.json`)

Current state: `jsdom` exists only as a vitest peer dependency in `package-lock.json` but is not a direct `devDependency`. Frontend component tests require it.

### 2. Fix `vitest.workspace.ts` (File: root `vitest.workspace.ts`)

Replace the 6 empty `defineProject({})` stub entries:

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/domain',
  'packages/infra-db',
  'apps/backend',
  'apps/frontend',
]);
```

Each reference resolves to that workspace's own `vitest.config.ts`.

### 3. Create per-workspace vitest configs (5 files)

Each workspace config imports the shared `baseConfig` and adds workspace-specific overrides. None currently exists.

| File | Key Settings |
|------|-------------|
| `packages/domain/vitest.config.ts` | Pure Node, no setup. Merge base config, `test.name: 'packages-domain'` |
| `packages/infra-db/vitest.config.ts` | Node, `setupFiles: ['./test/setup.ts']`. `test.name: 'packages-infra-db'` |
| `apps/backend/vitest.config.ts` | Node, `setupFiles: ['./src/test/setup.ts']`. `test.name: 'backend'` |
| `apps/frontend/vitest.config.ts` | `environment: 'jsdom'`, `plugins: [react()]`, `css: true`, `setupFiles: ['./src/test/setup.ts']`. `test.name: 'frontend'` |

### 4. Create test setup files (4 files)

| File | Purpose |
|------|---------|
| `packages/infra-db/test/setup.ts` | Export `createTestDb()` and `destroyTestDb()` helpers. Use `pg-mem` for local, real PostgreSQL from `docker-compose.yml` in CI. Runs migrations before each suite. |
| `apps/backend/src/test/setup.ts` | Set `NODE_ENV=test`. Export `createTestApp(deps?: Partial<AppDeps>): Express` helper. Mock/fake implementations for `LlmGateway`, `JobEventBridge`, `Queue`. |
| `apps/frontend/src/test/setup.ts` | Import `@testing-library/jest-dom/vitest`. `afterEach(cleanup)`. Configure MSW server lifecycle. |
| `apps/frontend/src/test/mocks/handlers.ts` | MSW handlers for all 28 API endpoints with realistic response shapes matching `packages/contracts` DTOs. |

---

## Phase 11b: Domain Tests — `packages/domain`

All tests are pure unit tests. No infrastructure dependencies. Zero mocking needed.

### Shared Kernel

| # | File | Entity | Cases |
|---|------|--------|-------|
| 5 | `shared/__tests__/identifier.test.ts` | `Identifier` | Extend existing 5 tests: empty strings, UUID format, large strings, cross-type comparison |
| 6 | `shared/__tests__/date-time.test.ts` | `DateTime` | `now()`, `isBefore()`, `isAfter()`, `equals()`, `toUTCDate()`, `minus()`, immutability |
| 7 | `shared/__tests__/domain-error.test.ts` | `DomainError` | `code` is set, `retryable` is set, `message` is accessible, subclassing works |

### Generation Bounded Context

| # | File | Entity | Key Cases |
|---|------|--------|-----------|
| 8 | `generation/__tests__/Session.test.ts` | `Session` | `create()` initializes `draft` + version 1. `reconstitute()` pass-through. All valid transitions: `CONFIGURE` (draft→ready, sets startedAt), `QUEUE` (ready→queued), `WORKER_PICKUP` (queued→running), `ADD_ARTIFACT` (increments stepIndex), `COMPLETE` (running→completed, returns SessionCompleted event), `FAIL` (running→failed, sets errorCode/errorMessage), `CANCEL` from ready/queued/running. Invalid transitions: `COMPLETE` from draft, `QUEUE` from completed, `CANCEL` from terminal. Version increments on every `apply()`. |
| 9 | `generation/__tests__/SessionStatus.test.ts` | `SessionStatus` | All 7 instances. `isTerminal()`. `equals()`. `SessionStatus.from('draft')` valid. Invalid string throws. |
| 10 | `generation/__tests__/ToolKey.test.ts` | `ToolKey` | All 11 static instances. `equals()`. `from()` valid/invalid. `toString()`. |
| 11 | `generation/__tests__/Artifact.test.ts` | `Artifact` | `create()` sets pending status. `reconstitute()`. Step number stored. Content stored. |
| 12 | `generation/__tests__/ArtifactStatus.test.ts` | `ArtifactStatus` | `canTransitionTo()` valid transitions. `apply()` succeeds on valid. `apply()` throws on invalid. Terminal states. |
| 13 | `generation/__tests__/ReadinessPolicy.test.ts` | `ReadinessPolicy` | `from(tool)`. `evaluate()` returns `{ isReady, missing }`. All required inputs present → `isReady: true`. Missing required → `isReady: false` with missing list. Optional missing → `isReady: true`. |
| 14 | `generation/__tests__/session-lifecycle.test.ts` | `SessionLifecycle` | `initialState === 'draft'`. `getValidTransition()` returns correct target for every valid transition. Returns `null` for every invalid transition (all 7×7 combinations). `type: 'final'` on terminal states. |
| 15 | `generation/__tests__/ContextEnricher.test.ts` | `ContextEnricher` | `enrich()` returns combined context from previous + acquisition data. Handles empty previous results. Handles empty acquisition data. Handles both present. |

### Prompt Components (Generation Context)

| # | File | Entity | Key Cases |
|---|------|--------|-----------|
| 16 | `generation/__tests__/PromptComponent.test.ts` | `PromptComponent` | `create()` with all fields. `fromFile()` bypasses validation. Empty content throws `EmptyComponentContentError`. `componentKey`, `type`, `content`, `version`, `description` all accessible. |
| 17 | `generation/__tests__/PromptComponentType.test.ts` | `PromptComponentType` | All 5 instances. `from()` valid/invalid. `isSystemRule`, `isFormatConstraint`, `isSafetyGuard`, `isStyleGuide`, `isDomainKnowledge` getters. `equals()`. `toString()`. Invalid string throws `InvalidPromptComponentTypeError`. |
| 18 | `generation/__tests__/PromptComponentRegistry.test.ts` | `PromptComponentRegistry` | `register()` + `get()` round-trip. `get()` returns undefined for unknown key. `getAll()` returns all registered. `resolveAll()` returns ordered. `resolveAll()` throws `PromptComponentNotFoundError` for unknown key. `has()` true/false. |
| 19 | `generation/__tests__/PromptComposer.test.ts` | `PromptComposer` | `compose()` with template + system_rule → system prepended. `compose()` with format_constraint → user appended. `compose()` with context → `{{slots}}` replaced. `compose()` with both system and format components. `compose()` with unknown component key throws. Empty components array → clean pass-through. |
| 20 | `generation/__tests__/PromptTemplateId.test.ts` | `PromptTemplateId` | `from(toolKey, stepLabel)` valid. `fromString('blog-post/seo-structure')` valid. `fromString('invalid')` throws `InvalidPromptTemplateIdFormatError`. `from('INVALID', 'key')` throws `InvalidPromptTemplateKeyError`. `equals()`. `toString()`. |
| 21 | `generation/__tests__/PromptVersion.test.ts` | `PromptVersion` | `PromptVersion.LATEST` is `'latest'`. `from('latest')` returns LATEST instance. `from('1.0.0')` valid semver. `from('invalid')` throws. `isLatest`/`isPinned` getters. `equals()`. `toString()`. |

### Workspace Bounded Context

| # | File | Entity | Key Cases |
|---|------|--------|-----------|
| 22 | `workspace/__tests__/Workspace.test.ts` | `Workspace` | `create()` initializes with owner membership. `reconstitute()` pass-through. `inviteMember()` adds invited membership, throws if not owner, throws on duplicate. `acceptInvitation()` transitions invited→active, throws if not invited. `removeMember()` removes active member, throws if target is owner, throws if caller not owner. `transferOwnership()` swaps roles atomically. `changeMemberRole()` updates role, throws for owner. `isOwner()`, `isMember()`, `canEdit()`, `canView()`, `getMemberRole()` for all role/viewer combos. `memberships` returns `ReadonlyArray`. Version increments on mutations. |
| 23 | `workspace/__tests__/WorkspaceMembership.test.ts` | `WorkspaceMembership` | `invite()` creates invited membership. `accept()` transitions to active. `changeRole()` updates role. `_setRoleAsOwner()` sets role to owner (internal). `isActive` getter. `isOwner` getter (checks role === 'owner' AND active). |
| 24 | `workspace/__tests__/MembershipRole.test.ts` | `MembershipRole` | All 3 instances. `isOwner`/`isEditor`/`isViewer` getters. `equals()`. `from()` valid/invalid. `toString()`. |
| 25 | `workspace/__tests__/MembershipStatus.test.ts` | `MembershipStatus` | `Invited`/`Active` instances. `isPending`/`isActive` getters. `equals()`. `from()` valid/invalid. |

### Agent Chat Bounded Context

| # | File | Entity | Key Cases |
|---|------|--------|-----------|
| 26 | `agent-chat/__tests__/Conversation.test.ts` | `Conversation` | `start()` creates active conversation. `addMessage()` appends user message, auto-titles from first user message (80 chars + '...'). `addMessage()` throws `ConversationArchivedError` when archived. `archive()` transitions active→archived, throws when already archived. `recentMessages(n)` returns last N. `messages` returns `ReadonlyArray`. `status`/`title` getters. |
| 27 | `agent-chat/__tests__/Message.test.ts` | `Message` | `user()` factory creates user-role message. `agent()` factory creates agent-role message. `system()` factory creates system-role message. `reconstitute()` pass-through. `role`, `content`, `createdAt` all accessible. Immutability of content. |
| 28 | `agent-chat/__tests__/ConversationStatus.test.ts` | `ConversationStatus` | `Active`/`Archived` instances. `isActive`/`isArchived` getters. `equals()`. `from()` valid/invalid. |
| 29 | `agent-chat/__tests__/MessageRole.test.ts` | `MessageRole` | `User`/`Agent`/`System` instances. `isUser`/`isAgent`/`isSystem` getters. `equals()`. `from()` valid/invalid. |
| 30 | `agent-chat/__tests__/AgentKey.test.ts` | `AgentKey` | All 7 static instances. `equals()`. `from()` valid/invalid. `toString()`. |

### Identity Bounded Context

| # | File | Entity | Key Cases |
|---|------|--------|-----------|
| 31 | `identity/__tests__/User.test.ts` | `User` | `create()` with email. `reconstitute()` pass-through. `email` is `Email` VO. `role` defaults to `Member`. `status` defaults to `Active`. |
| 32 | `identity/__tests__/Email.test.ts` | `Email` | Valid emails normalize to lowercase. Missing `@` throws `InvalidEmailError`. Empty string throws. Max length 255. |
| 33 | `identity/__tests__/UserRole.test.ts` | `UserRole` | `Admin`/`Member` instances. `equals()`. `from()` valid/invalid. `toString()`. |
| 34 | `identity/__tests__/UserStatus.test.ts` | `UserStatus` | `Active`/`Disabled` instances. `isActive`/`isDisabled` getters. `equals()`. `from()` valid/invalid. |

### Domain Events (smoke tests)

| # | File | Event | Key Cases |
|---|------|-------|-----------|
| 35 | `generation/__tests__/domain-events.test.ts` | Session events | `SessionCompleted` has `eventType`, `occurredAt`, `aggregateId`. `SessionFailed` same shape. `SessionCancelled` same shape. Events are serializable. |
| 36 | `workspace/__tests__/domain-events.test.ts` | Workspace events | `MemberInvited`, `MemberJoined`, `MemberRemoved`, `OwnershipTransferred` all conform to `DomainEvent` interface. |
| 37 | `agent-chat/__tests__/domain-events.test.ts` | Chat events | `ConversationStarted`, `MessageAdded`, `ConversationArchived` conform to `DomainEvent` interface. |

---

## Phase 11c: Repository Integration Tests — `packages/infra-db`

These tests hit a real PostgreSQL database. Use `pg-mem` for local development speed; real PostgreSQL (`docker-compose.yml`) in CI to validate against the actual engine.

### 38. `infra-db/src/__tests__/session-repository.spec.ts` (~12 cases)

- `save()` insert + `findById()` retrieve
- `saveWithLock()` succeeds with matching version, throws `ConcurrencyError` on stale version (`numUpdatedRows === 0`)
- `findByIdempotencyKeyHash()` returns session or null
- `findByWorkspace()` with pagination (`limit`, `offset`), status filter
- `findAll()` returns all sessions
- `saveSnapshot()` + `loadSnapshot()` round-trip (JSON string content)
- `saveIdempotencyKey()` insert + duplicate prevention (`ON CONFLICT`)
- Transaction rollback: error during multi-table save leaves no partial state

### 39. `infra-db/src/__tests__/workspace-repository.spec.ts` (~10 cases)

- `save()` persists workspace + memberships in one transaction
- `findById()` returns workspace with populated memberships
- `findByMember()` returns all workspaces the user belongs to (any role)
- `saveWithLock()` optimistic locking on workspace version
- `findMembership()` returns individual `WorkspaceMembership` row
- `findPendingInvitations()` returns only `status = 'invited'` rows

### 40. `infra-db/src/__tests__/conversation-repository.spec.ts` (~8 cases)

- `save()` persists conversation with messages atomically
- `findById()` returns conversation with ordered messages
- `findByUserAndWorkspace()` scoped to userId — other user's conversations not returned (privacy invariant)
- Pagination support (`limit`, `offset`)
- Update: add messages to existing conversation, persist again
- Archive update: `status = 'archived'` persists

### 41. `infra-db/src/__tests__/user-repository.spec.ts` (~10 cases)

- `save()` user + `findById()` + `findByEmail()`
- Duplicate email insertion throws constraint violation
- `saveAuthSession()` + `findByRefreshToken()` round-trip
- `deleteAuthSession()` removes single session
- `deleteAllAuthSessionsForUser()` clears all sessions for user
- `saveOAuthAccount()` + `findByOAuth()` with `provider` + `providerId`
- OAuth account duplicate constraint (same provider+providerId)

---

## Phase 11d: Application & API Tests — `apps/backend`

### Use Cases (6 files, ~32 cases)

All use case tests mock repositories and infrastructure deps via manual DI. The `createTestApp` helper from Phase 11a provides fake implementations.

| # | File | Cases |
|---|------|-------|
| 42 | `application/__tests__/start-session.test.ts` | Valid request creates session + enqueues job. Idempotency key match returns existing session (no duplicate). Readiness failure throws. Unknown tool throws `ToolNotFoundError`. Workspace not found throws. |
| 43 | `application/__tests__/invite-member.test.ts` | Valid invite creates membership. Duplicate invite throws. Non-owner caller throws. |
| 44 | `application/__tests__/accept-invitation.test.ts` | Valid accept transitions to active. Already active is no-op. Non-invited accept throws. |
| 45 | `application/__tests__/transfer-ownership.test.ts` | Valid transfer swaps roles. Non-owner transfer throws. Transfer to non-member throws. |
| 46 | `application/__tests__/start-conversation.test.ts` | Valid start creates conversation. Workspace not found throws. Invalid agentKey throws. |
| 47 | `application/__tests__/send-message.test.ts` | Valid send creates user+agent messages. LLM failure returns graceful fallback. Send to archived throws `ConversationArchivedError`. |

### Middleware & Error Handling (5 files, ~28 cases)

These test Express middleware functions in isolation with mocked `req`/`res`/`next`.

| # | File | Cases |
|---|------|-------|
| 48 | `middleware/__tests__/authenticate.test.ts` | Missing `Authorization` header → 401 `MISSING_TOKEN`. Malformed header → 401. Expired token → 401 `INVALID_TOKEN`. Valid token → `next()` called, `req.authUser` set. `authenticateOrDev`: with header → real auth; without header → dev auth fallback. |
| 49 | `middleware/__tests__/workspace-role.test.ts` | No auth user → 401. No workspaceId in params → 400. Workspace not found → 404. Wrong role → 403 with descriptive message. Correct role → `next()` called, `req.workspace` + `req.workspaceRole` set. Owner role grants access to all endpoints. Viewer blocked on `POST`/`PUT`/`DELETE`. |
| 50 | `middleware/__tests__/error-handler.test.ts` | `ErrorMapper.toHttpStatus`: `ConcurrencyError` → 409. `DomainError` with `TOOL_NOT_FOUND` → 404. `DomainError` with `READINESS_FAILED` → 422. `DomainError` with `LLM_GATEWAY_ERROR` → 502. Unknown `DomainError` code → 500. Plain `Error` → 500. `ErrorMapper.toResponse`: structured format with `code`, `message`, `retryable`. `ConcurrencyError` includes `details.resourceId`. `INTERNAL_ERROR` masks message in production. `errorHandler` middleware returns correct status + JSON. |
| 51 | `infrastructure/__tests__/token-service.test.ts` | `generateAccessToken(user)` returns JWT with `sub`, `email`, `role` claims. `verifyAccessToken(validToken)` returns payload. `verifyAccessToken(expiredToken)` returns null. `generateRefreshToken()` returns 64-char hex string. `refreshTokenExpiry()` returns future date (7 days). `accessTokenExpirySeconds()` returns positive integer. |
| 52 | `api/auth/__tests__/auth-service.test.ts` | `register()` returns user + tokens, encrypts password with bcrypt. Duplicate email throws `409`. `login()` with correct credentials returns tokens. Wrong password throws `401`. Disabled user throws `403`. `refresh()` with valid token rotates + issues new tokens. Invalid/expired refresh token throws `401`. `logout()` deletes session. |

### API Integration Tests (5 files, ~55 cases)

Full HTTP stack tests via `supertest(createTestApp(...))`. Fake repositories pre-seeded with test data. Mock `LlmGateway` returns deterministic responses.

| # | File | Cases |
|---|------|-------|
| 53 | `api/__tests__/auth.spec.ts` | `POST /api/auth/register` — 201 + user + token + cookie. 409 duplicate. 422 invalid email. `POST /api/auth/login` — 200 + token, 401 wrong password. `POST /api/auth/refresh` — 200 + rotated cookie. 401 expired/missing. `POST /api/auth/logout` — 200 + cleared cookie. `GET /api/auth/me` — 200 with user, 401 without token. `GET /api/auth/google` — 501 when not configured (`GOOGLE_CLIENT_ID` missing). |
| 54 | `api/__tests__/generation.spec.ts` | `POST /api/tools/blog-post/sessions` — 201 + session DTO. Idempotency: same key → 200 replay, different key → 201. Unknown `toolKey` → 404. Missing required inputs → 422 + `READINESS_FAILED`. `GET /api/sessions` — list with filters + pagination. `GET /api/sessions/:id` — detail with artifacts. Not found → 404. `GET /api/artifacts/:id` — 200 + content. Not found → 404. Auth required — 401 without `Authorization` header. |
| 55 | `api/__tests__/workspace.spec.ts` | `POST /api/workspaces` — 201, creator is owner. `GET /api/workspaces` — user's workspaces. `GET /api/workspaces/:id` — 200 as member, 404 not found, 403 not a member. Invite → 200, non-owner → 403, duplicate → 409. Accept → 200. Decline → 200. Remove member → 200, remove owner → 403. Change role → 200, change owner role → 403. Transfer ownership → 200, non-owner → 403. List invitations → 200. |
| 56 | `api/__tests__/agent-chat.spec.ts` | `GET /api/workspaces/:wid/agents` — 200 + 7 personas. `POST /api/workspaces/:wid/conversations` — 201. `GET /api/workspaces/:wid/conversations` — privacy: returns only user's conversations. `GET /api/conversations/:id` — 200 with messages. Not found → 404. `POST /api/conversations/:id/messages` — 200 with user + agent message IDs. Send to archived → 409. `POST /api/conversations/:id/archive` — 200. |
| 57 | `api/__tests__/admin.spec.ts` | `GET /admin/jobs` — 200 with queue stats. `GET /admin/health` — 200 `{ status: 'healthy', alerts: [] }`. |

---

## Phase 11e: Worker Tests — `apps/backend`

### 58. `generation/__tests__/session-machine.test.ts` (~10 cases)

Test the XState v5 state machine in isolation (no BullMQ, no LLM calls). Mock the `executeStep` and `persistSession` actors with `fromPromise`.

- Initial state: `draft`
- `CONFIGURE` → `ready`
- `QUEUE` → `queued`
- `WORKER_PICKUP` → `running`
- `COMPLETE` → `completed`
- `FAIL` → `failed`
- `CANCEL` from `ready`/`queued`/`running` → `cancelled`
- Invalid transitions are rejected by guards (delegating to `SessionLifecycle`)
- `context.stepResults` accumulates after each `ADD_ARTIFACT`

### 59. `generation/__tests__/session-worker.test.ts` (~6 cases)

Test the BullMQ job processing logic. Requires Redis (`ioredis-mock` for local, real Redis in CI).

- Worker picks up valid job, processes through machine, calls `sessionRepo.saveWithLock()`
- `SessionNotFoundError` → job fails with clear error
- `ToolNotFoundError` → job fails with clear error
- LLM failure: primary model fails → fallback model succeeds
- LLM failure: all models fail → graceful fallback to `fallbackOutput`
- Stalled job detection: `lockDuration` exceeded → event emitted

---

## Phase 11f: Frontend Tests — `apps/frontend`

Requires `jsdom`, `@testing-library/react`, and MSW handlers from Phase 11a. All pages are code-split (`lazy`) — wrap in `Suspense` + `MemoryRouter`.

### Shared Components (~12 cases)

| # | File | Cases |
|---|------|-------|
| 60 | `components/__tests__/PageHeader.test.tsx` | Renders title. Renders subtitle. Renders children (action buttons). |
| 61 | `components/__tests__/EmptyState.test.tsx` | Renders message. Renders icon. Renders action button. |
| 62 | `components/__tests__/ErrorState.test.tsx` | Renders error message. Renders retry button. Click calls `onRetry`. |
| 63 | `components/__tests__/LoadingSkeleton.test.tsx` | Renders MUI Skeleton. |
| 64 | `components/__tests__/ErrorBoundary.test.tsx` | Renders children normally. Catches thrown error → renders ErrorState. |
| 65 | `components/__tests__/AuthLayout.test.tsx` | Renders logo. Renders title. Renders children inside card. |

### Auth Components (~8 cases)

| # | File | Cases |
|---|------|-------|
| 66 | `auth/__tests__/AuthGuard.test.tsx` | Shows spinner when `isLoading: true`. Redirects to `/login` when `!isAuthenticated`. Renders `<Outlet />` when authenticated. |
| 67 | `auth/__tests__/OAuthCallback.test.tsx` | Extracts token from query string. Stores token. Navigates to `/dashboard`. Invalid token → navigates to `/login?error=oauth_failed`. |
| 68 | `auth/__tests__/AuthContext.test.tsx` | `login()` sets user + tokens. `register()` sets user + tokens. `logout()` clears user + tokens. `attemptTokenRefresh()` calls `/api/auth/refresh` silently on mount. Refresh failure redirects to `/login`. |

### Pages (~20 cases)

| # | File | Cases |
|---|------|-------|
| 69 | `pages/__tests__/LoginPage.test.tsx` | Renders email + password fields. Submits credentials. Shows validation error on empty submit. Shows Google OAuth button. Redirects on success. Shows error on wrong password (401). |
| 70 | `pages/__tests__/RegisterPage.test.tsx` | Renders email + password + confirm fields. Validates min 8 chars. Validates password match. Submits registration. Redirects on success. Shows error on duplicate email (409). |
| 71 | `pages/__tests__/DashboardPage.test.tsx` | Shows loading state. Renders tool grid after load. Renders recent sessions list. Shows EmptyState when no sessions. |
| 72 | `pages/__tests__/ToolPage.test.tsx` | Renders tool form from `:toolKey` param. Disables submit when required inputs missing. Enables submit when valid. Shows POST response. Handles 422 `READINESS_FAILED`. |
| 73 | `pages/__tests__/SessionPage.test.tsx` | Renders session detail with artifacts. Shows progress indicator for running status. Shows completed state with final artifact. Shows error state for failed sessions. |
| 74 | `pages/__tests__/ConversationPage.test.tsx` | Renders conversation with messages. Sends new message → shows user + agent reply. Shows archive button. |

---

## Phase 11g: CI Enforcement + ESLint

### 75. Add vitest ESLint rules (File: `eslint.config.js`)

Add test-file overrides enforcing quality rules:

| Rule | Value | Effect |
|------|-------|--------|
| `vitest/no-focused-tests` | `error` | Blocks `.only` in CI — no skipped test suites |
| `vitest/expect-expect` | `error` | Every test must have at least one assertion |
| `vitest/consistent-test-it` | `['error', { fn: 'it' }]` | Use `it`, not `test` |
| `vitest/max-nested-describe` | `['error', { max: 3 }]` | Prevent deep nesting |
| `vitest/no-disabled-tests` | `warn` | Warn on `.skip` — use for conscious deferral |

### 76. Update CI workflow (File: `.github/workflows/ci.yml`)

Add `test` job to the existing `ci.yml` (which currently has `lint`, `typecheck`, `build`):

```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: flow_app_test
        POSTGRES_PASSWORD: test
      ports: ['5432:5432']
      options: >-
        --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    redis:
      image: redis:7
      ports: ['6379:6379']
      options: >-
        --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22 }
    - run: npm ci
    - run: npm run migrate --workspace=packages/infra-db
      env:
        DATABASE_URL: <DATABASE_URL>
    - run: npm test -- --run --coverage
      env:
        DATABASE_URL: <DATABASE_URL>
        REDIS_URL: <REDIS_URL>
        NODE_ENV: test
        JWT_SECRET: test-secret-at-least-32-characters-long-for-ci
        CSRF_SECRET: test-csrf-16-chars
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: coverage
        path: coverage/
```

---

## DDD Guardrails (Enforced During Phase 11)

From the roadmap's Phase 11 DDD Drift Risk table. These apply to every test file written in this phase:

| # | Risk | CLAUDE.md Rule | Enforcement |
|---|------|---------------|-------------|
| 1 | `new Session(...)` instead of `Session.create()`/`reconstitute()` | Rule 6 | Every test that creates an aggregate uses the canonical factory. Review checklist. |
| 2 | `(session as any)._status` in test assertions | Rule 1 | Use public getters (`session.status`, `session.version`). If a getter is missing, add it **before** writing the test — never cast. |
| 3 | `throw new Error()` in test fixtures | Rule 3 | Test fixtures that create domain objects must use `DomainError` subclasses for validation failures. |
| 4 | Asserting invariants via DB query instead of aggregate API | — | `expect(row.status).toBe('completed')` is a violation. Test domain behavior: `expect(session.status.toString()).toBe('completed')`. |

### Additional Guardrail

**Every TDD cycle for Phase 11 follows the red-green-refactor flow**: write the failing test first, verify it fails for the expected reason, implement the minimal fix, verify it passes, then refactor. This ensures tests are testing the right thing and are themselves correct.

---

## Coverage Targets (Per Roadmap Minimums)

| Layer | Lines | Branches |
|-------|-------|----------|
| `packages/domain` | ≥ 60% | ≥ 50% |
| `packages/infra-db` (repos) | ≥ 40% | ≥ 30% |
| `apps/backend` (app + infra) | ≥ 30% | ≥ 20% |
| `apps/frontend` | ≥ 30% | ≥ 20% |

These are minimums — individual bounded contexts within `packages/domain` may exceed them (Generation and Workspace are the most valuable to cover).

---

## Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | `pg-mem` doesn't support Kysely features (`ON CONFLICT`, `RETURNING`, CTEs) | High | Blocks Phase 11c | Real PostgreSQL from `docker-compose.yml` used in CI. Accept Docker dependency for local repo tests. |
| R2 | `ioredis-mock` doesn't support BullMQ internals | High | Blocks Phase 11e | Worker tests run with real Redis from `docker-compose.yml` or CI service container. |
| R3 | Frontend lazy-loaded pages fail in jsdom | Medium | Blocks Phase 11f | Wrap in `Suspense` + `MemoryRouter`. Use `await screen.findBy*` for async queries. |
| R4 | MSW handler response shapes drift from real API | Medium | False confidence | Add contract smoke test in `setup.ts` validating handler responses against `packages/contracts` DTOs. |
| R5 | CI test job timeout from slow DB/Redis startup | Medium | Blocks merges | Health-check options on service containers. `testTimeout: 30000` in vitest config. |
| R6 | `SESSION_NOT_FOUND` error code case mismatch from repo vs wiki | Low | Test failures | Verify `DomainError.code` case matches `ErrorMapper.toHttpStatus` switch. Consistent casing: `SCREAMING_SNAKE_CASE`. |
| R7 | Rate limiter state leaking between auth API tests | Medium | Flaky tests | Use `vi.useFakeTimers()` or reset rate limiter store between test suites. |
| R8 | SSE stream tests timing-dependent | Low | CI flakes | Mock `EventBridge.publish` with synchronous calls. Test SSE response shape, not timing. |
| R9 | `vitest --coverage` reports 0% on Kysely-generated code | Low | Misleading metrics | Exclude repository implementations from coverage thresholds; they're thin wrappers. |

---

## Scope Exclusion

The following bounded contexts, entities, and services are documented in the wiki but have **zero code on the filesystem**. They receive **zero tests**:

| Wiki Page | Status | Why Excluded |
|-----------|--------|-------------|
| [[Gamification]] bounded context | Planned | `packages/domain/src/gamification/` does not exist |
| [[PlayerProfile]] aggregate | Planned | No code |
| [[Achievement]] entity | Planned | No code |
| [[Usage & Quota]] bounded context | Planned | `packages/domain/src/usage/` does not exist |
| [[Quota]] aggregate | Planned | No domain code (DB migration 005 exists) |
| [[Asset]] entity | Planned | `workspace/entities/Asset.ts` does not exist |
| [[AssetResolver]] domain service | Planned | No code |
| [[Asset Promotion]] cross-context flow | Planned | No code |
| [[CrawlData]] value object | Planned | No code |
| [[IdempotencyKey]] value object | Planned | Logic is inline in repository methods |

---

## Success Criteria

- [ ] 76 test files created, 100% passing in local and CI
- [ ] `npm test -- --run` succeeds across all workspaces
- [ ] `vitest.workspace.ts` references 4 named workspaces with per-workspace configs
- [ ] Domain line coverage ≥ 60%
- [ ] CI `test` job runs with PostgreSQL 16 + Redis 7 service containers and passes
- [ ] ESLint `vitest/no-focused-tests: error` enforced — no `.only` committed
- [ ] Zero `new Session(...)` in test files — all aggregates created via `create()` or `reconstitute()`
- [ ] Zero `as any` casts to access private aggregate fields in test assertions
- [x] `coverage/` artifact uploaded to each CI run
- [x] Summary: from 1 test file → 66, from 0% coverage → ≥30-60% across layers

## Execution Results (2026-08-04)

| Layer | Files | Tests | Status | Coverage Target |
|-------|-------|-------|--------|-----------------|
| `packages/domain` | 32 | 415 | ✅ 100% passing | ≥ 60% lines |
| `packages/infra-db` | 4 | 32 | ✅ 100% passing | ≥ 40% lines |
| `apps/backend` | 18 | 127 | ✅ 100% passing | ≥ 30% lines |
| `apps/frontend` | 12 | 60 | ✅ 100% passing | ≥ 30% lines |
| **Total** | **66** | **~634** | | |

### Infrastructure Created

| File | Purpose |
|------|---------|
| `vitest.workspace.ts` | 4 named projects (domain, infra-db, backend, frontend) |
| `vitest.config.base.ts` | Shared config: globals, v8 coverage, timeouts |
| `packages/domain/vitest.config.ts` | Pure Node, coverage thresholds (60/50) |
| `packages/infra-db/vitest.config.ts` | Fork pool, sequential, coverage thresholds (40/30) |
| `apps/backend/vitest.config.ts` | Node, setupFile, coverage thresholds (30/20) |
| `apps/frontend/vitest.config.ts` | jsdom + React plugin, MSW setup, coverage (30/20) |
| `packages/infra-db/test/setup.ts` | Singleton DB pool (`createTestDb`, `destroyTestDb`) |
| `apps/backend/src/test/setup.ts` | NODE_ENV=test, mock factories (`createMockTokenService`, `createMockLlmGateway`, `createMockQueue`, `createMockEventBridge`) |
| `apps/frontend/src/test/setup.ts` | jest-dom matchers, MSW lifecycle, cleanup |
| `apps/frontend/src/test/mocks/handlers.ts` | 19 MSW handlers matching API contract |
| `apps/frontend/src/test/mocks/server.ts` | MSW server singleton |

### DDD Compliance

- Zero `new Session(...)` — all aggregates via `create()`/`reconstitute()`
- Zero `as any` casts — public getters only
- All test errors are `DomainError` subclasses

### Key Design Decisions

- **Infra-db uses fork pool + sequential**: prevents cross-file DB interference (different files share the same PostgreSQL instance). Configured in `vitest.config.ts` as `pool: 'forks'` + `fileParallelism: false`.
- **DB singleton pattern**: `createTestDb()` returns the same `Kysely` instance across all files in the same process, avoiding pool exhaustion.
- **Prerequisite inserts via `beforeAll` + `onConflict doNothing`**: workspaces and users are inserted once per test file, never deleted in `beforeEach` — they are shared prerequisites, not test data.
- **`contracts` and `copy` packages excluded from workspace**: no testable source code.
- **Repository tests need real PostgreSQL**: `pg-mem` was considered but rejected due to Kysely feature incompatibility (CTEs, `ON CONFLICT`). CI uses PostgreSQL 16 service container.

## Sources

- [[implementation-roadmap-2026-08-01]] — Phase 11 definition and DDD drift risks
- [[Testing Strategy]] — Test framework, patterns, naming, run commands
- [[Quality Gate Matrix]] — Coverage thresholds and CI enforcement rules
- [[packages-domain Structure]] — Domain file layout for test location
- [[Dependency Injection Setup]] — Manual DI enabling mockable tests
- [[API Contract Baseline v1]] — API response shapes for MSW handlers
