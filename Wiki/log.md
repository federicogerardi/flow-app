---
type: log
tags:
  - wiki/log
---

# Operation Log

> Append-only. Each entry: `## [YYYY-MM-DD] operation | Title`

## [2026-07-30] scaffold | Wiki initialized

## [2026-07-30] ingest | All 4 doodle sources

## [2026-07-30] brainstorm | DDD architecture v2 → v3

## [2026-07-30] design | Gaps #1–4

## [2026-07-30] lint + review | Wiki health check + DDD compliance

## [2026-07-30] analysis | Startup gaps

## [2026-07-30] ingest | B1 — Database Schema

- [[Database Schema]]: 15 tables, 7 enums, Kysely types, 6 migrations

## [2026-07-30] ingest | B2 — API Routes

- [[API Routes]]: 45 endpoints, SSE format, error catalog

## [2026-07-30] ingest | B3 — BullMQ Worker Wiring + LLM Gateway

- [[BullMQ Worker Wiring]]: async execution pipeline, crash recovery, event bridge, graceful shutdown
- [[LLM Gateway - OpenRouter]]: unified gateway for all LLM models
  - Model tier mapping: premium → Claude, balanced → GPT-4o Mini, light → Gemini Flash, search → Gemini Pro
  - Fallback chain per tier, cost tracking, prompt template loader
  - 34 prompt templates organized by tool/step
- Wiki: 38 pages. Next: F1 — ToolPage XState Machine (Frontend)