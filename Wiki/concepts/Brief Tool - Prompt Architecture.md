---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-06
source_count: 3
confidence: high
implementation: complete
smoke_test: passed
---

# Brief Tool — Prompt Architecture

> 2-step extraction→generation pipeline for the `brief` asset tool  
> Prompt prototypes from [[sources/brief-generator]] — raw source for the `brief` `ToolDefinition`

## Architecture

The brief tool follows a **2-step serial pipeline** fundamentally different from the single-step asset tools (`brand-voice`, `buyer-persona`):

```
ACQUISITION                         STEP 1 (extraction)              STEP 2 (brief-generation)
────────────                        ────────────────────             ─────────────────────────
┌──────────────┐                    ┌─────────────────────┐          ┌──────────────────────────┐
│ briefing file│──┐                 │ Data Extraction      │          │ Creative Brief Synthesis  │
│ (.txt/.md/   │  │                 │ Specialist           │          │ Senior Creative Strategist│
│  .docx)      │  │                 │                      │          │                           │
└──────────────┘  │    ┌─────────┐  │ Input: file content  │  JSON    │ Input: extraction JSON    │
                  ├───▶│ Enricher │─▶│ Output: 5-field JSON │─────────▶│ Output: 11-section brief  │
┌──────────────┐  │    └─────────┘  │                      │          │ (Italian, Markdown)       │
│ user text     │──┘                 └─────────────────────┘          └──────────────────────────┘
│ (objective,   │                             │                                 │
│  company,     │                             ▼                                 ▼
│  product)     │                    `output-json/v1`                  `output-plain-text/v1`
└──────────────┘                                                      `italian-formal/v1`
```

### Step 1: Extraction

**Step key**: `extraction`  
**Model tier**: `balanced` (GPT-4o Mini or equivalent — good quality/cost ratio for structured extraction)  
**Prompt component**: `output-json/v1`  
**Enrichment**: `serial` (receives file content + user text inputs)

Extracts 5 core data points from the briefing source:
- `product_or_service` — what is being marketed
- `target_audience` — primary audience segments
- `campaign_objective` — stated goal (awareness, lead-gen, sales, retention)
- `primary_offer` — specific offer, mechanism, price range
- `tone` — tone descriptors, marks inferred values

Anti-hallucination rules: uses `"non disponibile"` for missing fields, never invents data not present in the source. Includes good/bad extraction examples and a 7-point internal checklist.

### Step 2: Brief Generation

