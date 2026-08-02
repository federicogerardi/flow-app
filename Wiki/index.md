---
type: index
tags:
  - wiki/index
date_updated: 2026-08-02
maintenance: 2026-08-02 — wiki maintenance: 2 stubs merged (Token Budget Control → LLM Gateway, Railway Deployment Config → Environment Configuration), split-page resolved (Workspace Gamification → Gamification), Planned markers added to PlayerProfile + Achievement, 7 synthesis backlinks added, Global Deterministic Model Matrix linked from Content Generation, 12 source_counts updated. Wiki-lint ✅ 114 pages.
maintenance: 2026-08-02 — medium-severity findings executed: 16/16 active findings (M2–M18, excl. M1 deferred) closed across 5 phases. Phase 1: static import M17, Identifier.equals cross-type M18, copy.t() M8, typography M11, statusColorMap M6. Phase 2: LoadingSkeleton M3, sendMessage error M2, theme-aware bubbles M7. Phase 3: N+1 query fix M14, batch membership sync M15. Phase 4: SSE race fix M13. Phase 5: ARIA labels M4/M9, focus management M10, React.lazy code splitting M5. Typecheck ✅, build ✅, tests 5/5.
maintenance: 2026-08-02 — low-severity remediation executed: 5 findings (L1–L5) across 2 phases. L1: OAuth headers + history cleanup. L2: admin error routing. L3: unified listSessions query. L4: dead file deleted. L5: DTOs aligned with contracts. Typecheck ✅ (0 new errors).
maintenance: 2026-08-02 — high-severity findings executed: all 10 (H1–H10) closed. Medium-severity plan filed: 16 findings, 5 phases. Typecheck ✅, build ✅, tests 8/8.
maintenance: 2026-08-02 — high-severity findings executed: all 10 findings (H1–H10) closed across 5 phases. H1: Conversation.start→create. H2: User factories→create. H3: ModelTier class VO. H4: saveWithLock transaction. H5: 3 DomainErrors. H6: OAuth token fallback. H7: useSession error state. H8: dynamic tool inputs. H9: countStalled fix. H10: exhaustiveness check. Typecheck ✅, build ✅, tests 8/8.
maintenance: 2026-08-02 — critical findings executed: all 8 findings (C1–C8) closed across 3 phases. Phase 1: auth error forwarding, WCAG contrast, OS theme reactivity, React render purity. Phase 2: ErrorBoundary + responsive drawer. Phase 3: artifact persistence + VO serialization. Typecheck ✅, build ✅, tests 8/8.
maintenance: 2026-08-02 — critical fix plan filed: 8 fixes across 3 phases (Quick Wins → Frontend Architecture → Data Integrity), 27 files, 4-5 hours. Plan: [[synthesis/critical-fix-plan-2026-08-02]].
maintenance: 2026-08-02 — multi-agent code review filed: 41 findings across 6 domains (DDD, backend, frontend, types, code quality, UI/UX). 8 critical, 10 high, 18 medium, 5 low. Synthesis: [[synthesis/code-review-2026-08-02]].
maintenance: 2026-08-02 — Phase 8 frontend implemented (Workstream D): AuthContext, AuthGuard, OAuthCallback, AuthLayout, LoginPage, RegisterPage, API client token injection + 401 interceptor, AppShell user menu, protected routes. Build ✅, typecheck ✅, lint ✅, tests 8/8.
maintenance: 2026-08-02 — health maintenance: 4 wiki-lint issues fixed (log.md frontmatter, overview.md escaped pipe, 2 missing concept stubs), 5 Italian prose violations translated, 6 env reference leaks sanitized.
---

# Wiki Index — Flow App

