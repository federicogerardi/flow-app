---
type: log
tags:
  - wiki/log
---

# Operation Log

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
