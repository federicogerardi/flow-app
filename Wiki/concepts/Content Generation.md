---
type: concept
tags:
  - wiki/concept
  - wiki/generation
date_updated: 2026-07-30
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
ACQUISIZIONE                  ELABORAZIONE (1..N step)            OUTPUT
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

### Fase 1: Acquisizione

I dati entrano **prima** che la pipeline parta. Fonti:

| Fonte | Esempio | Tool che la usano |
|-------|---------|-------------------|
| `userText` | Keyword, titolo, topic | `video-description`, `ai-overview-analysis` |
| `files` | Briefing `.txt`, `.docx`, `.md` | `landing-funnel`, `blog-post` |
| `apiCalls` | SerpAPI, People Also Ask | `ai-overview-analysis` |
| `assets` | `brand-voice`, `persona` | Tutti i content tool |

### Fase 2-3: Elaborazione

Ogni step è un **prompt LLM**. La differenza tra step è **quali dati riceve in input**:

| Modalità | Riceve | Esempio |
|----------|--------|---------|
| `serial` | Solo output dello step precedente | step 2 riceve output step 1 |
| `hybrid` | Output step precedente + dati API acquisiti | step Geometric che analizza crawl + contesto |

L'ultimo step dell'array è automaticamente il **final step**: riceve tutto il contesto accumulato e produce l'[[Artifact]] promovibile ad [[Asset]].

Niente `StepType` enum. Niente `ArtifactRole` esplicito. Niente step speciali per crawling o scoring.

## Aggregate Root

**[[Session]]** — una singola esecuzione di pipeline. Contiene [[Artifact]] ordinati (uno per step).

## Entities

| Entity | Role |
|--------|------|
| [[Session]] | Aggregate Root |
| [[Artifact]] | Output di uno step. L'ultimo è promovibile |

## Value Objects

| VO | Descrizione |
|----|-------------|
| `SessionId` | Identificativo unico |
| `ToolKey` | Riferimento al [[Tool as Static Configuration|ToolDefinition]] |
| `IdempotencyKey` | `(userId, workspaceId, toolKey, inputHash)` |
| `ArtifactContent` | Contenuto immutabile generato |
| `SessionStatus` | `draft` → `ready` → `running` → `completed` \| `failed` \| `cancelled` |
| `CrawlData` | Raw API response immutabile — persistito per replay, audit, cache |

## Domain Services

- **ContextEnricher**: Assembla il contesto per ogni step:
  - Modalità `serial`: unisce output step precedenti + asset iniettati
  - Modalità `hybrid`: come serial + dati API acquisiti (`CrawlData`)

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

- [[doodle/APP-CONCEPT]] — Tool catalog, architecture
- [[doodle/PRD]] — FR-W01 to FR-W09
- [[doodle/STARTUP]] — Domain rules
- [[doodle/USER-STORIES]] — All tool epics