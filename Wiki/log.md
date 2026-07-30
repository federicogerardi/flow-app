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

- [[BullMQ Worker Wiring]]: async execution pipeline, crash recovery, event bridge
- [[LLM Gateway - OpenRouter]]: model tier mapping, fallback chain, prompt loader

## [2026-07-30] rename | Gen App 2 → Flow App

- Replaced all occurrences across 14 files (10 Wiki, 3 doodle, 1 CLAUDE.md)
- `Gen App 2` → `Flow App`, `gen-app-2` → `flow-app`
- Zero remaining references to old name