> Maintenance note (2026-08-02): Phase 8 fully complete — Real Authentication frontend implemented (Workstream D: 6 new files, 4 modified — AuthContext, AuthGuard, OAuthCallback, AuthLayout, LoginPage, RegisterPage, API client token injection + 401 interceptor, AppShell user menu, protected routes). Build ✅, typecheck ✅, lint ✅, tests 8/8. Phase 8 now marked ✅ in roadmap.
> Maintenance note (2026-08-02): Wiki drift remediation — 8 runtime gaps + 13 documentation gaps resolved. `packages-domain Structure.md` rewritten to match code (agent-chat added, usage/ removed, 11 tool files → 1 index.ts, Asset subsystem marked as planned). `API Routes.md`: status fixes + typos. `Database Schema.md`: conversations + messages added, Kysely types corrected. `Frontend Architecture.md`: route count corrected (5→7), hooks/API methods updated. `overview.md`: usage/ context marked 🔴 planned.
> Maintenance note (2026-08-02): DDD governance audit completed — 58 files across 4 bounded contexts. 8 findings: 2 critical (encapsulation + zod in domain), 5 important (Error hierarchy + use case errors), 1 minor (repository side-effect). 6 pattern-based rules added to schema.
> Maintenance note (2026-08-02): Phase 8 backend implemented — Real Authentication (Workstreams A+B+C+E): identity domain (User, Email, UserRole, UserStatus), KyselyUserRepository, BcryptPasswordHasher, TokenService, AuthService, Passport.js, 7 auth endpoints, authenticate middleware, rate limiter. Lint warnings resolved (7→0). Branch: `feature/phase-8-real-auth`.
> Maintenance note (2026-08-02): Phase 8 implementation plan created — Real Authentication (5 workstreams, 35 files, 8-10 days). Plan: [[synthesis/phase-8-real-auth-plan]].
> Maintenance note (2026-08-02): ESM hoisting bug fixed — `process.env.SEED_USER_ID` was evaluated at module load time (before `dotenv.config()`), so dev-auth always used the fallback UUID. Moved read to request time inside middleware function.
> Maintenance note (2026-08-01): Phase 7 implemented — Frontend MVP (4 shared + 4 page components, 5 routes, react-router v7, MUI v6 Grid2, SWR). Backend: `GET /api/sessions`, `GET /api/artifacts/:id`, `SessionRepository.findByWorkspace()`. Build ✅, tests ✅ (8/8).
> Maintenance note (2026-08-01): Phase 5 implemented — Agent Chat bounded context (Conversation, Message, 7 agents, 6 API routes, privacy invariant). Build ✅, tests ✅ (8/8).
> Maintenance note (2026-08-01): Phase 4 implemented — Prompt Governance Runtime (PromptTemplateId, PromptVersion, PromptComponent, PromptComposer, filesystem repository, 12 default components). Build ✅, tests ✅ (8/8).
> Maintenance note (2026-08-01): Phase 3 implemented — workspace collaboration (membership entity, aggregate, domain events, repository, middleware, 10 API routes, 3 use cases). Build ✅, tests ✅ (8/8).
> Maintenance note (2026-08-01): API verification completed — managed PostgreSQL + Redis provisioned, 6 migrations executed, all endpoints green, idempotency replay verified.
> Maintenance note (2026-08-01): Phase 2 implemented — reliability and ops hardening (optimistic locking, health monitor, graceful shutdown, cleanup job). Build ✅, tests ✅ (8/8).
> Maintenance note (2026-08-01): branch sync policy documented — permanent branches (main/staging/dev), auto-sync workflow, promotion flow updated in Git Governance Policy and CI-CD Promotion Policy.
> Maintenance note (2026-08-01): Phase 0-1 implemented — monorepo bootstrap + core async generation vertical slice. PR #1 open. Code verified (typecheck 0 errors, 8 tests pass, lint 0 errors).
> Maintenance note (2026-08-01): implementation roadmap filed — phased development sequence added in synthesis (bootstrap -> core async slice -> hardening -> collaboration -> expansion).
> Maintenance note (2026-08-01): ultra-strict naming pass completed — canonical guard naming standardized to `canQueue` with legacy alias note for `canStart`.
> Maintenance note (2026-08-01): lexical hardening pass completed — residual `START` transition references removed from canonical architecture pages; naming unified on `QUEUE`/`WORKER_PICKUP`.
> Maintenance note (2026-08-01): mini-remediation cleanup completed — `draft` vs `queued` lifecycle semantics aligned across session/domain/application/frontend docs.
> Maintenance note (2026-08-01): queued-state drift closed — `queued` is now canonical across baseline, OpenAPI, contracts, schema, and route governance.
> Maintenance note (2026-08-01): coherence lint executed — structural wiki lint passed after 2 source_count fixes; queued-state drift subsequently closed.
> Maintenance note (2026-08-01): final-gate remediation applied — contract freeze and enforcement artifacts added (API Contract Baseline v1, Quality Gate Matrix) and related concept pages aligned.
> Maintenance note (2026-08-01): execution follow-up completed — 3 governance concept pages added (Definition of Done, Frontend Error Observability, Concurrency & Conflict Policy).
> Maintenance note (2026-08-01): model alignment for PM review — overview updated to 6 bounded contexts (Agent Chat + Gamification), and broken wikilinks fixed (`LlmGateway` and `Prompting Mechanics` references).
> Maintenance note (2026-08-01): governance audit persisted — multi-dimension project model audit filed in synthesis with maturity scoring and prioritized gap list.
> Maintenance note (2026-08-01): fast-close governance gaps — 3 concept pages added (Git Governance Policy, Secure SDLC Controls, API SLO Catalog).
> Maintenance note (2026-08-01): CI/CD governance completed — CI-CD Promotion Policy added (Dev -> Staging -> Prod gates, artifact integrity, rollback policy).
> Maintenance note (2026-08-01): Output Personalization deprecated — concept page removed and source items marked as deprecated in the current model baseline.
> Maintenance note (2026-08-01): critical-gap remediation for PM review — 4 concept pages added (Global Deterministic Model Matrix, Output Personalization, Project Brand Persona, Invitation Notification Delivery); workspace invitation notification decision closed.
> Maintenance note (2026-08-01): gamification UI Designer review — 3 pages updated (Design Tokens: rarity + sparkle; Gamification UX: ARIA, toast priority, rarity labels; UX Wireframes: Player Profile template; UI Component Map: 29→37).
> Maintenance note (2026-08-01): agent chat UX extended — Agent Chat UX concept page added (23→29 components, templates 9–10, sidebar Team nav); UI Component Map and UX Wireframes updated.
> Maintenance note (2026-08-01): agent chat exploration — 2 new concept pages + 2 new entities + 1 synthesis added (Agent Chat, Agent Personas, Conversation, Message, agent-chat-proposal).
> Maintenance note (2026-08-01): workspace sharing exploration — 2 new concept pages + 1 new entity + 1 synthesis + Workspace entity updated (Workspace Sharing, Workspace Permissions, WorkspaceMembership, workspace-sharing-proposal).
> Maintenance note (2026-08-01): prompting mechanics deep-dive — 3 additional concept pages added (Prompt Caching Strategy, Prompt Admin API, IdempotencyKey + Prompt Version).
> Maintenance note (2026-08-01): prompting mechanics exploration completed — 4 new concept pages + 1 synthesis added (Prompt Versioning, Prompt Components, Context Injection, PromptComposer, prompting-mechanics-proposal).
> Maintenance note (2026-07-31): post-remediation language normalization completed on source/concept pages.
> Maintenance note (2026-07-31): backend architecture consistency remediation applied (idempotency contract, retention policy, queue topology, event delivery semantics).
> Maintenance note (2026-07-31): second remediation applied (API contract governance, CI contract checks, LLM reliability policy, worker scaling policy).
> Maintenance note (2026-07-31): phase 3 remediation applied (DR runbook targets, outbox/inbox delivery contract, API deprecation timeline policy).
> Maintenance note (2026-07-31): phase 4 frontend remediation applied (readiness determinism, SSE multi-session client contract, queue-position semantics).
> Maintenance note (2026-07-31): UX/GUI design session completed — 3 new concept pages added (UX Wireframes, Design Tokens, UI Component Map).

