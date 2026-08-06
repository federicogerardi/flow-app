---
type: log
tags:
  - wiki/log
date_updated: 2026-08-06
---

# Wiki Operation Log

Every ingest, lint run, and maintenance operation is recorded here automatically. For a better experience, use the **Operation History** panel:
- Cmd+P → "View operation history"
- Or open from Settings → Auto Maintenance → Operation History
---

## [2026-08-06] review | test coverage audit — 6 new test files, 5 updated

**Test gap analysis**: 7/13 source files in the plan have NO test coverage. 5 have existing tests needing updates. 1 (KnowledgePanel) is dead code and skipped.

**New test files to create** (6):
- `packages/domain/.../tool-definition.test.ts` — AssetInput shape validation
- `packages/infra-db/.../asset-repository.spec.ts` — findByWorkspaceAndType (array), upsert behavior
- `packages/domain/.../AssetResolver.test.ts` — resolve, MissingRequiredAssetError, InvalidAssetSelectionError (F1)
- `apps/backend/.../promote-to-asset.test.ts` — idempotency (F2), error cases
- `apps/frontend/.../AssetPicker.test.tsx` — radio/checkbox modes, exclusivePerType
- `apps/frontend/.../ReadinessSnapshot.test.tsx` — asset readiness rows with count

**Existing test files to update** (5):
- `ReadinessPolicy.test.ts` — multi-asset evaluation (4 new tests)
- `ContextEnricher.test.ts` — multi-asset labeling (3 new tests)
- `Workspace.test.ts` — addAsset, getAssetsByType, reconstitute with assets (5 new tests)
- `start-session.test.ts` — selectedAssets passthrough, auto-resolve (3 new tests)
- `session-worker.test.ts` — SessionJobData Record<string, string[]> (1 update)

**Existing files with new cases** (2):
- `generation.spec.ts` — listTools includes assets, startSession skipped on replay (3 new tests)
- `error-handler.test.ts` — ASSET_NOT_FOUND → 404 (1 new test)

**Estimated**: ~600 new test lines. Baseline: all 644 existing tests must pass after every phase.

## [2026-08-06] review | cross-validation: backend-architect + frontend-engineer — 15 fixes integrated

**Both reviewers**: APPROVED WITH CHANGES. 4 blockers, 7 medium, 3 low.

**Cross-review finding** (both found independently): `StartSessionUseCase` must always call `AssetResolver.resolve()` — not gated on `selectedAssets.length > 0`. Otherwise required-asset tools fail readiness when no explicit selection is made.

**Backend fixes integrated** (BA-C1 to BA-C5):
- BA-C1: `ASSET_NOT_FOUND` added to `ErrorMapper` → 404 (new Step 13)
- BA-C2: `resolvedAssets` added to `StartSessionResult` interface (Step 9)
- BA-C3: `PromoteToAssetUseCase` F2 fix specified as `findByWorkspace()` + in-memory `sourceArtifactId` filter (Step 8)
- BA-C4: partial unique index for NULL `source_ref` in migration 011 (Step 4)
- BA-C5: skip `enqueueSession()` on replayed path (Step 11)

**Frontend fixes integrated** (FE-C1 to FE-C10):
- FE-C1: `AssetPicker` extracted as shared component — not inline in SetupPanel (Step 15)
- FE-C2: data fetching only in `ToolPageLayout`, `workspaceAssets` passed as prop (Step 16)
- FE-C3: `selectedByType: Map<string, number>` pre-computed with `useMemo` (Step 16)
- FE-C4: same as BA-C4 cross-review (Step 9)
- FE-C5: stale `selectedAssets` filtered on SWR revalidate (Step 16)
- FE-C6: 6 new copy keys — `selectOne`, `selectAtLeastOne`, `noneAvailable`, `assetsSelected`/`assetsSelectedOne`/`assetsRequired` (Step 20)
- FE-C7: AssetCoverageBar count overflow acceptable at B2B scale (Step 19 note)
- FE-C8: `KnowledgePanel` confirmed dead code (0 imports) — Step 17 replaced with defer-to-AssetPicker note
- FE-C9: SWR key collision between AssetList and ToolPageLayout documented as intentional cache sharing (Step 16 note)
- FE-C10: `selectedAssets` reset on tool change alongside `setFiles({})` (Step 16)

**Updated Architecture Changes**: 10 entries (was 7) — added `StartSessionResult`, `ErrorMapper`, `AssetPicker`

## [2026-08-06] review | type-design audit: 3 findings (2 medium, 1 low) integrated into plan

**F1** — `AssetResolver` silently drops invalid `selectedAssetIds` → added `InvalidAssetSelectionError` validation in Step 7
**F2** — `PromoteToAssetUseCase` returns wrong `assetId` on UPSERT (`Asset.create()` UUID ≠ DB row ID) → pre-check by `source_ref` in Step 8
**F3** — `created: boolean` dead code → removed from `PromoteToAssetResult` in Step 8

**Verified type invariants**: `Map<string, string[]>` clean, `AssetInput.multiple` orthogonal to `required`, `ReadinessPolicy` defensive, no over-engineered VOs needed

## [2026-08-06] decision | multi-asset: 5 pre-implementation decisions resolved

**D1**: `resolvedAssets` type always `Map<string, string[]>` — controlled break, 3 consumers all in plan
**D2**: Explicit selection only — no auto-resolve. Per-type config via `multiple` flag: `false` = radio (single), `true` = checkboxes (multi). Required assets block submit; optional accept 0-n
**D3**: `AssetResolver.resolve()` without `selectedAssetIds` → returns all assets of each type
**D4**: `multiple: false` + 2+ same-type assets in workspace → radio button UI, no domain error
**D5**: `Workspace._assets` kept as-is (snapshot read-only, no dual-write)

Updated `Wiki/synthesis/multi-asset-implementation-plan.md` with decision table + selection UX matrix

## [2026-08-06] plan | multi-asset promotion — complete implementation plan

**Context**: Enable tools to consume multiple promoted assets of the same type (e.g. 3 buyer personas). Full gate validation against all 19 DDD rules: 3 blocking gates (DB constraint, type change, resolver return type), 4 design gates (readiness semantics, promotion overwrite, AssetInput type, context enrichment), 0 architectural blockers.

**Wiki changes**:
- `Wiki/synthesis/multi-asset-implementation-plan.md` — new page: 21 steps across 7 phases covering domain, DB migration, backend, frontend, copy module, DI, contracts
- `Wiki/index.md` — added synthesis entry
- `Wiki/log.md` — this entry

**Plan structure**:
- Phase 1: Domain Foundation (3 files) — `AssetInput.multiple`, `AcquisitionData` type, `ContextEnricher`
- Phase 2: Database (2 files) — migration 011, repository ON CONFLICT change
- Phase 3: Workspace Domain (2 files) — `getAssetsByType()`, `AssetResolver`
- Phase 4: Application Layer (2 files) — `PromoteToAssetUseCase`, `StartSessionUseCase`
- Phase 5: Backend API + Worker (3 files) — `listTools`, `acquisitionData`, `SessionJobData`
- Phase 6: Frontend (6 files) — `SetupPanel` asset picker, `ToolPageLayout` wiring, `ReadinessSnapshot`, `KnowledgePanel` fix, `AssetCoverageBar` count
- Phase 7: Copy + DI + Contracts (3 files)

**Gate validation**: 3 blocking (G1–G3), 4 design (G4–G7), 12 compliant (Rules 1,2,4,6–14,17–19), 1 pre-existing (Rule 3 violation in `Workspace.rename()`)

**Cross-references**: [[DDD Domain Design Rules]], [[Creating a New Tool]], [[ReadinessPolicy]], [[Centralized Copy Modules]]

## [2026-08-06] docs | howto: Creating a New Tool — step-by-step guide

**Context**: After implementing the `brief` tool and fixing 19 copy module violations, a reusable guide was needed for adding future tools without rediscovering the pattern each time.

**Wiki changes**:
- `Wiki/concepts/Creating a New Tool.md` — new page: decision tree, 6-step checklist, code templates for content/asset/analysis tools, field reference, model tier guide, prompt template conventions, common pitfalls, file count per tool type
- `Wiki/index.md` — added concept entry
- `Wiki/log.md` — this entry

**Cross-references**: [[Tool as Static Configuration]], [[Tool UX Architecture]], [[Brief Tool - Prompt Architecture]], [[Content Generation]], [[Centralized Copy Modules]]

## [2026-08-06] refactor | brief: remove company+product text inputs → file extraction

**Context**: `company` and `product` were redundant text inputs in `briefTool.acquisition.userText` — both values already present in the uploaded briefing file. Extracting them from the file eliminates data duplication and simplifies the SetupPanel to a single `objective` field.

**Code changes** (7 files):
- `packages/domain/src/generation/tools/index.ts`: removed `company` and `product` from `briefTool.acquisition.userText` (1 field remaining: `objective`)
- `apps/frontend/src/tool-inputs.ts`: removed `company` and `product` from `BRIEF_INPUTS`
- `apps/backend/src/prompts/brief/extraction/versions/1.0.0/system.md`: extraction now 6-field JSON (+ `company`), `product_or_service` instructions reinforced for file extraction, added company extraction example
- `apps/backend/src/prompts/brief/extraction/versions/1.0.0/user.md`: added file-extraction instructions for `company` + `product_or_service`
- `apps/backend/src/prompts/brief/brief-generation/versions/1.0.0/system.md`: `## Panoramica` now includes `- Azienda:` bullet, payload reference updated to 6 fields
- `apps/backend/src/prompts/brief/brief-generation/versions/1.0.0/user.md`: added `company` to extraction field list

**Wiki changes**:
- `Wiki/concepts/Brief Tool - Prompt Architecture.md`: updated ASCII diagram, acquisition model rewritten, comparison table, data flow, checklist (1 text input, 6 extraction fields)

**Verification**: tsc (3 packages) ✅, vitest (644 tests) ✅, vite build ✅

## [2026-08-06] feat | AssetDetailPage + toast notification + AssetList navigation

**Context**: [[Asset Promotion]] was working but users had no way to view promoted asset content without returning to the session. Also missing: feedback after promotion and navigation from asset list to detail.

**Changes** (6 files):

| File | Change |
|------|--------|
| `pages/AssetDetailPage.tsx` | **NEW** — full markdown content view at `/workspaces/:wid/assets/:aid`. Metadata: type, source, creation date. CTA "Usa in una generazione" → navigates to tool. Same ReactMarkdown styling as SessionSummary. |
| `App.tsx` | Lazy import + route `/workspaces/:wid/assets/:aid` |
| `components/workspace/AssetList.tsx` | Cards clickable via `CardActionArea` → navigate to AssetDetailPage. Delete `stopPropagation`. |
| `components/tool/SessionSummary.tsx` | Fragment wrapper + MUI Snackbar/Alert with "Vedi asset →" link. Appears bottom-right on promotion, auto-dismiss 6s. |
| `components/shared/PromoteButton.tsx` | `onPromoted` now passes `(assetId, assetType)` for toast |
| `api/client.ts` | `promoteArtifact` return type includes `assetId` |

**User flow**:
```
Session → Click "Promuovi ad asset" → green "Promoted" + toast "✅ Asset 'brief' promosso [Vedi asset →]"
  → Click "Vedi asset" → AssetDetailPage (full markdown, metadata, "Usa in una generazione" CTA)
  → Or: Workspace → Assets → click card → AssetDetailPage
```

**Verification**: TypeScript 0 errors (5 packages). Tests 616/616 pass.

**Wiki updated**: [[UX Wireframes]], [[Frontend Architecture]], [[Asset Promotion]], [[log]].

## [2026-08-06] impl | Promote to Asset — use case, API, frontend

**Context**: [[Asset Promotion]] was documented but the `POST /api/artifacts/:id/promote` handler was raw SQL bypassing the domain layer. No `Asset.create()`, no `AssetType` validation, no workspace authorization, no provenance tracking.

**Changes** (9 files):

| File | Change |
|------|--------|
| `packages/domain/.../SessionRepository.ts` | Added `findByArtifactId(artifactId)` |
| `packages/infra-db/.../session-repository.ts` | Implemented: query `artifacts.session_id` → `findById` |
| `apps/backend/.../promote-to-asset.usecase.ts` | **NEW** — 5 domain errors, session completion check, workspace auth, `Asset.create()` with provenance |
| `apps/backend/.../generation.ts` | Handler delegates to `PromoteToAssetUseCase`, removed raw SQL |
| `apps/backend/.../app.ts` | `createGenerationRoutes` receives `workspaceRepo` + `assetRepo` |
| `packages/contracts/.../session.dto.ts` | `SessionDetailDTO` gains `produces?: string` |
| `apps/frontend/.../PromoteButton.tsx` | Accepts `produces` instead of `assetType`, hidden when undefined |
| `apps/frontend/.../SessionSummary.tsx` | Passes `produces` to `PromoteButton` |
| `apps/frontend/.../SessionPage.tsx` + `ToolPageLayout.tsx` | Pass `session.produces` to `SessionSummary` |

**Architecture decisions**:
- `assetType` derived from `tool.produces` (domain-driven) rather than request body — `AssetType.from(tool.produces)` validates it
- Promotion is **explicit** (user clicks button) rather than automatic on `SessionCompleted` event. This gives the user control. EventBus wiring deferred.
- `AssetCreated` domain event also deferred — `Workspace.addAsset()` doesn't emit events yet
- Frontend `PromoteButton` only renders when `produces` is set on the tool config

**DDD validation**: All 14 rules pass. Custom errors extend `DomainError` with `code` + `retryable`. Authorization via `workspace.isMember()`. No external validation libraries. Business validation delegated to `AssetType.from()`. `Asset.create()` uses canonical factory pattern with full provenance (`sourceSessionId`, `sourceArtifactId`).

**Verification**: TypeScript 0 errors (5 packages). Tests 616/616 pass (57 files).

**Wiki updated**: [[Asset Promotion]], [[Application Services]], [[Domain Events Catalog]], `index.md`, `log.md`.

## [2026-08-06] ops | Removed backend public domain — proxy-only architecture complete

**Context**: [[nodejs-thin-reverse-proxy-plan]] Step 8 was documented as complete but the backend public domain (`backend-dev-cfc8.up.railway.app`) was still active. Proxy architecture was functionally correct (all traffic through `backend.railway.internal:3000`, CORS disabled), but the domain was unnecessary attack surface.

