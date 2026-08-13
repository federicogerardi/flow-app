---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-13
source_count: 6
confidence: high
implementation: deployed
current_version: 1.1.0
---

# Angle Generator — Prompt Architecture

> 3-step extraction→matrix→activation pipeline for the `marketing-angle` asset tool  
> Prompt prototypes from [[sources/angle-generator]] — raw source for the `marketing-angle` `ToolDefinition`  
> **Current prompt version**: `1.1.0` (2026-08-13) — data-anchored scoring, awareness classification examples, proof honesty

> 3-step extraction→matrix→activation pipeline for the `marketing-angle` asset tool  
> Prompt prototypes from [[sources/angle-generator]] — raw source for the `marketing-angle` `ToolDefinition`

## Architecture

The angle generator is an **Asset Tool** that produces an `angle` AssetType. It follows the extraction→elaboration pattern established by [[Brief Tool - Prompt Architecture|brief]] and [[Persona Generator - Prompt Architecture|buyer-persona]], with one extra step for the angle scoring/ranking complexity.

```
ACQUISITION                     STEP 1 (extraction)        STEP 2 (angle-matrix)       STEP 3 (creative-activation)
────────────                    ────────────────────       ───────────────────────     ───────────────────────────
┌─────────────────┐             ┌──────────────────┐       ┌─────────────────────┐     ┌──────────────────────────┐
│ brief asset (1) │──┐          │ Awareness          │       │ Senior Performance  │     │ Senior Performance       │
│ (workspace)     │  │          │ Evidence Extractor  │ JSON  │ Marketing Strategist│     │ Marketing Strategist     │
└─────────────────┘  │          │                     │─────▶│                     │────▶│                          │
                     │ ┌──────┐ │ Input: brief +      │       │ Input: extraction   │     │ Input: top 3 angles      │
┌─────────────────┐  ├▶│Enricher│▶ personas content    │       │ JSON                │     │ Output: creative         │
│ persona assets  │──┘ └──────┘ │ Output: evidence     │       │ Output: angle       │     │ foundations (Italian,    │
│ (N, multiple)   │             │ map JSON             │       │ matrix + top 3      │     │ Markdown)                │
│ (workspace)     │             └──────────────────┘       └─────────────────────┘     └──────────────────────────┘
└─────────────────┘                                                                                    │
                                                                                                       ▼
                                                                                           `produces: 'angle'`
                                                                                       ┌────────────────────┐
                                                                                       │ Asset Promotion    │
                                                                                       │ (AssetType.angle)  │
                                                                                       └────────────────────┘
```

## Methodology Foundation

The tool applies the **PDA Framework** (Persona, Desire, Awareness) across all steps, derived from the root prompt prototype:

1. **PDA Framework**: Persona profile → Core desire → Awareness stage matching
2. **Evidence synthesis** across social/community language, review signals, search questions, objections
3. **Four decision parameters**: potential ROI, differentiation, ease of communication, credibility and demonstrability

### Awareness Levels (Canonical)

The tool classifies every persona cluster and angle into exactly one of 5 levels, always in English:

| Level | Nature | Primary ad job |
|-------|--------|----------------|
| Completely Unaware | Audience does not recognize the underlying problem | Reveal hidden problem through contextual storytelling |
| Problem Aware | Recognizes problem but doesn't know solution path | Clarify problem and introduce solution direction |
| Solution Aware | Knows desired outcome but not correct solution category | Frame desired result, guide toward right category |
| Product Aware | Knows product/brand but has objections or trust gaps | Resolve objections, prove product-specific credibility |
| Most Aware | Close to purchase, needs activation | Trigger immediate action (urgency, scarcity, CTA) |

Key classification rules:
- Classify by strongest concrete purchase-readiness signal, not generic ad/review exposure
- Solution Aware means outcome-first, reasoning from result to solution — not locked on a solution
- Product Aware = recognizes specific product/brand or named competitor
- Most Aware = already in direct buying conversation
- Never use protected traits as awareness proxies

## Step 1 — Extraction

**Step key**: `extraction`  
**Model tier**: `balanced`  
**Prompt component**: `output-json/v1`  
**Enrichment**: `serial` (receives brief + N persona assets)

