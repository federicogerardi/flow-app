---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/overview
date_updated: 2026-08-04
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
| [[Gamification]] | Supporting | [[PlayerProfile]] | Event-driven XP, levels, badges, streaks, workspace challenges |
| [[Auth Dependencies]] | Generic | [[User]] | Auth, roles, sessions |
| [[Usage & Quota]] | Supporting | [[Quota]] | ✅ Domain complete (10 files, 40 tests). Repository with optimistic locking. Wiring (use cases + API) pending. |

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
| `blog-post` | SEO blog article |
| `ad-copy` | Ad copy |

### Asset
| toolKey | Produced AssetType |
|---------|-------------------|
| `brief` | `brief` |
| `brand-voice` | `brand-voice` |
| `buyer-persona` | `persona` |
| `marketing-angle` | `angle` |

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

### Completed (Phase 0–11.5)

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
| Phase 11.5 — Usage & Quota Domain | ✅ | Bounded context: 10 files, 40 tests, Kysely repository, optimistic locking, backend wiring |

### Planned (Phase 12)

| Phase | Priority | Scope |
|-------|----------|-------|
| Phase 12 — Gamification | 🟢 Medium | Points, achievements, leaderboards, event-driven rewards |

### Critical Gaps (remaining)

1. **Usage & Quota wiring** — Domain and persistence layer complete. Use cases (`EnsureQuotaUseCase`, `ConsumeCreditsUseCase`), event subscriptions, and API routes still pending.

## Infrastructure (Needs Railway provisioning)

| Resource | Endpoint | Status |
|----------|----------|--------|
| PostgreSQL | Railway dev (TCP proxy 5432) | ✅ 19 tables, 8 migrations |
| Redis | Railway dev (TCP proxy 6379) | ✅ ACTIVE |
| Backend API | `localhost:3000` | ✅ 22 endpoints verified |
| LLM Gateway | OpenRouter (`OPENROUTER_API_KEY`) | ✅ 4 model tiers, fallback chain |
| Dockerfile | Multi-stage (Node 22-alpine) | ✅ Phase 10 |
| CI/CD | GitHub Actions (lint, typecheck, test, build, deploy) | ✅ Phase 10 |
| railway.json | Railway service definition | ✅ Phase 10 |