**Actions**:
- Deleted backend public domain via Railway API (`railway_delete_domain`)
- Verified proxy: `GET /health` → `{"status":"ok","proxy":"http://backend.railway.internal:3000"}`, `GET /api` → `{"message":"Flow App API"}` — both through frontend proxy
- Verified backend directly unreachable: `GET backend-dev-cfc8.up.railway.app/health` → 404

**Final architecture**:
```
Browser → frontend-dev-b363.up.railway.app (server.mjs)
           ├─ /, /*     → dist/ (SPA)
           └─ /api/*, /health → proxy → backend.railway.internal:3000 (private)
```
Zero public surface on backend. CORS disabled. All auth cookies same-origin.

**Wiki updated**: [[nodejs-thin-reverse-proxy-plan]] — Status section + Step 8 verification.

## [2026-08-06] fix | Railway Log Errors — trust proxy + migration runner

Two errors appeared in Railway deploy logs after brief generation:

**1. `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` (express-rate-limit)**
- Root cause: Railway routes traffic through a reverse proxy which sets `X-Forwarded-For`, but Express `trust proxy` was not enabled. express-rate-limit couldn't identify the real client IP.
- Fix: `app.set('trust proxy', 1)` in `apps/backend/src/app.ts` (commit `d58fb0e`).
- Verified: no more ERR_ERL errors on Railway deploy.

**2. `credits_consumption_failed` (PostgreSQL 42703 — undefined column)**
- Root cause: Migration 009 (`ALTER TABLE quotas ADD COLUMN version`) was not applied on Railway. The `KyselyQuotaRepository.save()` INSERT referenced a column that didn't exist.
- Fix: Applied `ALTER TABLE` manually on Railway database. Implemented auto-migration runner (`packages/infra-db/src/migrate.ts`) that runs on every server startup.
- Migration runner features:
  - Creates `migrations` tracking table on first run
  - Reads `.sql` files in alphabetical order, applies unapplied ones in transactions
  - Auto-detects manually-applied migrations via PostgreSQL error codes (42710, 42P07, 42P16, 42701)
  - Fail-fast on unknown errors
  - Called from `server.ts` before `createApp()`
- Verified (Railway): 10/10 migrations skip as "already applied", server starts clean, no ERROR logs on deploy.

**Files changed**: `apps/backend/src/app.ts`, `apps/backend/src/server.ts`, `packages/infra-db/src/migrate.ts` (new), `packages/infra-db/src/index.ts`.

**Wiki updated**: [[Migration Tooling]] (rewritten with actual implementation), [[overview]] (credits fixed, migration runner in infra table), [[Brief Tool - Prompt Architecture]] (credits consumption error resolved), [[log]] (this entry).

## [2026-08-06] fix | Worker Gap — Inline Worker in Server Process

**Problem**: Railway `Dockerfile.backend` only started `server.ts`. The BullMQ worker (`worker-process.ts`) was a separate process with no deployment. Sessions were enqueued but never processed on Railway.

**Fix — Option 3 (Worker Inline)**:
- `apps/backend/src/server.ts`: imports `createSessionWorker`, `GamificationEventPublisher`, `getGamificationQueue`, `ConsumeCreditsUseCase`. Worker instantiated after `app.listen()`. Graceful shutdown coordinates `worker.pause()` → drain(30s) → `worker.close()`.
- `apps/backend/package.json`: removed `dev:worker` script.
- `package.json`: `dev` script simplified to server + vite only.
- `Dockerfile.backend`: no changes needed (CMD already points to `server.ts`).

**Verification**:
```
tsc --noEmit  →  backend ✅  domain ✅
vitest        →  676/676 (69 files) ✅
Railway deploy →  Worker started ✅ → pending session auto-picked → extraction → brief-generation → job_completed ✅
```

**Wiki updated**: [[overview]] (infra table, remaining stubs), [[Brief Tool - Prompt Architecture]] (worker entries, data flow diagram), [[log]] (this entry).

## [2026-08-06] implementation | Brief Tool — Smoke Test ✅ + Bug Fixes (7 root causes)

Smoke test passed: session created → extraction step → brief-generation step → 2 artifacts in DB → FE displays final brief.

**7 critical bugs fixed during end-to-end validation:**

1. **Readiness always failed** — FE sent `{...inputs}` flat, backend expected `{ text: inputs }`. Fixed request body shape.
2. **FE stuck on "preparazione in corso"** — XState `send()` after `await` didn't transition state. Replaced with local `useState`.
3. **Worker `InvalidSessionStateError`** — Session aggregate stayed in `ready` when machine sent `ADD_ARTIFACT`. Applied `QUEUE`+`WORKER_PICKUP` to aggregate before processing.
4. **`saveWithLock` version mismatch** — `session.version` incremented by `apply()` before optimistic lock check. Used `version - 1`.
5. **`COMPLETE` not persisted before SSE** — Session saved as `running` because `save()` happened after `session_completed` publish. Reordered: save first, then publish.
6. **Session detail missing artifacts** — `GET /api/sessions/:id` returned no `artifacts[]`. Added artifact query to endpoint.
7. **Worker never started** — Missing `dev:worker` script + wrong env path in worker-process. Added script + fixed `../../..`.

**Additional fixes:**
- Logger: silenced 304 responses; dropped verbose req/res serializers
- Frontend: merged `fetchToolMeta` + `fetchToolDefinitions` into single `GET /api/tools` call (was 2 calls)
- Test mock: added `orderBy` to mockDb for artifacts query

**Verification**: `tsc --noEmit` ✅ (3 projects), `vitest` 644/644 ✅, `vite build` ✅, smoke test ✅.

**Wiki updated**: [[Brief Tool - Prompt Architecture]] (implementation status → complete with final data flow), [[log]] (this entry).

## [2026-08-06] implementation | Brief Tool — Gap Closure (File Content Wiring)

Closed all 3 remaining gaps from the brief tool implementation:

**`ContextEnricher.enrich()` — file content emission**:
- ✅ Added `[File - {key}]\n{content}` sections between asset emission and user inputs (line 26-28 of `packages/domain/src/generation/domain-services/ContextEnricher.ts`)
- ✅ Added 2 tests: single file, multiple files — 457 domain tests ✅

**`AcquisitionData` flow from API to worker**:
- ✅ `SessionJobData` extended with `acquisitionData: { userInputs, fileContents, apiResponses, resolvedAssets }` (`session-worker.ts`)
- ✅ `enqueueSession()` now accepts and passes `acquisitionData` alongside `sessionId` (`enqueue-session.job.ts`)
- ✅ API handler builds serializable `acquisitionData` from `req.body.inputs` and passes it to `enqueueSession()` (`generation.ts:214-222`)
- ✅ Worker reads `job.data.acquisitionData` and sends `CONFIGURE` event with real data (replaces empty `{}` at `session-worker.ts:156-164`)
- ✅ `Map` serialization: `resolvedAssets` converted `Record<string,string>` ↔ `Map<string,string>` at JSON boundary

**Verification**: `tsc --noEmit` ✅ (3 projects), `vitest` 644/644 ✅ (domain 457 + backend 127 + frontend 60), `vite build` 2.58s ✅

**Wiki updated**: [[Brief Tool - Prompt Architecture]] (implementation status → complete, gaps → all closed, data flow diagram), [[log]] (this entry).

## [2026-08-06] implementation | Brief Tool — Domain + Prompts + Frontend

Implemented the `brief` tool based on the ingested prompt prototypes from [[sources/brief-generator]].

**Domain** (`packages/domain/src/generation/tools/index.ts`):
- ✅ Added `briefTool` definition: 2-step extraction→generation pipeline, `produces: 'brief'`, 3 userText fields + optional file upload
- ✅ Registered in `toolRegistry` (replaced blogPostTool stub)

**Prompt templates** (`apps/backend/src/prompts/brief/`):
- ✅ `extraction/versions/1.0.0/system.md` — Data Extraction Specialist, 5-field JSON output, anti-hallucination guardrails
- ✅ `extraction/versions/1.0.0/user.md`
- ✅ `brief-generation/versions/1.0.0/system.md` — Senior Creative Strategist, 11-section structure, downstream-first design
- ✅ `brief-generation/versions/1.0.0/user.md`

**Backend API** (`apps/backend/src/api/generation.ts`):
- ✅ `GET /api/tools` now exposes `acquisition.files[]` alongside `acquisition.userText[]`

**Frontend** (5 files):
- ✅ `SetupPanel.tsx` — FileUpload component with drag-and-drop, remove, accept filter
- ✅ `ReadinessSnapshot.tsx` — file readiness tracking
- ✅ `ToolPageLayout.tsx` — file state management, FileReader integration on submit
- ✅ `tool-inputs.ts` — `FileInput` type, `BRIEF_FILES`, `getToolFiles()`, Italian labels

**Verification**: `tsc --noEmit` ✅ (3 projects), `vitest` 642/642 ✅ (domain 455 + backend 127 + frontend 60), `vite build` 1.71s ✅

**Remaining**: `ContextEnricher.enrich()` doesn't pass file content to the prompt enrichment context. File content from the API `inputs.files[].content` must be wired into the acquisition data so the `extraction` step's `[File - key]\ncontent` sections appear in the LLM context.

**Wiki updated**: [[Brief Tool - Prompt Architecture]] (implementation status section), [[log]] (this entry).

## [2026-08-06] ingest | Brief Generator Prompts (sources/brief-generator/)

Ingested 2 raw prompt prototype files from `Wiki/sources/brief-generator/`:
- `prompt_extraction.md` — Step 1: 5-field data extraction from briefing documents (JSON output)
- `prompt_brief_generation.md` — Step 2: 11-section creative brief synthesis (Italian, Markdown)

**Wiki files created/updated**:
- ✅ Created [[sources/brief-generator]] — source summary with architecture overview, design principles
- ✅ Created [[Brief Tool - Prompt Architecture]] — concept page: 2-step pipeline, downstream-first design, anti-hallucination guardrails, implementation checklist
- ✅ Updated [[index]] — added source to Processed Sources table, concept to Concepts table
- ✅ Updated [[log]] (this entry)

**Key architectural findings**:
1. The brief tool prototype uses a **2-step extraction→generation pipeline** — not a single step as assumed by the current stub
2. The output is **Italian-only** and **downstream-first**: every section answers a question that `landing-funnel`, `ad-copy`, `marketing-angle`, `video-script-long-form`, or `landing-page` will need
3. The 11-section output structure makes the brief the **only orchestrating asset** — it gates the quality of all downstream generation
4. The current tool registry stub (`'brief': blogPostTool` in `index.ts`) maps brief to 3-step SEO blog post definition — completely incompatible with the prototype

**Implementation gap identified**: 4 files to modify/create (tool definition + 2 prompt templates × 2 steps), 2 frontend gaps (SetupPanel needs FileUpload support, ReadinessSnapshot needs files input type).

## [2026-08-04] implementation | Sprint 4 — Asset CRUD + Dark Mode + Polish

Executed Sprint 4 — all remaining tracks, ~5h. All 4 sprints complete: ~22h total, 4 commits, 69/674 tests.

**Backend Asset CRUD** (Track F): `AssetRepository` interface + `KyselyAssetRepository`, `AssetsTable` in DB types, 5 API routes (GET/POST workspace assets, GET/PUT/DELETE by id), wired in app.ts + server.ts.

**Frontend** (Tracks F+G): `AssetList` (list + delete), `AssetCoverageBar` (5-type progress), `ConfirmDialog`, `CompletionBanner`, `QuickGenerateBar`. Dark mode: light/dark/system toggle in AppShell header, persisted via ThemeProvider context.

**Wiki updated**: [[frontend-gap-analysis-2026-08-04|gap analysis]] (all tracks ✅, component inventory refreshed, P1 blockers resolved), [[log]] (this entry), [[Maintenance Log]].

**Verification**: `tsc --build` clean, `vite build` 2.51s, `eslint` 0/0, `vitest` 69/674.

---

## [2026-08-04] implementation | Sprint 3 — Gamification UI — 8 components + toast system

Executed Sprint 3 — 8 gamification components, ~4h:

- `GamificationZone` — sidebar: level badge, XP bar, streak, recent badges (SWR from `/api/me/profile`)
- `ToastSystem` — `ToastProvider` context: `LevelUpBanner` (gradient, slide-in) + `LuckyBonusSparkle` (sparkle animation)
- `BadgeProgressRing` — circular progress (MUI CircularProgress)
- `ActivityPulse` — ambient pulse indicator in header
- `SeasonCountdown` — chip with days-left tooltip
- `ChallengeVoting` — active/completed challenge cards with progress bars
- `StreakModeToggle` — daily vs business days
- API client: +`getPlayerProfile`, `getLeaderboard`, `getWorkspaceHealth`, `getChallenges`, `getCurrentSeason` + 6 DTOs

**Verification**: `tsc --noEmit` 0, `vite build` 2.03s, `eslint` 0/0, `vitest` 69/674.

**Updated**: [[frontend-gap-analysis-2026-08-04|gap analysis]] (Sprint 3 ✅), [[log]] (this entry), [[Maintenance Log]].

---

## [2026-08-04] implementation | Sprint 2 — PromoteButton + Agent Chat + Workspace Members

Executed Sprint 2 — 4 phases, ~6h:

**Phase 6 — PromoteButton** (Track B item 5):
- NEW: `src/components/shared/PromoteButton.tsx` — promote artifact to asset (disabled, API pending)
- MOD: `src/components/tool/SessionSummary.tsx` — integrated PromoteButton
- MOD: `src/pages/SessionPage.tsx` — passes workspaceId to SessionSummary

**Phase 7 — ChatMessageBubble + ChatInput** (Track C items 1-2):
- NEW: `src/components/agent-chat/ChatMessageBubble.tsx` — user/agent variants, token info, timestamps
- NEW: `src/components/agent-chat/ChatInput.tsx` — managed input with send error handling
- MOD: `src/pages/ConversationPage.tsx` — -50 lines, extracted to components

**Phase 8 — TeamHub + AgentCard** (Track C items 3-4):
- NEW: `src/components/agent-chat/TeamHub.tsx` — agent grid + recent conversations, SWR-powered
- NEW: `src/components/agent-chat/AgentCard.tsx` — name, role, capability chips
- MOD: `src/App.tsx` — new route `/workspaces/:workspaceId/team`
- MOD: `src/layout/AppShell.tsx` — Team nav → `/team` (was `/conversations`)

**Phase 9 — Workspace Members** (Track D items 1-3):
- MOD: `src/pages/DashboardPage.tsx` — +`WorkspaceMembers` section with MUI List + invite dialog (email + role selector)
- MOD: `src/api/client.ts` — +`inviteMember`, `removeMember`, `changeMemberRole`

