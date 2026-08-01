---
type: log
tags:
  - wiki/log
---

# Operation Log

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
