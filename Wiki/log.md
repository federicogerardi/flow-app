---
type: log
tags:
  - wiki/log
date_updated: 2026-08-02
---

# Wiki Operation Log

Every ingest, lint run, and maintenance operation is recorded here automatically. For a better experience, use the **Operation History** panel:
- Cmd+P → "View operation history"
- Or open from Settings → Auto Maintenance → Operation History
---

## [2026-08-02] remediation | Wiki drift — source of truth alignment post Phase 8

Comprehensive drift remediation to make the Wiki the authoritative source of truth for development status. Cross-referenced all Wiki claims against actual runtime code across 5 layers (domain, infrastructure, API, DB, frontend).

### Drift audit results

| Layer | Wiki Pages | Gaps Found | Runtime | Doc-only |
|-------|-----------|:---:|:---:|:---:|
| API Routes | 1 | 3 | 1 (⬜→✅) | 2 (typos) |
| Domain structure | 1 | 6 | 4 (usage/, asset/, tools, agent-chat) | 2 |
| DB Schema | 1 | 2 | 1 (7 untyped tables) | 1 (conversations docs) |
| Frontend Architecture | 1 | 5 | 2 (listTools, useWorkspace) | 3 (routes, methods, SWR) |
| Config/Middleware | 1 | 4 | 0 | 4 (env vars, files) |
| Overview | 1 | — | 1 (usage/ context status) | — |
| **Total** | **6** | **21** | **8** | **13** |

### Files remediated (6)

**`Wiki/concepts/packages-domain Structure.md`** — Major rewrite:
- Added `agent-chat/` full tree (12 files: Conversation, Message, 3 VOs, personas, events, repository)
- Removed `usage/` tree entirely (10 files — not implemented)
- Fixed `generation/`: removed non-existent `IdempotencyKey.ts`, `CrawlData.ts`, `AcquisitionData.ts`; consolidated 11 individual tool `.ts` files → single `tools/index.ts` with 11 definitions
- Fixed `workspace/`: removed Asset subsystem (Asset.ts, 6 Asset VOs, AssetResolver, AssetCreated/Updated — not implemented); added WorkspaceMembership.ts, errors.ts, domain-events/index.ts
- Fixed `identity/`: removed incorrect `entities/` subdirectory (flat structure); `Role.ts` → `UserRole.ts`; added `UserStatus.ts`, `AuthSession.ts`, `OAuthAccount.ts`, `errors.ts`
- Fixed `shared/`: added `domain-error.ts`, `concurrency-error.ts`, `__tests__/`
- Updated file count table (63 → 58), barrel exports, cross-context references, Package Boundaries examples
- Added implementation note documenting what's planned vs implemented

**`Wiki/concepts/API Routes.md`** — Status fixes:
- `POST /api/workspaces`: ⬜ → ✅ (fully implemented in code)
- Agent chat route params: `:wid` → `:workspaceId` for code consistency
- Fixed doubled `/api/api/` typos in Mapping table
- Updated "Last synced" note

**`Wiki/concepts/Database Schema.md`** — Missing content added:
- Added Agent Chat section with `conversations` + `messages` CREATE TABLE definitions, column docs, and indexes
- Updated ER diagram to include conversations + messages relationships
- Updated migration strategy (added 007, 008)
- Corrected Kysely `DB` interface to reflect reality: only 11/18 tables typed (7 are migration-only with no TypeScript definitions)

**`Wiki/concepts/Frontend Architecture.md`** — Corrections:
- Route count: 5 → 7 (added `/` redirect and `/workspaces/:workspaceId`)
- Documented missing `listTools` API method and missing `useWorkspace` hook
- Added `cancelSession` and `createWorkspace` to documented methods

**`Wiki/overview.md`** — Context status:
- `Usage & Quota` row: "Two-track limits" → "🔴 Planned — DB tables exist (005), domain code not yet implemented"

**`Wiki/index.md`** — Maintenance note updated

### Wiki lint

`scripts/wiki-lint.py`: ✅ 0 failures (110 pages validated)

### Files modified (6)

- `Wiki/concepts/packages-domain Structure.md` — full tree rewrite
- `Wiki/concepts/API Routes.md` — 3 fixes
- `Wiki/concepts/Database Schema.md` — conversations + messages added, types corrected
- `Wiki/concepts/Frontend Architecture.md` — route count + methods corrected
- `Wiki/overview.md` — usage/ context marked planned
- `Wiki/index.md` — maintenance note

## [2026-08-02] maintenance | Wiki health check + qmd database post Phase 8

Comprehensive health maintenance of the Wiki/ directory and qmd search database after Phase 1-8 code implementation.

### Wiki lint (`scripts/wiki-lint.py`)

**Starting state**: 4 failures on 108 pages.