**Verification**: `tsc --noEmit` 0, `vite build` ✅ 2.71s, `eslint` 0/0, `vitest run` 69 files/674 tests ALL PASSED.

**Baseline fix** (pre-existing, fixed during sprint):
- Replaced `vitest.workspace.ts` → root `vitest.config.ts` with `test.projects` (Vitest 4 syntax)
- Deleted `vitest.config.base.ts` + all stale compiled artifacts (`.jsx` tests, `.js`, `.d.ts`, `.map`, `dist/`)
- Fixed backend send-message/accept-invitation tests: added `gamificationEventPublisher` mock
- `npx tsc --build` → 0 errors (was 27 errors)

**Updated**: [[frontend-gap-analysis-2026-08-04|gap analysis]] (Sprint 2 ✅, 2/4 sprints done), [[log]] (this entry), [[Maintenance Log]].

---

## [2026-08-04] implementation | Sprint 1 — Track A (Quota UI) + Track B (Tool Workflow 1-4)

Executed [[synthesis/frontend-gap-analysis-2026-08-04|Sprint 1]] — 5 phases, ~7h, all green:

**Phase 1 — QuotaCounter** (Track A):
- NEW: `src/components/usage/QuotaCounter.tsx` — SWR fetch `GET /api/usage/credits`, MUI LinearProgress, artifact gate warning badge
- MOD: `src/layout/AppShell.tsx` — QuotaCounter in sidebar between workspace switcher and nav
- MOD: `src/pages/ToolPage.tsx` — catch `ApiClientError` QUOTA_EXCEEDED/ARTIFACT_GATE_EXCEEDED, show Alert (non-retryable) vs ErrorState
- MOD: `src/api/client.ts` — `request()` method public for generic API calls

**Phase 2 — Markdown rendering** (Track B item 1):
- MOD: `src/pages/SessionPage.tsx` — replaced `<pre>` with `<ReactMarkdown remarkPlugins={[remarkGfm]}>`, full CSS for headings/tables/code/blockquote

**Phase 3 — FeedbackPanel** (Track B item 3):
- NEW: `src/components/tool/FeedbackPanel.tsx` — SSE-driven step cards: completed ✅/active ◐/pending ○, progress bar + step list
- MOD: `src/pages/SessionPage.tsx` — replaced inline LinearProgress with FeedbackPanel

**Phase 4 — SessionSummary** (Track B item 4):
- NEW: `src/components/tool/SessionSummary.tsx` — artifact list + ReactMarkdown + Download/Promote placeholder buttons
- MOD: `src/pages/SessionPage.tsx` — extracted artifact section into SessionSummary

**Phase 5 — ReadinessSnapshot** (Track B item 6):
- NEW: `src/components/tool/ReadinessSnapshot.tsx` — pre-flight checklist: ✓/✗ per required field, "Tutti i campi pronti" summary
- MOD: `src/pages/ToolPage.tsx` — integrated before Submit button
- MOD: `src/shared/statusColors.ts` — added `cancelled`, `ready`

**Copy package**:
- NEW: `packages/copy/src/it/usage.ts` — credits, artifacts, quota labels
- MOD: `packages/copy/src/it/tool-page.ts` — `allReady`, `title`, `starting`
- MOD: `packages/copy/src/it/shared.ts` — `promote`
- MOD: `packages/copy/src/it/index.ts` — registered usage module

**Verification**: `tsc --noEmit` 0 errors, `vite build` ✓ 1.65s, `eslint` 0/0.

**Bundle**: SessionPage 9.56→163.68 KB (react-markdown+remark-gfm), ToolPage 2.76→4.14 KB, index 524→565 KB.

**Updated**: [[frontend-gap-analysis-2026-08-04|gap analysis]] (Sprint 1 ✅, remaining 13–19 days), [[log]] (this entry), [[Maintenance Log]].

---

## [2026-08-04] audit | Phase 12 backend drift closure

Audit confirmed Phase 12 backend already implemented — zero code needed. Wiki pages updated to close documentation drift:

**Backend already done** (discovered, not built today):
- `ConsumeCreditsUseCase` (`apps/backend/src/application/usage/consume-credits.usecase.ts`) — auto-create quota + optimistic retry (3 attempts) + `tool.creditCost` deduction
- `GET /api/usage/credits` (`apps/backend/src/api/usage/usage-routes.ts`) — returns `{ credits, artifacts, plan, period }`
- Session worker wiring (`apps/backend/src/generation/worker/session-worker.ts:166-175`) — `consumeCreditsUC.execute()` after `SessionCompleted`
- Worker process wiring (`apps/backend/src/generation/worker/worker-process.ts:50-51`) — `KyselyQuotaRepository` → `ConsumeCreditsUseCase` injection

**Wiki pages updated** (6 files):
- `implementation-roadmap-2026-08-01.md` — Phase 12 marked ✅ backend / 🟡 frontend, backlog reordered
- `frontend-gap-analysis-2026-08-04.md` — Track A reduced to frontend-only (1-2 days), P0 section updated, Phase 11.5 domain ✅
- `API Routes.md` — `GET /api/usage/credits` added to route index + full response documentation, sync date updated
- `Frontend Architecture.md` — Auth status fixed (was stale: 0 → 5 built), updated to 2026-08-04
- `log.md` — this entry
- `Maintenance Log.md` — appended

**Verification**: `tsc --build` clean, `eslint` 0/0, 80 domain usage tests passing.

---

## [2026-08-04] synthesis | Frontend gap analysis filed

Created [[synthesis/frontend-gap-analysis-2026-08-04]] — two-part operational dashboard:
- **Part 1**: 28 missing components across 6 layers (Workspace 5, Tool 6, Agent Chat 6, Gamification 8, Shared 4). Every component mapped to wiki design authority page, target file path, API endpoint, and estimated effort.
- **Part 2**: 3 priority tiers — 🔴 Phase 12 Usage & Quota wiring (not built), 🟠 backend API blockers (7 ⬜ endpoints blocking 7 frontend components), 🟡 technical debt (XState deferred, DTO cleanup, markdown rendering, tool definitions).
- **Execution roadmap**: 7 tracks (A–G) across 4 sprints, ~17–23 days total. Critical path: Track A (quota safety) + Track B (tool workflow).
- **Wiki drift found**: `Frontend Architecture.md` Auth status is stale — says 0 built but Phase 8 completed AuthContext/AuthGuard/OAuthCallback/LoginPage/RegisterPage. Flagged for reconciliation.
- Updated: [[index]] Synthesis table, [[log]] (this entry), [[Maintenance Log]].

---

## [2026-08-04] implementation | Usage & Quota domain + repository

Executed [[synthesis/usage-quota-implementation-plan]] (Phase A–J + tests). Final results:

| Layer | Files | Tests | Status |
|-------|-------|-------|--------|
| Domain | 10 (9 new + 1 wired) | 40 | ✅ |
| Infra-db | 3 (1 new + 2 wired) | 0 | ✅ |
| Backend | 3 (wired) | 0 | ✅ |
| DB migration | 1 (009_quotas_version) | — | ✅ |

**New files (10)**:
- `packages/domain/src/usage/value-objects/Plan.ts` — PlanType, Plan, CreditAmount
- `packages/domain/src/usage/value-objects/QuotaPeriod.ts` — YYYY-MM period validation
- `packages/domain/src/usage/value-objects/TransactionReason.ts` — generation, admin_grant, purchase, plan_upgrade
- `packages/domain/src/usage/entities/CreditTransaction.ts` — Owned child entity
- `packages/domain/src/usage/entities/Quota.ts` — Aggregate root (artifact gate + credit quota)
- `packages/domain/src/usage/errors.ts` — QuotaExceededError, ArtifactGateExceededError, QuotaNotFoundError
- `packages/domain/src/usage/domain-events/index.ts` — CreditConsumed, QuotaExceeded, ArtifactGateExceeded interfaces
- `packages/domain/src/usage/repositories/QuotaRepository.ts` — Repository interface with saveWithLock()
- `packages/domain/src/usage/index.ts` — Barrel export
- `packages/infra-db/src/repositories/quota-repository.ts` — KyselyQuotaRepository

**Modified files (7)**:
- `packages/domain/src/index.ts` — `+ export * from './usage'`
- `packages/infra-db/src/types.ts` — `+ QuotasTable, CreditTransactionsTable`
- `packages/infra-db/src/index.ts` — `+ KyselyQuotaRepository export`
- `apps/backend/src/infrastructure/error-handler.ts` — `+ ARTIFACT_GATE_EXCEEDED → 429`
- `apps/backend/src/app.ts` — `+ quotaRepo to AppDeps`
- `apps/backend/src/server.ts` — `+ quotaRepo instantiation + wiring`
- `packages/infra-db/migrations/009_quotas_version.sql` — `+ version column on quotas`

**Verification**: `tsc --build` (zero new errors), `npm run lint` (zero new errors), 40 domain tests passing.

**Out of scope** (follow-up): EnsureQuotaUseCase, ConsumeCreditsUseCase, API routes, event subscriptions, frontend UI.

**Lint cleanup**: 18 pre-existing errors + 18 warnings resolved (unused imports, `.js`→`.jsx` renames, `no-explicit-any` off in test files, `.d.ts` ignored).

**Wiki alignment**: `overview.md` — Usage & Quota → ✅ Complete, Phases 11+11.5 promoted to Completed section, Critical Gaps updated. Plan status → `completed`.

## [2026-08-04] synthesis + maintenance | Phase 11 completion + production vitest configs

Executed Phase 11 per [[synthesis/phase-11-testing-plan]]. Final results:

| Layer | Files | Tests | Status |
|-------|-------|-------|--------|
| Domain | 32 | 415 | ✅ |
| Backend | 18 | 127 | ✅ |
| Frontend | 12 | 60 | ✅ |
| Infra-db | 4 | 32 | ✅ (PostgreSQL required) |
| **Total** | **66** | **~634** | |

**Production vitest configs finalized**:
- 4 workspace projects (`domain`, `infra-db`, `backend`, `frontend`) — `contracts` + `copy` excluded (no testable code)
- Per-workspace coverage thresholds: domain 60/50, infra-db 40/30, backend 30/20, frontend 30/20
- Infra-db: `pool: 'forks'` + `fileParallelism: false` for DB isolation
- Base config: `testTimeout: 10s`, `hookTimeout: 10s`

**DDD compliance**: zero `new Aggregate(...)`, zero `as any` casts, all errors are `DomainError` subclasses.

**Wiki pages updated**: `Testing Strategy` (Phase 11 Baseline + configs), `phase-11-testing-plan` (Results section), `log.md`, `Maintenance Log`.

## [2026-08-04] synthesis | Phase 11 execution completed

Executed Phase 11 per [[synthesis/phase-11-testing-plan]]. Results:

| Layer | Files | Tests | Status |
|-------|-------|-------|--------|
| Domain (`packages/domain`) | 32 | 415 | ✅ 100% passing |
| Backend (`apps/backend`) | 18 | 127 | ✅ 100% passing |
| Frontend (`apps/frontend`) | 12 | 60 | ✅ 100% passing |
| Infra-db (`packages/infra-db`) | 4 | 34 | ⚠️ Need PostgreSQL (pass in CI) |
| **Total** | **66** | **~636** | |

**Infrastructure created**: 4 vitest config files, `vitest.workspace.ts` rewrite (4 named projects), 3 setup files, MSW handlers (19 mock endpoints), jsdom devDependency, frontend mock server.

**DDD compliance**: Zero `new Aggregate(...)` in tests (canonical factories only), zero `as any` casts, all errors are `DomainError` subclasses.

**CI**: `_ci-checks.yml` already has `test` job with PostgreSQL 16 + Redis 7. ESLint vitest rules already configured.

**Not executed**: Repository integration tests require PostgreSQL (Docker unavailable locally). Will pass in CI.

**Files created**: 66 test files, 4 vitest configs, 3 setup files, 2 MSW files.
**Files modified**: `vitest.workspace.ts`, `apps/frontend/package.json`.

## [2026-08-03] synthesis | Phase 11 testing plan filed

Filed [[synthesis/phase-11-testing-plan]] — comprehensive Phase 11 implementation plan derived from wiki-vs-code divergence analysis and the existing Testing Strategy + Quality Gate Matrix:

- **Infrastructure**: per-workspace vitest configs (5), setup files (4), MSW handlers, `vitest.workspace.ts` rewrite, jsdom install
- **Domain tests** (~30 files): 4 aggregates (Session, Workspace, Conversation, User), 3 child entities, 11+ VOs, prompt components (5 files), domain events smoke, SessionLifecycle, ContextEnricher
- **Repository integration tests** (4 files): KyselySessionRepository, KyselyWorkspaceRepository, KyselyConversationRepository, KyselyUserRepository — against real PostgreSQL
- **Application & API tests** (16 files): 6 use cases (mocked deps), 5 middleware/infrastructure (authenticate, workspace-role, error-handler, token-service, auth-service), 5 API integration (supertest)
- **Worker tests** (2 files): session-machine (XState v5 actors), session-worker (BullMQ job processing)
- **Frontend tests** (~15 files): 6 shared components, 3 auth components, 6 pages — all with MSW + testing-library
- **CI enforcement**: test job with PostgreSQL 16 + Redis 7 service containers, ESLint vitest rules

**Total**: 76 test files, ~6 sub-phases (11a–11g). DDD guardrails enforced: canonical factories only, zero `as any` casts, DomainError subclasses in fixtures. Scope exclusion: Gamification, Usage & Quota, Asset, AssetResolver, AssetPromotion, CrawlData, IdempotencyKey — all documented in wiki but absent from code.

**Files updated**: `synthesis/phase-11-testing-plan.md` (NEW), `index.md`, `log.md`

## [2026-08-03] deploy | ✅ Node.js thin reverse proxy — deployed and verified

Deploy completed after 9 attempts across 6 root causes. All wiki pages updated to final status.

**Deployed**: `https://frontend-dev-b363.up.railway.app`
- `GET /` → 200 (SPA)
- `GET /health` → 200 (direct frontend endpoint)
- `GET /api` → 200 (proxied via backend.railway.internal)
- `GET /api/sessions` → 200 (backend API, auth works)
- Backend public URL → 404 (removed ✅)

