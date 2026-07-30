# Flow App — App Concept Document

## Visione

Flow App è una piattaforma AI-powered per la generazione strutturata di contenuti di marketing. Ogni **Tool** è una capability completa: accetta input contestuali (briefing, documenti, brand voice), esegue una catena ordinata di step di elaborazione basati su LLM, e produce artefatti pronti all'uso — landing page, script video, articoli, analisi competitive, asset riutilizzabili.

**Nessuna black box**: ogni step di generazione è visibile, rieseguibile e tracciabile. Gli output sono versionati, scaricabili e associati al workspace.

## Utenti Target

Team di marketing e content creation in ambito B2B che necessitano di:
- Produrre contenuti multicanale a scala (landing page, funnel, script YouTube, articoli blog, ads)
- Estrarre insight strategici da documenti e briefing
- Analizzare risultati SERP e generare report competitivi
- Costruire asset brand riutilizzabili (brief, brand voice, personas, angles)

## Tool Catalog (11 strumenti attivi)

| Tool | Descrizione | Input | Output |
|------|------------|-------|--------|
| **funnel-pages** | Generazione landing page funnel | File briefing | Contenuti landing page |
| **nextland** | Generazione pagine Nextland | File briefing | Contenuti nextland |
| **youtube-lf-script** | Script YouTube long-form (6 step) | File briefing | Script strutturato |
| **angle-generator** | Estrazione angoli marketing | 2 file (Briefing + AngleDetector) | `angle` Asset |
| **youtube-description** | Descrizioni YouTube | Direct input (no file) | Descrizione ottimizzata |
| **geometric** | Analisi SERP competitiva (4 step: crawling → scoring → reporting) | Direct input + SerpAPI | StrategicReport + UnifiedReport |
| **blog-article-generator** | Articoli blog SEO (3 step) | File + direct input | Articolo strutturato |
| **brief-generator** | Generazione brief da documenti | File | `brief` Asset |
| **tov-generator** | Estrazione Tone of Voice | File | `brand-voice` Asset |
| **personas-generator** | Generazione personas | File | `persona` Asset |
| **meta-ads** | Copy per Meta Ads (riattivato) | File + direct input | `ad-copy` Asset |

## Architettura

### Pilastri ingegneristici

1. **Domain-Driven Design** — 6 bounded context, 230+ decisioni di naming tracciate, ogni concetto ha un nome canonico e un confine definito. Nessuna ambiguità.

2. **XState v5 come Aggregate Root** — l'intera pipeline di generazione è modellata come macchine a stati espliciti. Ogni transizione è dichiarativa, ispezionabile, testabile. Pattern adottato sia nel backend (`GenerationSystem`) che nel frontend (`ToolPage`).

### Bounded Context

| Context | Responsabilità | Aggregate Root |
|---------|---------------|----------------|
| **Generation** | Orchestrazione produzione artefatti: routing, streaming, persistenza, idempotency | `GenerationSystem` |
| **Auth** | Identità: registrazione, sessioni, ruoli, OAuth | — |
| **Usage/Quota** | Tracciamento e enforcement limiti per utente (crediti) | — |
| **Frontend/UI** | Sessione pagina tool, step flow, readiness computation, history | `ToolPage` |
| **Crawling & Extraction** | Web crawling asincrono, scraping SERP, bypass anti-bot | — |
| **Competitor Analysis** | Raggruppamento competitor, scoring pesato, tier assignment | — |

### Flusso di generazione

```
User Input → Context Generation → Readiness Gate → Dispatch → BE-Driven Workflow (BullMQ)
                                                              ├── Step 1: extraction / crawling / acquisition
                                                              ├── Step 2: generation / scoring
                                                              ├── Step N: generation (final)
                                                              └── SSE → Frontend (progress + artifacts)
```

### BE-Driven Workflow (implementato 2026-07-24)

Lo shift architetturale dal loop HTTP FE-driven all'esecuzione asincrona BE-driven via BullMQ:
- **Prima**: N+1 chiamate HTTP per tool (orchestrate + generate per step)
- **Dopo**: 1 submit + 1 connessione SSE; il worker BullMQ continua anche a tab chiuso
- **Componenti chiave**: `ToolWorkflowJob` (aggregate root), `JobEventBridge` (Redis pub/sub), `JobProgressSerializer`

### Registry-Driven Architecture (Frontend)

Single `ToolPageTemplate` (~150 LOC) che deriva comportamento da `ToolFormRegistry` dichiarativo. Nuovo tool: 5 file, ~100 linee, ~30 minuti. Zero duplicazione di componenti tool-specifici.

## Stack Tecnico

| Layer | Tecnologia |
|-------|-----------|
| **Monorepo** | npm workspaces |
| **Backend** | Node.js, XState v5, Kysely (SQL tipizzato), pg driver, Redis, BullMQ, Zod |
| **Frontend** | React 19, XState v5, MUI, Vite, Vitest, SWR |
| **Contracts** | `packages/contracts` — fonte autoritativa condivisa FE/BE (compile-time parity guard) |
| **Domain** | `packages/domain` — framework-agnostic, mai importa tipi FE/BE |
| **Infra-DB** | `packages/infra-db` — migrazioni e seed |
| **Deployment** | Railway (Dockerfile, stessa origine proxy `server.mjs`) |

## Decisioni Architetturali Chiave

- **ADR-001**: Data access layer unificato frontend
- **ADR-003**: Pattern Explicit Error States in tutte le macchine XState (no `error: string | null`)
- **DDD-081**: Tool Input File Requirement Policy — blocking vs advisory
- **DDD-116**: `WorkflowStepType` esteso con `crawling` e `scoring` per Geometric
- **DDD-216**: Deprecazione `ToneProfile`/`RequestTone` — il tono deriva da `brand-voice` Asset
- **Registry-driven routing**: nessuna guardia tool-specifica nel `GenerationSystem`; routing discrimina per `WorkflowStepType`

## Governance

- **DDD-first**: ogni termine di dominio richiede entry `DDD-NNN` nel decision log
- **Documentazione**: frontmatter YAML obbligatorio, language policy (tech doc = EN, product doc = IT), link integrity
- **UI Governance**: 2 archetype pagina, 3 pattern CTA, design token only, feedback channel deterministici
- **Prompt Template**: standard canonici per 34 template LLM (anti-hallucination, chain awareness, persona rules)

## Stato Corrente (2026-07-28)

- **11 Tool attivi**, 1 riattivato (`meta-ads`)
- **32 documenti di design/specifica** ingeriti nel wiki
- **Architettura BE-Driven** implementata e verificata
- **Refactoring routing/frontend** completato: zero eccezioni tool-specifiche
- **Proposte attive**: output personalization, admin debug/monitoring, global deterministic model matrix
- **Aree provvisionali**: `Crawling & Extraction` e `Competitor Analysis` context, `ToolWorkflowJob` aggregate root, `AnalysisSession` per Geometric

---

> ⚑ **DDD Reference**: [Glossary](docs/01-requirements/domain-ubiquitous-language-glossary.md) · [BCM](docs/02-design/domain-bounded-context-map.md) · [Decision Log](docs/07-governance/domain-naming-decision-log.md) · [Documentation Index](docs/index-overview.md)