## Processed Sources

| File | Summary Page | Date Ingested |
|------|-------------|---------------|
| APP-CONCEPT.md | [[sources/APP-CONCEPT]] | 2026-07-30 |
| PRD.md | [[sources/PRD]] | 2026-07-30 |
| STARTUP.md | [[sources/STARTUP]] | 2026-07-30 |
| USER-STORIES.md | [[sources/USER-STORIES]] | 2026-07-30 |

## Entities

| Page | Context | Type | Source Count |
|------|---------|------|-------------|
| [[Session]] | Content Generation | Aggregate Root | 4 |
| [[Artifact]] | Content Generation | Entity | 4 |
| [[Conversation]] | Agent Chat | Aggregate Root | 4 |
| [[Message]] | Agent Chat | Entity | 3 |
| [[Workspace]] | Workspace & Assets | Aggregate Root | 7 |
| [[WorkspaceMembership]] | Workspace & Assets | Internal Entity | 3 |
| [[Asset]] | Workspace & Assets | Entity | 4 |
| [[User]] | Identity & Access | Aggregate Root | 2 |
| [[PlayerProfile]] | Gamification | Aggregate Root | 4 |
| [[Achievement]] | Gamification | Entity | 3 |
| [[Quota]] | Usage & Quota | Aggregate Root | 2 |
| [[SessionRepository]] | Content Generation | Repository Interface | 3 |
| [[WorkspaceRepository]] | Workspace & Assets | Repository Interface | 3 |