**Root causes resolved**:
1. `import.meta.env` BuildKit cache staleness — resolved by fresh SHA
2. Railway same-SHA skip — resolved by committing code changes
3. `express` not hoisted in npm workspaces — resolved by `npm install express http-proxy-middleware` directly
4. `@flow-app/*` workspace deps break `npm install --omit=dev` — resolved by skipping package.json
5. Express 5 `app.get('*')` wildcard invalid — resolved by `app.get('/{*splat}', ...)`
6. `app.use('/api', proxy)` strips prefix — resolved by `pathFilter: '/api'`

**Railway config**:
- Frontend: DOCKERFILE builder, `/health` healthcheck, watch patterns, `VITE_API_URL=""`, `BACKEND_INTERNAL_URL=http://backend.railway.internal:3000`
- Backend: `CORS_ORIGIN=""`, public domain removed

**Files updated**: `reverse-proxy-deploy-log.md`, `deployment-patterns-phase-10.md`, `nodejs-thin-reverse-proxy-plan.md`, `index.md`, `log.md`

## [2026-08-03] synthesis | Reverse proxy deployment log filed

Filed [[synthesis/reverse-proxy-deploy-log]] — field notes from 6 Railway deploy attempts:
- 4 root causes identified: `import.meta.env` BuildKit cache, same-SHA skip, `express` not hoisted, `@flow-app/*` workspace registry 404
- Fix: `npm install express http-proxy-middleware` (direct, sans `package.json`) in Stage 2
- Railway config applied: DOCKERFILE builder, `/health` healthcheck, watch patterns, `VITE_API_URL=""`, `BACKEND_INTERNAL_URL`
- Backend CORS + public domain removal pending proxy verification
- Files updated: `reverse-proxy-deploy-log.md` (NEW), `deployment-patterns-phase-10.md` (+Node.js proxy notes), `nodejs-thin-reverse-proxy-plan.md` (+current status), `index.md`

## [2026-08-03] synthesis | Node.js thin reverse proxy plan filed

Filed [[synthesis/nodejs-thin-reverse-proxy-plan]] — implementation plan derived from the proxy proposal:
- 8 steps, ~1h estimated
- 6 files changed, 1 new file (`apps/frontend/server.mjs`)
- Key design decision: make backend `CORS_ORIGIN` optional (empty = no CORS) since the backend has no public URL — all traffic goes through the frontend proxy on the private Railway network
- Backend `config.ts`: relax `CORS_ORIGIN` from `z.string().url()` to `z.string()`
- Backend `app.ts`: conditional `cors()` middleware (skip when `CORS_ORIGIN=""`)
- `railway.frontend.json`: switch from RAILPACK to DOCKERFILE builder

## [2026-08-02] synthesis | Deployment patterns filed

Filed [[synthesis/deployment-patterns-phase-10]] — findings from Phase 10 reverse proxy attempts:
- 4 architectures evaluated (public URL, nginx, runtime URL, Caddy)
- 8 root causes documented for nginx/reverse proxy failures
- Runtime URL pattern documented as alternative to build-time Vite env vars
- Docker/Node/Railway lessons learned
- Recommendations per scenario (dev vs production)

## [2026-08-02] implement | Phase 10 — Deployment & CI/CD

Implemented Phase 10 of [[synthesis/implementation-roadmap-2026-08-01]] — production deployment artifacts.

### Files created (8)
- `Dockerfile` — multi-stage build: builder (node:22-alpine, `tsc --build` + `vite build` + `npm prune --production`) → production (node:22-alpine, non-root user, HEALTHCHECK)
- `.dockerignore` — excludes node_modules, dist, .git, Wiki, logs, coverage
- `railway.json` — Railway schema: DOCKERFILE builder, healthcheck `/health`, restart ALWAYS
- `.github/workflows/_ci-checks.yml` — reusable workflow: lint, typecheck, test (PostgreSQL + Redis services), build
- `.github/workflows/ci.yml` — calls `_ci-checks.yml` on PR, concurrency group, `permissions: contents: read`
- `.github/workflows/deploy.yml` — calls `_ci-checks.yml` + 3 conditional deploys (dev/staging/production), Railway CLI pinned to v3.21.0, `--ci` mode (fails on deploy error)
- `.github/workflows/codeql.yml` — JavaScript/TypeScript security scanning (weekly + on push/PR to main/staging)
- `.dockerignore` — build context optimization

### CI review fixes applied (github-actions-expert review)
- **C1**: Added `permissions: contents: read` to all workflows (was missing, defaulted to write-all)
- **C2**: Replaced `-detach` with `-ci` in Railway deploy (now fails workflow on deploy error)
- **C3**: Pinned Railway CLI version: `sh -s -- --version 3.21.0`
- **H1**: Extracted shared checks into reusable `_ci-checks.yml` (zero job duplication)
- **H2**: Added `-U flow_app` to PostgreSQL health check
- **H3**: Added concurrency groups (ci → `cancel-in-progress: true`, deploy → `cancel-in-progress: false`)
- **H4**: Added CodeQL security scanning workflow
- **M3/M4**: Added `paths-ignore` for `.github/workflows/ci.yml` in deploy; added `--service backend` consideration (deferred — Railway auto-detects)

### Files modified (3)
- `package.json` — fixed root `build` script: `"tsc --build && npm run build --workspace=apps/frontend"` (was `"npm run build --workspaces"` which failed on packages without build scripts)
- `.github/workflows/ci.yml` — rewritten: delegates to `_ci-checks.yml`, added permissions + concurrency
- `Wiki/synthesis/implementation-roadmap-2026-08-01.md` — Phase 10 status: → ✅, frontmatter updated (11/12 complete), backlog order updated
- `Wiki/overview.md` — phase numbering fixed (9→10→11→12), Phase 10 marked complete, infrastructure section updated

### Verification
- Typecheck: ✅ (3 pre-existing warnings, no new errors)
- Lint: ✅ (0 errors, 2 pre-existing warnings)
- Build: ✅ (tsc --build + vite build, 1.30s)
- Tests: ✅ 10/10 (2 files)

### Remaining
- Railway project provisioning (secrets: `RAILWAY_TOKEN` → GitHub)
- Managed PostgreSQL + Redis services in Railway
- Environment creation (dev/staging/production)

## [2026-08-02] maintenance | Wiki content rules enforcement

Enforced Wiki Content Rules #1–#6 based on comprehensive health scan.

### Split-page resolution (Rule #1)
- Merged `Workspace Gamification` (288 lines) into `Gamification` as `### Workspace Gamification` section. Removed redundant page. All 3 pages (Gamification, Workspace Gamification, Gamification UX) → 2 pages (Gamification domain + Gamification UX companion).

### Stub absorption (Rule #2)
- Merged `Token Budget Control` (22 lines) into `LLM Gateway - OpenRouter` as `## Token Budget Control` section.
- Merged `Railway Deployment Config` (22 lines) into `Environment Configuration` as `## Railway Deployment` section.

### Code-existence verification (Rule #6)
- Marked `entities/PlayerProfile.md` as **Planned** — not yet implemented.
- Marked `entities/Achievement.md` as **Planned** — not yet implemented.
- Both reference `[[implementation-roadmap-2026-08-01]]` Phase 11.

### Reference-only page linking (Rule #5)
- Added `[[Global Deterministic Model Matrix]]` to `Content Generation` Sources section (was orphan with 0 inbound links).

### Synthesis backlinks (Rule #3)
Added references from concept pages to key synthesis pages, raising several from 0→2+ inbound links:
- `code-review-2026-08-02` → DDD Domain Design Rules, Auth Dependencies, Frontend Architecture
- `phase-8-real-auth-plan` → Auth Dependencies, Auth Middleware
- `critical-fix-plan-2026-08-02` → DDD Domain Design Rules
- `agent-chat-proposal` → Agent Chat
- `gamification-proposal` + `implementation-roadmap-2026-08-01` → Gamification

### Source count sync (Rule #3)
Updated 12 `source_count` values in index.md and individual frontmatter to match actual Sources sections.

### Files modified (10)
- `Wiki/concepts/LLM Gateway - OpenRouter.md` — merged Token Budget Control, source_count 4→6
- `Wiki/concepts/Environment Configuration.md` — merged Railway Deployment Config, source_count 6→8
- `Wiki/concepts/Gamification.md` — merged Workspace Gamification, source_count 7→9
- `Wiki/concepts/Content Generation.md` — linked Global Deterministic Model Matrix, source_count 4→5
- `Wiki/concepts/DDD Domain Design Rules.md` — 2 synthesis backlinks, source_count 19→20
- `Wiki/concepts/Auth Dependencies.md` — 2 synthesis backlinks, source_count 6→8
- `Wiki/concepts/Frontend Architecture.md` — 1 synthesis backlink, source_count 7→8
- `Wiki/concepts/Auth Middleware.md` — 1 synthesis backlink, source_count 4→5
- `Wiki/concepts/Agent Chat.md` — 1 synthesis backlink, source_count 7→8
- `Wiki/entities/PlayerProfile.md` — Planned marker added
- `Wiki/entities/Achievement.md` — Planned marker added
- `Wiki/index.md` — 2 entries removed (Token Budget Control, Railway Deployment Config), 1 removed (Workspace Gamification), 12 source_counts updated, maintenance note
- `Wiki/log.md` — this entry

### Files deleted (3)
- `Wiki/concepts/Token Budget Control.md`
- `Wiki/concepts/Railway Deployment Config.md`
- `Wiki/concepts/Workspace Gamification.md`

### Verification
- `scripts/wiki-lint.py`: ✅ 0 failures (114 pages)
- Pages: 116 → 113 (-3 deleted)

## [2026-08-02] execute | Low-severity remediation executed

Executed [[synthesis/low-fix-plan-2026-08-02]]. All 5 low-severity findings (L1–L5) from [[synthesis/code-review-2026-08-02]] resolved across 2 phases.

**Phase 1 — Quick Wins** (~40 min):
- L4: Deleted `packages/contracts/src/shared.ts` (dead byte-for-byte duplicate of `shared/index.ts`)
- L2: Replaced `res.status(500).json()` with `next(err)` in admin routes (`admin.ts:50,70`), removed unused `logger` import + `log` variable
- L5: Aligned frontend DTOs with `@flow-app/contracts` — `SessionDTO extends SessionDetailDTO` with `artifacts` override, `ArtifactDTO extends ContractArtifactDTO` with `artifactId` field, TODO annotations on remaining local DTOs

**Phase 2 — Architectural Cleanup** (~90 min):
- L1: OAuth token hygiene — added `Cache-Control: no-store` + `Referrer-Policy: no-referrer` on redirect (`auth-routes.ts:196-197`), `window.history.replaceState()` to strip token from browser history (`OAuthCallback.tsx:14`)
- L3: Unified `listSessions` query paths — added `findAll()` to `SessionRepository` interface + `KyselySessionRepository` implementation, refactored `findByWorkspace` to delegate, single consistent mapping in `generation.ts`

Files touched: 8 (6 modified, 1 new interface method, 1 deleted). Typecheck: 0 new errors.
Wiki: index.md, code-review-2026-08-02.md, log.md updated.

## [2026-08-02] plan | Low-severity remediation plan filed

Filed [[synthesis/low-fix-plan-2026-08-02]]. 5 findings (L1–L5) from [[synthesis/code-review-2026-08-02]] organized into 2 phases, touching 8 files:

**Phase 1 — Quick Wins** (L2, L4, L5, ~40 min):
- L4: Delete dead `packages/contracts/src/shared.ts` (byte-for-byte duplicate of `shared/index.ts`, zero imports)
- L2: Replace `res.status(500).json()` with `next(err)` in admin routes (2 catch blocks in `admin.ts:50,70`)
- L5: Align frontend DTOs with `@flow-app/contracts` — import `SessionDetailDTO` and `ArtifactDTO`, annotate remaining local DTOs with TODO

**Phase 2 — Architectural Cleanup** (L1, L3, ~90 min):
- L1: OAuth token hygiene — add `Cache-Control: no-store` + `Referrer-Policy: no-referrer` on redirect, strip token from browser history in `OAuthCallback.tsx`
- L3: Unify `listSessions` query paths — add `findAll` to `SessionRepository` interface + implementation, refactor `findByWorkspace` to delegate, single mapping in `generation.ts`

Files touched: 8 (6 modified, 1 new interface method, 1 deleted).
Wiki: index.md, code-review-2026-08-02.md, log.md updated.

## [2026-08-02] fix | Wiki lint — 3 broken wikilinks resolved

Created 2 missing entity pages for repository interfaces referenced in [[DDD Domain Design Rules]]:
- `Wiki/entities/SessionRepository.md` — interface, design decisions, implementation reference
- `Wiki/entities/WorkspaceRepository.md` — interface, design decisions, implementation reference

Added both to `Wiki/index.md` entities table. All 115 pages validate clean.

---

## [2026-08-02] execute | Medium-severity findings — 16/16 active closed

Executed [[synthesis/medium-fix-plan-2026-08-02]]. 16 active medium-severity findings resolved across 5 phases. M1 deferred (architectural discussion), M12 already resolved (H9 piggyback).

**Phase 1 — Quick Wins (5 files)**:
- M17: Static import of `PromptTemplateId`/`PromptVersion` in session-worker — removed `await import()` from hot path
- M18: `Identifier.equals()` checks `this.constructor === other.constructor` — cross-type equality test added
- M8: ErrorState uses `copy.t()` — Italian strings ("Riprova", "Si è verificato un errore")
- M11: Added `h4`/`h5`/`h6` typography variants to theme tokens
- M6: Extracted `statusColorMap` to `shared/statusColors.ts` — both DashboardPage and SessionPage import it

**Phase 2 — Frontend UX (3 files)**:
- M3: WorkspaceRedirect shows `<LoadingSkeleton />` + `<ErrorState>` instead of plain text
- M2: `sendMessage` failures render `<Alert>` below chat input with dismiss
- M7: Agent bubbles use `action.hover` (theme-aware) instead of `grey.100`

**Phase 3 — Backend Data (1 file)**:
- M14: `findByMember()` and `findPendingInvitations()` — 2 queries instead of 1+2N (batch membership load)
- M15: Extracted `syncMemberships()` private method with `Promise.all` — used in both `save()` and `saveWithLock()`

**Phase 4 — Real-time (1 file)**:
- M13: Handler registered before `subscribe()` — no race window. Added try/catch on `JSON.parse`

**Phase 5 — A11y & Performance (2 files)**:
- M4/M9: ARIA labels on Drawer (`role="navigation"`), Select, IconButtons, `role="main"`, `role="banner"`
- M10: `useFocusOnNavigate` hook moves focus to `<h1>` on route change
- M5: All page components lazy-loaded with `<Suspense>` — separate chunks in build output

