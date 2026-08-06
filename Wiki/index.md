---
type: index
tags:
  - wiki/index
date_updated: 2026-08-06
---

# Wiki Index — Flow App

> **Maintenance log**: see [[Maintenance Log]] for chronological history of wiki and codebase operations.

## Processed Sources

| File | Summary Page | Date Ingested |
|------|-------------|---------------|
| APP-CONCEPT.md | [[sources/APP-CONCEPT]] | 2026-07-30 |
| PRD.md | [[sources/PRD]] | 2026-07-30 |
| STARTUP.md | [[sources/STARTUP]] | 2026-07-30 |
| USER-STORIES.md | [[sources/USER-STORIES]] | 2026-07-30 |
| prompt_extraction.md, prompt_brief_generation.md | [[sources/brief-generator]] | 2026-08-06 |

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
| [[Brief Tool - Prompt Architecture]] | high | 3 |
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
| [[Invitation Notification Delivery]] | high | 4 |
| [[Job Queue - Monitoring and Stability]] | high | 4 |
| [[LLM Gateway - OpenRouter]] | high | 6 |
| [[Logging Strategy]] | high | 4 |
| [[Maintenance Log]] | high | 2 |
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
| [[SessionPage]] | high | 5 |
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
| [[synthesis/deployment-patterns-phase-10]] | Deployment patterns — reverse proxy, build-time vs runtime URL, lessons learned | 2026-08-02 |

| [[synthesis/agent-chat-proposal]] | Agent chat architecture — 7 agents, conversational context, SSE streaming | 2026-08-01 |
| [[synthesis/gamification-proposal]] | Gamification overlay — XP, badges, leaderboards, seasons, workspace health | 2026-08-01 |
| [[synthesis/project-model-multi-dimension-audit-2026-08-01]] | Project model governance audit — 4 areas, coverage assessment, maturity score, priority gaps | 2026-08-01 |
| [[synthesis/lint-report-2026-08-01-coherence]] | Coherence lint — structural pass, queued-state drift closed | 2026-08-01 |
| [[synthesis/implementation-roadmap-2026-08-01]] | Rational development roadmap — phase plan from bootstrap to expansion tracks | 2026-08-01 |
| [[synthesis/phase-8-real-auth-plan]] | Phase 8 implementation plan — Real Authentication (5 workstreams, 35 files) | 2026-08-02 |
| [[synthesis/frontend-mvp-plan-2026-08-01]] | Frontend MVP plan — 13 components, 5 routes, 7-step execution | 2026-08-01 |
| [[synthesis/rule-4-vo-debt]] | 8 type-alias VOs catalogued with conversion roadmap | 2026-08-02 |
| [[synthesis/phase-9-architectural-targets]] | 11 VALIDATION + 5 STRUCTURAL gaps for Phase 9+ | 2026-08-02 |
| [[synthesis/phase-9-implementation-plan]] | Phase 9 implementation plan — 11 gaps across 4 phases, ~12h | 2026-08-02 |
| [[synthesis/code-review-2026-08-02]] | Multi-agent code review — phases 0–9, 41 findings (8 critical, 10 high, 18 medium, 5 low) | 2026-08-02 |
| [[synthesis/critical-fix-plan-2026-08-02]] | Critical findings implementation plan — 8 fixes, 3 phases, 27 files ✅ | 2026-08-02 |
| [[synthesis/high-fix-plan-2026-08-02]] | High-severity remediation plan — 10 findings (H1–H10), 5 phases, 19 files ✅ | 2026-08-02 |
| [[synthesis/medium-fix-plan-2026-08-02]] | Medium-severity remediation plan — 16 findings (M2–M18), 5 phases, M1 deferred ✅ | 2026-08-02 |
| [[synthesis/low-fix-plan-2026-08-02]] | Low-severity remediation plan — 5 findings (L1–L5), 2 phases, 8 files ✅ | 2026-08-02 |
| [[synthesis/nodejs-thin-reverse-proxy-proposal]] | Node.js thin reverse proxy — frontend-backend internal DNS, eliminates public backend URL | 2026-08-03 |
| [[synthesis/nodejs-thin-reverse-proxy-plan]] | Implementation plan for the thin reverse proxy — 8 steps, 6 files, ~1h | 2026-08-03 |
| [[synthesis/reverse-proxy-deploy-log]] | Deployment log — 9 Railway attempts, 6 root causes, ✅ resolved | 2026-08-03 |
| [[synthesis/phase-11-testing-plan]] | Phase 11 implementation plan — 76 test files, 6 sub-phases, DDD guardrails, wiki-vs-code scope exclusion | 2026-08-03 |
| [[synthesis/usage-quota-implementation-plan]] | Usage & Quota domain implementation — 13 new files, 7 modified, aggregate + VOs + repository + wiring | 2026-08-04 |
| [[synthesis/frontend-gap-analysis-2026-08-04]] | Frontend operational gap analysis — 28 missing components, 7 execution tracks, sprint roadmap | 2026-08-04 |
| [[overview]] | High-level synthesis (v3) | 2026-08-04 |