## Concepts

| Page | Confidence | Source Count |
|------|------------|--------------|
| [[API Client + SSE Client]] | high | 4 |
| [[API Contract Baseline v1]] | high | 7 |
| [[API Documentation - OpenAPI]] | high | 3 |
| [[API Routes]] | high | 4 |
| [[API SLO Catalog]] | high | 5 |
| [[Agent Chat]] | high | 8 |
| [[Agent Chat UX]] | high | 8 |
| [[Agent Personas]] | high | 4 |
| [[Application Services]] | high | 4 |
| [[Achievements & Badges]] | high | 4 |
| [[ArtifactContent]] | high | 3 |
| [[Asset Promotion]] | high | 4 |
| [[AssetResolver]] | high | 4 |
| [[Auth Dependencies]] | high | 8 |
| [[Auth Middleware]] | high | 5 |
| [[BullMQ Worker Wiring]] | high | 5 |
| [[CI-CD Promotion Policy]] | high | 7 |
| [[Centralized Copy Modules]] | high | 3 |
| [[Concurrency & Conflict Policy]] | high | 8 |
| [[Content Generation]] | high | 5 |
| [[Contracts Package]] | high | 5 |
| [[Context Injection]] | high | 6 |
| [[CrawlData]] | high | 2 |
| [[Database Schema]] | high | 9 |
| [[DDD Domain Design Rules]] | high | 20 |
| [[Dependency Injection Setup]] | high | 4 |
| [[Docker Compose - Local Dev]] | high | 2 |
| [[Domain Events]] | high | 4 |
| [[Domain Events Catalog]] | high | 4 |
| [[Environment Configuration]] | high | 8 |
| [[Error Mapping (Domain to HTTP)]] | high | 3 |
| [[File Upload Security]] | high | 3 |
| [[Frontend Architecture]] | high | 8 |
| [[Frontend Error Observability]] | high | 7 |
| [[Gamification]] | high | 9 |
| [[Gamification UX]] | high | 6 |
| [[Git Governance Policy]] | high | 4 |
| [[Global Deterministic Model Matrix]] | high | 5 |
| [[Health Check - Deep]] | high | 4 |
| [[Idempotency]] | high | 8 |
| [[Invitation Notification Delivery]] | high | 4 |
| [[Job Queue - Monitoring and Stability]] | high | 4 |
| [[LLM Gateway - OpenRouter]] | high | 6 |
| [[Logging Strategy]] | high | 4 |
| [[Migration Tooling]] | high | 2 |
| [[Progressive Context Enrichment]] | high | 2 |
| [[Project Dependencies]] | high | 4 |
| [[Project Brand Persona]] | high | 5 |
| [[Prompt Admin API]] | high | 5 |
| [[Prompt Caching Strategy]] | high | 6 |
| [[Prompt Components]] | high | 6 |
| [[Prompt Versioning]] | high | 7 |
| [[PromptComposer]] | high | 5 |
| [[Quality Gate Matrix]] | high | 7 |
| [[ReadinessPolicy]] | high | 3 |
| [[ReadinessSnapshot UI]] | high | 4 |
| [[Seed Data]] | high | 2 |
| [[Session List - Live Status]] | high | 5 |
| [[Session Machine (XState v5)]] | high | 4 |
| [[Secure SDLC Controls]] | high | 7 |
| [[Testing Strategy]] | high | 3 |
| [[Tool as Static Configuration]] | high | 4 |
| [[Tool UX Architecture]] | high | 7 |
| [[ToolPage Machine (XState v5)]] | high | 5 |
| [[UI Component Map]] | high | 6 |
| [[Usage & Quota]] | high | 2 |
| [[UX Wireframes]] | high | 6 |
| [[Workspace & Assets]] | high | 5 |
| [[Workspace Sharing]] | high | 5 |
| [[Workspace Permissions]] | high | 5 |
| [[XState Integration]] | high | 4 |
| [[packages-domain Structure]] | high | 5 |