**Step key**: `brief-generation`  
**Model tier**: `balanced` (creative synthesis benefits from stronger model; could be `premium` for production)  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial` (receives Step 1's JSON output)

Synthesizes the extraction into a complete creative brief in **Italian markdown** with 11 mandatory sections. The output is designed as the **single source of truth for downstream tools** — every section answers a question that `landing-funnel`, `ad-copy`, `marketing-angle`, `video-script-long-form`, or `landing-page` will need.

## Downstream-First Design

The output structure is explicitly designed for consumption by other Flow App tools:

| Section | Consumed by | Why |
|---------|-------------|-----|
| `Panoramica` + `Pilastri di Messaggio` | All content tools | Core positioning and key messages |
| `Target Audience` (pain points, objections) | `landing-funnel`, `ad-copy` | Angle generation, copy hooks |
| `Offerta e Meccanismo` | `landing-funnel`, `landing-page` | Opt-in pages, CTAs |
| `Brand Voice e Tono` | All content tools | Consistent tone across artifacts |
| `Contesto Funnel` | `landing-funnel` | Funnel stage alignment |

This is the **only tool in Flow App** whose output is explicitly structured for consumption by other tools — all 11 sections serve a downstream purpose. Other asset tools (`brand-voice`, `buyer-persona`, `marketing-angle`) produce self-contained reference documents; the brief produces an **orchestration document** that gates the quality of all downstream generation.

## Comparison with Current Stub

| Dimension | Current stub (`index.ts`) | Prototype design |
|-----------|--------------------------|-------------------|
| Steps | 3 (SEO → Outline → Article) | 2 (Extraction → Brief) |
| Step model | `blog-post` template | `brief`-specific templates |
| Output language | Not specified | Italian only (`it-IT`) |
| Acquisition | `userText` only (topic, language) | `files` (briefing document) + `userText` (objective, company, product) |
| Asset production | None (`produces: undefined`) | `produces: 'brief'` |
| Default components | `output-markdown/v1`, `seo-optimized/v1` | `output-json/v1` (step 1), `output-plain-text/v1`, `italian-formal/v1` (step 2) |
| Design philosophy | Generic content generation | Downstream-first, every section answers a tool's question |

## Acquisition Design Decision

The prototype is **file-centric** — Step 1 reads an unstructured briefing document. However, for the Flow App implementation, the tool should support both modes:

| Mode | Acquisition | Use case |
|------|-------------|----------|
| **File-based** | User uploads `.txt`/`.md`/`.docx` briefing | Full brief from existing document |
| **Text-only** | User fills `objective`, `company`, `product` text fields | Quick brief when no document exists |

In text-only mode, Step 1 structures the user text into the 5-field extraction format (with `(from user input)` attribution). In file-based mode, Step 1 extracts from the file. The `files` input should be **optional** with a fallback to `userText` structuring — this keeps the tool accessible while preserving the full extraction power for users with briefing documents.

## Anti-Hallucination Guardrails

Both steps share a consistent anti-hallucination contract:

| Rule | Application |
|------|-------------|
| Never invent data/metrics/results/testimonials | Both steps |
| `"non disponibile"` / `"Non specificato..."` for missing data | Step 1 (JSON) / Step 2 (prose) |
| No self-promotion or superlatives | Step 2 |
| Trace every claim to extraction payload | Step 2 |
| Mark inferred values explicitly | Step 1 |

## Implementation Status (2026-08-06) — ✅ Complete

18 file changes across domain, backend, frontend, and wiki. All typechecks, 644 tests, build, and smoke test pass.

### Domain & Backend

| File | Change |
|------|--------|
| `packages/domain/src/generation/tools/index.ts` | `briefTool`: 2-step pipeline, 3 text fields + optional file upload, `produces: 'brief'` |
| `apps/backend/src/prompts/brief/extraction/.../system.md` | Data Extraction Specialist — 5-field JSON, anti-hallucination |
| `apps/backend/src/prompts/brief/extraction/.../user.md` | User prompt with file + text context |
| `apps/backend/src/prompts/brief/brief-generation/.../system.md` | Senior Creative Strategist — 11 sections, Italian, downstream-first |
| `apps/backend/src/prompts/brief/brief-generation/.../user.md` | User prompt with extraction context |
| `apps/backend/src/api/generation.ts` | `GET /api/tools` exposes `files[]`; `GET /api/sessions/:id` returns `artifacts[]` + `stepCount`; `POST /api/tools/brief/sessions` passes `acquisitionData` to job queue |
| `apps/backend/src/generation/jobs/enqueue-session.job.ts` | Accepts `acquisitionData` parameter for worker |
| `apps/backend/src/generation/worker/session-worker.ts` | `SessionJobData` extended; `QUEUE`/`WORKER_PICKUP` applied to session aggregate; `session.save()` before SSE publish; `expectedVersion = session.version - 1`; manual `session_completed` publish after DB consistency |
| `apps/backend/src/generation/worker/worker-process.ts` | ~~Fixed env path~~ — **deprecated**: worker now runs inline in `server.ts` |
| `packages/domain/src/generation/domain-services/ContextEnricher.ts` | File content emission: `[File - {key}]\n{content}` |
| `packages/domain/src/generation/__tests__/ContextEnricher.test.ts` | +2 tests for file content |
| `apps/backend/package.json` | ~~Added `dev:worker` script~~ — removed; worker starts with server |
| `package.json` | Root `dev` starts server + vite (worker is inline) |

### Frontend

| File | Change |
|------|--------|
| `apps/frontend/src/components/tool/SetupPanel.tsx` | `FileUpload` component; `fetchToolDefinitions()` returns text + file + creditCost in single call |
| `apps/frontend/src/components/tool/ReadinessSnapshot.tsx` | File readiness tracking |
| `apps/frontend/src/components/layout/ToolPageLayout.tsx` | File state management; bypassed XState `send()` after `await` (local `useState`); merged `fetchToolMeta` into `fetchToolDefinitions` |
| `apps/frontend/src/tool-inputs.ts` | `FileInput` type; `BRIEF_FILES`; `BRIEF_INPUTS` with Italian labels; `getToolFiles()` |
| `apps/backend/src/infrastructure/logger.ts` | Silenced 304 responses; dropped verbose req/res serializers; `silent` log level for cache hits |

### Wiki

| File | Change |
|------|--------|
| `Wiki/sources/brief-generator.md` | Source summary of 2 prompt prototypes |
| `Wiki/concepts/Brief Tool - Prompt Architecture.md` | This page — architecture, downstream-first design, implementation checklist |
| `Wiki/index.md` | Added source + concept entries |
| `Wiki/log.md` | 4 ingest/implementation entries |

### Bugs Fixed During Implementation

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Readiness failed (missing inputs) | FE sent `{...inputs}` flat instead of `{ text: inputs }` | Wrapped under `text` key |
| FE stuck on "preparazione in corso" | XState `send()` after `await` didn't transition state | Replaced with local `useState` |
| Worker crash: `InvalidSessionStateError` | Session aggregate in `ready` when machine tried `ADD_ARTIFACT` | Apply `QUEUE` + `WORKER_PICKUP` to session aggregate |
| `saveWithLock` version mismatch | `session.version` mutated by `apply()` before optimistic lock check | Use `version - 1` (pre-mutation); `save()` after initial QUEUE/WORKER_PICKUP |
| SSE received but FE didn't show result | Session saved as `running` (COMPLETE not persisted before SSE publish) | `session.save()` then manual `session_completed` publish |
| Session detail missing artifacts | `GET /api/sessions/:id` didn't include artifacts | Added artifact query + `artifacts[]` + `stepCount` to response |
| Worker didn't start | Missing `dev:worker` script; wrong env path | Added script + fixed `../../..` |
| Railway worker gap (no session processing) | `Dockerfile` only started server; worker was separate process with no Railway service | Worker inlined into `server.ts`: initialized after `app.listen()`, graceful shutdown coordinates `worker.pause()` → drain(30s) → `worker.close()`. `dev:worker` script removed, `dev` simplified to server + vite only. Verified on Railway: pending sessions auto-picked and completed on deploy. |

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅  frontend ✅
vitest        →  676/676 (69 files) ✅
vite build    →  ✅
smoke test   →  ✅ session created → extraction step → brief-generation step → artifacts in DB → FE displays result
Railway deploy →  ✅ Worker started inline → pending sessions auto-processed → job_completed
```

