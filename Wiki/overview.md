---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/overview
date_updated: 2026-07-30
---

# Overview — Flow App

> High-level synthesis of all ingested knowledge. Updated when the big picture changes.

## What is Flow App?

Flow App is an AI-powered content generation platform for B2B marketing teams. It transforms contextual inputs (briefings, documents, keywords, API data) into structured marketing artifacts through a **unified multi-step prompt pipeline**. Every tool follows the same execution model — different configuration, same engine.

## Architecture

**4 bounded contexts**:

| Context | Category | Aggregate Root | Responsibility |
|---------|----------|---------------|----------------|
| [[Content Generation]] | Core | [[Session]] | Unified tool execution: acquisition → elaboration → final artifact |
| [[Workspace & Assets]] | Supporting | [[Workspace]] | Organization, reusable brand resources |
| [[Identity & Access]] | Generic | [[User]] | Auth, roles, sessions |
| [[Usage & Quota]] | Supporting | [[Quota]] | Credit tracking, enforcement |

## Tool Catalog (11 tools)

### Content
| toolKey | Output |
|---------|--------|
| `landing-funnel` | Landing page funnel (optin → quiz → VSL) |
| `landing-page` | Landing page + thank-you |
| `video-script-long-form` | Script video long-form (6 step) |
| `video-description` | Descrizione video |
| `blog-post` | Articolo blog SEO |
| `ad-copy` | Copy pubblicitario |

### Asset
| toolKey | AssetType prodotto |
|---------|-------------------|
| `brief` | `brief` |
| `brand-voice` | `brand-voice` |
| `buyer-persona` | `persona` |
| `marketing-angle` | `angle` |

### Analisi
| toolKey | Output |
|---------|--------|
| `ai-overview-analysis` | Analisi presenza competitiva su Google AI Overview |

**Naming convention**: `{output}[-{variant}]`. Zero abbreviazioni, zero verbi, zero nomi fantasy.

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

4 raw sources ingested from `doodle/`. See [[Wiki/index]] for full catalog.