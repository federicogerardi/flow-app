---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/overview
date_updated: 2026-08-18
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
| [[Gamification]] | Supporting | [[PlayerProfile]], [[WorkspaceChallenge]] | ✅ Event-driven XP, levels, badges (22), streaks, workspace challenges. BullMQ pipeline, 5 API endpoints. |
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
- **Domain Events** (in-process) connect contexts: `SessionCompleted` → credit consumption. Asset promotion is an explicit user action (`POST /api/artifacts/:id/promote`), not event-driven.

## Sources

11 source summaries ingested (4 foundational docs + 7 prompt generators). Original raw files have been removed — all content now lives in [[index|this wiki]].

## Implementation Status

**Pre-staging: all phases shipped.** Phases 0–13 (foundation → gamification), Brief Tool, Multi-Asset Promotion, Frontend Drift Remediation, and the ToolPage test suite are implemented and verified. Historical phase-by-phase detail has been retired from this overview; current system state lives in the concept pages above.

### Remaining Stubs

| Gap | Status |
|-----|--------|
| **5 other tool definitions** | 🟡 Stubs — `landing-funnel`, `landing-page`, `video-script-long-form`, `video-description`, `ai-overview-analysis` all map to `blogPostTool`. Asset tools have real definitions. |
| **CrawlData worker integration** | 🟡 `CrawlData` VO implemented; `ai-overview-analysis` session worker integration pending. |

## Infrastructure (Needs Railway provisioning)

| Resource | Endpoint | Status |
|----------|----------|--------|
| PostgreSQL | Railway dev (TCP proxy 5432) | ✅ 26 tables, 10 migrations |
| Redis | Railway dev (TCP proxy 6379) | ✅ ACTIVE |
| Backend API | `localhost:3000` | ✅ Endpoints verified — see [[API Routes]] for the catalog |
| BullMQ Worker | Inline in server process | ✅ Processes session jobs (concurrency: 5). Formerly separate `worker-process.ts`, now started from `server.ts`. Verified on Railway deploy. |
| LLM Gateway | OpenRouter (`OPENROUTER_API_KEY`) | ✅ 4 model tiers, fallback chain |
| Dockerfile | Multi-stage (Node 22-alpine) | ✅ Phase 10 |
| CI/CD | GitHub Actions (lint, typecheck, test, build, deploy) | ✅ Phase 10 |
| Migration Runner | Inline in server startup | ✅ Auto-runs on every deploy via `runMigrations()`. Idempotent — skips already-applied migrations. Auto-detects manually-applied migrations. [[Database Schema]] |
