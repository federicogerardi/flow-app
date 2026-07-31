---
type: concept
tags:
  - wiki/concept
  - wiki/generation
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# CrawlData

> Value Object — [[Content Generation]] context

## Definition

`CrawlData` is an **immutable Value Object** representing the raw response from an external API call configured in a tool's acquisition phase. It is persisted permanently for replay, audit, and cache — avoiding redundant API calls for the same query within TTL.

## Context

In the unified tool model, `CrawlData` lives in [[Content Generation]] as a data source acquired during the pre-flight phase. It is then injected into steps configured with `enrichment: 'hybrid'`, where the LLM prompt receives both the previous step's output AND the raw API data.

## Why a Value Object?

- **Immutable**: once fetched, never modified
- **No identity**: equality based on content and source, not an ID
- **Owned by Session**: persisted alongside the generation run

## Purpose

| Purpose | Description |
|---------|-------------|
| **Replay** | Re-process the same data without calling the API again |
| **Audit** | Trace what the system saw when producing an artifact |
| **Cache** | Avoid redundant API calls within TTL (`cache.ttlSeconds`) |

## Structure

```typescript
class CrawlData {
  constructor(
    readonly source: string,                     // 'serpapi', 'people_also_ask', 'ai_overview'
    readonly rawResponse: Record<string, unknown>, // raw JSON from the API
    readonly fetchedAt: DateTime,
    readonly expiresAt: DateTime | null,          // cache TTL
  ) {}

  get isExpired(): boolean { ... }
}
```

## Flow

```
Acquisition Phase                     Elaboration Phase
─────────────────                     ─────────────────
API call → CrawlData ──┐              Step 2 (hybrid)
(persisted)             │              ├── output Step 1
                        └──injected───▶├── CrawlData (raw API)
                                       └── LLM prompt analyzes both
```

## Sources

- [[sources/APP-CONCEPT]] — Geometric tool, crawling phase
- [[sources/USER-STORIES]] — US-GE08, US-GE09