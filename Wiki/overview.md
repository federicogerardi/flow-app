---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/overview
date_updated: 2026-08-08
---

# Overview — Flow App

> High-level synthesis of all ingested knowledge. Updated when the big picture changes.

## What is Flow App?

Flow App is an AI-powered content generation platform for B2B marketing teams. It transforms contextual inputs (briefings, documents, keywords, API data) into structured marketing artifacts through a **unified multi-step prompt pipeline**. Every tool follows the same execution model — different configuration, same engine.

## Architecture

**6 bounded contexts**:

| Context | Category | Aggregate Root | Responsibility |
|---------|----------|---------------|----------------|
| [[Content Generation]] | Core | [[Session]] | Unified tool execution: acquisition → elaboration → final artifact |
| [[Workspace & Assets]] | Supporting | [[Workspace]] | Organization, reusable brand resources |
| [[Agent Chat]] | Supporting | [[Conversation]] | Conversational, multi-turn guidance with workspace-aware context injection |
| [[Gamification]] | Supporting | [[PlayerProfile]] | ✅ Event-driven XP, levels, badges (22), streaks, workspace challenges. BullMQ pipeline, 5 API endpoints. |
| [[Auth Dependencies]] | Generic | [[User]] | Auth, roles, sessions |
| [[Usage & Quota]] | Supporting | [[Quota]] | ✅ Domain + wiring complete. Two-track enforcement (artifact gate + credit quota). `ConsumeCreditsUseCase` integrated into session worker. `GET /api/usage/credits`. |

## Interaction Models

- **Deterministic generation**: [[Content Generation]] orchestrates tool execution through the unified step pipeline.
- **Conversational guidance**: [[Agent Chat]] provides persistent, user-private conversations with role-specific agents.
- **Engagement overlay**: [[Gamification]] reacts to cross-context domain events and updates player/workspace progress state.

## Tool Catalog (11 tools)

### Content
| toolKey | Output |
|---------|--------|
| `landing-funnel` | Landing page funnel (optin → quiz → VSL) |
| `landing-page` | Landing page + thank-you |
| `video-script-long-form` | Long-form video script (6 steps) |
| `video-description` | Video description |
| `blog-post` | SEO blog article | ✅ 3-step search→research→article. [[Blog Article Generator - Prompt Architecture|Prompt architecture]] documented. |
| `ad-copy` | Ad copy | ✅ 3-step cluster→angle→awareness. Meta Ads specialization. |

### Asset
| toolKey | Produced AssetType |
|---------|-------------------|
| `brief` | `brief` |
| `brand-voice` | `brand-voice` | ✅ 2-step extraction→TOV document. Consumes: brief (1) + optional supplementary file. |
| `buyer-persona` | `persona` |
| `marketing-angle` | `angle` | 🟡 Planned — 3-step extraction→matrix→activation. Consumes: brief (1) + personas (N). |

### Analysis
| toolKey | Output |
|---------|--------|
| `ai-overview-analysis` | Competitive presence analysis on Google AI Overview |

**Naming convention**: `{output}[-{variant}]`. Zero abbreviations, zero verbs, zero fantasy names.

## The Unified Tool Model

1. **Acquisition** (pre-flight): gather data from user text, file upload, API calls, workspace assets
2. **Elaboration** (1..N steps): each step is an LLM prompt, receiving previous output (`serial`) or previous output + API data (`hybrid`)
3. **Final step**: the last step in the array — produces the promotable [[Artifact]]

## Key Decisions

- **XState v5** in application layer as workflow orchestrator. Domain is framework-agnostic.
- **Tool = static config** in `packages/domain`. 11 tools, same execution engine.
- **Session** is the aggregate root for all generation — content, asset, and analysis tools.
- **CrawlData** is a Value Object in Content Generation — raw API data persisted for replay/cache.
- **Asset toolKey = AssetType** — 1:1 mapping, zero lookup tables.
- **Domain Events** (in-process) connect contexts: `SessionCompleted` → Asset promotion + credit consumption.

## Sources

4 source documents fully ingested. Original raw files (`doodle/`) have been removed — all content now lives in [[index|this wiki]].

## Implementation Status