## Synthesis

| Page | Description | Date Filed |
|------|-------------|------------|
| [[synthesis/backend-audit-gaps-improvements]] | Backend audit — 12 findings, all closed | 2026-07-30 |
| [[synthesis/backend-frontend-startup-gaps]] | Backend→Frontend startup gap analysis (15 items) | 2026-08-01 |
| [[synthesis/lint-report-2026-07-30]] | Wiki health-check — 0 orphans, 0 broken links | 2026-07-30 |
| [[synthesis/prompting-mechanics-proposal]] | Prompting mechanics architecture — versioning, components, context injection | 2026-08-01 |
| [[synthesis/workspace-sharing-proposal]] | Workspace sharing architecture — membership, permissions, invitations | 2026-08-01 |
| [[synthesis/agent-chat-proposal]] | Agent chat architecture — 7 agents, conversational context, SSE streaming | 2026-08-01 |
| [[synthesis/gamification-proposal]] | Gamification overlay — XP, badges, leaderboards, seasons, workspace health | 2026-08-01 |
| [[synthesis/project-model-multi-dimension-audit-2026-08-01]] | Project model governance audit — 4 areas, coverage assessment, maturity score, priority gaps | 2026-08-01 |
| [[synthesis/lint-report-2026-08-01-coherence]] | Coherence lint — structural pass, queued-state drift closed | 2026-08-01 |
| [[synthesis/implementation-roadmap-2026-08-01]] | Rational development roadmap — phase plan from bootstrap to expansion tracks | 2026-08-01 |
| [[synthesis/phase-8-real-auth-plan]] | Phase 8 implementation plan — Real Authentication (5 workstreams, 35 files) | 2026-08-02 |
| [[synthesis/frontend-mvp-plan-2026-08-01]] | Frontend MVP plan — 13 components, 5 routes, 7-step execution | 2026-08-01 |
| [[synthesis/lint-report-2026-08-01-coherence]] | Coherence lint — structural pass, queued-state drift closed | 2026-08-01 |
| [[synthesis/rule-4-vo-debt]] | 8 type-alias VOs catalogued with conversion roadmap | 2026-08-02 |
| [[synthesis/phase-9-architectural-targets]] | 11 VALIDATION + 5 STRUCTURAL gaps for Phase 9+ | 2026-08-02 |
| [[synthesis/phase-9-implementation-plan]] | Phase 9 implementation plan — 11 gaps across 4 phases, ~12h | 2026-08-02 |
| [[synthesis/code-review-2026-08-02]] | Multi-agent code review — phases 0–9, 41 findings (8 critical, 10 high, 18 medium, 5 low) | 2026-08-02 |
| [[synthesis/critical-fix-plan-2026-08-02]] | Critical findings implementation plan — 8 fixes, 3 phases, 27 files ✅ | 2026-08-02 |
| [[synthesis/high-fix-plan-2026-08-02]] | High-severity remediation plan — 10 findings (H1–H10), 5 phases, 19 files ✅ | 2026-08-02 |
| [[synthesis/medium-fix-plan-2026-08-02]] | Medium-severity remediation plan — 16 findings (M2–M18), 5 phases, M1 deferred ✅ | 2026-08-02 |
| [[synthesis/low-fix-plan-2026-08-02]] | Low-severity remediation plan — 5 findings (L1–L5), 2 phases, 8 files ✅ | 2026-08-02 |
| [[overview]] | High-level synthesis (v3) | 2026-07-31 |
