---
type: index
tags:
  - wiki/index
date_updated: 2026-07-31
---

# Wiki Index — Flow App

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
| [[Workspace]] | Workspace & Assets | Aggregate Root | 4 |
| [[Asset]] | Workspace & Assets | Entity | 4 |
| [[User]] | Identity & Access | Aggregate Root | 2 |
| [[Quota]] | Usage & Quota | Aggregate Root | 2 |

## Concepts

| Page | Confidence | Source Count |
|------|------------|--------------|
| [[API Client + SSE Client]] | high | 4 |
| [[API Documentation - OpenAPI]] | high | 2 |
| [[API Routes]] | high | 3 |
| [[Application Services]] | high | 4 |
| [[ArtifactContent]] | high | 3 |
| [[Asset Promotion]] | high | 4 |
| [[AssetResolver]] | high | 4 |
| [[Auth Dependencies]] | high | 5 |
| [[Auth Middleware]] | high | 4 |
| [[BullMQ Worker Wiring]] | high | 5 |
| [[Centralized Copy Modules]] | high | 3 |
| [[Content Generation]] | high | 4 |
| [[Contracts Package]] | high | 4 |
| [[CrawlData]] | high | 2 |
| [[Database Schema]] | high | 8 |
| [[Design Tokens]] | high | 6 |
| [[Dependency Injection Setup]] | high | 4 |
| [[Docker Compose - Local Dev]] | high | 2 |
| [[Domain Events]] | high | 4 |
| [[Domain Events Catalog]] | high | 4 |
| [[Environment Configuration]] | high | 6 |
| [[Error Mapping (Domain to HTTP)]] | high | 2 |
| [[File Upload Security]] | high | 3 |
| [[Frontend Architecture]] | high | 7 |
| [[Health Check - Deep]] | high | 4 |
| [[Identity & Access]] | high | 2 |
| [[Idempotency Implementation]] | high | 4 |
| [[IdempotencyKey]] | high | 3 |
| [[Job Queue - Monitoring and Stability]] | high | 4 |
| [[LLM Gateway - OpenRouter]] | high | 4 |
| [[Logging Strategy]] | high | 4 |
| [[Migration Tooling]] | high | 2 |
| [[Progressive Context Enrichment]] | high | 2 |
| [[Project Dependencies]] | high | 4 |
| [[ReadinessPolicy]] | high | 3 |
| [[ReadinessSnapshot UI]] | high | 4 |
| [[Seed Data]] | high | 2 |
| [[Session List - Live Status]] | high | 5 |
| [[Session Machine (XState v5)]] | high | 4 |
| [[Testing Strategy]] | high | 3 |
| [[Tool as Static Configuration]] | high | 4 |
| [[Tool UX Architecture]] | high | 7 |
| [[ToolPage Machine (XState v5)]] | high | 5 |
| [[UI Component Map]] | high | 6 |
| [[Usage & Quota]] | high | 2 |
| [[UX Wireframes]] | high | 6 |
| [[Workspace & Assets]] | high | 4 |
| [[XState Integration]] | high | 4 |
| [[packages-domain Structure]] | high | 5 |

## Synthesis

| Page | Description | Date Filed |
|------|-------------|------------|
| [[synthesis/backend-audit-gaps-improvements]] | Backend audit — 12 findings, all closed | 2026-07-30 |
| [[synthesis/backend-frontend-startup-gaps]] | Backend→Frontend startup gap analysis (15 items) | 2026-07-30 |
| [[synthesis/lint-report-2026-07-30]] | Wiki health-check — 0 orphans, 0 broken links | 2026-07-30 |
| [[overview]] | High-level synthesis (v3) | 2026-07-31 |