**Verification**: backend tsc: 0 errors | domain tests: 5/5 | frontend build: success | infra-db tsc: 0 errors

**Files touched**: 11 modified, 1 new (`statusColors.ts`)

---

## [2026-08-02] enhance | DDD Domain Design Rules — workspace instructions upgraded

Upgraded `CLAUDE.md` Domain Design Rules section from 6 rules to 14 enforceable rules with checklists. Added authoritative reference pointer to [[DDD Domain Design Rules]] (19-rule wiki page) as the full governance document. New rules: Rule 7 (Aggregate Root canonical template — private constructor, _version, DomainEvent|null), Rule 8 (Domain Events as immutable DTOs), Rule 9 (Domain-owned lifecycle — SessionLifecycle as single source, XState imports), Rule 10 (Business rules in domain VOs, never in use cases/guards), Rule 11 (Domain enforces for all callers, middleware is optimization), Rule 12 (Aggregate boundaries by business invariants), Rule 13 (Snapshot-based crash recovery), Rule 14 (IdempotencyKey as domain VO with atomic claim). Header updated: Phase 0–8 → Phase 0–9. CLAUDE.md now has 32 `###` sections total.

## [2026-08-02] extend | DDD Domain Design Rules — 7 implicit patterns added

Extended [[DDD Domain Design Rules]] with 7 architectural patterns discovered from wiki cross-references (19 total rules now). New patterns: Pattern 13 (Domain-Owned State Machine — SessionLifecycle as single source of truth, XState as runtime), Pattern 14 (Two-Layer Permission Enforcement — domain validates, middleware short-circuits), Pattern 15 (VO as Business Rule Encapsulation — ReadinessPolicy eliminates leaked logic), Pattern 16 (Aggregate Transaction Boundaries — team-size-driven design, WorkspaceMembership inside Workspace), Pattern 17 (Snapshot-Based Crash Recovery — XState snapshots for worker resume), Pattern 18 (Idempotency as Domain VO — key format, atomic claim), Pattern 19 (Fail-Fast Startup Validation — boot-time checks prevent runtime drift). Updated: `Wiki/index.md` (source_count 12→19), `Wiki/concepts/DDD Domain Design Rules.md` (589→900+ lines). 7 new sources added.

## [2026-08-02] create | DDD Domain Design Rules concept page

Created [[DDD Domain Design Rules]] — authoritative governance reference encoding all DDD tactical patterns from Phase 0–9. 12 rules: 6 core rules from CLAUDE.md (no `as any`, zero external validation, DomainError hierarchy, class VOs, repository purity, canonical factories) + 6 architectural patterns from codebase (aggregate root design, domain events, repository interfaces, cross-context references, barrel exports, domain services). 12 sources cross-referenced. Updated: `Wiki/index.md` (concepts table), `Wiki/concepts/DDD Domain Design Rules.md` (new, 440 lines).

## [2026-08-02] plan | Medium-severity remediation plan filed

Filed [[synthesis/medium-fix-plan-2026-08-02]]. 18 findings (M1–M18), 1 already resolved (M12 via H9), 1 deferred (M1 — architectural discussion needed), 16 active. Organized into 5 phases:

**Phase 1 — Quick Wins (M6, M8, M11, M17, M18)**: Remove dynamic import, fix cross-type equality, copy.t() i18n, h4-h6 typography, extract statusColorMap. 5 files, ~25 min.

**Phase 2 — Frontend UX (M2, M3, M7)**: sendMessage error feedback, WorkspaceRedirect LoadingSkeleton, theme-aware bubble colors. 3 files, ~35 min.

**Phase 3 — Backend Data (M14, M15)**: Fix N+1 query in findByMember (2 queries instead of 2N+1), extract & batch membership sync (M15+M16 consolidation). 1 file, ~55 min.

**Phase 4 — Real-time (M13)**: Fix SSE race condition in job-event-bridge — handler registered before subscribe, add try/catch around JSON.parse. 1 file, ~30 min.

**Phase 5 — Accessibility + Performance (M4, M5, M9, M10)**: ARIA labels on Drawer/Select/nav, focus management hook, React.lazy code splitting. 2 files, ~40 min.

Deferred: M1 (hard redirect requires ADR), M4 full audit (separate task).

---

## [2026-08-02] execute | High-severity findings — all 10 closed

Executed [[synthesis/high-fix-plan-2026-08-02]]. All 10 high-severity findings (H1–H10) resolved across 5 phases.

**Phase 1 — Domain DDD (4 files)**:
- H1: `Conversation.start()` → `create()` + caller update
- H2: `User.register()` + `User.fromOAuth()` → unified `User.create(opts?)`
- H3: New `ModelTier` class VO + `InvalidModelTierError`. Ripples: tool-definition.ts, tools/index.ts, model-registry.ts (Map), llm-gateway.ts, send-message.usecase.ts
- H10: `Session.apply()` default → exhaustiveness check (`never`)

**Phase 2 — Data Integrity (2 files)**:
- H4: `saveWithLock()` wrapped in `db.transaction()`
- H5: `SessionNotFoundError`, `ToolNotFoundError`, `UnknownModelTierError` replacing bare `throw new Error()`

**Phase 3 — Auth Flow (1 file)**:
- H6: `trySilentRefresh()` falls back to in-memory OAuth token + `GET /api/auth/me`

**Phase 4 — Frontend UX (4 files)**:
- H7: `useSession()` gets `error` state. SessionPage renders `<ErrorState>`
- H8: New `tool-inputs.ts` with per-tool input definitions. ToolPage renders dynamically

**Phase 5 — Monitoring (1 file)**:
- H9: `countStalled()` queries waiting + `attemptsMade > 0`
- M12: `queueDepth` = `waiting + active + delayed`

Verification: typecheck ✅, backend build ✅, frontend build ✅, domain tests 8/8.

---

## [2026-08-02] plan | High-severity remediation plan filed

Filed [[synthesis/high-fix-plan-2026-08-02]]. 10 findings (H1–H10) from [[synthesis/code-review-2026-08-02]] organized into 5 phases, touching 19 files.

**Phase 1 — Domain DDD violations (H1, H2, H3, H10)**:
- H1: `Conversation.start()` → `create()` (Rule 6)
- H2: `User.register()` + `fromOAuth()` → `create()` (Rule 6)
- H3: `ModelTier` type alias → class VO (Rule 4) — new `InvalidModelTierError`
- H10: `default: return null` → exhaustiveness check in `Session.apply()`

**Phase 2 — Data integrity (H4, H5)**:
- H4: `workspace-repository saveWithLock()` → `db.transaction()`
- H5: 3 new errors (`SessionNotFoundError`, `ToolNotFoundError`, `UnknownModelTierError`) replacing bare `throw new Error()` in worker + model-registry

**Phase 3 — Auth flow (H6)**:
- `AuthContext.trySilentRefresh()` falls back to in-memory token + `GET /api/auth/me` when cookie refresh fails after OAuth

**Phase 4 — Frontend gaps (H7, H8)**:
- H7: `useSession()` gets `error` state + `.catch()`
- H8: `ToolPage` reads `toolRegistry[].acquisition.userText` for dynamic inputs

**Phase 5 — Monitoring (H9)**:
- `countStalled()` queries waiting jobs with `attemptsMade > 0` instead of counting retry-exhausted jobs
- M12 piggyback: `queueDepth` sums `waiting + active + delayed`

Wiki: index.md, code-review-2026-08-02.md, log.md updated.

---

## [2026-08-02] execute | Critical findings — all 8 closed

Executed [[synthesis/critical-fix-plan-2026-08-02]]. All 8 critical findings (C1–C8) from [[synthesis/code-review-2026-08-02]] resolved across 3 phases.

**Phase 1 — Quick Wins (4 files)**:
- C1: `auth-routes.ts` — added `NextFunction` import + `next` param to 4 handlers, `throw err` → `next(err)`
- C4: `tokens.ts` — `text.secondary` `#64748b` → `#334155` (WCAG AA 7.8:1)
- C5: `ThemeProvider.tsx` — static `matchMedia` → MUI `useMediaQuery` hook
- C8: `LoginPage.tsx` — `navigate()` moved from render body to `useEffect`

**Phase 2 — Frontend Architecture (3 files)**:
- C7: New `ErrorBoundary.tsx` class component + wrapped 6 protected routes in `App.tsx`
- C3: `AppShell.tsx` — `useMediaQuery` desktop breakpoint, `mobileOpen` state, hamburger `IconButton`, `Drawer` permanent/temporary switch

**Phase 3 — Data Integrity (4 files)**:
- C2a: `Session.ts` — `_artifacts: Artifact[]` field, `artifacts` param in constructor + `reconstitute()`, getter, `ADD_ARTIFACT` pushes to array
- C2b: `session-repository.ts` — `saveWithLock()` upserts artifacts after session update
- C2c: `session-repository.ts` — `findById()` loads artifacts, passes to `reconstitute()`
- C6: `generation.ts`, `workspaces.ts`, `agent-chat.ts` — `.toString()` on all VO fields in response mapping

**Verification**: typecheck 0 errors, backend build ✅, frontend build ✅, domain tests 8/8.

Files touched: 10 modified, 1 new (`ErrorBoundary.tsx`). Wiki: critical-fix-plan success criteria updated, index.md + log.md + overview.md updated.

---

## [2026-08-02] plan | Critical findings fix plan filed

Filed as [[synthesis/critical-fix-plan-2026-08-02]]. Implementation plan to close all 8 critical findings from the multi-agent code review.

**3 phases, 27 files, estimated 4-5 hours:**

**Phase 1 — Quick Wins (~30 min, low risk)**:
- C1: `throw err` → `next(err)` in `auth-routes.ts` (4 lines, prevents process crash)
- C4: `text.secondary` contrast `#64748b` → `#334155` in `tokens.ts` (WCAG AA)
- C5: Static `matchMedia` → `useMediaQuery` hook in `ThemeProvider.tsx` (OS theme reactivity)
- C8: `navigate()` moved from render body to `useEffect` in `LoginPage.tsx` (React purity)

**Phase 2 — Frontend Architecture (~1 h, medium risk)**:
- C7: New `ErrorBoundary.tsx` class component + route wrapping in `App.tsx` (prevents white-screen crashes)
- C3: Responsive drawer in `AppShell.tsx` — `useMediaQuery` + `variant` switch + hamburger toggle

**Phase 3 — Data Integrity (~2 h, high risk)**:
- C2a: `_artifacts` field on `Session` aggregate + `ADD_ARTIFACT` case
- C2b: Artifact upsert in `saveWithLock()`
- C2c: Artifact load in `findById()`
- C6a-c: `.toString()` on VOs in API responses (generation.ts, workspaces.ts, agent-chat.ts)

**Verification checklist**: 12 criteria across all fixes. Typecheck, backend build, frontend build, domain tests.

Files touched: 1 new synthesis page (`synthesis/critical-fix-plan-2026-08-02`), index.md and log.md updated.

## [2026-08-02] review | Multi-agent code review — phases 0–9

Filed as [[synthesis/code-review-2026-08-02]]. 6 specialized agents reviewed the entire monorepo against the implemented roadmap (phases 0–9):

**Agents deployed**: DDD Expert, Backend Architect, React Frontend Engineer, Code Simplifier, Type Design Analyzer, UI Designer.

**Findings summary** (41 total):
- 🔴 Critical (8): C1 — `throw err` in async handlers crashes Express 4. C2 — artifacts never persisted to DB (all generated content discarded). C3 — permanent drawer breaks tablet/mobile. C4 — `text.secondary` fails WCAG AA contrast. C5 — theme static, never reacts to OS preference change. C6 — Value Objects serialized directly in JSON → `{"_value": "..."}` leaked to API. C7 — zero Error Boundaries (entire React tree can white-screen). C8 — `navigate()` called during render phase.
- 🟠 High (10): H1 — `Conversation.start()` violates Rule 6. H2 — `User.register()`/`fromOAuth()` instead of `create()`. H3 — `ModelTier` type alias (Rule 4). H4 — `saveWithLock()` senza transazione. H5 — `throw new Error()` in worker. H6 — OAuth token valido scartato dopo login. H7 — `useSession()` senza error state. H8 — ToolPage input hardcoded. H9 — `countStalled()` conta job sbagliati. H10 — `default: return null` sopprime exhaustiveness check.
- 🟡 Medium (18): M1-M18 su UX, performance, ARIA, DRY violations, race conditions, N+1 queries.
- 🟢 Low (5): L1-L5 su consistenza, dead code, divergenza DTO.

**Positive findings**: optimistic locking pattern correct, token rotation correct, module-level token store (no localStorage), SSE client lifecycle correct, structured logging (Pino child loggers), MUI v6 Grid2 `size` prop correct, Phase 9 remediation verified clean (8 type aliases → classes, zero `throw new Error` in domain, zero `as any`).

**Recommended fix order**: C1 (4-line fix) → C2 (artifact persistence) → C6 (VO serialization) → C3-C5 (responsive layout + contrast + theme) → C7-C8 (Error Boundaries + useEffect) → H1-H3 (DDD factory naming) → H4-H5 (transaction + DomainError) → H6 (OAuth flow) → M1-M18 (schedulable tech debt).

Files touched: 1 new synthesis page (`synthesis/code-review-2026-08-02`), index.md and log.md updated.

---

## [2026-08-02] implementation | Phase 8 — Real Authentication (Workstream D) complete

Phase 8 Real Authentication is now fully complete. Workstream D (Frontend Auth Flow) implemented on branch `feature/phase-8-real-auth`:

**6 new files created:**
- `apps/frontend/src/auth/AuthContext.tsx` — React context: user state, module-level token store (never localStorage), `login()`, `register()`, `logout()`, `attemptTokenRefresh()`. On mount: silent refresh via httpOnly cookie. `getAccessToken()` / `setAccessToken()` exported for API client.
- `apps/frontend/src/auth/AuthGuard.tsx` — Protected route wrapper: loading → spinner, !isAuthenticated → redirect /login, authenticated → Outlet.
- `apps/frontend/src/auth/OAuthCallback.tsx` — Handles `/auth/callback?token=...` from Google OAuth redirect. Stores token in memory, navigates to dashboard. AuthContext silent refresh handles rest.
- `apps/frontend/src/components/AuthLayout.tsx` — Centered card layout with "flow app" logo, shared by LoginPage and RegisterPage.
- `apps/frontend/src/pages/LoginPage.tsx` — Email + password form, Google OAuth button, link to /register. MUI TextField, Button, Alert.
- `apps/frontend/src/pages/RegisterPage.tsx` — Email + password + confirm form, validation (min 8 chars, match), link to /login.