Extracts structured awareness evidence from the merged dual-source context. Produces a JSON payload with:

| Field | Description |
|-------|-------------|
| `personaClusters` | Persona profiles grouped by shared characteristics |
| `desireMatrix` | Core desires mapped to persona clusters |
| `awarenessEvidence` | Evidence map across all 5 canonical levels |
| `painPoints` | Prioritized pain points from sources |
| `objections` | Sales and form objections |
| `marketSignals` | Social/community language, review signals, search questions, sales feedback |
| `angleCandidates` | 10-15 angle candidates with strategic rationale |

Anti-hallucination: uses `"non disponibile"` / `"Non emerso dalle fonti fornite"` for missing data. Never invents metrics, testimonials, or market evidence.

## Step 2 — Angle Matrix

**Step key**: `angle-matrix`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial` (receives Step 1 JSON)

Produces a full context map and actionable angle matrix in Italian markdown:

1. **Context Map**: Persona clusters, core desires, awareness distribution, priority objections
2. **Angle Matrix (10-15)**: Each with persona focus, desire focus, awareness level, message function, trigger problem, promise shape, proof requirement, strategic rationale
3. **Awareness Coverage Check**: Angle count per level; gaps or over-concentration flagged
4. **Scoring**: Each angle scored 1-5 on ROI, differentiation, ease, credibility → total /20
5. **Top 3 ranked**: Deterministic tie-break: awareness-fit → evidence traceability → ease → lower awareness level

## Step 3 — Creative Activation

**Step key**: `creative-activation`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial` (receives Step 2 output — top 3 angles)

For each of the top 3 angles, produces activation-ready creative foundations for Meta campaigns. This is the **final artifact** that gets promoted as an `angle` asset:

| Per angle | Output |
|-----------|--------|
| Awareness Anchor | Assigned level + message function used |
| 3 Scroll-Stopper Headlines | Direct-response style, Italian, awareness-coherent |
| Copy Guidelines | Suggested framework (PAS/FAB/AIDA), objections to neutralize, proof assets required, CTA direction |
| Final Launch Note | Which angle to test first and why |

Output is Italian markdown. Awareness labels preserved in English. Persona names never used in output — addresses abstract "tu" archetypes.

## Comparison with Prototype

The prototype has 4 steps (extraction → context-and-angle-matrix → angle-prioritization → creative-activation). The Flow App implementation consolidates to 3:

| Prototype Step | Flow App Step | Rationale |
|----------------|---------------|-----------|
| extraction | extraction (Step 1) | Same — awareness evidence map, pain points, objections, market signals, angle candidates |
| context-and-angle-matrix + angle-prioritization | angle-matrix (Step 2) | Consolidated — matrix generation + scoring + top-3 ranking are one analytical unit; separating them introduces redundant re-scoring |
| creative-activation | creative-activation (Step 3) | Same — top-3 creative foundations, final artifact |

## Acquisition Model

| Asset | Required | Multiple | Purpose |
|-------|----------|----------|---------|
| `brief` | Yes | No (single) | Business context: company, product, market, objectives |
| `persona` | Yes | Yes (N) | Audience profiles: demographics, pain points, behaviors, objections |

**No text inputs** — all context comes from workspace assets. This means:
- **Zero idempotency variance**: selecting the same brief + same personas always produces the same hash → `POST` returns `200` (replayed session)
- **SetupPanel auto-selection**: if exactly 1 `brief` exists in workspace, it's auto-selected. Personas use multi-select `AssetPicker`
- **`userText: []`** in domain definition

## ToolDefinition (Planned)