**Issues found and fixed**:

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Missing frontmatter | `log.md` | Replaced `<!-- llm-wiki-log-header-start -->` HTML comment with proper YAML frontmatter (`type: log`, `tags`, `date_updated`) |
| 2 | Broken wikilink (false positive) | `overview.md:96` | Changed `[[synthesis/phase-8-real-auth-plan\|Plan →]]` to `[[synthesis/phase-8-real-auth-plan\|Plan →]]` (escaped pipe in markdown table confused parser; standard `|` alias syntax within `[[]]` doesn't need escaping) |
| 3 | Broken wikilink — missing page | `implementation-roadmap-2026-08-01.md` → `[[Token Budget Control]]` | Created stub: `Wiki/concepts/Token Budget Control.md` (concept page with 3 sources, Phase 6 reference) |
| 4 | Broken wikilink — missing page | `implementation-roadmap-2026-08-01.md` → `[[Railway Deployment Config]]` | Created stub: `Wiki/concepts/Railway Deployment Config.md` (concept page with 3 sources, Phase 9 reference) |

**End state**: 0 failures on 110 pages.

### Orphan check

**Result**: No orphans found. All 97 content pages (excl. index/log/overview/schema) have at least one inbound wikilink from another page. Wiki is fully connected.

### Source count consistency

**Result**: 88/88 entity + concept pages verified. Zero `source_count` mismatches between frontmatter and `## Sources` sections.

### Index completeness

**Result**: 2 concept pages missing from Concepts table (`Token Budget Control`, `Railway Deployment Config` — newly created). Added to index.

### Italian prose compliance

**5 violations found and fixed across 3 files**:

| File | Line | Fix |
|------|------|-----|
| `entities/Quota.md` | 23 | Full Italian paragraph translated to English |
| `concepts/Git Governance Policy.md` | 24-28 | Table headers + cell content (`Scopo→Purpose`, `Protezione→Protection`, `Push diretto→Direct push`, `produzione→production`, `sviluppo→development`, `Nessuna→None`, `Consentito→Allowed`, `Solo PR→PR only`) |
| `concepts/Workspace Gamification.md` | 175 | Single Italian sentence translated to English |

### Environment reference leaks (Rule 8)

**6 connection strings sanitized across 3 files**:

| File | Before | After |
|------|--------|-------|
| `Docker Compose - Local Dev.md` | `postgresql://flow_app:flow_app@localhost:5432/flow_app` | `<DATABASE_URL>` |
| `Docker Compose - Local Dev.md` | `redis://localhost:6379` | `<REDIS_URL>` |
| `Environment Configuration.md` | `postgresql://postgres:postgres@localhost:5432/flow_app` | `<DATABASE_URL>` |
| `Environment Configuration.md` | `redis://localhost:6379` | `<REDIS_URL>` |
| `Testing Strategy.md` | `postgresql://postgres:test@localhost:5432/flow_app_test` | `<DATABASE_URL>` |
| `Testing Strategy.md` | `redis://localhost:6379` | `<REDIS_URL>` |

Remaining hits (`Environment Configuration.md:21,28`) use already-generic placeholders (`user:password@host`) — compliant.

### qmd database

- Collection created: `flow-app` (`/Users/federico/Dev/flow-app`, mask `**/*.md`)
- Indexed: 113 documents (new: 113)
- Embedded: 508 chunks across 113 documents (1m 9s, embeddinggemma-300M)
- Database: `~/.cache/qmd/index.sqlite` (shared across collections)

### Files modified (7)

- `Wiki/log.md` — frontmatter + this entry
- `Wiki/overview.md` — wikilink syntax fix
- `Wiki/index.md` — 2 new concept entries + maintenance note
- `Wiki/entities/Quota.md` — Italian prose translation
- `Wiki/concepts/Git Governance Policy.md` — Italian table headers → English
- `Wiki/concepts/Workspace Gamification.md` — Italian sentence → English
- `Wiki/concepts/Docker Compose - Local Dev.md` — env reference sanitization
- `Wiki/concepts/Environment Configuration.md` — env reference sanitization
- `Wiki/concepts/Testing Strategy.md` — env reference sanitization

### Files created (2)

- `Wiki/concepts/Token Budget Control.md` — forward-reference stub
- `Wiki/concepts/Railway Deployment Config.md` — forward-reference stub

### Final state

| Check | Result |
|-------|--------|
| `scripts/wiki-lint.py` | ✅ 0 failures |
| Orphan pages | ✅ None |
| Broken wikilinks | ✅ 0 |
| `source_count` consistency | ✅ 88/88 |
| Index completeness | ✅ All pages listed |
| Italian prose | ✅ 0 violations |
| Environment leaks | ✅ 0 real connections |
| qmd index | ✅ 113 docs, 508 chunks |

## [2026-08-02] remediation | DDD Governance — audit findings + CLAUDE.md rules

Full DDD governance audit against Phase 0–8 codebase (58 files, 4 bounded contexts). 8 findings identified, 7 remediated.

### Audit findings (ranked by severity)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | Critical | `Workspace.transferOwnership()` uses `(newOwner as any)._role = 'owner'` | ✅ Remediated |
| 2 | Critical | `zod` imported in `Email.ts` (domain layer purity) | ✅ Remediated |
| 3 | Important | `ConcurrencyError extends Error` (not `DomainError`) | ✅ Remediated |
| 4 | Important | `InvalidSessionStateError`, `ConversationArchivedError`, `ConversationAlreadyArchivedError` extend `Error` | ✅ Remediated |
| 5 | Important | 5 `throw new Error()` in use cases (workspace + agent-chat) | ✅ Remediated |
| 6 | Minor | `SessionStatus`, `ToolKey`, `MembershipRole`, etc. are plain type aliases | Documented (Rule 4) |
| 7 | Minor | `SessionRepository.save()` inserts idempotency key as side-effect | ✅ Remediated |
| 8 | Minor | `WorkspaceRepository.findByMember()` N+1 queries | Deferred |

### Remediation details

**Fix 1 — Encapsulation**: Added `_setRoleAsOwner()` delegation method on `WorkspaceMembership`. `Workspace.transferOwnership()` now calls `newOwner._setRoleAsOwner()` instead of `(newOwner as any)._role = 'owner'`.

**Fix 2 — Domain purity**: Removed `import { z } from 'zod'` from `Email.ts`. Replaced with inline validation: regex `EMAIL_REGEX` + length ≤ 255.

**Fix 3 — Error hierarchy**: `ConcurrencyError` now `extends DomainError`. Removed redundant `this.name` setter (inherited from `DomainError`).

**Fix 4 — Error hierarchy**: `InvalidSessionStateError` (code `INVALID_STATE`), `ConversationArchivedError` (code `INVALID_STATE`), `ConversationAlreadyArchivedError` (code `INVALID_STATE`) now extend `DomainError`.

**Fix 5 — Application errors**: Created 3 new `DomainError` subclasses:
- `WorkspaceNotFoundError` (code `WORKSPACE_NOT_FOUND` → 404)
- `ConversationNotFoundError` (code `CONVERSATION_NOT_FOUND` → 404)
- `NotConversationParticipantError` (code `FORBIDDEN` → 403)

Updated 4 use cases: `invite-member`, `accept-invitation`, `transfer-ownership`, `send-message`. Added `CONVERSATION_NOT_FOUND` to `ErrorMapper`.

**Fix 7 — Repository side-effect**: Added `saveIdempotencyKey()` to `SessionRepository` interface + `KyselySessionRepository` implementation. Removed idempotency insert from `save()`. `StartSessionUseCase` now calls both methods explicitly.

### CLAUDE.md — Domain Design Rules

6 rules added to prevent future violations:

| Rule | Pattern prevented |
|------|-------------------|
| 1 — No `as any` on private fields | Aggregate encapsulation bypass |
| 2 — Zero validation libs in domain | Framework coupling (zod, yup, class-validator) |
| 3 — Every error extends `DomainError` | Bare `new Error()` bypassing ErrorMapper |
| 4 — VOs with constrained domains = classes | Bare type aliases (`type X = 'a' \| 'b'`) |
| 5 — `save()` persists only aggregate | Repository side-effects |
| 6 — Canonical factory naming | `start()`/`begin()` vs `create()` inconsistency |

### Files modified

**Domain (7):**
- `packages/domain/src/workspace/entities/WorkspaceMembership.ts` — `_setRoleAsOwner()`
- `packages/domain/src/workspace/entities/Workspace.ts` — use `_setRoleAsOwner()`
- `packages/domain/src/identity/value-objects/Email.ts` — remove zod, inline validation
- `packages/domain/src/shared/concurrency-error.ts` — `extends DomainError`
- `packages/domain/src/agent-chat/entities/Conversation.ts` — 3 error classes → `DomainError` + 2 new
- `packages/domain/src/generation/entities/Session.ts` — `InvalidSessionStateError` → `DomainError`
- `packages/domain/src/workspace/errors.ts` — `WorkspaceNotFoundError`
- `packages/domain/src/workspace/index.ts` — export new error
- `packages/domain/src/agent-chat/index.ts` — export new errors
- `packages/domain/src/generation/repositories/SessionRepository.ts` — `saveIdempotencyKey()`

**Infrastructure (2):**
- `packages/infra-db/src/repositories/session-repository.ts` — `saveIdempotencyKey()` implementation, remove from `save()`
- `apps/backend/src/infrastructure/error-handler.ts` — `CONVERSATION_NOT_FOUND` mapping

**Application (5):**
- `apps/backend/src/application/workspace/invite-member.usecase.ts` — `WorkspaceNotFoundError`
- `apps/backend/src/application/workspace/accept-invitation.usecase.ts` — `WorkspaceNotFoundError`
- `apps/backend/src/application/workspace/transfer-ownership.usecase.ts` — `WorkspaceNotFoundError`
- `apps/backend/src/application/agent-chat/send-message.usecase.ts` — `ConversationNotFoundError` + `NotConversationParticipantError`
- `apps/backend/src/application/generation/start-session.usecase.ts` — `saveIdempotencyKey()` call

**Schema (1):**
- `CLAUDE.md` — 6 Domain Design Rules added

### Verification

- Typecheck: 4/4 packages clean (domain, infra-db, backend, frontend)
- Tests: 4/4 pass
- Lint: 0 errors, 10 pre-existing `as any` warnings (DB cast, not introduced by this change)

### Wiki updates

- `Wiki/log.md` — this entry
- `Wiki/index.md` — maintenance note added
- `Wiki/synthesis/phase-8-real-auth-plan.md` — remediation section added

---

## [2026-08-02] implementation | Phase 8 — Real Authentication (Backend)

Phase 8 (backend) of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `feature/phase-8-real-auth`. Workstreams A, B, C, E complete. Workstream D (frontend auth flow) remaining.

### Deliverables

1. **Identity domain** (`packages/domain/src/identity/`)
   - `User` aggregate — `register()`, `fromOAuth()`, `verifyPassword()`, `reconstitute()`, `PasswordHasher` interface
   - `Email` value object — Zod-validated, lowercase normalization
   - `UserRole` value object — `admin|member`
   - `UserStatus` value object — `active|disabled`
   - `UserRepository` interface — user + auth_sessions + oauth_accounts CRUD
   - `AuthSession`, `OAuthAccount` read models
   - Domain errors: `InvalidCredentialsError`, `UserAlreadyExistsError`, `UserDisabledError`, `InvalidRefreshTokenError`

2. **Infrastructure** (`packages/infra-db/`, `apps/backend/src/infrastructure/`)
   - `AuthSessionsTable`, `OAuthAccountsTable` added to Kysely `DB` interface
   - `KyselyUserRepository` — full CRUD for users + auth_sessions + oauth_accounts
   - `BcryptPasswordHasher` — cost factor 12
   - Seed migration `008_seed_user.sql` — `dev@flow-app.local` / `password123`

3. **Token service** (`apps/backend/src/infrastructure/token-service.ts`)
   - JWT access tokens (HS256, 15min expiry)
   - Opaque refresh tokens (32-byte crypto random, 7-day expiry)
   - `verifyAccessToken()` with algorithm check

4. **Auth service** (`apps/backend/src/api/auth/auth-service.ts`)
   - `register()` — email uniqueness check, password hash, user creation
   - `login()` — email lookup, password verify, status check
   - `refresh()` — token rotation (delete old, create new)
   - `logout()` — session deletion
   - `loginWithOAuth()` — find-or-create user, link OAuth account

5. **Passport.js** (`apps/backend/src/infrastructure/passport-config.ts`)
   - Local strategy (email + password)
   - Google OAuth2 strategy (conditional on config)

6. **Auth routes** (`apps/backend/src/api/auth/auth-routes.ts`)
   - `POST /api/auth/register` — create account
   - `POST /api/auth/login` — authenticate (rate limited: 5/15min)
   - `POST /api/auth/refresh` — rotate tokens (httpOnly cookie)
   - `POST /api/auth/logout` — clear cookie
   - `GET /api/auth/me` — current user (JWT required)
   - `GET /api/auth/google` — OAuth redirect
   - `GET /api/auth/google/callback` — OAuth callback

7. **Auth middleware** (`apps/backend/src/middleware/`)
   - `authenticate.ts` — JWT verification, `setAuthUser()` helper
   - `authenticateOrDev()` — dev fallback (JWT if Bearer present, else seed user)
   - `auth-rate-limit.ts` — `express-rate-limit` on login
   - `auth-types.ts` — `AuthUser` interface, `getAuthUser()`/`setAuthUser()`, Express.Request augmentation

8. **Config** (`apps/backend/src/config.ts`)
   - Added: `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_SECONDS`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX_ATTEMPTS`, `SEED_USER_ID`

9. **Wiring** (`apps/backend/src/app.ts`, `server.ts`)
   - Auth routes registered BEFORE auth middleware (public endpoints)
   - `authenticateOrDev` replaces `devAuthMiddleware` in non-production
   - `AppDeps` extended with `tokenService`, `authService`
   - All auth deps wired in `server.ts`

### Lint Fix — 7 warnings resolved

| File | Before | After |
|------|--------|-------|
| `authenticate.ts` | `(req as any).user = ...` | `setAuthUser(req, ...)` |
| `auth-routes.ts` | `(req as any).user` | `getAuthUser(req)` |
| `dev-auth.ts` | `(req as any).user` | `setAuthUser()`/`getAuthUser()` |
| `workspace-role.ts` | `(req as any).user?.sub` | `getAuthUser(req)?.sub` |
| `token-service.ts` | `as any` on `expiresIn` | `as StringValue` (branded type from `ms`) |
| `passport-config.ts` | `user: any` | `user: Express.User` with explicit cast |
| `app.ts` | `(req as any).log` | `req.log` (augmented by `pino-http`) |

### Files

**New files (17):**
- `packages/domain/src/identity/User.ts`
- `packages/domain/src/identity/value-objects/Email.ts`
- `packages/domain/src/identity/value-objects/UserRole.ts`
- `packages/domain/src/identity/value-objects/UserStatus.ts`
- `packages/domain/src/identity/UserRepository.ts`
- `packages/domain/src/identity/AuthSession.ts`
- `packages/domain/src/identity/OAuthAccount.ts`
- `packages/domain/src/identity/errors.ts`
- `packages/domain/src/identity/index.ts`
- `packages/infra-db/src/repositories/user-repository.ts`
- `packages/infra-db/migrations/008_seed_user.sql`
- `apps/backend/src/infrastructure/bcrypt-hasher.ts`
- `apps/backend/src/infrastructure/token-service.ts`
- `apps/backend/src/infrastructure/passport-config.ts`
- `apps/backend/src/api/auth/auth-service.ts`
- `apps/backend/src/api/auth/auth-routes.ts`
- `apps/backend/src/middleware/authenticate.ts`
- `apps/backend/src/middleware/auth-rate-limit.ts`
- `apps/backend/src/middleware/auth-types.ts`

**Modified files (8):**
- `packages/domain/src/index.ts` — identity exports
- `packages/infra-db/src/types.ts` — AuthSessionsTable, OAuthAccountsTable
- `packages/infra-db/src/index.ts` — KyselyUserRepository export
- `apps/backend/src/config.ts` — 8 new env vars
- `apps/backend/src/app.ts` — auth routes + middleware, AppDeps extended
- `apps/backend/src/server.ts` — auth deps wired
- `apps/backend/.env.example` — new vars documented
- `apps/backend/package.json` — bcrypt, passport, express-rate-limit + types

### Verification

- Typecheck: 4/4 packages clean (domain, infra-db, backend, frontend)
- Tests: 4/4 pass
- Lint: 0 errors, 0 warnings (all auth-related files)

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 8 marked 🟡 (backend complete)
- `Wiki/synthesis/phase-8-real-auth-plan.md` — implementation section added, exit criteria updated
- `Wiki/overview.md` — Phase 8 moved to Completed (partial), critical gaps updated
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

---

## [2026-08-02] analysis | DDD Drift Risk — Phase 9, 10, 11

Pre-mortem DDD drift risk analysis for upcoming phases against the 6 CLAUDE.md Domain Design Rules.

### Phase 9 — Deployment & CI/CD
🟢 **NEGLIGIBLE**. Pure infrastructure: Dockerfile, railway.json, CI workflows. Zero domain code.

### Phase 10 — Testing & Quality
🟡 **MODERATE**. 4 risks:
1. `new Session(...)` instead of `Session.create()`/`reconstitute()` — bypasses factory invariants
2. `(session as any)._status` in test assertions — breaks encapsulation
3. `throw new Error()` in test fixtures — bypasses ErrorMapper
4. Asserting DB state instead of aggregate API — tests DB, not domain

### Phase 11 — Gamification
🔴 **HIGH**. 8 risks, 3 at high probability:
1. 9 new VOs as `type` aliases instead of classes (Rule 4)
2. `throw new Error()` in domain services (Rule 3)
3. Event handler bypasses aggregate → direct DB mutation (Rule 1)
4. Repository.save() with leaderboard side-effects (Rule 5)
5. Non-standard factory naming (Rule 6)
6. Bare Error for game logic (Rule 3)
7. Cross-context `as any` in AchievementEvaluator (Rule 1)
8. Event types as bare strings without source context import

### Recommendation
Phase 11: pre-commit checklist against 6 Domain Design Rules for every new file under `packages/domain/src/gamification/`.

### Wiki updates
- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — DDD Drift Risk sections added to Phase 9, 10, 11
- `Wiki/synthesis/gamification-proposal.md` — DDD Governance Risks section + guardrail checklist
- `Wiki/index.md` — maintenance note
- `Wiki/log.md` — this entry

---

## [2026-08-02] sync | Wiki alignment — code vs spec gap analysis

Full gap analysis between implemented code (frontend 13 files, backend 6 route files) and Wiki specs (7 pages). Key findings:

### API Routes drift
- 12 endpoints match between code and Wiki
- 21 endpoints are Wiki-spec only (never implemented — mostly assets, admin CRUD, workspace CRUD)
- 20 endpoints are code-only (never documented — workspace membership, agent chat, token refresh, OAuth)

Fixes applied to `Wiki/concepts/API Routes.md`:
- Auth base path corrected (`/auth/` → `/api/auth/`)
- Route index rewritten with ✅/⬜ status column (49 rows)
- Added: refresh, me, Google OAuth, workspace membership (9 routes), agent chat (6 routes)
- Marked as planned ⬜: assets (5 routes), workspace CRUD (3 routes), admin CRUD (10 routes), session cancel, artifact download
- Error Code Catalog expanded with 10 new codes
- Mapping to Application Services updated

### Frontend component gap
- 8/37 components built (22%): AppShell (basic), PageHeader, EmptyState, ErrorState, LoadingSkeleton + 4 page components
- Tool components: 0/6 built (SetupPanel, KnowledgePanel, ReadinessSnapshot, FeedbackPanel, SessionSummary, ToolCard)
- Workspace components: 0/4 built
- Agent Chat: ConversationPage exists but not componentized
- Auth: 0 login/register pages, no AuthContext, no guards

Fixes applied:
- `Frontend Architecture.md` — Implementation Status section with layer breakdown
- `UI Component Map.md` — Implementation Status table (8/37, 22%)
- `frontend-mvp-plan-2026-08-01.md` — Actual Delivery section vs plan

### Files updated
- `Wiki/concepts/API Routes.md` — 651→490 lines
- `Wiki/concepts/Frontend Architecture.md` — status added
- `Wiki/concepts/UI Component Map.md` — status added
- `Wiki/synthesis/frontend-mvp-plan-2026-08-01.md` — Actual Delivery section
- `Wiki/index.md` — maintenance note
- `Wiki/log.md` — this entry

---

## [2026-08-02] fix | ESM import hoisting — SEED_USER_ID not loaded from .env

### Problem

`dev-auth.ts` evaluated `process.env.SEED_USER_ID` at **module load time** (line 3, top-level constant). In ESM, all `import` statements are hoisted and resolved before the importing module's code executes. This means:

1. `server.ts` → ESM resolves all imports (including `dev-auth.ts`)
2. `dev-auth.ts` → `const SEED_USER_ID = process.env.SEED_USER_ID ?? '...'` ← evaluated HERE
3. `server.ts` → `dotenv.config({ path: '.env' })` ← runs AFTER imports

Result: `process.env.SEED_USER_ID` was always `undefined` at evaluation time, falling back to `'00000000-0000-0000-0000-000000000001'`. The actual seed user in DB is `a0eebc99-...`, so `findByMember()` returned empty → workspace list was always empty → dashboard showed only EmptyState.

### Fix

Moved `process.env.SEED_USER_ID` read from module-level constant to inside the middleware function body. At request time, `dotenv.config()` has already run, so the env var is available.

```typescript
// Before (broken — module load time)
const SEED_USER_ID = process.env.SEED_USER_ID ?? '00000000-0000-0000-0000-000000000001';
export function devAuthMiddleware(req, _res, next) {
  (req as any).user = { sub: SEED_USER_ID };
  next();
}

// After (fixed — request time)
export function devAuthMiddleware(req, _res, next) {
  const seedUserId = process.env.SEED_USER_ID ?? '00000000-0000-0000-0000-000000000001';
  (req as any).user = { sub: seedUserId };
  next();
}
```

### Secondary fix

`DashboardPage` was early-returning with `<EmptyState>` when workspaces was empty, hiding the tools grid entirely. Removed the early return — tools grid is now always visible.

### Files

- `apps/backend/src/middleware/dev-auth.ts` — read env at request time
- `apps/frontend/src/pages/DashboardPage.tsx` — tools always visible
- `apps/backend/.env` — `SEED_USER_ID` added
- `apps/backend/.env.example` — `SEED_USER_ID` documented

---

## [2026-08-01] implementation | Phase 7 — Frontend MVP

Phase 7 of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `dev`.

### Deliverables

1. **Theme** (`apps/frontend/src/theme/`)
   - `tokens.ts` — light/dark palette, typography, shape
   - `ThemeProvider.tsx` — wraps app with MUI ThemeProvider + CssBaseline

2. **AppShell layout** (`apps/frontend/src/layout/AppShell.tsx`)
   - MUI AppBar (fixed) + Drawer (permanent, 240px) + Outlet
   - Navigation: Dashboard, Agent Chat (contextual)

3. **Routing** (`apps/frontend/src/App.tsx`)
   - React Router v7 (canonical `"react-router"` import)
   - 5 routes: Dashboard, Tool, Session, Conversation, catch-all redirect

4. **Shared components** (`apps/frontend/src/components/`)
   - `PageHeader` — title, subtitle, breadcrumbs, action button
   - `EmptyState` — message + optional CTA
   - `ErrorState` — error alert + retry button
   - `LoadingSkeleton` — MUI Skeleton variants

5. **DashboardPage** (`apps/frontend/src/pages/DashboardPage.tsx`)
   - Tool grid (11 tools with icons) + recent sessions list
   - SWR-powered workspace + session data

6. **ToolPage** (`apps/frontend/src/pages/ToolPage.tsx`)
   - Dynamic form (topic + language inputs)
   - POST /api/tools/:toolKey/sessions → navigate to session page

7. **SessionPage** (`apps/frontend/src/pages/SessionPage.tsx`)
   - SSE-powered status + step progress bar
   - Artifact content rendering on completion

8. **ConversationPage** (`apps/frontend/src/pages/ConversationPage.tsx`)
   - Chat message list with user/agent styling
   - Input with Enter-to-send + SWR revalidation
   - Token usage display per agent message

9. **API client expansion** (`apps/frontend/src/api/client.ts`)
   - New methods: listWorkspaces, getWorkspace, listWorkspaceMembers, listAgents, listConversations, startConversation, getConversation, sendMessage, archiveConversation, getArtifact

10. **Hook fix** (`apps/frontend/src/api/hooks.ts`)
    - `useWorkspaces()` — fixed: now calls `api.listWorkspaces()` (was `api.listSessions()`)

11. **Backend endpoints** (`apps/backend/src/api/generation.ts`)
    - `GET /api/sessions?workspaceId=&status=&limit=` — session listing with filters
    - `GET /api/artifacts/:id` — fetch artifact content

12. **SessionRepository** — `findByWorkspace()` method added (interface + Kysely impl)

### Files

**New files (10):**
- `apps/frontend/src/theme/tokens.ts`
- `apps/frontend/src/theme/ThemeProvider.tsx`
- `apps/frontend/src/layout/AppShell.tsx`
- `apps/frontend/src/components/PageHeader.tsx`
- `apps/frontend/src/components/EmptyState.tsx`
- `apps/frontend/src/components/ErrorState.tsx`
- `apps/frontend/src/components/LoadingSkeleton.tsx`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/ToolPage.tsx`
- `apps/frontend/src/pages/SessionPage.tsx`
- `apps/frontend/src/pages/ConversationPage.tsx`

**Modified files (10):**
- `apps/frontend/package.json` — react-router-dom, react-markdown, remark-gfm, @mui/icons-material
- `apps/frontend/src/App.tsx` — routing with BrowserRouter + Routes
- `apps/frontend/src/main.tsx` — ThemeProvider wrapper
- `apps/frontend/src/api/client.ts` — expanded API methods
- `apps/frontend/src/api/hooks.ts` — useWorkspaces bug fix
- `apps/backend/src/api/generation.ts` — listSessions + getArtifact endpoints
- `apps/backend/src/app.ts` — db dep added, new routes registered
- `apps/backend/src/server.ts` — db dep passed to createApp
- `packages/domain/src/generation/repositories/SessionRepository.ts` — findByWorkspace + SessionFilters
- `packages/domain/src/generation/index.ts` — SessionFilters export

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm run build --workspace=apps/frontend`: 0 errors (521KB bundle)
- `npm run lint`: 0 errors, 69 warnings
- `npm test`: 8 tests pass

### Context7 verification

- React Router v7.18.2 — canonical import `"react-router"`, BrowserRouter + Routes + Outlet ✅
- MUI v6.5.0 — Grid2 from `@mui/material/Grid2`, `size` prop syntax ✅
- `@mui/icons-material@6.x` — peer dependency resolved ✅

---

## [2026-08-01] plan | Phase 7 — Frontend MVP

Implementation plan for Phase 7 filed in [[synthesis/frontend-mvp-plan-2026-08-01]].

### Key decisions

- **13 core components** from the wiki's 37 (priority: workflow-critical path)
- **XState deferred** — `useState`/`useReducer` for MVP, XState `toolPageMachine` in v1.1
- **SWR** for server state (already installed), no additional state library
- **5 routes**: Dashboard → Workspace → Tool → Session → Conversation
- **2 backend endpoints needed**: `GET /api/sessions` and `GET /api/artifacts/:id`

### Implementation order (7 steps)

1. Foundation: react-router-dom, MUI theme, AppShell layout, routing
2. Shared components: PageHeader, EmptyState, ErrorState, LoadingSkeleton
3. API client expansion + hook fixes (useWorkspaces bug, new methods)
4. Backend gap: session listing + artifact endpoint
5. Dashboard + Workspace pages
6. Tool Page + SetupPanel
7. Session Summary + Agent Chat

### Wiki updates

- `Wiki/synthesis/frontend-mvp-plan-2026-08-01.md` — created (full plan)
- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 7 linked to plan
- `Wiki/overview.md` — Phase 7 status updated
- `Wiki/index.md` — maintenance note + synthesis table entry
- `Wiki/log.md` — this entry

---

## [2026-08-01] implementation | Phase 6 — Real LLM Integration

Phase 6 of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `dev`.

### Deliverables

1. **LlmGateway** (`apps/backend/src/infrastructure/llm-gateway.ts`)
   - OpenAI SDK wrapper for OpenRouter API
   - `generate()` with primary model + fallback chain (429/503/500 → retryable)
   - Structured logging (start, success, primary_failed, fallback, fallback_success)
   - Token usage tracking (promptTokens, completionTokens, totalTokens)
   - Latency tracking per call

2. **ModelRegistry** (`apps/backend/src/infrastructure/model-registry.ts`)
   - 4 ModelTier configs as designed in [[LLM Gateway - OpenRouter]]
   - premium: Claude Sonnet 4 / GPT-4o (16K tokens)
   - balanced: GPT-4o Mini / Gemini Flash (8K tokens)
   - light: Gemini Flash Lite / Llama 4 Maverick (4K tokens)
   - search: Gemini 2.5 Pro / Perplexity (8K tokens)

3. **LlmErrors** (`apps/backend/src/infrastructure/llm-errors.ts`)
   - `LlmGatewayError` extends DomainError → 502 (already in ErrorMapper)
   - `LlmRateLimitError` → 429, `LlmTimeoutError` → 504, `LlmUnavailableError` → 503

4. **Config** (`apps/backend/src/config.ts`)
   - `OPENROUTER_BASE_URL` (default: openrouter.ai)
   - `OPENROUTER_APP_NAME` (default: flow-app)
   - `LLM_DEFAULT_TIMEOUT_MS` (default: 60s)

5. **Session worker wiring** (`apps/backend/src/generation/worker/session-worker.ts`)
   - `executeStep` actor replaced mock with real LLM call
   - ContextEnricher.enrich() for user prompt from acquisition data + previous step results
   - PromptComposer.compose() with tool's StepPromptDefinition
   - Fallback: if template not found, uses step label as system prompt

6. **Agent chat wiring** (`apps/backend/src/application/agent-chat/send-message.usecase.ts`)
   - Composes persona system prompt + conversation history (last 20 messages)
   - Calls LlmGateway.generate() with balanced tier
   - Creates Message.agent() with token usage and model ID
   - Graceful fallback message on LLM failure

7. **Server + worker wiring** (`server.ts`, `worker-process.ts`, `app.ts`)
   - LlmGateway, PromptComposer, PromptTemplateRepository wired through AppDeps and SessionWorkerDeps

8. **Bug fix** — `PromptVersion.from('1')` → `'1.0.0'` in `default-components.ts` (was crashing on startup)

### Files

**New files (3):**
- `apps/backend/src/infrastructure/llm-gateway.ts`
- `apps/backend/src/infrastructure/llm-errors.ts`
- `apps/backend/src/infrastructure/model-registry.ts`

**Modified files (6):**
- `apps/backend/src/config.ts` — LLM config vars added
- `apps/backend/src/generation/worker/session-worker.ts` — mock replaced with real LLM
- `apps/backend/src/generation/worker/worker-process.ts` — LLM deps wired
- `apps/backend/src/application/agent-chat/send-message.usecase.ts` — agent reply generation
- `apps/backend/src/api/agent-chat.ts` — llmGateway param added
- `apps/backend/src/app.ts` — AppDeps extended, llmGateway passed to routes
- `apps/backend/src/server.ts` — all deps wired
- `packages/domain/src/generation/prompting/default-components.ts` — version fix
- `apps/backend/package.json` — openai SDK added

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm test`: 8 tests pass
- `npm run lint`: 0 errors, 52 warnings (all `@typescript-eslint/no-explicit-any`)
- Server startup: clean (all deps initialized, cleanup job ran)

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 6 marked ✅
- `Wiki/overview.md` — Phase 6 status updated, LLM Gateway infra added
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

---

## [2026-08-01] roadmap | Phase 6-11 expansion

Roadmap [[synthesis/implementation-roadmap-2026-08-01]] expanded after Phase 0-5 completion. PR #5 merged to `dev`. Branch tracking fix applied.

### Gap analysis findings

1. **LLM is mocked** — `executeStep` returns `'Mock generated content'`, agent chat never generates AI replies
2. **Frontend is a skeleton** — single `<h1>`, no routing, no pages; API client is wired but unused
3. **Auth is a dev stub** — hardcoded seed user, no login/register, JWT secret defined but never used
4. **Zero deployment** — no Dockerfile, no CI/CD, no Railway config
5. **Near-zero tests** — 1 test file (Identifier), all test tooling installed but unused

### New phases added

| Phase | Scope |
|-------|-------|
| Phase 6 — Real LLM Integration | LLM provider abstraction, session worker wiring, agent chat wiring, token budgets |
| Phase 7 — Frontend MVP | React SPA with MUI, routing, session wizard, live progress, agent chat UI |
| Phase 8 — Real Authentication | JWT auth replacing dev stub: register, login, refresh, protected routes |
| Phase 9 — Deployment & CI/CD | Dockerfile, Railway config, GitHub Actions CI/CD pipeline |
| Phase 10 — Testing & Quality | Domain tests, API tests, worker tests, CI quality gates |
| Phase 11 — Gamification | Points, achievements, leaderboards, event-driven rewards |

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 6-11 added, risk register expanded, frontmatter updated
- `Wiki/overview.md` — completed/planned phases table, critical gaps listed
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

### Consistency verification (post-write)

Cross-referenced all 4 modified pages against existing wiki. Found 3 contradictions — all fixed:

1. **Phase 6 LLM design** diverged from [[LLM Gateway - OpenRouter]] — aligned with existing `LlmGateway` + `ModelTier` design
2. **Phase 8 auth** omitted Passport.js from [[Auth Dependencies]] — added Passport strategies + OAuth support
3. **Pydantic reference** (Python tool in Node.js project) — changed to Zod only

Additional verifications passed:
- ✅ No Italian prose in any modified page
- ✅ No anchor links (all wikilinks are page-level)
- ✅ 2 forward-reference wikilinks ([[Token Budget Control]], [[Railway Deployment Config]]) — pages don't exist yet, acceptable
- ✅ No environment references (Rule 8)
- ✅ Frontmatter valid on all pages
- ✅ Referenced pages section updated with existing wiki pages

---

## [2026-08-01] implementation | Phase 5 — Agent Chat

Phase 5 (Agent Chat) of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `feature/phase-3-workspace-collaboration`.

### Deliverables

1. **Message entity** (`packages/domain/src/agent-chat/entities/Message.ts`)
   - `user()`, `agent()`, `system()` factories
   - Immutable, append-only, tracks `tokensUsed` and `modelUsed`

2. **Conversation aggregate** (`packages/domain/src/agent-chat/entities/Conversation.ts`)
   - `addMessage()`, `archive()`, auto-title from first user message
   - `recentMessages(n)` for context window management
   - Privacy: scoped to `userId`, no cross-user access

3. **Agent Personas** (`packages/domain/src/agent-chat/agent-personas.ts`)
   - 7 agents: strategist, copywriter, seo-specialist, ads-specialist, analyst, creative-director, email-marketer
   - Static config with system prompts and capabilities

4. **ConversationRepository** (`packages/domain/src/agent-chat/repositories/ConversationRepository.ts` + `packages/infra-db/src/repositories/conversation-repository.ts`)
   - `findById()`, `findByUserAndWorkspace()` (privacy-scoped), `save()`

5. **DB migration** (`packages/infra-db/migrations/007_conversations.sql`)
   - `conversations` table (workspace_id, user_id, agent_key, title, status)
   - `messages` table (conversation_id, role, content, tokens_used, model_used)

6. **API routes** (`apps/backend/src/api/agent-chat.ts`)
   - GET `/api/workspaces/:id/agents` — list 7 agents
   - POST `/api/workspaces/:id/conversations` — start conversation
   - GET `/api/workspaces/:id/conversations` — list user's conversations
   - GET `/api/conversations/:id` — get conversation + messages
   - POST `/api/conversations/:id/messages` — send message
   - POST `/api/conversations/:id/archive` — archive conversation

7. **Use cases** (`apps/backend/src/application/agent-chat/`)
   - `StartConversationUseCase`, `SendMessageUseCase`

8. **Lint fix** — `packages/infra-db/migrate.ts` console.log → process.stdout/write

### Files

**New files (14):**
- `packages/domain/src/agent-chat/entities/Message.ts`
- `packages/domain/src/agent-chat/entities/Conversation.ts`
- `packages/domain/src/agent-chat/value-objects/MessageRole.ts`
- `packages/domain/src/agent-chat/value-objects/ConversationStatus.ts`
- `packages/domain/src/agent-chat/value-objects/AgentKey.ts`
- `packages/domain/src/agent-chat/domain-events/index.ts`
- `packages/domain/src/agent-chat/repositories/ConversationRepository.ts`
- `packages/domain/src/agent-chat/agent-personas.ts`
- `packages/domain/src/agent-chat/index.ts`
- `packages/infra-db/src/repositories/conversation-repository.ts`
- `packages/infra-db/migrations/007_conversations.sql`
- `apps/backend/src/api/agent-chat.ts`
- `apps/backend/src/application/agent-chat/start-conversation.usecase.ts`
- `apps/backend/src/application/agent-chat/send-message.usecase.ts`

**Modified files (6):**
- `packages/domain/src/index.ts` — agent-chat exports
- `packages/infra-db/src/index.ts` — KyselyConversationRepository export
- `packages/infra-db/src/types.ts` — ConversationsTable, MessagesTable
- `packages/infra-db/migrate.ts` — lint fix
- `apps/backend/src/app.ts` — agent chat routes + conversationRepo
- `apps/backend/src/server.ts` — conversationRepo dependency

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm test`: 8 tests pass
- `npm run lint`: 0 errors, 41 warnings (all `@typescript-eslint/no-explicit-any`)

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 5 marked ✅
- `Wiki/overview.md` — Phase 4+5 status updated
- `Wiki/index.md` — maintenance notes added
- `Wiki/log.md` — this entry

---

## [2026-08-01] implementation | Phase 4 — Prompt Governance Runtime

Phase 4 of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `feature/phase-3-workspace-collaboration`.

### Deliverables

1. **PromptTemplateId** (`packages/domain/src/generation/prompting/PromptTemplateId.ts`)
   - `{toolKey}/{stepLabel}` format, validated

2. **PromptVersion** (`packages/domain/src/generation/prompting/PromptVersion.ts`)
   - Semver or "latest", `isPinned`/`isLatest` getters

3. **PromptComponent** (`packages/domain/src/generation/prompting/PromptComponent.ts`)
   - Types: system_rule, format_constraint, safety_guard, style_guide, domain_knowledge

4. **PromptComponentRegistry** (`packages/domain/src/generation/prompting/PromptComponentRegistry.ts`)
   - `register()`, `get()`, `resolveAll()` with missing component error

5. **PromptComposer** (`packages/domain/src/generation/prompting/PromptComposer.ts`)
   - Layered composition: system_rules → template → format_constraints
   - Slot resolution: `{{key}}` replaced at compose time

6. **PromptTemplateRepository** (`packages/domain/src/generation/prompting/PromptTemplateRepository.ts` + `apps/backend/src/infrastructure/prompt-template-repository.ts`)
   - Interface + filesystem implementation
   - `findById()`, `publishVersion()`, `listVersions()`

7. **Default components** (`packages/domain/src/generation/prompting/default-components.ts`)
   - 12 components: anti-hallucination, output formats, style guides, safety guards
   - Italian 'Tu' form in language guidelines

8. **StepDefinition updated** (`packages/domain/src/generation/tools/tool-definition.ts`)
   - Versioned prompt: `templateId` + `version`, backward compatible with `template`

### Files

**New files (10):**
- `packages/domain/src/generation/prompting/PromptTemplateId.ts`
- `packages/domain/src/generation/prompting/PromptVersion.ts`
- `packages/domain/src/generation/prompting/PromptTemplateContent.ts`
- `packages/domain/src/generation/prompting/PromptComponent.ts`
- `packages/domain/src/generation/prompting/PromptComponentRegistry.ts`
- `packages/domain/src/generation/prompting/PromptComposer.ts`
- `packages/domain/src/generation/prompting/PromptTemplateRepository.ts`
- `packages/domain/src/generation/prompting/default-components.ts`
- `packages/domain/src/generation/prompting/index.ts`
- `apps/backend/src/infrastructure/prompt-template-repository.ts`

**Modified files (4):**
- `packages/domain/src/generation/tools/tool-definition.ts` — versioned prompt
- `packages/domain/src/generation/tools/index.ts` — defaultComponents + versioned prompts
- `packages/domain/src/generation/index.ts` — prompting exports

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm test`: 8 tests pass

---

## [2026-08-01] implementation | Phase 3 — Workspace Collaboration

Phase 3 of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `feature/phase-3-workspace-collaboration`.

### Deliverables

1. **WorkspaceMembership entity** (`packages/domain/src/workspace/entities/WorkspaceMembership.ts`)
   - `invite()` factory, `accept()` lifecycle, `changeRole()` mutation
   - `isOwner`, `isActive` getters

2. **Workspace aggregate** (`packages/domain/src/workspace/entities/Workspace.ts`)
   - `_memberships` collection (1:N)
   - `inviteMember()`, `acceptInvitation()`, `removeMember()`, `transferOwnership()`, `changeMemberRole()`
   - Permission checks: `isOwner()`, `canEdit()`, `canView()`, `getMemberRole()`

3. **Value Objects** (`packages/domain/src/workspace/value-objects/`)
   - `MembershipRole`: `'owner' | 'editor' | 'viewer'`
   - `MembershipStatus`: `'invited' | 'active'`

4. **Domain errors** (`packages/domain/src/workspace/errors.ts`)
   - `NotWorkspaceOwnerError`, `NotAWorkspaceMemberError`, `InsufficientWorkspacePermissionError`
   - `MemberAlreadyExistsError`, `CannotRemoveOwnerError`, `NotAnActiveMemberError`

5. **Domain events** (`packages/domain/src/workspace/domain-events/index.ts`)
   - `MemberInvited`, `MemberJoined`, `MemberRemoved`, `OwnershipTransferred`

6. **WorkspaceRepository** (`packages/domain/src/workspace/repositories/WorkspaceRepository.ts` + `packages/infra-db/src/repositories/workspace-repository.ts`)
   - Interface: `findById()`, `findByMember()`, `save()`, `saveWithLock()`, `findMembership()`, `findPendingInvitations()`
   - Kysely implementation with membership sync on save

7. **requireWorkspaceRole() middleware** (`apps/backend/src/middleware/workspace-role.ts`)
   - HTTP guard with role check, admin bypass pattern
   - Injects `req.workspace` and `req.workspaceRole`

8. **API routes** (`apps/backend/src/api/workspaces.ts`)
   - 10 endpoints: workspaces list/detail, invitations (CRUD), members (list/remove/role), ownership transfer

9. **Use cases** (`apps/backend/src/application/workspace/`)
   - `InviteMemberUseCase`, `AcceptInvitationUseCase`, `TransferOwnershipUseCase`

### Files

**New files (13):**
- `packages/domain/src/workspace/entities/Workspace.ts`
- `packages/domain/src/workspace/entities/WorkspaceMembership.ts`
- `packages/domain/src/workspace/value-objects/MembershipRole.ts`
- `packages/domain/src/workspace/value-objects/MembershipStatus.ts`
- `packages/domain/src/workspace/domain-events/index.ts`
- `packages/domain/src/workspace/errors.ts`
- `packages/domain/src/workspace/index.ts`
- `packages/domain/src/workspace/repositories/WorkspaceRepository.ts`
- `packages/infra-db/src/repositories/workspace-repository.ts`
- `apps/backend/src/api/workspaces.ts`
- `apps/backend/src/middleware/workspace-role.ts`
- `apps/backend/src/application/workspace/invite-member.usecase.ts`
- `apps/backend/src/application/workspace/accept-invitation.usecase.ts`
- `apps/backend/src/application/workspace/transfer-ownership.usecase.ts`

**Modified files (5):**
- `packages/domain/src/index.ts` — workspace exports added
- `packages/infra-db/src/index.ts` — KyselyWorkspaceRepository export
- `packages/infra-db/src/types.ts` — WorkspaceMembershipsTable added
- `apps/backend/src/app.ts` — workspace routes + middleware wired
- `apps/backend/src/server.ts` — workspaceRepo dependency added

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm test`: 8 tests pass

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 3 marked ✅ with implementation details
- `Wiki/overview.md` — Phase 3 status updated
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

---

## [2026-08-01] validation | API endpoints verification + infrastructure setup

Full API verification against managed PostgreSQL + Redis. All endpoints green.

### Infrastructure

| Resource | Service | Endpoint | Status |
|----------|---------|----------|--------|
| PostgreSQL | Managed | TCP proxy (5432) | ✅ ACTIVE |
| Redis | Managed | TCP proxy (6379) | ✅ ACTIVE |
| Backend API | localhost | `http://localhost:3000` | ✅ Running |

### Database

- 6 migrations executed (001-006): enums, users, workspaces, sessions, quotas, platform config
- 17 tables created (16 domain + `_migrations` tracking)
- Seed user: admin role, active status
- Seed workspace: Default Workspace, owner membership
- Migration runner (`packages/infra-db/migrate.ts`) is idempotent — tracks executed migrations in `_migrations` table

### API Endpoints Verified

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/health` | GET | ✅ | `{"status":"ok"}` |
| `/api` | GET | ✅ | `{"message":"Flow App API","version":"0.0.1"}` |
| `/admin/jobs` | GET | ✅ | Queue stats + stability metrics |
| `/admin/health` | GET | ✅ | `{"status":"healthy","alerts":[]}` |
| `/api/tools/:key/sessions` | POST | ✅ | 201 create, `replayed: false` |
| `/api/tools/:key/sessions` | POST (replay) | ✅ | 200 replay, `replayed: true` |
| `/api/sessions/:id` | GET | ✅ | Session detail |

### Idempotency Verification

```
1a. POST /api/tools/blog-post/sessions → 201, id=2f902140, replayed=false
1b. POST /api/tools/blog-post/sessions → 200, id=2f902140, replayed=true  ✅
```

Same request returns same session with `replayed: true`. Idempotency key saved with 24h TTL.

### Fix Applied

- `packages/infra-db/src/repositories/session-repository.ts` — `save()` now inserts idempotency key into `idempotency_keys` table (was missing)
- `packages/infra-db/src/types.ts` — `IdempotencyKeysTable.expires_at` changed from `ColumnType<Date, never, never>` to `ColumnType<Date, Date, never>` to allow inserts
- `apps/backend/src/middleware/dev-auth.ts` — dev auth middleware created (injects seed user ID when `NODE_ENV !== production`)

### Files

- `packages/infra-db/migrations/001_enums.sql` — created
- `packages/infra-db/migrations/002_users_auth.sql` — created
- `packages/infra-db/migrations/003_workspaces.sql` — created
- `packages/infra-db/migrations/004_sessions.sql` — created
- `packages/infra-db/migrations/005_quotas.sql` — created
- `packages/infra-db/migrations/006_platform_config.sql` — created
- `packages/infra-db/migrate.ts` — created
- `packages/infra-db/package.json` — added `migrate` script
- `packages/infra-db/src/types.ts` — `expires_at` type fix
- `packages/infra-db/src/repositories/session-repository.ts` — idempotency key insert
- `apps/backend/src/middleware/dev-auth.ts` — created
- `apps/backend/src/app.ts` — dev auth middleware wired
- `apps/backend/.env.local` — managed PostgreSQL + Redis URLs

---

## [2026-08-01] implementation | Phase 2 — Reliability and Ops Hardening

Phase 2 of [[synthesis/implementation-roadmap-2026-08-01]] implemented. Branch: `feature/phase-2-reliability-ops`.

### Deliverables

1. **Optimistic locking on Session**
   - `ConcurrencyError` class (`packages/domain/src/shared/concurrency-error.ts`)
   - `SessionRepository.saveWithLock()` interface
   - `KyselySessionRepository.saveWithLock()` — conditional `WHERE version = ?`, throws `ConcurrencyError` on zero-row update
   - `ErrorMapper` — `ConcurrencyError` → `409` with structured response `{code, message, details, retryable}`

2. **Worker structured logging**
   - `job_started`/`job_completed`/`job_failed` schema with `sessionId`, `durationMs`, `attempts`, `toolKey`, `stepCount`, `error`, `stack`
   - Worker stall config: `lockDuration: 120s`, `stalledInterval: 30s`, `maxStalledCount: 2`

3. **Queue health monitor**
   - `QueueHealthMonitor` class (`apps/backend/src/generation/worker/health-monitor.ts`)
   - SLO checks: failure rate, queue depth, P95 latency, stalled jobs
   - Warning/critical thresholds per [[Job Queue - Monitoring and Stability]]

4. **Admin endpoints**
   - `GET /admin/jobs` — queue stats, worker uptime, stability metrics
   - `GET /admin/health` — health check with active alerts

5. **Graceful shutdown**
   - `worker-process.ts` — SIGTERM handler: `pause()` → drain (30s) → `close()`
   - Server SIGTERM: cleanup job stop → queue close → event bridge close → DB destroy

6. **Cleanup job**
   - `CleanupJob` (`apps/backend/src/infrastructure/cleanup-job.ts`)
   - Hourly: expired idempotency keys + snapshots >7 days

### Files modified

- `packages/domain/src/shared/concurrency-error.ts` — created
- `packages/domain/src/shared/index.ts` — added `ConcurrencyError` export
- `packages/domain/src/index.ts` — added `ConcurrencyError` export
- `packages/domain/src/generation/repositories/SessionRepository.ts` — added `saveWithLock()` method
- `packages/infra-db/src/repositories/session-repository.ts` — implemented `saveWithLock()` with Kysely
- `apps/backend/src/infrastructure/error-handler.ts` — `ConcurrencyError` → `409` mapping
- `apps/backend/src/generation/worker/session-worker.ts` — structured logging + stall config
- `apps/backend/src/generation/worker/health-monitor.ts` — created
- `apps/backend/src/generation/worker/worker-process.ts` — created
- `apps/backend/src/api/admin.ts` — created
- `apps/backend/src/app.ts` — added admin routes, queue dependency
- `apps/backend/src/server.ts` — added queue, cleanup job, SIGTERM handler
- `apps/backend/src/infrastructure/cleanup-job.ts` — created

### Verification

- `npm run build --workspace=apps/backend`: 0 errors
- `npm test`: 8 tests pass

### Wiki updates

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 2 marked ✅ with implementation details
- `Wiki/overview.md` — implementation status table added (Phases 0-2 ✅)
- `Wiki/concepts/Concurrency & Conflict Policy.md` — implementation section added
- `Wiki/concepts/Job Queue - Monitoring and Stability.md` — implementation section added
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

---

## [2026-08-01] policy | Branch sync workflow + permanent branches documented

Files updated:

- `Wiki/concepts/Git Governance Policy.md` — added permanent branches table (`main`, `staging`, `dev`), promotion flow diagram, branch sync policy section
- `Wiki/concepts/CI-CD Promotion Policy.md` — updated environments table, promotion flow with branch mapping, branch sync reference
- `Wiki/index.md` — maintenance note added
- `Wiki/log.md` — this entry

Implementation: `.github/workflows/branch-sync.yml` (PR #2)

## [2026-08-01] implementation | Phase 0-1 code bootstrap (monorepo + core async generation)

Phase 0 and Phase 1 of [[synthesis/implementation-roadmap-2026-08-01]] implemented.

### Phase 0 — Foundation Bootstrap

Files created:

- Root: `package.json` (npm workspaces), `tsconfig.json` (project references), `vitest.workspace.ts`, `vitest.config.base.ts`, `eslint.config.js`, `docker-compose.yml`, `.gitignore`
- `apps/backend/`: Express app, fail-closed config (Zod), Pino logger, `.env.example`, `.env.local.example`
- `apps/frontend/`: Vite + React 19 skeleton, proxy config
- `packages/domain/`: shared kernel (Identifier, DomainEvent, DateTime, DomainError)
- `packages/contracts/`: barrel exports, shared types
- `packages/infra-db/`: skeleton with Kysely
- `packages/copy/`: skeleton
- `.github/workflows/ci.yml`: typecheck + lint + test gates

### Phase 1 — Core Async Generation Vertical Slice

Domain layer (`packages/domain/src/generation/`):

- Entities: `Session` (aggregate root with `apply()` method), `Artifact`
- Value Objects: `SessionId`, `ToolKey`, `StepNumber`, `ArtifactId`, `ArtifactContent`, `SessionStatus`, `ArtifactStatus`, `ReadinessPolicy`
- Lifecycle: `SessionLifecycle` (domain-owned state machine: draft→ready→queued→running→completed|failed|cancelled)
- Domain Events: `SessionStarted`, `StepCompleted`, `SessionCompleted`, `SessionFailed`, `SessionCancelled`
- Domain Services: `ContextEnricher`
- Repository interface: `SessionRepository`
- Tools: `tool-definition.ts` types, `blog-post` example, `toolRegistry`

Contracts layer (`packages/contracts/src/`):

- `SessionDTO`, `SessionDetailDTO`, `ArtifactDTO`
- `StartSessionRequest/Response`
- `SSEEvent` types (4 events)

Infra-DB layer (`packages/infra-db/src/`):

- Kysely `DB` type with all tables
- `KyselySessionRepository` implementation

Backend layer (`apps/backend/src/`):

- `infrastructure/error-handler.ts`: DomainError → HTTP status mapping
- `infrastructure/event-bus.ts`: in-process DomainEventBus
- `infrastructure/job-event-bridge.ts`: Redis pub/sub for SSE (optional in dev)
- `application/generation/start-session.usecase.ts`: idempotent session creation
- `api/generation.ts`: POST `/api/tools/:toolKey/sessions`, GET `/api/sessions/:id`, GET `/api/sessions/:id/events`
- `generation/machines/session-machine.ts`: XState v5 machine
- `generation/worker/session-worker.ts`: BullMQ worker
- `generation/jobs/enqueue-session.job.ts`: queue integration

Frontend layer (`apps/frontend/src/api/`):

- `client.ts`: typed HTTP client
- `sse-client.ts`: multi-session SSE manager
- `hooks.ts`: `useSession`, `useWorkspaces`

### Verification

- `npm run typecheck`: 0 errors
- `npm test -- --run`: 8 tests pass
- `npm run lint`: 0 errors (18 `any` warnings)

### PR

- [#1](https://github.com/federicogerardi/flow-app/pull/1): `feat(monorepo): Phase 0-1 — Foundation Bootstrap + Core Async Generation`
- Branch protection active on `main` (status checks: Lint, Typecheck, Test)

## [2026-08-01] synthesis | Rational implementation roadmap filed

Files created/updated:

- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — created (phased development roadmap, gating rules, expansion order, risk mitigations)
- `Wiki/index.md` — updated (maintenance note + synthesis table row)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] lint | Coherence lint execution (structural pass + queued-state closure)

Files created/updated:

- `Wiki/synthesis/lint-report-2026-08-01-coherence.md` — created (lint scope and initial results; later updated with queued-state closure)
- `Wiki/concepts/Gamification.md` — updated (`source_count` 6 -> 7)
- `Wiki/concepts/UI Component Map.md` — updated (`source_count` 7 -> 8)
- `Wiki/concepts/Error Mapping (Domain to HTTP).md` — updated (`x-correlation-id` -> `x-request-id` in logging snippet)
- `Wiki/concepts/API Contract Baseline v1.md` — updated (`queued` promoted to canonical status enum)
- `Wiki/concepts/API Documentation - OpenAPI.md` — updated (`Session.status` enum includes `queued`)
- `Wiki/concepts/Contracts Package.md` — updated (`SessionDTO` / `SessionListItemDTO` aligned on `queued` union)
- `Wiki/concepts/Database Schema.md` — updated (`session_status` enum includes `queued`)
- `Wiki/concepts/API Routes.md` — updated (governance status enum includes `queued`)
- `Wiki/synthesis/lint-report-2026-08-01-coherence.md` — updated (semantic drift section replaced with closure result)
- `Wiki/entities/Session.md` — updated (lifecycle includes `queued`; transitions clarified as `QUEUE` then `WORKER_PICKUP`)
- `Wiki/concepts/Session Machine (XState v5).md` — updated (queued runtime state and transition events aligned)
- `Wiki/concepts/Application Services.md` — updated (state-flow line aligned with queue pickup semantics)
- `Wiki/concepts/Content Generation.md` — updated (`SessionStatus` lifecycle + `IdempotencyKey` signature wording aligned)
- `Wiki/concepts/packages-domain Structure.md` — updated (`SessionStatus` VO comment aligned)
- `Wiki/concepts/XState Integration.md` — updated (example transitions aligned)
- `Wiki/concepts/Session List - Live Status.md` — updated (canonical enum/sql snippet and lifecycle wording aligned)
- `Wiki/concepts/Domain Events Catalog.md` — updated (SessionStarted trigger and event-flow diagram aligned to `queued -> running`)
- `Wiki/concepts/BullMQ Worker Wiring.md` — updated (`START` transition wording replaced with `QUEUE` + `WORKER_PICKUP`)
- `Wiki/concepts/ReadinessPolicy.md` — updated (readiness phrasing aligned to queue admission)
- `Wiki/synthesis/lint-report-2026-08-01-coherence.md` — updated (lexical hardening pass recorded)
- `Wiki/concepts/Session Machine (XState v5).md` — updated (guard naming standardized to `canQueue`; legacy alias note for `canStart`)
- `Wiki/concepts/ReadinessPolicy.md` — updated (XState guard examples renamed `canQueue`; legacy alias note added)
- `Wiki/synthesis/lint-report-2026-08-01-coherence.md` — updated (ultra-strict guard naming pass recorded)
- `Wiki/index.md` — updated (maintenance note + synthesis table row)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] finalization | Operational-go remediation (contract freeze, quality gates, consistency alignment)

Files created/updated:

- `Wiki/concepts/API Contract Baseline v1.md` — created (canonical v1 wire contract: statuses, error envelope, idempotency replay, conflict semantics, SSE schema)
- `Wiki/concepts/Quality Gate Matrix.md` — created (numeric CI thresholds, merge/promotion gates, security exception workflow, release evidence)
- `Wiki/concepts/Definition of Done.md` — updated (enforcement source of truth linked to Quality Gate Matrix)
- `Wiki/concepts/Frontend Error Observability.md` — updated (numeric alert/release thresholds)
- `Wiki/concepts/Concurrency & Conflict Policy.md` — updated (storage-level enforcement requirements)
- `Wiki/concepts/API Routes.md` — updated (canonical error envelope with `retryable`, status enum, baseline reference)
- `Wiki/concepts/API Documentation - OpenAPI.md` — updated (`Session.status` enum fix, `StartSessionResponse` schema, 200 replay response)
- `Wiki/concepts/Idempotency Implementation.md` — updated (canonical hash formula includes prompt signature, unified TTL, FK-safe PostgreSQL fallback)
- `Wiki/concepts/Database Schema.md` — updated (workspace membership model, version columns, ER and migration alignment)
- `Wiki/concepts/Workspace & Assets.md` — updated (membership-based workspace model and repository semantics)
- `Wiki/concepts/Contracts Package.md` — updated (`StartSessionResponse.replayed`, canonical source alignment)
- `Wiki/concepts/Error Mapping (Domain to HTTP).md` — updated (`ConcurrencyError` mapping, baseline reference)
- `Wiki/concepts/Secure SDLC Controls.md` — updated (mandatory, time-bound exception record)
- `Wiki/index.md` — updated (maintenance note + concept table rows/count alignment)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] implementation | DoD + frontend error observability + concurrency policy

Files created/updated:

- `Wiki/concepts/Definition of Done.md` — created (canonical delivery gates, PR acceptance checklist, release-readiness extension)
- `Wiki/concepts/Frontend Error Observability.md` — created (browser error telemetry standard, release/source-map requirements, triage policy)
- `Wiki/concepts/Concurrency & Conflict Policy.md` — created (uniform write-conflict, optimistic locking, idempotency, retry contracts)
- `Wiki/index.md` — updated (maintenance note + 3 concept rows)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] policy | Fast-close governance gaps (Git policy, Secure SDLC, API SLO catalog, CI-CD promotion)

Files created/updated:

- `Wiki/concepts/Git Governance Policy.md` — created (branching model, commit convention, PR policy, merge gates)
- `Wiki/concepts/Secure SDLC Controls.md` — created (CI security gates, SAST/SCA baseline, secrets policy, compliance baseline)
- `Wiki/concepts/API SLO Catalog.md` — created (endpoint-class SLI/SLO targets, alert thresholds, queue coupling)
- `Wiki/concepts/CI-CD Promotion Policy.md` — created (Dev->Staging->Prod promotion flow, quality gates, artifact integrity, rollback policy)
- `Wiki/index.md` — updated (maintenance note + 4 concept rows)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] audit | Project model multi-dimension governance audit persisted

Files created/updated:

- `Wiki/synthesis/project-model-multi-dimension-audit-2026-08-01.md` — created (4-area audit, detailed sub-dimension findings, maturity snapshot, priority gap list)
- `Wiki/index.md` — updated (maintenance note + synthesis table row for the new audit page)
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] deprecation | Output Personalization removed from current model baseline

Files updated:

- `Wiki/concepts/Output Personalization.md` — removed (feature deprecated in current model baseline)
- `Wiki/sources/PRD.md` — FR-W08 marked as deprecated in current model baseline; roadmap row annotated accordingly
- `Wiki/sources/USER-STORIES.md` — US-GF06/07/08/09 marked as deprecated in current model baseline
- `Wiki/index.md` — maintenance note added; Concepts table entry for Output Personalization removed
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] alignment | PM review model alignment (overview scope + wikilinks)

Files updated:

- `Wiki/overview.md` — architecture scope updated from 4 to 6 bounded contexts; added Agent Chat and Gamification to the canonical high-level model; added interaction-model synthesis section
- `Wiki/concepts/Agent Chat.md` — fixed source link `LlmGateway` → `[[LLM Gateway - OpenRouter]]`
- `Wiki/entities/Message.md` — fixed source link `LlmGateway` → `[[LLM Gateway - OpenRouter]]`
- `Wiki/synthesis/agent-chat-proposal.md` — fixed references `LlmGateway` → `[[LLM Gateway - OpenRouter]]` and `Prompting Mechanics` → `[[synthesis/prompting-mechanics-proposal|Prompting Mechanics]]`
- `Wiki/index.md` — maintenance note added for this alignment batch
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-08-01] fix | Gamification — UI Designer review fixes (8 findings resolved)

Files updated:

- `Wiki/concepts/Design Tokens.md` — added `rarity.*` tokens (common/rare/epic/legendary) + dark mode overrides; added `sparkle` keyframe with reduced-motion guard
- `Wiki/concepts/Gamification UX.md` — added Accessibility section (WCAG 2.1 AA); added Toast Priority System (3 SnackbarProvider); added Rarity Visual Treatment; sidebar zone ARIA labels
- `Wiki/concepts/UX Wireframes.md` — added Template 11: Player Profile page (desktop + mobile); added `/profile` route
- `Wiki/concepts/UI Component Map.md` — 29→37 components (8 gamification: GamificationZone, LevelUpBanner, BadgeProgressRing, LuckyBonusSparkle, ActivityPulse, SeasonCountdown, ChallengeVoting, StreakModeToggle); added `'profile'` skeleton variant
- `Wiki/index.md` — updated
- `Wiki/log.md` — this entry

## [2026-08-01] design | Gamification UX — psychological triggers, notification cadence, sidebar zone

Files created/updated:

- `Wiki/concepts/Gamification UX.md` — created (9 psychological triggers, sidebar zone, notification cadence, anti-patterns)
- `Wiki/concepts/UX Wireframes.md` — updated (sidebar gamification zone added in Template 1 + mobile drawer)
- `Wiki/concepts/Gamification.md` — updated (source ref to Gamification UX)
- `Wiki/index.md` — updated
- `Wiki/log.md` — this entry

## [2026-08-01] fix | Gamification — backend review fixes (6 findings resolved)

Files updated:

- `Wiki/concepts/Gamification.md` — added Event Idempotency + Concurrency Control sections; Key Properties updated
- `Wiki/entities/PlayerProfile.md` — streak switched to UTC DATE; optimistic locking (`version`); removed `xp_seasonal`/`seasonId`/`resetSeason()`; added `xp_transactions` table
- `Wiki/concepts/Workspace Gamification.md` — added ChallengeCompleted handler for XP distribution; added `challenge_contributions` table
- `Wiki/synthesis/gamification-proposal.md` — DB schema updated with `xp_transactions`, `gamification_processed_events`, `challenge_contributions`, `version` column
- `Wiki/log.md` — this entry

Files updated:

- `Wiki/concepts/Gamification.md` — removed false "zero writes" claim; added read models distinction; WorkspaceChallenge as second AR; event-mediated credit rewards
- `Wiki/concepts/Achievements & Badges.md` — Credit Reward Flow: now event-mediated (`AchievementUnlocked → Quota`), no direct cross-context call
- `Wiki/concepts/Workspace Gamification.md` — Leaderboard + Health Score → read models; WorkspaceChallenge aggregate added; removed LeaderboardRanker/WorkspaceHealthScorer as domain services
- `Wiki/synthesis/gamification-proposal.md` — Updated directory tree (+read-models/, +WorkspaceChallenge); fixed event flow diagram; fixed cross-context impact table
- `Wiki/log.md` — this entry

## [2026-08-01] design | Gamification — XP, badges, leaderboards, seasons, workspace health

Files created:

- `Wiki/concepts/Gamification.md` — created
- `Wiki/concepts/Achievements & Badges.md` — created
- `Wiki/concepts/Workspace Gamification.md` — created
- `Wiki/entities/PlayerProfile.md` — created
- `Wiki/entities/Achievement.md` — created
- `Wiki/synthesis/gamification-proposal.md` — created
- `Wiki/index.md` — updated (3 concepts + 2 entities + 1 synthesis)
- `Wiki/log.md` — this entry

## [2026-08-01] design | Agent Chat — Conversation privacy rule (user-scoped)

Files updated:

- `Wiki/concepts/Agent Chat.md` — added Conversation Privacy section, updated API auth to `member + owner`
- `Wiki/concepts/Agent Chat UX.md` — added Conversation Privacy section, Team Hub "Le tue Conversazioni" user-scoped, TeamHub component docs updated
- `Wiki/entities/Conversation.md` — privacy invariant added, repository changed to `findByUserAndWorkspace()`
- `Wiki/synthesis/agent-chat-proposal.md` — key decision added, API auth updated
- `Wiki/log.md` — this entry

## [2026-08-01] design | Agent Chat UX — wireframes, 6 new components, sidebar update

Files created/updated:

- `Wiki/concepts/Agent Chat UX.md` — created (29 components, templates 9–10, interaction patterns)
- `Wiki/concepts/UI Component Map.md` — updated (23→29, new agent-chat/ layer)
- `Wiki/concepts/UX Wireframes.md` — updated (Team nav, routes, templates 9–10 reference)
- `Wiki/index.md` — updated
- `Wiki/log.md` — this entry

## [2026-08-01] design | Agent Chat — 7 agents, Conversation/Message entities, new bounded context

Files created:

- `Wiki/concepts/Agent Chat.md` — created
- `Wiki/concepts/Agent Personas.md` — created
- `Wiki/entities/Conversation.md` — created
- `Wiki/entities/Message.md` — created
- `Wiki/synthesis/agent-chat-proposal.md` — created
- `Wiki/index.md` — updated (2 concepts + 2 entities + 1 synthesis)
- `Wiki/log.md` — this entry

## [2026-08-01] design | Workspace Sharing — Membership Diretta (Option A)

Files created/updated:

- `Wiki/concepts/Workspace Sharing.md` — created
- `Wiki/concepts/Workspace Permissions.md` — created
- `Wiki/entities/WorkspaceMembership.md` — created
- `Wiki/entities/Workspace.md` — updated (v2: multi-member model)
- `Wiki/synthesis/workspace-sharing-proposal.md` — created
- `Wiki/index.md` — updated (2 concepts + 1 entity + 1 synthesis, Workspace source_count bumped)
- `Wiki/log.md` — this entry

## [2026-08-01] design | Prompting deep-dive — Caching Strategy, Admin API, IdempotencyKey + Prompt Version

Files created:

- `Wiki/concepts/Prompt Versioning.md` — created
- `Wiki/concepts/Prompt Components.md` — created
- `Wiki/concepts/Context Injection.md` — created
- `Wiki/concepts/PromptComposer.md` — created
- `Wiki/concepts/Prompt Caching Strategy.md` — created
- `Wiki/concepts/Prompt Admin API.md` — created
- `Wiki/concepts/IdempotencyKey + Prompt Version.md` — created
- `Wiki/synthesis/prompting-mechanics-proposal.md` — created
- `Wiki/index.md` — updated (7 concepts + 1 synthesis added)
- `Wiki/log.md` — this entry

## [2026-08-01] remediation | Critical model gaps closure for PM review

Files created/updated:

- `Wiki/concepts/Global Deterministic Model Matrix.md` — added deterministic per-step model assignment contract, enforcement rules, and integration points
- `Wiki/concepts/Output Personalization.md` — added variant/HITL/feedback-RAG personalization model with rollout and invariants
- `Wiki/concepts/Project Brand Persona.md` — added workspace-level auto-injected brand persona contract and traceability rules
- `Wiki/concepts/Invitation Notification Delivery.md` — added invitation notification delivery decision (in-process + retry + idempotent guard)
- `Wiki/synthesis/workspace-sharing-proposal.md` — closed notification open question; normalized option naming to English; linked to notification concept
- `Wiki/synthesis/backend-frontend-startup-gaps.md` — removed stale 4-context wording; aligned to current 6-context canonical overview
- `Wiki/index.md` — maintenance note added; Concepts table expanded with 4 new pages; synthesis date updated for backend/frontend startup gaps
- `Wiki/log.md` — this entry

Readback verification completed for all files above after write.

## [2026-07-30] scaffold | Wiki initialized
## [2026-07-30] ingest | All 4 sources, DDD v3, Gaps, Compliance
## [2026-07-30] design | Full stack: Quota, Monitoring, Copy, Deps, Testing, Logging, Auth, FE Arch, Tool UX, Session List
## [2026-07-30] audit | Backend gaps — 12 findings, all resolved
## [2026-07-30] cleanup | Removed doodle/ — all content superseded by wiki (62 pages)
## [2026-07-30] lint | Full health-check — 0 orphans, 0 broken links, 0 stale pages
## [2026-07-31] remediation | Consistency fixes — 7 error classes resolved

Files verified and updated:

- **Italian prose → English** (4 files):
  - `overview.md` — tool catalog descriptions + `### Analisi` heading
  - `concepts/Content Generation.md` — diagram labels `ACQUISIZIONE/ELABORAZIONE` → `ACQUISITION/ELABORATION`
  - `synthesis/backend-audit-gaps-improvements.md` — §5 proposal sentence
  - `concepts/Centralized Copy Modules.md` — `## Principle` prose, table header `Regola`, `## Future` sentence, 4 code comments, `// futuro`
- **`source_count` corrected** (25 concept files): all fixed from `0` to actual source count matching `## Sources` entries
- **Duplicate log entry removed**: merged two `[2026-07-30] audit` entries into one
- **Broken anchor fixed** (`concepts/ArtifactContent.md`): `[[Database Schema#artifact_size_limit]]` → `[[Database Schema#artifacts]]` (verified heading exists)
- **Cross-version name mapping added** (`sources/APP-CONCEPT.md`): v1 tool slugs → v3 canonical names, 6 BC → 4 BC explanation
- **Numeric contradiction fixed** (`concepts/Frontend Architecture.md`): `16 components` → `17 components` in Key Properties table (consistent with Decision #2 and inventory tree count)
- **CLAUDE.md updated**: new `### Consistency Enforcement Rules` section with 7 rules preventing recurrence

### Audit detail

- [[synthesis/backend-audit-gaps-improvements]]: all 12 gaps closed
  - **Gap #1**: N/A — files are ephemeral, consumed immediately for LLM processing
  - **Gap #2**: [[Migration Tooling]] — FileMigrationProvider + Kysely, `npm run migrate:up`
  - **Gap #3**: [[Health Check - Deep]] — 5 checks (DB, Redis, Pool, BullMQ, LLM), admin-only
  - **Gap #4**: [[File Upload Security]] — multer memoryStorage, 10MB limit, MIME whitelist, mammoth/pdf-parse
  - **Gap #5**: Redis degradation — PostgreSQL fallback in [[Idempotency Implementation]]
  - **Gap #6**: DB Pool Monitoring — integrated in [[Health Check - Deep]]
  - **Gap #7**: Artifact Size — 500KB limit + preview in [[Artifact]]
  - **Gap #8**: Session Cleanup — retention policy in [[Database Schema]]
  - **Gap #9**: Prompt Validation — startup check in [[LLM Gateway - OpenRouter]]
  - **Gap #10**: [[Docker Compose - Local Dev]] — PostgreSQL 16 + Redis 7, 30s start
  - **Gap #11**: [[Seed Data]] — 2 users, workspaces, assets, quotas, models, demo creds
  - **Gap #12**: [[API Documentation - OpenAPI]] — zod-to-openapi + Swagger UI
- Wiki: 62 pages

## [2026-07-31] audit+remediation | Type-design audit — 11 findings across 8 entity/VO pages

Full audit: type-design coverage and effectiveness analysis across all domain types (4 aggregate roots, 2 entities, 6 value objects, 1 domain error hierarchy). All findings applied as wiki remediation.

### Pages modified (8):

| Page | Change | Finding |
|------|--------|---------|
| `concepts/IdempotencyKey.md` | Format fixed: added `workspaceId` to key format + full class structure | P0: three-way inconsistency between concept page, implementation, and DB schema |
| `concepts/ArtifactContent.md` | 500KB constraint moved from application layer to domain VO constructor | P0: domain invariant leak — VO now self-validates |
| `entities/Workspace.md` | Added `addAsset()` with "one Asset per type" enforcement + `sourceRef` validation | P1: invariants enforced only at DB level, not in aggregate root |
| `entities/Asset.md` | `sourceRef` typed as `ArtifactId \| null` (was raw UUID) | P1: raw UUID with no FK, no type safety |
| `entities/Quota.md` | Fixed `readonly plan` → `private _plan`; added `get plan()`, `get transactions(): ReadonlyArray`; `addCredits` positive-value guard; Italian prose → English | P1/P2: TypeScript compile error, mutable array leak, missing validation |
| `entities/Session.md` | Added guarded transition methods (`configure`, `start`, `addArtifact`, `complete`, `fail`, `cancel`); `currentStepIndex` as `StepNumber` VO; `ReadonlyArray<Artifact>` | P1/P2: anemic aggregate — state guards existed only in XState machine |
| `entities/User.md` | Added `plan: Plan` field (referenced by Quota but missing from entity page) | P2: inconsistency between entity pages |
| `entities/Artifact.md` | Added `startGeneration()`, `complete()`, `fail()` status transition guards | P3: no self-guarding lifecycle |

### Ratings summary:
- **Encapsulation**: Session 4→7/10, Workspace 5→7/10, Asset 5→7/10, Quota 8→9/10
- **Invariant Enforcement**: Session 4→8/10, Workspace 2→7/10, Asset 2→7/10, Artifact 4→7/10

## [2026-07-31] ddd-validation | Session aggregate root — 4 DDD compliance fixes

Post-Pattern-B validation against canonical DDD principles. 4 violations fixed:

| # | Violation | Fix |
|---|-----------|-----|
| 1 | `startedAt` / `completedAt` were `readonly` in constructor, never set during transitions | Changed to `private` with getters; `apply()` now sets them on `START` and `COMPLETE` |
| 2 | `ADD_ARTIFACT` called `getTool(this.toolKey)` — external dependency inside aggregate | `isLast` and `stepLabel` are now passed in the event by XState; aggregate operates only on its own state |
| 3 | `SessionStatus` VO and `SessionLifecycle.states` were independent enumerations | Added compile-time derivation note: `SessionStatus` derives from `SessionLifecycle` |
| 4 | `finalArtifact!` non-null assertion | Replaced with explicit narrowing via `if (!final) throw ...` |

### Pages modified:
- `entities/Session.md` — 4 fixes applied to `apply()` method + `SessionStatus` derivation note
- `concepts/Session Machine (XState v5).md` — `callApply` now passes `isLast` + `stepLabel` in `ADD_ARTIFACT` event

Follow-up to the type-design audit. Replaced the double-enforcement pattern (Session guard methods + XState guards) with a canonical DDD integration: **the domain owns the state machine definition, XState consumes it**.

### What changed:

| Before (Pattern A — double enforcement) | After (Pattern B — domain-owned) |
|----------------------------------------|----------------------------------|
| Session had 6 guarded methods (`configure`, `start`, `addArtifact`, `complete`, `fail`, `cancel`) | Session has 1 entry point: `apply(event: SessionEvent)` |
| XState defined all states/transitions itself | XState imports `SessionLifecycle` from domain |
| State knowledge duplicated (entity + XState) | Single source of truth in `packages/domain` |
| Startup: no validation of XState↔domain consistency | Startup: `validateXStateMatchesDomain()` fails fast on drift |

### Pages modified (4):

| Page | Change |
|------|--------|
| `entities/Session.md` | Replaced 6 guarded methods with `SessionLifecycle` definition + single `apply(event)` method |
| `concepts/Session Machine (XState v5).md` | Rewrote architecture: XState imports domain definition; added startup validation; updated action names (`callApply` instead of `callAddArtifact`) |
| `concepts/packages-domain Structure.md` | Added `session-lifecycle.ts` (+1 file: 62→63); added `SessionLifecycle` to barrel exports |
| `concepts/Application Services.md` | Updated flow: `Session.complete()` → `Session.apply({ type: 'COMPLETE' })` |

### Architecture diagram:
```
packages/domain                          apps/backend
─────────────                            ────────────
SessionLifecycle (pure data)  ──import──▶  sessionMachine (XState runtime)
  → states: draft, ready, ...               → actors (invoke LLM, persist)
  → transitions: CONFIGURE, START, ...      → guards (ReadinessPolicy)
  → getValidTransition(from, event)         → actions (publish events)
Session.apply(event)           ◀──calls───  XState calls Session.apply()
  → validates against lifecycle
  → mutates state
  → returns DomainEvent | null
```

## [2026-07-31] validation-remediation | Global consistency remediation (metadata, index, links, language)

Scope: full remediation after global validation of `Wiki/` consistency, coherence, duplication risk, and contradictions.

Files verified and updated:

- **`source_count` aligned to `## Sources` entries** (10 files):
  - `concepts/ArtifactContent.md` (`4` → `3`)
  - `concepts/Frontend Architecture.md` (`4` → `7`)
  - `concepts/IdempotencyKey.md` (`4` → `3`)
  - `concepts/ReadinessPolicy.md` (`4` → `3`)
  - `concepts/Session List - Live Status.md` (`4` → `5`)
  - `concepts/Tool UX Architecture.md` (`4` → `7`)
  - `concepts/ToolPage Machine (XState v5).md` (`4` → `5`)
  - `concepts/packages-domain Structure.md` (`4` → `5`)
  - `entities/Quota.md` (`4` → `2`)
  - `entities/User.md` (`3` → `2`)
- **Duplicate heading ambiguity removed**:
  - `entities/Asset.md` — first `## Sources` renamed to `## Origin Modes` (kept final `## Sources` as canonical source list)
- **Anchor link fixed**:
  - `concepts/ArtifactContent.md` — `[[Health Check - Deep#7]]` → `[[Health Check - Deep#deep-health-check]]` (anchor verified)
- **Language normalization (Italian prose → English)**:
  - `overview.md` — naming convention sentence translated
  - `concepts/Project Dependencies.md` — table cell text translated (`Compilation`, `Imports ... to build DTOs`)
  - `sources/APP-CONCEPT.md` — key claim normalized to English
- **Index realigned with current wiki state**:
  - `index.md` — Concepts table expanded from curated subset to full inventory (46 concept pages) with corrected source counts
  - `index.md` — synthesis row typo fixed (`12 finding` → `12 findings`)
  - `index.md` — `overview` row date aligned to current page update date (`2026-07-31`)

Follow-up maintenance (same operation):

- `concepts/Project Dependencies.md` — additional Italian residue fixed (`Compilazione` → `Compilation` in `packages/copy` table)
- `sources/APP-CONCEPT.md` — removed remaining Italian phrase from key claim
- `index.md` — maintenance note added for traceability of this wiki write

## [2026-07-31] architecture-remediation | Backend architecture consistency hardening (phase 1 + phase 2)

Scope: direct remediation of backend architecture documentation to remove contradictions and make scaling/reliability contracts explicit.

Files verified and updated:

- `concepts/Idempotency Implementation.md`
  - Clarified fallback semantics: Redis down => PostgreSQL fallback is fail-open for availability.
  - Added deterministic contract for single canonical `sessionId`.
  - Aligned example flow to create Session with the same claimed `sessionId`.
- `concepts/Database Schema.md`
  - Fixed retention-policy contradiction (`archived` status was not in enum).
  - Replaced soft-archive SQL with optional export + hard-delete path for completed sessions.
- `concepts/BullMQ Worker Wiring.md`
  - Replaced contradictory single-process claim with explicit deployment modes (single-service early stage, split api/worker for scale).
  - Standardized queue connection snippets to `REDIS_URL`.
- `concepts/Job Queue - Monitoring and Stability.md`
  - Standardized Redis config snippets to `REDIS_URL`.
  - Added production queue SLO section (success rate, queue wait p95, completion p95, stalled ratio).
- `concepts/Domain Events.md`
  - Added explicit delivery semantics (current at-most-once in-process).
  - Added outbox migration path for higher reliability in split-service topology.
- `synthesis/backend-audit-gaps-improvements.md`
  - Normalized file-storage finding as closed by design (ephemeral uploads).
  - Updated retention row to match current hard-delete policy.
- `index.md`
  - Added maintenance note for this remediation batch.

Readback verification completed for all files above after write.

### Phase 2 — API/reliability/scaling governance

Additional files verified and updated:

- `concepts/API Routes.md`
  - Added API contract governance rules: versioning, correlation ID, idempotency, rate-limit headers, deprecation headers.
  - Corrected idempotency behavior for session start: replay is `200` (existing session), create is `201`.
  - Replaced Italian step label in SSE sample with English (`Briefing Analysis`).
  - Updated `409 CONFLICT` description to generic write-conflict semantics.
- `concepts/API Documentation - OpenAPI.md`
  - Added governance requirements (operationId stability, auth metadata, retry semantics, idempotency header documentation).
  - Added CI contract validation workflow and breaking-change gate.
- `concepts/LLM Gateway - OpenRouter.md`
  - Added timeout/retry budget matrix and transient/non-transient retry rules.
  - Added deterministic execution controls (template version logging, output-shape validation).
- `concepts/Job Queue - Monitoring and Stability.md`
  - Added explicit worker autoscaling policy with thresholds, min/max replicas, cooldown.
- `concepts/Health Check - Deep.md`
  - Added operational semantics (`/health` for readiness, `/health/deep` for diagnostics only).
- `index.md`
  - Added maintenance note for second remediation batch.

Readback verification completed for all files above after write.

### Phase 3 — DR, durable events, API deprecation policy

Additional files verified and updated:

- `concepts/Database Schema.md`
  - Added Phase 3 reliability schema extension (`outbox_events`, `inbox_consumers`) with indexes and dedupe-key convention.
  - Added backup/disaster-recovery runbook section with explicit targets (RPO <= 15m, RTO <= 60m), restore steps, and drill checklist.
- `concepts/Domain Events.md`
  - Added concrete outbox/inbox delivery contract and publisher/consumer rules.
  - Added DLQ/poison-message handling semantics for durable mode.
- `concepts/API Routes.md`
  - Added deprecation timeline policy (T-90/T-60/T-30/T+0) and compatibility rule for major versions.
- `concepts/API Documentation - OpenAPI.md`
  - Added deprecation metadata requirements (`deprecated`, `Deprecation`, `Sunset`, `Link` headers) with YAML example.
- `index.md`
  - Added maintenance note for phase 3 remediation batch.

Readback verification completed for all files above after write.

### Phase 4 — Frontend UX determinism and SSE scalability

Additional files verified and updated:

- `concepts/ToolPage Machine (XState v5).md`
  - Fixed readiness guard contradiction: required assets are now enforced by `assetType`.
  - Added explicit FE/BE determinism contract and parity-test requirement for readiness predicates and reason codes.
  - Updated context shape to include `selectedAssetsByType` for deterministic asset validation.
- `concepts/ReadinessSnapshot UI.md`
  - Fixed required-asset check from generic `selectedAssetIds.length > 0` to `selectedAssetsByType[assetType]`.
  - Canonicalized reason-code table (`missing_text`, `missing_file`, `missing_asset`, `missing_workspace`).
  - Aligned KnowledgePanel integration snippet to pass both selected IDs and `byType` map.
- `concepts/API Client + SSE Client.md`
  - Replaced singleton `EventSource` model with multi-session map (`Map<sessionId, EventSource>`).
  - Added per-session unsubscribe semantics to prevent cross-session disconnect side effects.
  - Corrected hook import split (`api` from client, `sseClient` from sse-client).
- `concepts/Session List - Live Status.md`
  - Updated live-session hook cleanup to use per-session unsubscribe.
  - Replaced queue-position example based on waiting-count with deterministic rank-based semantics.
  - Added scale note recommending Redis sorted-set rank for high throughput.
- `index.md`
  - Added maintenance note for phase 4 frontend remediation batch.

Readback verification completed for all files above after write.

## [2026-07-31] ux-design-session | UX/GUI deterministic proposal — 3 new concept pages

10-question design Q&A session completed. Answers collected, reviewed against existing [[Frontend Architecture]], and transcribed into deterministic design specifications.

### Design decisions confirmed

| Dimension | Decision |
|-----------|----------|
| Target users | Marketer operativo · Content manager · Agenzia multi-cliente |
| Core tasks (frictionless) | Generate · Promote to Asset · Navigate workspace |
| Style | Creative modern (benchmark: Forest + Monday.com) |
| Navigation | Hybrid: dashboard home + workflow shortcuts |
| Theming | Light/Dark/System + workspace accent color (10 presets) |
| Accessibility | WCAG 2.1 AA + AAA selective (headings, body text) |
| Density | Balanced |
| Anti-patterns | Airbnb-style cold bureaucracy · Badoo-style complexity |
| Future modules | Templates (placeholder) · Audit Log (placeholder) |
| KPI 60gg | Promote rate ≥35% · Error rate ≤6% · Retry rate ≤18% |

### Review: coherence with existing architecture

- MUI v6 kept (theme override only, no replacement)
- 17 components extended to 23 (+6 UX-v1 additions)
- `--workspace-accent` CSS variable system added
- Routing extended with `/assets`, `/sessions` full-page routes
- Zero tool-specific components (rule preserved)

### Pages created (3):

| Page | Content |
|------|---------|
| `concepts/UX Wireframes.md` | ASCII wireframes desktop + mobile: AppShell, Workspace Home, Tool Page (3 phases), Session Detail, Assets, Shared States. Interaction patterns table. |
| `concepts/Design Tokens.md` | Complete CSS custom-property + MUI v6 token system: palette, workspace accent system (10 presets), typography (Plus Jakarta Sans + Inter + JetBrains Mono), spacing, shadows, radius, animations, dark mode overrides, `buildTheme()`, `ThemeProvider`. |
| `concepts/UI Component Map.md` | 23-component inventory with file tree, props interfaces, MUI internals, state management bindings, accessibility summary. 6 UX-v1 additions fully specified: `AssetCoverageBar`, `ToolCard`, `CompletionBanner`, `QuickGenerateBar`, `WorkspaceAccentProvider`, `PromoteButton`. |

### Pages updated (2):

- `index.md` — added 3 new concept pages to Concepts table; added maintenance note
- `log.md` — this entry

Readback verification completed for all files above after write.