### Data Flow (Final)

```
Frontend                      API + Worker (same process)
────────                      ──────────────────────────
SetupPanel                    POST /api/tools/              processSessionJob()
  ├─ text fields               brief/sessions                 │
  │  objective/company/product   │                             ├─ session.apply(QUEUE)
  │                              ├─ StartSessionUseCase        ├─ session.apply(WORKER_PICKUP)
  └─ [Generate]                  │   → readiness(✅)           ├─ sessionRepo.save()
     │                          │   → Session.create()          │
     │                          ├─ enqueueSession(              ├─ actor.start()
     │                          │     sessionId,                │   step 0: extraction → LLM
     │                          │     acquisitionData           │   step 1: brief-generation → LLM
     │                          │   )                           │
     ▼                          │                              ├─ actor.subscribe → step_completed
ToolPageLayout                  ▼                              │   (SSE to FE)
  ├─ setSubmitting(true)       res 201                         │
  ├─ api.startSession({        { session: { id, ... } }        ├─ sessionRepo.save()  (COMPLETE)
  │    text: inputs           ─────────────────────────▶       │
  │  })                         SSE /events                    ├─ eventBridge.publish(
  ├─ setPhaseOverride(running)  ◀─────────────────────────      │     'session_completed')
  └─ FeedbackPanel              event: step_completed           │
     │                          event: step_completed           └─ job_completed
     │                          event: session_completed
     ▼
  SessionSummary
    └─ GET /api/sessions/:id → artifacts[] + stepCount ✅
       renders final brief
```

For the `brief` `ToolDefinition` in `packages/domain/src/generation/tools/index.ts`:
- [ ] `toolKey: 'brief'`, `name: 'Brief'`, `produces: 'brief'`, `creditCost: 1`
- [ ] `acquisition.files`: `{ key: 'briefing', label: 'Documento briefing', accept: ['.txt','.md','.docx'], required: false }`
- [ ] `acquisition.userText`: 3 fields (objective/long, company/short, product/short)
- [ ] `acquisition.assets`: none required (brief is the root asset — it generates from scratch, not from existing assets)
- [ ] Step 1: `{ order: 1, label: 'extraction', enrichment: 'serial', prompt: { templateId: 'brief/extraction', version: '1.0.0', model: ModelTier.Balanced, components: ['output-json/v1'] } }`
- [ ] Step 2: `{ order: 2, label: 'brief-generation', enrichment: 'serial', prompt: { templateId: 'brief/brief-generation', version: '1.0.0', model: ModelTier.Balanced, components: ['output-plain-text/v1', 'italian-formal/v1'] } }`

For prompt template files (`apps/backend/src/prompts/`):
- [ ] `brief/extraction/versions/1.0.0/system.md` — system prompt from the extraction prototype
- [ ] `brief/extraction/versions/1.0.0/user.md` — user prompt with `{{slot:file:briefing}}` and `{{slot:text:objective}}`, `{{slot:text:company}}`, `{{slot:text:product}}` slots
- [ ] `brief/brief-generation/versions/1.0.0/system.md` — system prompt from the brief generation prototype
- [ ] `brief/brief-generation/versions/1.0.0/user.md` — user prompt with `{{slot:step:1}}` injection + structural constraints

For frontend:
- [ ] `SetupPanel.fetchToolInputs()` already reads from `GET /api/tools` — no changes needed
- [ ] `ReadinessSnapshot` must support `files` input type (currently only shows `userText`)
- [ ] `SetupPanel` must render `FileUpload` component for `files` acquisition type (currently only renders `userText`)
- [ ] `tool-inputs.ts` has `BRIEF_INPUTS` with 3 fields — keep as text-only fallback

## Sources

- [[sources/brief-generator]] — source summary of both prompt prototypes
- [[sources/brief-generator/prompt_extraction]] — Step 1 extraction prompt (raw)
- [[sources/brief-generator/prompt_brief_generation]] — Step 2 brief generation prompt (raw)
