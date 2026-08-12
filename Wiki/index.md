---
type: index
tags:
  - wiki/index
date_updated: 2026-08-12
---

# Wiki Index — Flow App

> **Chronological log**: see [[log]] for all wiki and codebase operations.

## Processed Sources

| File | Summary Page | Date Ingested |
|------|-------------|---------------|
| APP-CONCEPT.md | [[sources/APP-CONCEPT]] | 2026-07-30 |
| PRD.md | [[sources/PRD]] | 2026-07-30 |
| STARTUP.md | [[sources/STARTUP]] | 2026-07-30 |
| USER-STORIES.md | [[sources/USER-STORIES]] | 2026-07-30 |
| prompt_extraction.md, prompt_brief_generation.md | [[sources/brief-generator]] | 2026-08-06 |
| prompt_extraction.md, prompt_personas_generation.md | [[sources/personas-generator]] | 2026-08-06 |
| prompt_root.md, prompt_extraction.md, prompt_context_and_angle_matrix.md, prompt_angle_prioritization.md, prompt_creative_activation.md | [[sources/angle-generator]] | 2026-08-07 |
| prompt_extraction.md, prompt_context_generation.md, prompt_ads_generation.md | [[sources/meta-ads]] | 2026-08-07 |
| prompt_extraction.md, prompt_tov_generation.md | [[sources/tov-generator]] | 2026-08-11 |

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

## Concepts

| Page | Confidence | Source Count |
|------|------------|--------------|
| [[API Client + SSE Client]] | high | 4 [+G2 runtime fix] |
| [[API Contract Baseline v1]] | high | 7 |
| [[API Documentation - OpenAPI]] | high | 3 |
| [[API Routes]] | high | 4 |
| [[API SLO Catalog]] | high | 5 |
| [[Agent Chat]] | high | 8 |
| [[Agent Chat UX]] | high | 8 |
| [[Agent Personas]] | high | 4 |
| [[Angle Generator - Prompt Architecture]] | high | 6 |
| [[Application Services]] | high | 4 |
| [[Asset Promotion]] | high | 5 |
| [[AssetResolver]] | high | 5 |
| [[Auth Dependencies]] | high | 8 |
| [[Auth Middleware]] | high | 5 |
| [[Brief Tool - Prompt Architecture]] | high | 3 |
| [[BullMQ Worker Wiring]] | high | 5 |
| [[CI-CD Promotion Policy]] | high | 7 |
| [[Centralized Copy Modules]] | high | 3 |
| [[Concurrency & Conflict Policy]] | high | 8 |
| [[Content Generation]] | high | 5 |
| [[Contracts Package]] | high | 5 |
| [[Creating a New Tool]] | high | 5 |
| [[Context Injection]] | high | 6 |
| [[Database Schema]] | high | 9 |
| [[DDD Domain Design Rules]] | high | 20 |
| [[Dependency Injection Setup]] | high | 4 |
| [[Design Tokens]] | high | 6 |
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
| [[Job Queue - Monitoring and Stability]] | high | 4 |
| [[LLM Gateway - OpenRouter]] | high | 6 |
| [[Logging Strategy]] | high | 4 |
| [[Meta Ads - Prompt Architecture]] | high | 3 |
| [[Migration Tooling]] | high | 2 |
| [[Persona Generator - Prompt Architecture]] | high | 4 |
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
| [[Session List - Live Status]] | high | 5 [+G3 stub annotation] |
| [[Session Machine (XState v5)]] | high | 4 |
| [[SessionPage]] | high | 5 [+G2 fix] |
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
| [[XState Integration]] | high | 4 |
| [[packages-domain Structure]] | high | 5 |

## Synthesis