```typescript
const marketingAngleTool: ToolDefinition = {
  toolKey: 'marketing-angle',
  name: 'Angoli di Attacco',
  description: 'Genera angoli marketing testabili per campagne Meta, basati su brief e buyer personas',
  creditCost: 1,
  produces: 'angle',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
      { assetType: 'persona', required: true, multiple: true },
    ],
    userText: [],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'angle-matrix',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/angle-matrix',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 180000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'creative-activation',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/creative-activation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

> **Current state**: `'marketing-angle': blogPostTool` stub in `toolRegistry`. Replace with `marketingAngleTool`.

## Prompt Template Files

6 files to create under `apps/backend/src/prompts/marketing-angle/`:

```
marketing-angle/
├── extraction/
│   └── versions/1.0.0/
│       ├── system.md    # Awareness Evidence Extractor — PDA methodology, 5 awareness levels, JSON schema
│       └── user.md      # Extract from brief + personas: evidence map, pain points, market signals, angle candidates
├── angle-matrix/
│   └── versions/1.0.0/
│       ├── system.md    # Senior Performance Marketing Strategist — matrix construction, scoring model, tie-break
│       └── user.md      # Build angle matrix + top 3 from extraction JSON
└── creative-activation/
    └── versions/1.0.0/
        ├── system.md    # Senior Performance Marketing Strategist — creative activation, direct-response style
        └── user.md      # Activate top 3 angles: headlines, copy guidelines, CTA
