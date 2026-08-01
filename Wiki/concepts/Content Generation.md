---
type: concept
tags:
  - wiki/concept
  - wiki/generation
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Content Generation

> Core Bounded Context — `packages/domain/src/generation/`

## Responsibility

The **single core domain** of Flow App. Transform acquired data (user text, file uploads, API responses, workspace [[Asset]]s) into structured marketing [[Artifact]]s through a unified multi-step prompt pipeline.

All 11 tools are variations of the same pattern — different acquisition sources, different step counts, different prompt templates. No exceptions.

## The Unified Tool Model

Every tool follows the same three-phase flow:

```
ACQUISITION                   ELABORATION (1..N steps)             OUTPUT
────────────                  ─────────────────────────            ──────
┌──────────┐                  ┌──────┐   ┌──────┐   ┌──────────┐
│user text │──┐               │step 1│──▶│step 2│──▶│step N    │   ┌──────────┐
│file      │──┤               │prompt│   │prompt│   │(final)   │──▶│ Artifact │
│API data  │──┼──────────────▶│      │   │      │   │prompt    │   │ (final)  │
│assets    │──┘               └──────┘   └──────┘   └──────────┘   └──────────┘
└──────────┘                                                           │
                                                                       ▼
                                                                  ┌──────────┐
                                                                  │  Asset   │
                                                                  │(promotion)│
                                                                  └──────────┘
```

### Phase 1: Acquisition

Data enters **before** the pipeline starts. Sources:

| Source | Example | Tools that use it |
|-------|---------|-------------------|
| `userText` | Keyword, title, topic | `video-description`, `ai-overview-analysis` |
| `files` | Briefing `.txt`, `.docx`, `.md` | `landing-funnel`, `blog-post` |
| `apiCalls` | SerpAPI, People Also Ask | `ai-overview-analysis` |
| `assets` | `brand-voice`, `persona` | All content tools |

### Phase 2-3: Processing

Each step is an **LLM prompt**. The difference between steps is **which data it receives as input**:

| Mode | Receives | Example |
|----------|--------|---------|
| `serial` | Only output from the previous step | step 2 receives output from step 1 |
| `hybrid` | Previous step output + acquired API data | Geometric step analyzing crawl + context |

The last step in the array is automatically the **final step**: it receives all accumulated context and produces the [[Artifact]] that can be promoted to [[Asset]].

No `StepType` enum. No explicit `ArtifactRole`. No special steps for crawling or scoring.

## Aggregate Root

**[[Session]]** — a single pipeline execution. Contains ordered [[Artifact]]s (one per step).

## Entities

| Entity | Role |
|--------|------|
| [[Session]] | Aggregate Root |
| [[Artifact]] | Output of a step. The last one is promotable |

## Value Objects

| VO | Description |
|----|-------------|
| `SessionId` | Unique identifier |
| `ToolKey` | Reference to the [[Tool as Static Configuration|ToolDefinition]] |
| `IdempotencyKey` | `(userId, workspaceId, toolKey, inputHash, promptSignature)` |
| `ArtifactContent` | Immutable generated content |
| `SessionStatus` | `draft` → `ready` → `queued` → `running` → `completed` \| `failed` \| `cancelled` |
| `CrawlData` | Immutable raw API response — persisted for replay, audit, cache |

## Domain Services

- **ContextEnricher**: Assembles the context for each step:
  - `serial` mode: merges previous step outputs + injected assets
  - `hybrid` mode: like serial + acquired API data (`CrawlData`)

## Repository

```typescript
interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByIdempotencyKey(key: IdempotencyKey): Promise<Session | null>;
  findByWorkspace(workspaceId: WorkspaceId, options?: Pagination): Promise<Session[]>;
  save(session: Session): Promise<void>;
}
```

## Cross-Context Interactions

| Direction | Context | Pattern |
|-----------|---------|---------|
| Reads | [[Workspace & Assets]] | Sync: `AssetResolver.resolve()` |
| Emits to | [[Workspace & Assets]] | Async: `SessionCompleted` → [[Asset Promotion]] |
| Emits to | [[Usage & Quota]] | Async: `SessionCompleted` → credit consumption |

## Sources

- [[sources/APP-CONCEPT]] — Tool catalog, architecture
- [[sources/PRD]] — FR-W01 to FR-W09
- [[sources/STARTUP]] — Domain rules
- [[sources/USER-STORIES]] — All tool epics