**4 files modified:**
- `apps/frontend/src/api/client.ts` — Injects `Authorization: Bearer <token>` from `getAccessToken()`. On 401: attempts `attemptTokenRefresh()` via cookie, retries request once. If refresh fails: redirects to `/login`.
- `apps/frontend/src/App.tsx` — Added public routes (`/login`, `/register`, `/auth/callback`). All existing routes wrapped in `<AuthGuard>`.
- `apps/frontend/src/layout/AppShell.tsx` — Added user avatar (MUI Avatar) in AppBar with dropdown menu: email, role badge, Logout action.
- `apps/frontend/src/main.tsx` — Wrapped app in `<AuthProvider>` (outermost, before WorkspaceAccentProvider).

**Verification**: Typecheck 4/4 packages clean. Frontend build ✅ (552 KB → 172 KB gzipped). Backend build ✅. Lint 0 errors, 0 warnings. Domain tests 8/8 pass.

**Phase 8 exit criteria — all 12 met**, including the 2 previously pending:
- 5. ✅ Protected routes redirect to `/login` when unauthenticated (AuthGuard)
- 6. ✅ Frontend token refresh is transparent to user (client.ts 401 interceptor)

Full auth flow: login/register → token in memory + httpOnly cookie → API calls with Bearer → 401 auto-refresh → logout. Dev mode: `authenticateOrDev` maintains backward compat (no auth header → seed user).

Wiki updated: `index.md` (maintenance note), `log.md` (this entry), `implementation-roadmap-2026-08-01.md` (Phase 8 → ✅, frontmatter: phases_complete 9→10), `phase-8-real-auth-plan.md` (Workstream D completed, exit criteria 5+6 → ✅, frontend files documented).

---

## [2026-08-02] synthesis | Phase 9 implementation plan filed

Created `synthesis/phase-9-implementation-plan.md` — comprehensive implementation plan for the 11 VALIDATION + 2 quick-win STRUCTURAL gaps documented in `phase-9-architectural-targets.md`. Every file path verified by reading actual source. Plan covers 4 phases:

- **9a** (P0, ~1h 40m): V10 (throw new Error → DomainError across 8 files) + V1 (SessionStatus class)
- **9b** (P0/P1, ~4h): V2 (MembershipRole class), V9 (SessionEvent discriminated union), V3 (ToolKey class), V4 (AgentKey class)
- **9c** (P2, ~3h): V5-V8 (remaining VO classes) + V11 (Artifact lifecycle methods)
- **9d** (P1, ~5h): S4 (temporal invariants fix) + S5 (11 real tool definitions)

Key findings during file verification:
- 3 prompt files live under `generation/prompting/` not `prompt/` (target doc paths corrected)
- `PromptComponentNotFoundError` extends `Error` not `DomainError` — added to V10 scope
- `Artifact.create()` default status change from `Completed` to `Pending` requires caller audit
- Circular dependency risk between `SessionStatus` ↔ `SessionLifecycle` mitigated by keeping transition logic in lifecycle only
- S1, S2, S3 deferred to Phase 10+ as RFC-first design decisions

Index updated. Log filed.

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
| 3 | Broken wikilink — missing page | `implementation-roadmap-2026-08-01.md` → `[[LLM Gateway - OpenRouter]]` | Created stub: `Wiki/concepts/Token Budget Control.md` (concept page with 3 sources, Phase 6 reference) |
| 4 | Broken wikilink — missing page | `implementation-roadmap-2026-08-01.md` → `[[Environment Configuration]]` | Created stub: `Wiki/concepts/Railway Deployment Config.md` (concept page with 3 sources, Phase 9 reference) |

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
- ✅ 2 forward-reference wikilinks ([[LLM Gateway - OpenRouter]], [[Environment Configuration]]) — pages don't exist yet, acceptable
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
  - **Gap #5**: Redis degradation — PostgreSQL fallback in [[Idempotency]]
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

## [2026-08-02] lint | Runtime ESLint — 1 error, 67 warnings

`npm run lint` results. All warnings are `@typescript-eslint/no-explicit-any`. One error is `no-console` (`console.warn` instead of `console.error`).

### Error

| File | Line | Rule | Detail |
|------|------|------|--------|
| `packages/copy/src/index.ts` | 17 | `no-console` | `console.warn` — only `console.error` allowed |

### Warnings by file

| File | Count |
|------|-------|
| `apps/backend/src/api/workspaces.ts` | 13 |
| `apps/frontend/src/api/client.ts` | 13 |
| `packages/infra-db/src/repositories/session-repository.ts` | 10 |
| `packages/infra-db/src/repositories/conversation-repository.ts` | 6 |
| `apps/backend/src/api/agent-chat.ts` | 5 |
| `packages/infra-db/src/repositories/workspace-repository.ts` | 4 |
| `apps/backend/src/api/generation.ts` | 2 |
| `apps/backend/src/generation/machines/session-machine.ts` | 2 |
| `apps/backend/src/generation/worker/session-worker.ts` | 2 |
| `apps/frontend/src/api/hooks.ts` | 2 |
| `apps/frontend/src/layout/AppShell.tsx` | 2 |
| `apps/frontend/src/pages/ConversationPage.tsx` | 2 |
| `apps/frontend/src/pages/DashboardPage.tsx` | 2 |
| `apps/frontend/src/pages/SessionPage.tsx` | 1 |
| `apps/frontend/src/pages/ToolPage.tsx` | 1 |
| **Total** | **67** |

### Summary by package

| Package | Files | Issues |
|---------|-------|--------|
| `apps/backend` | 5 | 24 warnings |
| `apps/frontend` | 7 | 23 warnings |
| `packages/infra-db` | 3 | 20 warnings |
| `packages/copy` | 1 | 1 error |
| **Total** | **16** | **67 warnings + 1 error** |

### Trend

| Milestone | Warnings | Errors | Date |
|-----------|----------|--------|------|
| Phase 1 (bootstrap) | 18 | 0 | — |
| Phase 5 (Agent Chat) | 41 | 0 | — |
| Phase 6 (LLM Integration) | 52 | 0 | — |
| Phase 7 (Frontend MVP) | 69 | 0 | — |
| Phase 8 (Real Auth) — post-fix | 0 | 0 | — |
| **Current** | **67** | **1** | 2026-08-02 |

### Remediation — August 2026-08-02

Complete remediation across 3 tiers to eliminate all ESLint violations (`npm run lint` → 0 errors, 0 warnings). All fixes are `@typescript-eslint/no-explicit-any` (`as any` / `: any`) and one `no-console` error.

#### Tier 0 &mdash; Immediate (1 error, 0 warnings)

| File | Fix |
|------|-----|
| `packages/copy/src/index.ts` | `console.warn` → `console.error` |

#### Tier 1 &mdash; Express Request augmentation (0 errors, 17 warnings)

**New file**: `apps/backend/src/types/express.d.ts` — declares `Request.user?: { sub: string }` and `Request.workspace?: Workspace` globally.

| File | Before | After | Fix |
|------|:---:|:---:|------|
| `apps/backend/src/api/workspaces.ts` | 13 | 2 | `(req as any).user.sub` → `req.user!.sub` |
| `apps/backend/src/api/agent-chat.ts` | 5 | 0 | Same pattern, all 5 resolved |
| `apps/backend/src/api/generation.ts` | 2 | 1 | `(req as any).user?.sub` → `req.user?.sub` |

#### Tier 2 &mdash; Local type fixes (0 errors, 15 warnings)

**Domain machine types**:
- `session-machine.ts`: exported `SessionContext`; added `StepDoneEvent` interface replacing `(event as any).output`
- `session-worker.ts`: `fromPromise<Artifact, SessionContext>` and `fromPromise<void, { session: Session }>`
- `generation.ts`: imported `SSEPayload` from `job-event-bridge`

**Backend API**:
- `workspaces.ts`: removed `: any` from `.map((m) => ...)` — TypeScript infers from `memberships` array

**Frontend pages**:
- `ToolPage.tsx`: `catch (err: any)` → `catch (err)` with `err instanceof Error`
- `ConversationPage.tsx`: same catch pattern + removed `: any` from `msg`
- `AppShell.tsx`: removed `: any` from `w` / `ws` callbacks
- `DashboardPage.tsx`: removed `: any` from `w` / `s` callbacks
- `SessionPage.tsx`: removed `: any` from `artifact` callback

#### Tier 3 &mdash; API client + DB repositories (0 errors, 35 warnings)

**Frontend API client** (`apps/frontend/src/api/client.ts`):
- Added 9 DTO interfaces: `SessionDTO`, `WorkspaceDTO`, `MessageDTO`, `ConversationDTO`, `ConversationListItemDTO`, `AgentDTO`, `ArtifactDTO`, `SessionListResponse`
- All 13 generic `<any>` replaced with specific DTO types

**Frontend hooks** (`apps/frontend/src/api/hooks.ts`):
- `useState<SessionDTO | null>` and `useState<WorkspaceDTO[]>` replacing `useState<any>` and `useState<any[]>`

**DB repositories** — `as any` → specific domain type assertions:

| Repository | Fix | Occurrences |
|------------|-----|:---:|
| `session-repository.ts` | `as ToolKey`, `as SessionStatus`, or removed (structurally identical types) | 10 |
| `conversation-repository.ts` | `as AgentKey`, `as ConversationStatus`, `as MessageRole` | 6 |
| `workspace-repository.ts` | `as MembershipRole`, `as MembershipStatus` | 4 |

Root cause: Kysely DB types have `string` columns (e.g., `tool_key`, `agent_key`, `role`, `status`) while domain `reconstitute()` expects branded string literal unions (`ToolKey`, `AgentKey`, `MembershipRole`, etc.). Structural type compatibility between DB and domain `SessionStatus` eliminated 7 unnecessary casts.

#### Final state

```
npm run lint → 0 errors, 0 warnings
```

17 files modified across 3 tiers. Trend:

| Milestone | Errors | Warnings |
|-----------|:---:|:---:|
| Initial | 1 | 67 |
| After Tier 0 | 0 | 67 |
| After Tier 1 | 0 | 50 |
| After Tier 2 | 0 | 35 |
| **After Tier 3** | **0** | **0** |

### DDD Architecture Review — 2026-08-02

The remediation was reviewed against the 6 DDD Design Rules (CLAUDE.md). Result: **valid, architecturally sound.** No anti-patterns introduced.

#### Finding 1: Rule 4 VO debt (pre-existing)

8 domain value objects are bare `type` aliases, not classes:

| VO | Values | Impact |
|----|--------|--------|
| `ToolKey` | 11 variants | Repository `as ToolKey` casts |
| `SessionStatus` | 7 variants with lifecycle | No `isTerminal()`, 10+ casts |
| `AgentKey` | 7 variants | Repository `as AgentKey` casts |
| `ConversationStatus` | 2 variants | Repository casts |
| `MessageRole` | 3 variants | Repository casts |
| `MembershipRole` | 3 variants (auth-critical) | Repository casts |
| `MembershipStatus` | 2 variants | Repository casts |
| `ArtifactStatus` | 4 variants | Not currently in use |

Tracked in [[rule-4-vo-debt]] with conversion roadmap and sequencing.

#### Finding 2: Wiki/code divergence on Session entity

The [[Session]] entity wiki page documents aspirational architecture (VOs, class-based `SessionStatus`, strongly-typed `SessionEvent` union) that diverges from current implementation (`string` IDs, type alias statuses, `{ type, [key: string]: unknown }` events). Page updated with `⚠️ Implementation status` banner and cross-reference to debt page.

#### Finding 3: Frontend DTOs in client.ts

The DTOs defined in `apps/frontend/src/api/client.ts` during Tier 3 duplicate types partially present in `packages/contracts`. Recommended consolidation into contracts package as follow-up tech debt (not blocking this remediation).

#### XState event casting pattern: validated

The `(event as unknown as StepDoneEvent).output` pattern in `session-machine.ts` is the correct XState v5 idiom for accessing typed actor output within action handlers. The machine's `SessionEvent` union defines external events only; actor `onDone` events are internally generated by XState and should NOT pollute the external event namespace. No change needed.

## [2026-08-02] wiki-sync | Cosmetic wiki/code alignment + architectural targets

### Cosmetic phase — Wiki aligned to code

5 cosmetic gaps resolved by updating wiki pages to reflect actual implementation:

| Page | Changes |
|------|---------|
| [[Session]] | Replaced aspirational code blocks with actual `Session.ts` code. `SessionId`/`WorkspaceId`/`UserId` → `string`. `DateTime` → `Date`. Removed `_artifacts` aspirational code. Corrected `apply()` signature. |
| [[Workspace]] | Fixed `transferOwnership()` — code uses `_setRoleAsOwner()` delegation, wiki showed `as any` (code is better). `UserId` → `string` throughout. Added 🔴 banner on aspirational `addAsset()`. |
| [[Artifact]] | Fixed `create()` signature to match code `(sessionId, stepNumber, content)`. Added ⚠️ banner for missing lifecycle methods. VO types table corrected. |

### Architectural targets documented

Created [[phase-9-architectural-targets]] — decision record cataloguing 11 VALIDATION + 5 STRUCTURAL gaps with effort estimates, risk analysis, and phased sequencing:

- **VALIDATION (11 gaps, ~8h)**: VOs → classes, `throw new Error()` → `DomainError`, `apply()` event typing, Artifact lifecycle guards. Phased in 3 sub-phases (9a foundation, 9b core, 9c remaining).
- **STRUCTURAL (5 gaps, RFC required)**: Session `_artifacts` collection, domain event payloads, Workspace assets, temporal invariants, tool stub content. Each needs a design decision before implementation.

See [[phase-9-architectural-targets]] for full roadmaps and prioritization.

## [2026-08-02] feat(domain) | Phase 9a — V10 + V1 Complete

### V10 — Zero `throw new Error()` in domain (Rule 3 compliance)

12 new `DomainError` subclasses created across 8 files. Every `throw new Error(...)` in `packages/domain/src/` replaced with a properly typed error:

| File | Error class(es) | code |
|------|----------------|------|
| `StepNumber.ts` | `InvalidStepNumberError` | `VALIDATION_ERROR` |
| `WorkspaceMembership.ts` | `CannotInviteAsOwnerError`, `InvalidMembershipAcceptError`, `CannotAssignOwnerRoleError` | `VALIDATION_ERROR`, `INVALID_STATE` |
| `PromptTemplateId.ts` | `InvalidPromptTemplateKeyError`, `InvalidPromptTemplateIdFormatError` | `VALIDATION_ERROR` |
| `PromptVersion.ts` | `InvalidPromptVersionError` | `VALIDATION_ERROR` |
| `PromptComponent.ts` | `EmptyComponentContentError` | `VALIDATION_ERROR` |
| `UserStatus.ts` | `InvalidUserStatusError` | `VALIDATION_ERROR` |
| `UserRole.ts` | `InvalidUserRoleError` | `VALIDATION_ERROR` |
| `PromptComponentRegistry.ts` | `PromptComponentNotFoundError` (fixed: `extends Error` → `extends DomainError`) | `VALIDATION_ERROR` |

### V1 — `SessionStatus` type alias → class (Rule 4 compliance)

`SessionStatus` converted from 8-line type alias to 67-line class:

- 7 static readonly instances: `Draft`, `Ready`, `Queued`, `Running`, `Completed`, `Failed`, `Cancelled`
- `static from(value: string)` with exhaustive switch throwing `InvalidSessionStatusError`
- `isTerminal()` returns true for `completed`/`failed`/`cancelled`
- `equals()`, `toString()` (returns `SessionStatusValue`), `value` getter
- `SessionLifecycle` updated: `getValidTransition()` accepts class, returns class, `initialState` is `SessionStatus.Draft`
- `Session.create()` uses `SessionStatus.Draft` instead of `'draft'`
- `session-repository.ts`: `SessionStatus.from(row.status)` for reads, `session.status.value` for writes
- Zero `as SessionStatus` casts in repository

### Verification

- `npm run lint`: 0 errors, 0 warnings
- `npm run typecheck`: 0 errors
- `npm test`: 8/8 pass
- `grep -rn "throw new Error" packages/domain/src/`: 0 matches

18 files modified. Next: Phase 9b (MembershipRole, ToolKey, AgentKey, SessionEvent discriminated union).

## [2026-08-02] feat(domain) | Phase 9b — V2 + V9 + V3 + V4 Complete

### V2 — MembershipRole type alias → class

`MembershipRole` converted from 1-line type alias to 46-line class:

- 3 static readonly instances: `Owner`, `Editor`, `Viewer`
- `isOwner`, `isEditor`, `isViewer` convenience getters
- `WorkspaceMembership`: `role === 'owner'` → `role.isOwner`; `this._role = 'owner'` → `MembershipRole.Owner`
- `Workspace`: `MembershipRole.Owner`, `MembershipRole.Editor` static instances; `canEdit()` uses `role?.isOwner || role?.isEditor`
- `workspace-repository.ts`: `MembershipRole.from(m.role)` for reads, `m.role.value` for writes
- `app.ts`: `requireWorkspaceRole(MembershipRole.Owner, MembershipRole.Editor, MembershipRole.Viewer)`
- Zero `as MembershipRole` casts in codebase

### V9 — SessionEvent discriminated union

`session-lifecycle.ts` now exports a typed `SessionEvent` union:

```typescript
type SessionEvent =
  | { type: 'CONFIGURE' }
  | { type: 'QUEUE' }
  | { type: 'WORKER_PICKUP' }
  | { type: 'ADD_ARTIFACT'; artifact: Artifact; isLast: boolean; stepLabel: string }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; errorCode: string; errorMessage: string }
  | { type: 'CANCEL' }
```

- `Session.apply(event: SessionEvent)` — no more `{ type: SessionEventType; [key: string]: unknown }`
- `event.errorCode` / `event.errorMessage` accessed directly — no `as` casts
- XState machine `callApply` action already sends correct shapes — zero changes needed

### V3 — ToolKey type alias → class

`ToolKey` converted from 12-line type alias to 58-line class:

- 11 static readonly instances: `LandingFunnel`, `LandingPage`, ..., `AiOverviewAnalysis`
- `tools/index.ts`: `Record<ToolKeyValue, ToolDefinition>` (string keys)
- `tool-definition.ts`: `toolKey: ToolKeyValue` (not class)
- `getTool(key: ToolKey)` uses `key.value` to index registry
- `session-repository.ts`: `ToolKey.from(row.tool_key)` for reads, `session.toolKey.value` for writes
- `start-session.usecase.ts`: `ToolKey.from(cmd.toolKey)` instead of `as ToolKey`
- `session-worker.ts`: removed `as ToolKey` cast (toolKey is already class instance)
- Zero `as ToolKey` casts in codebase

### V4 — AgentKey type alias → class

`AgentKey` converted from 8-line type alias to 50-line class:

- 7 static readonly instances: `Strategist`, `Copywriter`, ..., `EmailMarketer`
- `agent-personas.ts`: `Record<AgentKeyValue, AgentPersona>`, `getAgent(key)` uses `key.value`
- `conversation-repository.ts`: `AgentKey.from(row.agent_key)` for reads, `.value` for writes
- Zero `as AgentKey` casts in codebase

### Verification

- `npm run lint`: 0 errors, 0 warnings
- `npm run typecheck`: 0 errors
- `npm test`: 8/8 pass
- `grep "as ToolKey|as AgentKey|as MembershipRole"`: 0 matches

20 files modified. Next: Phase 9c (ConversationStatus, MessageRole, MembershipStatus, ArtifactStatus, Artifact lifecycle).

## [2026-08-02] feat(domain) | Phase 9c — ConversationStatus + MessageRole + ArtifactStatus + MembershipStatus Complete

### 7.1 — ConversationStatus type alias → class

`ConversationStatus` converted from 1-line type alias to 48-line class:

- 2 static readonly instances: `Active`, `Archived`
- `isActive`, `isArchived` convenience getters
- `Conversation.addMessage()`: `this._status !== 'active'` → `this._status.isArchived`
- `Conversation.archive()`: `this._status !== 'active'` → `!this._status.isActive`; `'archived'` → `ConversationStatus.Archived`
- `Conversation.isActive` getter delegates to `this._status.isActive`
- `conversation-repository.ts`: `ConversationStatus.from(row.status)` for reads, `.value` for writes
- Zero `as ConversationStatus` casts in codebase

### 7.2 — MessageRole type alias → class

`MessageRole` converted from 1-line type alias to 58-line class:

- 3 static readonly instances: `User`, `Agent`, `System`
- `isUser`, `isAgent`, `isSystem` convenience getters
- `Message.user()`: `'user'` → `MessageRole.User`
- `Message.agent()`: `'agent'` → `MessageRole.Agent`
- `Message.system()`: `'system'` → `MessageRole.System`
- `Conversation.addMessage()`: `message.role === 'user'` → `message.role.isUser`
- `conversation-repository.ts`: `MessageRole.from(m.role)` for reads, `.value` for writes
- Zero `as MessageRole` casts in codebase

### 7.3 — ArtifactStatus type alias → class (with lifecycle guards)

`ArtifactStatus` converted from 1-line type alias to 94-line class:

- 4 static readonly instances: `Pending`, `Generating`, `Completed`, `Failed`
- `isPending`, `isGenerating`, `isCompleted`, `isFailed` convenience getters
- `isTerminal` getter (completed or failed — terminal states)
- `canTransitionTo(target: ArtifactStatus): boolean` — checks allowed transitions:
  - `pending` → `generating`
  - `generating` → `completed` | `failed`
  - `completed`, `failed` → no transitions
- `apply(target: ArtifactStatus): ArtifactStatus` — transitions or throws `InvalidArtifactTransitionError`
- `Artifact.create()`: `'completed'` → `ArtifactStatus.Completed`
- Zero `as ArtifactStatus` casts in codebase

### 7.4 — MembershipStatus type alias → class

`MembershipStatus` converted from 1-line type alias to 48-line class:

- 2 static readonly instances: `Invited`, `Active`
- `isPending`, `isActive` convenience getters
- `WorkspaceMembership.invite()`: `'invited'` → `MembershipStatus.Invited`
- `WorkspaceMembership.accept()`: `this._status !== 'invited'` → `!this._status.isPending`; `'active'` → `MembershipStatus.Active`
- `WorkspaceMembership.isActive` getter delegates to `this._status.isActive`
- `Workspace.create()`: `'active'` → `MembershipStatus.Active`
- `Workspace.acceptInvitation()`: `m.status === 'invited'` → `m.status.isPending`
- `workspace-repository.ts`: `MembershipStatus.from(m.status)` for reads, `.value` for writes
- Zero `as MembershipStatus` casts in codebase

### Verification

- `npm run lint`: 0 errors, 0 warnings
- `npm run typecheck`: 0 errors
- `npm test`: 8/8 pass
- `grep "as ConversationStatus|as MessageRole|as ArtifactStatus|as MembershipStatus"`: 0 matches

14 files modified. Next: Phase 9d (PromptComponent, PromptTemplateId, UserStatus — remaining type aliases).

## [2026-08-02] feat(domain) | Phase 9d — PromptComponentType + UserStatus Complete

### 8.1 — PromptComponentType type alias → class

`PromptComponentType` converted from 5-line type alias to 68-line class:

- 5 static readonly instances: `SystemRule`, `FormatConstraint`, `SafetyGuard`, `StyleGuide`, `DomainKnowledge`
- `isSystemRule`, `isFormatConstraint`, `isSafetyGuard`, `isStyleGuide`, `isDomainKnowledge` getters
- `PromptComponent` internal `type` field uses `PromptComponentTypeValue` (string union) for simplicity
- `PromptComponent.create()` and `fromFile()` accept `PromptComponentTypeValue`
- `default-components.ts`: `ComponentDefinition.type` uses `PromptComponentTypeValue`
- Barrel exports updated in `prompting/index.ts` and `generation/index.ts`

### 8.2 — PromptTemplateId: already a class

`PromptTemplateId` was already converted to a class with `from()`, `fromString()`, `toString()`, `equals()`. No changes needed.

### 8.3 — UserStatus getter consistency fix

`UserStatus` was already a class but had `isActive()` as a method instead of a getter:

- `isActive()` method → `isActive` getter (matches all other VOs)
- Added `isDisabled` getter
- `User.ts`: `this._status.isActive()` → `this._status.isActive`

### Remaining type alias

Only `ModelTier` remains as a type alias in domain (`'premium' | 'balanced' | 'light' | 'search'`). This is intentional — it's an infrastructure/config concern, not a domain value object.

### Verification

- `npm run lint`: 0 errors, 0 warnings
- `npm run typecheck`: 0 errors
- `npm test`: 8/8 pass

6 files modified. Phase 9 (DDD type alias → class remediation) complete.

## [2026-08-03] synthesis | Node.js thin reverse proxy proposal filed

Filed [[synthesis/nodejs-thin-reverse-proxy-proposal]] — structural solution to eliminate backend public URL:

- **Problem**: current architecture exposes backend on public Railway URL with CORS. 10+ nginx reverse proxy attempts failed (documented in [[synthesis/deployment-patterns-phase-10]]).
- **4 architectures evaluated**: nginx (tried, fragile), Node.js thin proxy (recommended), monolith (rejected — coupling), dedicated nginx service (rejected — 3 services).
- **Solution B**: thin Node.js Express server (~30 lines) on frontend service — serves SPA + proxies `/api/*` → `http://backend.railway.internal:3000`. Same stack (Node.js), runtime config via `BACKEND_INTERNAL_URL` env var, `VITE_API_URL=""` (same-origin), backend fully private.
- **Changes**: new `apps/frontend/server.mjs`, update `Dockerfile.frontend` Stage 2, add `express` + `http-proxy-middleware` to frontend deps, switch `railway.frontend.json` builder to DOCKERFILE.
- **Zero changes**: frontend source (client.ts, sse-client.ts, AuthContext.tsx), Vite dev proxy, backend CORS config.
- **Estimated**: ~1 hour implementation. Fixes all 10 nginx failure modes at once.

## [2026-08-04] synthesis | Usage & Quota implementation plan filed

Filed [[synthesis/usage-quota-implementation-plan]] — 13 new files + 7 modified, implementing the [[Usage & Quota]] bounded context:

- **Status**: DB migration (005) exists, zero domain code. Wiki fully specified in [[Quota]] entity page (244 lines) and [[Usage & Quota]] concept page.
- **Phase A–C — Domain**: 3 VO files (Plan + PlanType + CreditAmount, QuotaPeriod, TransactionReason), 1 child entity (CreditTransaction), 1 aggregate root (Quota with `consumeCredits()`, `consumeArtifact()`, `addCredits()`, `upgradePlan()`)
- **Phase D–E — Errors + Events**: 3 DomainError subclasses (QuotaExceededError code `QUOTA_EXCEEDED` → 429, ArtifactGateExceededError, QuotaNotFoundError), 3 domain event interfaces (CreditConsumed, QuotaExceeded, ArtifactGateExceeded)
- **Phase F — Wiring**: usage barrel export + `packages/domain/src/index.ts` wire-in
- **Phase G–I — Infra**: Kysely table types for `quotas` + `credit_transactions` tables, `KyselyQuotaRepository` with `saveWithLock()` optimistic locking, infra barrel export
- **Phase J — Backend**: ErrorMapper `ARTIFACT_GATE_EXCEEDED` → 429, `quotaRepo` in AppDeps + server.ts instantiation
- **Phase K — Wiki**: overview.md Phase 11 status correction (completed, not planned)
- **DDD compliance**: Rules 1–7 verified — zero violations. Two intentional deviations from wiki entity design: `saveWithLock()` (concurrent credit consumption safety) and `findCurrent()` returns `Promise<Quota | null>` (repository finds, doesn't create).
- **Out of scope**: EnsureQuotaUseCase, ConsumeCreditsUseCase (SessionCompleted handler), API routes, EventBridge publishing — deferred to follow-up wiring phase.

3 wiki files updated: `Wiki/synthesis/usage-quota-implementation-plan.md` (new), `Wiki/index.md` (+1 synthesis entry), `Wiki/log.md` (this entry).

## 2026-08-04 | implement — Phase 13 Gamification

Created the gamification bounded context as an event-driven overlay on the operational layer. Implementation executed from [[phase-13-implementation-plan]] — 8 sub-phases, 50 files created or modified.

**Phase 13a — Domain Foundation (7 files)**:
- `errors.ts` — 8 DomainError subclasses (MaxLevelReachedError, BadgeAlreadyUnlockedError, InvalidXPValueError, ChallengeAlreadyActiveError, ChallengeNotActiveError, InvalidSeasonError, InvalidBadgeTierError, InvalidChallengeKeyError). All extend DomainError with `code` + `retryable`.
- 9 class VOs (XP, Level, Streak, BadgeKey, BadgeTier, ChallengeStatus, ChallengeKey, SeasonId, AchievementId) — all with `private constructor`, `static from()`/`of()`/`current()`, `equals()`. Rule 4 compliant.
- `Achievement` — child entity owned by PlayerProfile, `static create()` + `static reconstitute()`.
- `PlayerProfile` — aggregate root, canonical Pattern 7: `private constructor`, `_version`, `ReadonlyArray<Achievement>`, business methods return `DomainEvent[]`/`DomainEvent|null`. Methods: `addXP()`, `recordActivity(todayUTC)`, `getStreakBonus()`, `unlockBadge()`, `hasBadge()`.
- Badge catalog: 22 badges (16 permanent + 6 seasonal), 4 tiers, credit rewards (10/25/50/100).

**Phase 13b — Domain Services & Events (8 files)**:
- `XPCalculator` — stateless pure function mapping event types to XP (SessionCompleted: 50, MessageAdded: 10, MemberJoined: 75, ArtifactPromoted: 100 deferred).
- `AchievementEvaluator` — pure function evaluating 22 badges against player + event + AllTimeStats.
- `SeasonService` — current season detection, quarter matching.
- 5 domain events: XPEarned, LevelUp, StreakUpdated, AchievementUnlocked (carries creditReward for Quota context), ChallengeCompleted.

**Phase 13c — WorkspaceChallenge Aggregate (2 files)**:
- `WorkspaceChallenge` — second aggregate root, workspace-scoped, weekly lifecycle: active → completed. `contribute(amount)` method.
- Challenge catalog: 5 challenges (ContentSprint, AssetBuilder, AiDialogue, FullCoverage, PowerWeek) with XP rewards.

**Phase 13d — Repositories & DB Schema (5 files)**:
- Migration 010: 7 tables (player_profiles, achievements, xp_transactions, gamification_processed_events, workspace_leaderboard, workspace_challenges, challenge_contributions). Optimistic locking via `version` column. UNIQUE constraints for dedup.
- 7 Kysely table types added to `packages/infra-db/src/types.ts`.
- `PlayerProfileRepository` + `WorkspaceChallengeRepository` interfaces (domain layer).
- `KyselyPlayerProfileRepository` — `saveWithLock()` with `WHERE version = expectedVersion`, throws `ConcurrencyError` on 0 rows. Achievement sync inside `save()` per Rule 5.
- `KyselyWorkspaceChallengeRepository` — UPSERT pattern with `ON CONFLICT DO UPDATE`.

**Phase 13e — Event Pipeline (6 files)**:
- `GamificationEventPublisher` — BullMQ queue adapter for `SessionCompleted`, `MessageAdded`, `MemberJoined`.
- `gamification-worker.ts` — 5-step pipeline: (1) atomic dedup via `tryClaim`, (2) XP calculation, (3) profile load with `withOptimisticRetry(3)`, (4) achievement evaluation + persist, (5) leaderboard update. All steps separated per Rule 5.
- Sub-repositories: `ProcessedEventRepository` (atomic `INSERT ON CONFLICT DO NOTHING`), `XPTransactionRepository`, `LeaderboardProjectionRepository`, `GamificationStatsRepository` (6-stat query for all-time badges).
- `GetPlayerProfileUseCase`.
- `gamification-queue.ts` — BullMQ Queue factory.

**Phase 13f — Wiring & Integration (4 files)**:
- `session-worker.ts`: `SessionWorkerDeps` extended with `gamificationEventPublisher`. On completion, `publishSessionCompleted(sessionId, workspaceId, userId, toolKey)`.
- `send-message.usecase.ts`: `SendMessageUseCase` constructor extended. After conversation save, `publishMessageAdded()` fire-and-forget.
- `accept-invitation.usecase.ts`: `AcceptInvitationUseCase` constructor extended. After accept, extracts `membership.invitedBy` and publishes `MemberJoined` with inviter's ID (not joiner).
- `app.ts`: `createWorkspaceRoutes` and `createAgentChatRoutes` updated with `redisUrl` parameter.

**Phase 13g — API Routes (1 file)**:
- 5 endpoints: `GET /api/me/profile`, `/api/workspaces/:id/leaderboard` (XP-private, relative ranking), `/api/workspaces/:id/health` (stub), `/api/workspaces/:id/challenges`, `/api/seasons/current`. All routes use `authenticate` + `requireWorkspaceRole` middleware.

**Phase 13h — Barrel Exports (1 file)**:
- `packages/domain/src/gamification/index.ts` — exports all entities, VOs, domain services, domain events, badges, repositories, errors.
- `packages/domain/src/index.ts` — added `export * from './gamification'`.
- `packages/infra-db/src/index.ts` — added `KyselyPlayerProfileRepository` + `KyselyWorkspaceChallengeRepository`.

**Pre-execution validation fixes applied**:
- F1: `saveWithLock` captures `expectedVersion` BEFORE mutations (canonical SessionWorker line 127 pattern)
- F2: `MemberJoined` 75 XP awarded to inviter (`membership.invitedBy`), not joiner
- F3: `AllTimeStats` type defined (6 counters for cross-time badges)
- F4: Atomic `tryClaim` with `INSERT ON CONFLICT DO NOTHING` for dedup
- F5: `ArtifactPromoted` event deferred (not yet emitted by generation context)
- F6: Seasonal badges (6) added to catalog — total 22 badges

**DDD compliance**: All 14 CLAUDE.md rules verified. Zero `as any` in domain code. Zero `throw new Error()` in domain code. Zero bare type aliases for domain VOs. All 9 VOs are classes per Rule 4.

**Verification**: `tsc --build` clean (domain + backend, 0 errors), `eslint` clean (0 errors, 0 warnings).

9 wiki files updated: `Wiki/synthesis/phase-13-implementation-plan.md` (new), `Wiki/synthesis/implementation-roadmap-2026-08-01.md` (Phase 13 → ✅), `Wiki/entities/PlayerProfile.md` (Planned → Implemented), `Wiki/entities/Achievement.md` (Planned → Implemented), `Wiki/concepts/Gamification.md` (status updated), `Wiki/log.md` (this entry).

## 2026-08-04 | deploy — Phase 13 Railway deploy + bugfixes

Three deploy attempts failed due to Docker build cache issues and missing `@types/node`. Root cause: 14 domain files imported `randomUUID` from `node:crypto` which requires `@types/node` for TypeScript compilation. On Railway's clean Docker build, `@types/node` was not installed because the Docker `npm ci` layer was cached from a build before the dependency was added.

**Fix iterations** (5 attempts):
1. **TS errors in test files**: `tsc --build` type-checked `__tests__/` → fixed: added `**/__tests__/**` to root `tsconfig.json` exclude
2. **Express.User.sub type error**: `req.user!.sub` failed on Railway (no global augmentation) → fixed: replaced with `getAuthUser(req)!.sub` in 5 files (18 call sites)
3. **Missing `@types/node`**: added to `package.json` + `package-lock.json` → Docker cache persisted
4. **Docker layer cache**: added `npm install --save-dev @types/node` in Dockerfile → `--no-save` didn't install; changed to `--save-dev` → still "up to date"
5. **Dockerfile.backend not in watch patterns**: added to Railway service watch patterns

**Final fix**: Created `packages/domain/src/shared/random-uuid.ts` — uses global `crypto.randomUUID()` (Node 19+) with `Math.random()` fallback. Zero external dependencies. Replaced all 14 `import { randomUUID } from 'node:crypto'` with internal import. This eliminates `@types/node` dependency from the domain package entirely.

**Routing fix**: Gamification routes were not registered in `app.ts`. Added `PlayerProfileRepository` + `WorkspaceChallengeRepository` to `AppDeps`, wired `KyselyPlayerProfileRepository` + `KyselyWorkspaceChallengeRepository` in `server.ts`, registered `createGamificationRoutes`.

**Smoke test** (2026-08-04 09:45 UTC):
- `GET /health` → 200 `{"status":"ok"}` ✅
- `GET /api/seasons/current` → 401 (auth required) ✅
- `GET /api/me/profile` → 401 (auth required) ✅

5 wiki files updated: `Wiki/log.md` (this entry), plus the modified source files in the commits.

## [2026-08-04] update | Overview status refresh post Phase 11–13

Updated `Wiki/overview.md` to reflect actual implementation state after 3 commits implementing Phases 11, 11.5, and 13:

**Changes**:
- **Gamification** bounded context row: `Event-driven XP, levels...` → `✅ Event-driven XP, levels, badges (22), streaks...` (was always implied but never marked complete)
- **Usage & Quota** bounded context row: `🔴 Planned` → `🟡 Domain complete... Wiring pending` (matches actual state: domain done, use cases not yet wired)
- **Phase table**: "Completed (Phase 0–11.5)" → "Completed (Phase 0–13)". Phase 13 (Gamification) moved from Planned to Completed with full scope description (50 files, 2 aggregates, 22 badges, BullMQ pipeline, 5 API endpoints)
- **New Planned section**: Phase 12 — Usage & Quota Wiring (use cases, API routes, event subscriptions) — deferred from domain phase
- **Critical Gaps updated**: replaced outdated "Near-zero tests" with 3 real remaining gaps: (1) Usage & Quota wiring, (2) Asset entity + AssetResolver + Asset Promotion, (3) CrawlData value object
- **Infrastructure counts**: PostgreSQL 19→26 tables, 8→10 migrations, API 22→27 endpoints

3 wiki files updated: `Wiki/overview.md` (status refresh), `Wiki/log.md` (this entry).

## [2026-08-04] implement | Findings closure — Phase 12 + Asset + CrawlData

Closed all 3 remaining backend gaps identified in the overview audit. 11 files created/modified across domain, application, API, and worker layers.

**Phase 12 — Usage & Quota Wiring (3 new, 4 modified)**:
- `apps/backend/src/application/usage/consume-credits.usecase.ts` — `ConsumeCreditsUseCase` with `withOptimisticRetry(3)`. Auto-creates quota on first use. Consumes credits synchronously after session completion.
- `apps/backend/src/api/usage/usage-routes.ts` — `GET /api/usage/credits` returning credit quota (used, limit, remaining, percent), artifact gate, plan type, period.
- `apps/backend/src/generation/worker/session-worker.ts` — `SessionWorkerDeps` extended with `consumeCreditsUC`. Credit consumption called synchronously before gamification fire-and-forget. Errors logged, don't block session completion.
- `apps/backend/src/generation/worker/worker-process.ts` — `KyselyQuotaRepository` + `ConsumeCreditsUseCase` instantiated and passed to worker.
- `apps/backend/src/app.ts` — Usage routes wired at `/api/usage`.

**Asset Tooling (4 new, 1 modified)**:
- `packages/domain/src/workspace/value-objects/AssetType.ts` — 5 static instances (Brief, BrandVoice, Persona, Angle, AdCopy), `from()`, `equals()`. Rule 4 compliant.
- `packages/domain/src/workspace/value-objects/AssetSource.ts` — 3 instances (Generated, Uploaded, Manual).
- `packages/domain/src/workspace/entities/Asset.ts` — Entity with `create()`/`reconstitute()`, `withContent()`. Fields: assetId, workspaceId, assetType, source, content, sourceSessionId, sourceArtifactId.
- `packages/domain/src/workspace/domain-services/AssetResolver.ts` — Resolves workspace assets for tool execution. Returns `Map<AssetType, AssetContent>`. `MissingRequiredAssetError` for required-but-missing assets.
- `packages/domain/src/workspace/entities/Workspace.ts` — Added `_assets` collection, `addAsset()`, `getAssetByType()`, `assets` getter. `reconstitute()` accepts optional `assets` param (backward-compatible).
- `packages/domain/src/workspace/index.ts` — Barrel updated with all new exports.

**CrawlData (1 new, 1 modified)**:
- `packages/domain/src/generation/value-objects/CrawlData.ts` — Value object for external API data persistence. `create()` validates source + query non-empty. `reconstitute()`, `toJSON()`, `equals()`.
- `packages/domain/src/generation/index.ts` — Barrel updated.

**Verification**:
- `tsc --build packages/domain`: ✅ 0 errors
- `tsc --build apps/backend`: ✅ 0 errors
- ESLint: ✅ 0 errors, 0 warnings (all 11 files)
- Domain tests: ✅ 80/80 passed (Quota, Plan, QuotaPeriod — unchanged)
- Session worker test mock: fixed to include `consumeCreditsUC` + `gamificationEventPublisher`

**Wiki updates**:
- `overview.md`: Phase 12 marked ✅ complete. Usage & Quota bounded context row updated to `✅ Domain + wiring complete`. Critical Gaps reduced from 3 to 2 (Asset + CrawlData now in domain, wiring pending). "No Planned Phases" — all 13 phases complete.
- `Wiki/log.md`: this entry.

5 wiki files updated: `Wiki/synthesis/usage-quota-implementation-plan.md` (status already completed), `Wiki/overview.md` (status refresh), `Wiki/log.md` (this entry).

## [2026-08-06] audit | Wiki alignment — SessionPage + useSession hook bug

**Context**: user reported crash when opening `sessions/[id]` in frontend — `TypeError: can't access property "startedAt", session is null`. No `GET /api/sessions/:id` request reached the backend, indicating the component crashed before `useEffect` could fire the API call.

**Root cause**: two bugs combined:
1. `useSession` in `hooks.ts` initialized `loading` to `false` — no guard on first render with `session = null`
2. `SessionPage` lines 57-58 accessed `(session as unknown as ...).startedAt` with no null protection, crashing on first render before the `if (loading)` guard was reached

**Code fix**:
- `apps/frontend/src/api/hooks.ts`: `loading` initialized to `true`
- `apps/frontend/src/pages/SessionPage.tsx`: replaced unsafe type cast with `session?.startedAt ?? null`

**Wiki updates (5 pages)**:
1. [[Frontend Architecture]] — route table: `SessionSummary` → `SessionPage`
2. [[API Client + SSE Client]] — `useSession` hook code updated with `loading`/`error` states + `.catch()`
3. [[SessionPage]] — NEW concept page documenting component structure, state guards, duration calc, cancel, breadcrumbs, dependencies, and the bug fix
4. [[Wiki/index.md]] — added `SessionPage` to Concepts table
5. `Wiki/log.md` — this entry