```

### System prompts must encode:

- **Root methodology**: PDA Framework, four decision parameters, 5 awareness levels with nature checks and boundary rules
- **Anti-hallucination**: Never invent data/metrics/testimonials. `"non disponibile"` for missing fields. Mark inferences with `"(inferito dal contesto)"`
- **Persona asset rule**: Personas are abstract reference profiles — never use persona names in output. Address abstract "tu" archetypes
- **Output language**: Prompt instructions in English; generated output in Italian. Awareness level labels always in English
- **No preamble/commentary**: Output starts directly with the artifact — no "Ecco", "Di seguito", "Ho generato", "Certamente"

## Implementation Checklist

### Domain
- [ ] `marketingAngleTool` definition replaces `blogPostTool` stub in `toolRegistry`
- [ ] `toolKey: 'marketing-angle'` (already in `ToolKey` union — no changes needed)
- [ ] `produces: 'angle'` (AssetType already exists)
- [ ] `acquisition.assets`: `[{ assetType: 'brief', required: true }, { assetType: 'persona', required: true, multiple: true }]`
- [ ] `acquisition.userText: []` — zero text inputs
- [ ] `creditCost: 1`
- [ ] 3 steps: extraction (balanced) → angle-matrix (premium) → creative-activation (premium)
- [ ] `npx tsc --noEmit` passes in `packages/domain`

### Prompt Templates
- [ ] 6 files created under `apps/backend/src/prompts/marketing-angle/`
- [ ] `extraction/system.md` — Awareness Evidence Extractor with full 5-level framework + JSON schema
- [ ] `extraction/user.md` — extraction from brief + N personas
- [ ] `angle-matrix/system.md` — matrix + scoring methodology
- [ ] `angle-matrix/user.md` — build matrix from extraction JSON
- [ ] `creative-activation/system.md` — creative activation specialist
- [ ] `creative-activation/user.md` — activate top 3 from matrix output
- [ ] All system prompts include anti-hallucination guardrails
- [ ] All system prompts include persona asset rule (abstract profiles, no names in output)

### Frontend
- [ ] `tool-inputs.ts`: `'marketing-angle': []` (no text inputs — replaces `DEFAULT_INPUTS`)
- [ ] No file inputs (tool has no `files` in acquisition)
- [ ] SetupPanel, AssetPicker, ToolPageLayout are already generic — no new components needed
- [ ] Multi-select AssetPicker already supports `multiple: true` for personas
- [ ] `npx tsc --noEmit` passes in `apps/frontend`

### Backend
- [ ] No API changes needed (generic tool API)
- [ ] `ContextEnricher` injects `[Asset - brief]\n{content}` + `[Asset - persona]\n{content}` for N personas
- [ ] `AssetResolver` resolves `brief` + `persona` assets with `selectedAssetIds` filtering (multi-asset already supported)
- [ ] `npx tsc --noEmit` passes in `apps/backend`

### Testing
- [ ] `npx vitest run` passes in all packages
- [ ] Smoke test: start session with brief + personas, verify 3-step pipeline completes
- [ ] Asset promotion: verify `produces: 'angle'` creates an `angle` asset in workspace
- [ ] Multi-asset: verify N personas are correctly resolved and injected into extraction context

## Key Differences from Existing Asset Tools

| Dimension | Brief | Buyer Persona | Marketing Angle |
|-----------|-------|---------------|-----------------|
| Steps | 2 | 2 | 3 |
| Consumes | file (required) | brief (1) + optional file | brief (1) + personas (N) |
| Produces | `brief` | `persona` | `angle` |
| Step 2 model | `balanced` | `premium` | `premium` |
| Step 3 model | — | — | `premium` |
| creditCost | 1 | 1 | 1 |
| userText | objective (required) | none | none |
| Methodology | 11-section brief | PDA + 10-section persona + infer taxonomy | PDA + 5 awareness levels + 4-param scoring |
| Multiple assets | No | No (single persona) | Yes (N personas) |

## Downstream Consumers

Angles are consumed by content tools that need creative direction:

| Tool | How it uses angles |
|------|--------------------|
| `ad-copy` | Angle-aware hooks, headlines, and CTA direction |
| `landing-funnel` | Awareness-stage alignment for funnel messaging |
| `landing-page` | Angle-driven value propositions and proof selection |
| `video-script-long-form` | Hook angles, narrative framing |

## v1.1.0 — Data-Anchored Scoring & Awareness Classification Examples (2026-08-13)

**Problem**: Lo scoring model (Step 2) valutava gli angoli 1-5 su dimensioni non supportate dai dati: ROI (richiedeva market size, conversion probability), Differentiation (richiedeva competitor data), Credibility (richiedeva proof data). 3 dimensioni su 4 senza fondamento — il modello produceva punteggi pseudoscientifici.

Inoltre, l'extraction (Step 1) non aveva esempi di awareness classification — il task più soggettivo dell'intera pipeline.

### Modifiche

| File | Cambiamento |
|------|-------------|
| `extraction/1.1.0/system.md` | +2 good/bad examples per awareness classification (Solution Aware vs Product Aware, Problem Aware vs Solution Aware). +1 checklist item. |
| `extraction/1.1.0/user.md` | Documentata struttura contesto (`[Asset - brief]`, `[Asset - persona]`, `[Asset - persona #2]`). Aggiunte Extraction Priority rules. Aggiunte Critical Rules. |
| `angle-matrix/1.1.0/system.md` | **Scoring model riscritto**: ROI → Strategic Fit (allineamento obiettivo campagna), Differentiation → Audience Resonance (ancoraggio pain point), Ease → Communication Clarity, Credibility → Evidence Anchoring (supporto da dati estratti). Ogni dimensione ora si valuta sui dati REALI dell'extraction. Nota esplicita: "Scores are strategic estimates based on available data, not quantitative predictions." Aggiunto Strategic Guardrail #6 (Honest about evidence gaps). Output structure: +Risk Notes and Data Gaps section. |
| `angle-matrix/1.1.0/user.md` | Aggiunta tabella Field→Matrix Output mapping. Aggiunte Ranking Instructions con ancoraggio ai dati. |
| `creative-activation/1.1.0/system.md` | `Proof Assets Required` reso condizionale: se nessun proof data nella pipeline, formato `[Raccomandazione] Tipo di prova suggerita: ...`. Aggiunto Strategic Guardrail #6 (Proof awareness). |
| `creative-activation/1.1.0/user.md` | Aggiunta tabella Matrix Field→Creative Output mapping. Aggiunte Output Instructions. |
| `tools/index.ts` | Tutti e 3 gli step: `version: '1.0.0'` → `version: '1.1.0'` |

### Principio guida

**Data-anchored scoring**: ogni dimensione di valutazione deve essere rispondibile con i dati presenti nell'extraction. Se un dato non c'è, il modello lo dichiara — non lo inventa. I punteggi sono stime strategiche, non previsioni quantitative.

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅
vitest        →  domain 490/490 ✅  backend 145/145 ✅
```

## Sources

- [[sources/angle-generator/prompt_root]] — Root methodology: PDA Framework, 5 awareness levels, operational constraints
- [[sources/angle-generator/prompt_extraction]] — Step 1: awareness evidence map extraction
- [[sources/angle-generator/prompt_context_and_angle_matrix]] — Step 2 prototype: context map + angle matrix
- [[sources/angle-generator/prompt_angle_prioritization]] — Step 3 prototype: scoring + top 3 ranking
- [[sources/angle-generator/prompt_creative_activation]] — Step 4 prototype: creative activation foundations
- [[Persona Generator - Prompt Architecture]] — Reference implementation (asset tool consuming assets)