### Completed (Phase 0–13 + Brief Tool)

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 0 — Foundation Bootstrap | ✅ | Monorepo, tooling, CI, Docker Compose |
| Phase 1 — Core Async Generation | ✅ | Session aggregate, BullMQ worker, XState machine, SSE events, idempotency |
| Phase 2 — Reliability & Ops Hardening | ✅ | Optimistic locking, health monitor, graceful shutdown, cleanup job |
| Phase 3 — Workspace Collaboration | ✅ | Membership model, role enforcement, API routes, middleware |
| Phase 4 — Prompt Governance Runtime | ✅ | Prompt versioning, components, composer, filesystem repository |
| Phase 5 — Expansion Tracks | ✅ | Agent Chat (Conversation, Message, 7 agents) |
| Phase 6 — Real LLM Integration | ✅ | LlmGateway, ModelRegistry, 4 tiers, worker + chat wiring |
| Phase 7 — Frontend MVP | ✅ | 4 shared components, 4 pages, 5 routes, MUI + SWR + react-router v7 |
| Phase 8 — Real Authentication | ✅ | Backend (JWT, bcrypt, Passport, 7 endpoints) + Frontend (AuthContext, AuthGuard, LoginPage, RegisterPage, OAuthCallback, protected routes) |
| Phase 9 — DDD Architectural Remediation | ✅ | 8 type aliases → classes, 12 DomainError subclasses, discriminated union |
| Phase 10 — Deployment & CI/CD | ✅ | Dockerfile (multi-stage), railway.json, GitHub Actions CI + Deploy, .dockerignore |
| Phase 11 — Testing & Quality | ✅ | 66 test files, ~634 tests, vitest production configs, CI quality gates |
| Phase 11.5 — Usage & Quota Domain | ✅ | Bounded context: 10 files, 40 tests, Kysely repository, optimistic locking |
| Phase 12 — Usage & Quota Wiring | ✅ | `ConsumeCreditsUseCase` (optimistic retry), session worker integration, `GET /api/usage/credits` |
| Phase 13 — Gamification | ✅ | 50 files: 2 aggregates, 9 VOs, 22 badges, 5 challenges, BullMQ pipeline, 5 API endpoints |
| **Frontend Drift Remediation** | ✅ | 27 findings across 8 phases: XState v5 rewrite, SSEClient disconnect/reconnect, tool page machine, feedback panel, session list cards, session page, API contract alignment, UX polish. 40 files, +5013/-407 lines. |
| **G1–G4 Runtime Remediation** | ✅ | 4 runtime gaps fixed (2026-08-11): `failedAtStep` in XState machine failure SSE, `useSession` artifact extraction → `FeedbackPanel` live previews, `currentStepLabel` in listSessions, `stepLabel` in getSession artifacts. Contracts aligned (`ArtifactListItemDTO[]` → `ArtifactDTO[]`). 6 files, 0 regressions. |
| **Brief Tool** | ✅ | 2-step extraction→generation pipeline, 11-section Italian output, FileUpload, SSE completion, smoke test passed |
| **Multi-Asset Promotion** | ✅ | Tools can consume N assets of same type (e.g. 3 personas). 22 steps across 7 phases: `AssetInput.multiple`, `Map<string, string[]>`, migration 011, `AssetResolver` + `selectedAssetIds`, `PromoteToAssetUseCase` idempotency, `AssetPicker` UI component, 490 domain + 138 backend tests. |

### No Planned Phases

All phases through 13 + the Brief Tool + Multi-Asset Promotion + Frontend Drift Remediation + BE DTO Alignment + ToolPage Test Suite are fully implemented.

### Remaining Stubs

| Gap | Status |
|-----|--------|
| **Credits auto-create** | ✅ Fixed — migration 009 (`version` column on `quotas`) was missing on Railway. Applied manually + auto-migration runner now ensures all migrations run on every deploy. [[Migration Tooling]] |
| **5 other tool definitions** | 🟡 Stubs — `landing-funnel`, `landing-page`, `video-script-long-form`, `video-description`, `ai-overview-analysis` all map to `blogPostTool`. `brief`, `buyer-persona`, `brand-voice`, `marketing-angle`, and `ad-copy` have real definitions. |
| **CrawlData value object** | 🟡 Implemented in domain layer (`CrawlData.create()` / `reconstitute()`). `ai-overview-analysis` session worker integration still pending. |
| **Worker deployment** | ✅ Fixed — worker now runs inline in `server.ts` (same process as API). `worker-process.ts` retained as standalone reference. Verified on Railway: pending sessions auto-picked and completed on deploy. |

## Infrastructure (Needs Railway provisioning)

| Resource | Endpoint | Status |
|----------|----------|--------|
| PostgreSQL | Railway dev (TCP proxy 5432) | ✅ 26 tables, 10 migrations |
| Redis | Railway dev (TCP proxy 6379) | ✅ ACTIVE |
| Backend API | `localhost:3000` | ✅ 27 endpoints verified |
| BullMQ Worker | Inline in server process | ✅ Processes session jobs (concurrency: 5). Formerly separate `worker-process.ts`, now started from `server.ts`. Verified on Railway deploy. |
| LLM Gateway | OpenRouter (`OPENROUTER_API_KEY`) | ✅ 4 model tiers, fallback chain |
| Dockerfile | Multi-stage (Node 22-alpine) | ✅ Phase 10 |
| CI/CD | GitHub Actions (lint, typecheck, test, build, deploy) | ✅ Phase 10 |
| Migration Runner | Inline in server startup | ✅ Auto-runs on every deploy via `runMigrations()`. Idempotent — skips already-applied migrations. Auto-detects manually-applied migrations. [[Migration Tooling]] |
