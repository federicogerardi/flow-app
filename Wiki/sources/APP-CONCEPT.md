---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/architecture
date_updated: 2026-07-31
source: "doodle/APP-CONCEPT.md (raw)"
---

# APP-CONCEPT — App Concept Document

> Source: `doodle/APP-CONCEPT.md` (removed — content now lives in this wiki)

> **Name mapping (v1 → v3 rename)**: `funnel-pages` → `landing-funnel`, `nextland` → `landing-page`, `youtube-lf-script` → `video-script-long-form`, `angle-generator` → `marketing-angle`, `youtube-description` → `video-description`, `geometric` → `ai-overview-analysis`, `blog-article-generator` → `blog-post`, `brief-generator` → `brief`, `tov-generator` → `brand-voice`, `personas-generator` → `buyer-persona`, `meta-ads` → `ad-copy`. Bounded contexts reduced from 6 (v1) to 4 (v3): `Generation` + `Frontend/UI` merged into [[Content Generation]]; `Crawling & Extraction` + `Competitor Analysis` folded into [[Content Generation]] as acquisition phases.

## Summary

Flow App is an AI-powered platform for structured marketing content generation. Each **Tool** is a complete capability that accepts contextual inputs (briefings, documents, brand voice), executes an ordered chain of LLM-based processing steps, and produces ready-to-use artifacts.

**Key claim**: "No black box" — every generation step is visible, repeatable, and traceable. Outputs are versioned, downloadable, and associated with the workspace.

## Target Users

B2B marketing and content creation teams needing multi-channel content at scale, strategic insights from documents, SERP competitive analysis, and reusable brand assets.

## Tool Catalog (11 active)

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| funnel-pages | Landing page funnel generation | Briefing file | Landing page content |
| nextland | Nextland pages | Briefing file | Nextland content |
| youtube-lf-script | YouTube long-form script (6 step) | Briefing file | Structured script |
| angle-generator | Marketing angle extraction | 2 files (Briefing + AngleDetector) | `angle` Asset |
| youtube-description | YouTube descriptions | Direct input (no file) | Optimized description |
| geometric | SERP competitive analysis (4 steps: crawling → scoring → reporting) | Direct input + SerpAPI | StrategicReport + UnifiedReport |
| blog-article-generator | SEO blog articles (3 steps) | File + direct input | Structured article |
| brief-generator | Brief generation from documents | File | `brief` Asset |
| tov-generator | Tone of Voice extraction | File | `brand-voice` Asset |
| personas-generator | Persona generation | File | `persona` Asset |
| meta-ads | Meta Ads copy (reactivated) | File + direct input | `ad-copy` Asset |

## Architecture Pillars

1. **Domain-Driven Design** — 6 bounded contexts, 230+ naming decisions tracked
2. **XState v5 as Aggregate Root** — entire generation pipeline modeled as explicit state machines, used in both backend (`GenerationSystem`) and frontend (`ToolPage`)

## Bounded Contexts (original v1)

| Context | Responsibility | Aggregate Root |
|---------|---------------|----------------|
| Generation | Artifact production orchestration: routing, streaming, persistence, idempotency | `GenerationSystem` |
| Auth | Identity: registration, sessions, roles, OAuth | — |
| Usage/Quota | Tracking and enforcement of per-user limits (credits) | — |
| Frontend/UI | Tool page session, step flow, readiness computation, history | `ToolPage` |
| Crawling & Extraction | Async web crawling, SERP scraping, anti-bot bypass | — |
| Competitor Analysis | Competitor grouping, weighted scoring, tier assignment | — |

## BE-Driven Workflow

Shift from HTTP FE-driven loop to async BE-driven execution via BullMQ.

**Before**: N+1 HTTP calls per tool (orchestrate + generate per step)
**After**: 1 submit + 1 SSE connection; BullMQ worker continues even with tab closed

Key components: `ToolWorkflowJob` (aggregate root), `JobEventBridge` (Redis pub/sub), `JobProgressSerializer`.

## Registry-Driven Frontend

Single `ToolPageTemplate` (~150 LOC) deriving behavior from declarative `ToolFormRegistry`. New tool: 5 files, ~100 lines, ~30 minutes. Zero tool-specific component duplication.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces |
| Backend | Node.js, XState v5, Kysely, pg, Redis, BullMQ, Zod |
| Frontend | React 19, XState v5, MUI, Vite, Vitest, SWR |
| Contracts | `packages/contracts` — authoritative shared FE/BE source |
| Domain | `packages/domain` — framework-agnostic, never imports FE/BE types |
| Infra-DB | `packages/infra-db` — migrations and seeds |
| Deployment | Railway (Dockerfile, same-origin proxy `server.mjs`) |

## Key Architectural Decisions

- ADR-001: Unified frontend data access layer
- ADR-003: Explicit Error States in all XState machines
- DDD-081: Tool Input File Requirement Policy — blocking vs advisory
- DDD-116: `WorkflowStepType` extended with `crawling` and `scoring`
- Registry-driven routing: no tool-specific guards in `GenerationSystem`

## Entities Mentioned

- Tool, GenerationSystem, ToolPage, WorkflowStep, Asset, Artifact, Workspace
- ToolWorkflowJob, JobEventBridge, JobProgressSerializer

## Concepts Mentioned

- BE-Driven Workflow, Registry-Driven Architecture, DDD-first, XState as Aggregate Root
- Progressive Context Enrichment, Idempotency, SSE streaming
- Bounded Context, Prompt Template anti-hallucination