| Page | Description | Date Filed |
|------|-------------|------------|
| [[synthesis/workspace-sharing-proposal]] | Archived — workspace sharing architecture decision record | 2026-08-01 |
| [[synthesis/deployment-patterns-phase-10]] | Deployment patterns — reverse proxy, build-time vs runtime URL, lessons learned | 2026-08-02 |
| [[synthesis/prompting-mechanics-proposal]] | Archived — prompting mechanics architecture (migration path preserved) | 2026-08-01 |
| [[synthesis/project-model-multi-dimension-audit-2026-08-01]] | Project model governance audit — 4 areas, coverage assessment, maturity score, priority gaps | 2026-08-01 |
| [[synthesis/implementation-roadmap-2026-08-01]] | Rational development roadmap — phase plan from bootstrap to expansion tracks | 2026-08-01 |
| [[synthesis/phase-8-real-auth-plan]] | Phase 8 implementation plan — Real Authentication (5 workstreams, 35 files) | 2026-08-02 |
| [[synthesis/frontend-mvp-plan-2026-08-01]] | Frontend MVP plan — 13 components, 5 routes, 7-step execution | 2026-08-01 |
| [[synthesis/phase-9-architectural-targets]] | 11 VALIDATION + 5 STRUCTURAL gaps for Phase 9+ | 2026-08-02 |
| [[synthesis/phase-9-implementation-plan]] | Phase 9 implementation plan — 11 gaps across 4 phases, ~12h | 2026-08-02 |
| [[synthesis/code-review-2026-08-02]] | Multi-agent code review — phases 0–9, 41 findings (8 critical, 10 high, 18 medium, 5 low) | 2026-08-02 |
| [[synthesis/critical-fix-plan-2026-08-02]] | Critical findings implementation plan — 8 fixes, 3 phases, 27 files ✅ | 2026-08-02 |
| [[synthesis/high-fix-plan-2026-08-02]] | High-severity remediation plan — 10 findings (H1–H10), 5 phases, 19 files ✅ | 2026-08-02 |
| [[synthesis/medium-fix-plan-2026-08-02]] | Medium-severity remediation plan — 16 findings (M2–M18), 5 phases, M1 deferred ✅ | 2026-08-02 |
| [[synthesis/low-fix-plan-2026-08-02]] | Low-severity remediation plan — 5 findings (L1–L5), 2 phases, 8 files ✅ | 2026-08-02 |
| [[synthesis/nodejs-thin-reverse-proxy-proposal]] | Node.js thin reverse proxy — frontend-backend internal DNS, eliminates public backend URL | 2026-08-03 |
| [[synthesis/nodejs-thin-reverse-proxy-plan]] | Implementation plan for the thin reverse proxy — 8 steps, 6 files, ~1h | 2026-08-06 |
| [[synthesis/reverse-proxy-deploy-log]] | Deployment log — 9 Railway attempts, 6 root causes, ✅ resolved | 2026-08-06 |
| [[synthesis/phase-11-testing-plan]] | Phase 11 implementation plan — 76 test files, 6 sub-phases, DDD guardrails, wiki-vs-code scope exclusion | 2026-08-03 |
| [[synthesis/usage-quota-implementation-plan]] | Usage & Quota domain implementation — 13 new files, 7 modified, aggregate + VOs + repository + wiring | 2026-08-04 |
| [[synthesis/frontend-gap-analysis-2026-08-04]] | Frontend operational gap analysis — 28 missing components, 7 execution tracks, sprint roadmap | 2026-08-04 |
| [[synthesis/kysely-vulnerability-analysis-2026-08-07]] | Kysely CVE impact & surface analysis — 3 CVEs, 0 exploitable vectors, zero-risk upgrade | 2026-08-07 |
| [[synthesis/remediation-plan-2026-08-07]] | Remediation plan for diagnostic findings — 12 fixes across 5 phases | 2026-08-07 |
| [[synthesis/railway-backend-diagnostics-2026-08-07]] | Railway backend health sweep — 4 findings (0 critical), metrics baseline, action items | 2026-08-07 |
| [[synthesis/multi-asset-implementation-plan]] | Multi-asset promotion — 22 steps across 7 phases + 6 new test files + 7 updated | 2026-08-06 |
| [[synthesis/UX Spec Summary-2026-08-07]] | UX Design Summary — 9 sections consolidating UX wiki specs for backend architecture handoff | 2026-08-07 |
| [[synthesis/ui-design-summary-2026-08-07]] | UI Design Summary — full-stack design reference: 37-component inventory with status, complete design tokens, layout architecture, component props/interfaces/MUI internals/state bindings, gamification visual system, WCAG 2.1 AA requirements, implementation priority | 2026-08-07 |
| [[synthesis/frontend-drift-report-2026-08-07]] | Frontend drift report — 91 files examined, 15 critical + 12 high drifts: XState skeletal, missing variants, DTO gaps, SSE contract mismatch | 2026-08-07 |
| [[synthesis/frontend-drift-remediation-plan-2026-08-07]] | Frontend drift remediation plan — 27 findings across 8 phases, 40+ files, phased dependency chain | 2026-08-07 |
| [[synthesis/be-coordination-session-dto-2026-08-07]] | Backend coordination plan — Steps 0–11 resolved 2026-08-11. queuePosition deferred (stub). xpEarned deferred. | 2026-08-11 |
| [[synthesis/testing-plan-xstate-toolpage-2026-08-07]] | Testing plan — ✅ 79 unit/component tests implemented: 34 machine + 10 deriveUIState + 7 ToolPageLayout + 28 session cards | 2026-08-08 |
| [[synthesis/e2e-test-plan-tool-page-2026-08-07]] | E2E test plan — ✅ 8 Playwright scenarios scaffolded: happy path, upload, asset, error+retry, SSE resilience, accessibility, session list, gamification | 2026-08-08 |
| [[synthesis/open-findings-plan-2026-08-08]] | Open findings remediation — 4 gaps: 55 copy violations (8 files), 2 embedded gamification components, 2 missing tests, 1 migration deploy. ~5.75h, 1 day | 2026-08-08 |
| [[synthesis/session-ui-improvement-spec-2026-08-08]] | Session UI improvement spec — 32 findings: 14 copy violations, 12 a11y gaps, 4 drifts, 2 visual issues. ✅ 32/32 resolved | 2026-08-11 |
| [[synthesis/session-ui-improvement-addendum-2026-08-08]] | Session UI addendum — 7 remaining gaps resolved: 1 SSE integration + 6 a11y ARIA refinements. ✅ | 2026-08-11 |
| [[synthesis/railway-deploy-40x-2026-08-08]] | Railway deploy 40X analysis — 1 real bug (missing PUT /api/me/profile) + 14x 401 race condition. Implementation plan for streak mode + silent retry guard | 2026-08-08 |
| [[synthesis/project-improvement-ui-2026-08-08]] | Project Improvement UI — active findings collection for the 2026-08-08 improvement session. Baseline audit: 48 .tsx files, 288 sx={{ }}, 4 hardcoded gradients, 0 CSS modules | 2026-08-08 |
| [[overview]] | High-level synthesis (v3) | 2026-08-04 |
| [[synthesis/worker-gamification-fix-2026-08-08]] | Worker gamification fix — 2 bugs: terminal session crash + XP/credits for failed/cancelled. Implementation plan: 1 file, 2 phases, 7 new tests | 2026-08-08 |
| [[synthesis/generation-sse-wiring-remediation-2026-08-12]] | Generation SSE & FE wiring unified remediation — 15-file diagnostic (4 audits), 13-file plan (~110 lines): fix duplicate 2N-1→N SSE events, error propagation, label bugs, timer drift, UI disorganization | 2026-08-12 |
