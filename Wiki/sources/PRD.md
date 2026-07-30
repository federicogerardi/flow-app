---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/requirements
date_updated: 2026-07-30
source: "[[doodle/PRD]]"
---

# PRD — Product Requirement Document

> Source: [[doodle/PRD]] (257 lines, Italian)

## Summary

Product requirement document for Flow App. Defines functional requirements across 6 categories, non-functional requirements across 5 dimensions, user personas, roadmap with 3 horizons, acceptance criteria, and success metrics.

## User Personas

| Persona | Role | Primary JTBD |
|---------|------|-------------|
| Content Marketer | Marketing Manager / Content Strategist | Produce multi-channel content coherently without restarting per format |
| SEO & Competitive Analyst | SEO Specialist / Growth Marketer | Understand competitors and SERP positioning without manual scraping |
| System Admin | Admin / Platform Owner | Configure LLM models, API services, permissions without touching code |

## Functional Requirements Summary

### Tool Catalog (11 tools, FR-T01 to FR-T11)
All 11 tools implemented or reactivated. See [[APP-CONCEPT]] for full catalog.

### Workflow & Generation (FR-W01 to FR-W09)
- **BE-Driven Workflow** (FR-W01): Async execution via BullMQ, SSE progress — ✅
- **Idempotency** (FR-W02): `IdempotencyKey`, replay, conflict detection — ✅
- **Resume/Regenerate** (FR-W03): Resume interrupted workflows, regenerate specific steps — ✅
- **Cancellation** (FR-W04): `POST /cancel` with per-step flag check — ✅
- **Two-level credits** (FR-W05): Artifact gate (anti-abuse, invisible) + credit consumption on final step — ✅
- **Per-step LLM model override** (FR-W06): Static config for specific tool steps — 🔄 Partial
- **Global Deterministic Model Matrix** (FR-W07): Extend to all 22 LLM steps — 📝 Proposal
- **Output Personalization** (FR-W08): Multi-variant fan-out, HITL, feedback RAG — 📝 Proposal
- **Project Brand Persona** (FR-W09): Auto-inject brand voice at workspace level — 📝 Proposal

### Workspace & Asset (FR-A01 to FR-A05)
CRUD for asset types, automatic injection via `AssetFieldMapping`, Knowledge Panel selection, promote-to-asset with deterministic `toolKey→assetType` mapping.

### Administration (FR-AD01 to FR-AD06)
User management, LLM model CRUD, API service CRUD, changelog, user reports, Geometric admin debug (proposed).

### Auth & Security (FR-S01 to FR-S06)
OAuth (Google, GitHub) + email/password, RBAC, CSRF fail-closed, rate limiting, quota enforcement, JWT + refresh tokens.

### UI (FR-U01 to FR-U11)
Registry-driven tool pages, readiness snapshot, canonical UI state derivation (8 states), explicit error states, unified feedback panel, accessibility, dark/light mode, session history, artifact history, `.docx`/`.pdf` export.

## Non-Functional Requirements

| Category | Key Requirements |
|----------|-----------------|
| Performance | Submit latency <500ms, SSE <2s, configurable PG pool |
| Reliability | No data loss, idempotency guaranteed, job retry, graceful degradation |
| Security | HTTPS only, Pino redaction, Zod validation, CORS same-origin |
| Observability | Structured logging (Pino), Railway metrics, error rate alerting, audit trail |
| Maintainability | Contract-first code sharing, domain isolation, test coverage ≥70%, doc-first |

## Roadmap

| Horizon | Epics |
|---------|-------|
| Q3 2026 | Global Model Matrix, Workspace Dashboard completion, Prompt Layer Quality, BE-Driven stabilization |
| Q4 2026 | Output Personalization, Geometric Admin Debug, Session Aggregation, CTA convergence |
| 2025+ | Multi-tenant, collaborative editing, advanced pricing, public API, i18n |

## Acceptance Criteria

Every feature must satisfy: DDD compliance (canonical terms), test coverage, typecheck pass, UI governance (archetype + CTA patterns + design tokens + feedback channels), accessibility, structured logging, doc + DDD entry if new domain concepts.

## Success Metrics

Time-to-first-artifact <3min, generation success rate >95%, user activation >70%, asset reuse rate >50%, NPS >40, HTTP error rate <1%.

## Entities Mentioned

- Workspace, Asset, Artifact, Tool, WorkflowStep, Session, IdempotencyKey
- LlmModel, ApiService, ToolStepBinding, ReadinessSnapshot

## Concepts Mentioned

- Two-level credits, BE-Driven workflow, Global Deterministic Model Matrix
- Progressive Context Enrichment, Canonical UI State Derivation, Explicit Error States