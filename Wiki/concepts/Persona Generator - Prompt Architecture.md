---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-06
source_count: 4
confidence: high
implementation: complete
frontend_ready: true
frontend_fixes: 6 applied (W1-W5, W7)
smoke_test: pending
---

# Persona Generator — Prompt Architecture

> 2-step extraction→generation pipeline for the `buyer-persona` asset tool  
> Prompt prototypes from [[sources/personas-generator]] — raw source for the `buyer-persona` `ToolDefinition`

## Architecture

The persona generator follows the same **2-step serial pipeline** as the [[Brief Tool - Prompt Architecture|brief tool]]. It is an Asset Tool that produces a `persona` AssetType consumed by 6 downstream content tools:

```
ACQUISITION                             STEP 1 (extraction)              STEP 2 (personas-generation)
────────────                            ────────────────────             ───────────────────────────
┌──────────────────────┐                ┌─────────────────────┐          ┌─────────────────────────────┐
│ brief asset (req.)   │──┐             │ Market Research      │          │ Market Research Analyst +    │
│ (workspace asset)    │  │             │ Data Extractor       │          │ Buyer Persona Specialist     │
└──────────────────────┘  │             │                      │  JSON    │                              │
                          │ ┌─────────┐ │ Input: brief content │─────────▶│ Input: extraction JSON       │
┌──────────────────────┐  ├▶│Enricher │─▶ + optional file data │          │ Output: 10-section persona   │
│ file opt. (.txt/.md/ │──┘ └─────────┘ │ Output: 5-field JSON │          │ (Italian, Markdown)          │
│ .docx) istruzioni    │                 │                      │          └─────────────────────────────┘
│ aggiuntive           │                 │ fields: demographics │                         │
└──────────────────────┘                 │ goals, pain_point,   │                         ▼
                                         │ behaviors,           │             `produces: 'persona'`
                                         │ objections           │
                                         └─────────────────────┘
                                                       ┌────────────────────┐
                                                       │ Asset Promotion    │
                                                       │ (AssetType.persona)│
                                                       └────────────────────┘
```

### Step 1: Extraction

**Step key**: `extraction`  
**Model tier**: `balanced` (GPT-4o Mini — good quality/cost ratio for structured extraction)  
**Prompt component**: `output-json/v1`  
**Enrichment**: `serial` (receives brief asset content + optional file data)

Extracts 5 core data points from the brief content and any supplemental file data. The brief provides structured context (company, product, target audience, objectives, tone) while the optional file allows the marketer to inject raw research data (survey results, competitor analysis, market data) for deeper persona specificity.
- `demographics` — Age, gender, income, education, location, socio-economic context
- `goals` — Desired outcomes and aspirations (primary vs secondary)
- `pain_point` — Frustrations and unmet needs (practical + emotional)
- `behaviors` — Buying habits, media consumption, decision patterns, preferred channels
- `objections` — Barriers to purchase (rational + emotional)

Anti-hallucination rules: uses `"non disponibile"` for missing fields, never invents data not present in the source. Includes good/bad extraction examples for `demographics`, `pain_point`, and `objections` and a 7-point internal checklist.

### Step 2: Personas Generation

**Step key**: `personas-generation`  
**Model tier**: `premium` (GPT-4o / Claude 3.5 Sonnet — creative synthesis requires strong model for psychological depth)  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial` (receives Step 1's JSON output)

Synthesizes the extraction into a complete Buyer Persona document in **Italian markdown** with 10 mandatory sections. The persona is an abstract reference profile — NOT a real person. The "Nome Rappresentativo" is a label for internal reference only.

## Downstream-First Design

The output structure is explicitly designed for consumption by 6 downstream content tools:

| Section | Consumed by | Why |
|---------|-------------|-----|
| `Obiettivi e Motivazioni` + `Trigger di Acquisto` | All 6 content tools | Core motivational drivers |
| `Pain Point e Frustrazioni` | `landing-funnel`, `ad-copy`, `landing-page` | Angle generation, copy hooks for pain-point messaging |
| `Obiezioni e Barriere` | `landing-funnel`, `landing-page`, `meta-ads` | Counter-messaging, objection handling in funnel pages |
| `Comportamenti e Abitudini` | `meta-ads`, `blog-article-generator` | Channel selection, content format decisions |
| `Messaggistica Efficace` | All content tools | Tone alignment, language choices, proof types |
| `Dati Demografici` | `landing-page`, `nextland` | Visual design cues, social proof selection |

The persona is a **reference asset** — downstream tools use it to inform pain points, messaging tone, objections, and triggers. They address an abstract "tu" belonging to the target profile, never a named persona character. See [[sources/personas-generator/prompt_personas_generation#Persona Asset — Critical Usage Rule|Critical Usage Rule]].

## Persona Naming Convention

The "Nome Rappresentativo" follows deterministic rules encoded in the generation prompt:

| Rule | Constraint |
|------|-----------|
| **Age-appropriate** | Name matches generation: 55+ → Giuseppe/Antonio, 30-39 → Andrea/Valentina, <30 → Lorenzo/Sofia |
| **Gender-aligned** | Matches implied demographic gender; alternates for mixed audiences |
| **Culturally Italian** | Common Italian given name + common Italian surname — no foreign names |
| **Regional variation** | Surname suggests region: Esposito→Napoli, Brambilla→Lombardia, Mura→Sardegna |
| **No celebrity names** | No names uniquely associated with famous people |
| **No reuse** | Never reuse the same name across multiple persona generations |

This convention is embedded in the system prompt — it is an LLM-enforced rule, not a code-level constraint.

## Safe Inference Taxonomy

The persona prompt distinguishes what the LLM may infer from context vs what it must never invent:

| Safe to infer | Never infer |
|---|---|
| Education from professional role (CFO → laurea economia) | Exact age, income, location not in source |
| Information channels from age profile (25-35 → Instagram, 45-55 → LinkedIn) | Named competitors or brands the persona uses |
| Purchase process from price point (<€500 → impulse, >€5k → multi-stakeholder) | Personal life details (family status, hobbies) |
| Messaging triggers from pain points (time pain → efficiency language) | Specific objections not traceable to stated pain points |

## Comparison with Current Stub

| Dimension | Current stub (`index.ts` line 110) | Prototype design |
|-----------|------------------------------------|-------------------|
| Steps | 3 (SEO → Outline → Article) — `blogPostTool` stub | 2 (Extraction → Personas Generation) |
| Step model | `blog-post` templates | `buyer-persona`-specific templates |
| Output language | Not specified | Italian only (`it-IT`) |
| Acquisition | `userText` only (topic, language) | `assets: brief` (required) + `files` (optional) |
| Asset production | None (`produces: undefined`) | `produces: 'persona'` |
| Default components | `output-markdown/v1`, `seo-optimized/v1` | `output-json/v1` (step 1), `output-plain-text/v1`, `italian-formal/v1` (step 2) |
| Design philosophy | Generic content generation | Downstream-first, psychological depth, objection-first thinking |

## Acquisition Model

The persona generator uses a **required asset + optional file** model — structurally different from both the brief tool (required file) and content tools (various inputs):

| Mode | Acquisition | Result |
|------|-------------|--------|
| **Required** | Select a `brief` asset from workspace | Structured context: company, product, target audience, objectives, tone |
| **Optional** | Upload `.txt`/`.md`/`.docx` with supplemental data | Raw research: survey results, competitor analysis, market data |

### Rationale

The persona is a **derived asset**, not a standalone creation. The brief is the single source of truth for business context — it already contains the target audience description, pain points, and objectives that form the foundation of any persona. The persona generator:

1. **Consumes** the brief to anchor every demographic claim, behavior, and pain point in verified business context
2. **Enriches** with optional raw research (the file) for deeper specificity beyond what the brief provides
3. **Produces** a `persona` asset that downstream tools consume alongside the brief

This aligns with the Asset → Content pipeline: `brief` → `persona` → content tools. Each step adds specialization — the brief defines the market, the persona defines the buyer.

## Anti-Hallucination Guardrails

Both steps share a consistent anti-hallucination contract:

| Rule | Application |
|------|-------------|
| Never invent data, metrics, results, or entities | Both steps |
| `"non disponibile"` / `"Non specificato nel documento di input"` for missing data | Step 1 (JSON) / Step 2 (prose) |
| Never attribute demographic data not in source | Step 1 |
| Mark inferred content with `"(inferito dal contesto)"` | Step 2 |
| No stereotypes to fill demographic gaps | Step 2 |
| No invented personas, quotes, or behavioral patterns | Both steps |

## ToolDefinition (Planned)

> **Status**: ✅ Implemented — `buyerPersonaTool` definition created in `packages/domain/src/generation/tools/index.ts`. Replaces `blogPostTool` stub (line 110). Prompt templates created in `apps/backend/src/prompts/buyer-persona/`. Frontend readiness fixes applied (W1-W5, W7). Pending smoke test on Railway.

```typescript
// packages/domain/src/generation/tools/index.ts (planned replacement)
const buyerPersonaTool: ToolDefinition = {
  toolKey: 'buyer-persona',
  name: 'Buyer Persona',
  description: 'Genera buyer persona a partire da un brief — con dati supplementari opzionali',
  creditCost: 1,
  produces: 'persona',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
    ],
    files: [
      {
        key: 'instructions',
        label: 'Dati supplementari',
        accept: ['.txt', '.md', '.docx'],
        required: false,
        description: 'Opzionale: carica survey, competitor analysis, dati di mercato aggiuntivi',
      },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'buyer-persona/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'personas-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'buyer-persona/personas-generation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

### Implementation Checklist

For the `buyerPersona` `ToolDefinition` in `packages/domain/src/generation/tools/index.ts`:
- [ ] Replace `'buyer-persona': blogPostTool` (line 110) with `'buyer-persona': buyerPersonaTool`
- [ ] `toolKey: 'buyer-persona'`, `name: 'Buyer Persona'`, `produces: 'persona'`, `creditCost: 1`
- [ ] `acquisition.assets`: `{ assetType: 'brief', required: true }` — brief is mandatory
- [ ] `acquisition.files`: `{ key: 'instructions', label: 'Dati supplementari', accept: ['.txt','.md','.docx'], required: false }` — file is optional
- [ ] `acquisition.userText`: none (no text fields — all context comes from brief + optional file)
- [ ] Step 1: `{ order: 1, label: 'extraction', enrichment: 'serial', prompt: { templateId: 'buyer-persona/extraction', version: '1.0.0', model: ModelTier.Balanced, components: ['output-json/v1'] } }`
- [ ] Step 2: `{ order: 2, label: 'personas-generation', enrichment: 'serial', prompt: { templateId: 'buyer-persona/personas-generation', version: '1.0.0', model: ModelTier.Premium, components: ['output-plain-text/v1', 'italian-formal/v1'] } }`

For prompt template files (`apps/backend/src/prompts/`):
- [ ] `buyer-persona/extraction/versions/1.0.0/system.md` — extraction specialist: reads brief + optional file, outputs 5-field JSON
- [ ] `buyer-persona/extraction/versions/1.0.0/user.md` — user prompt referencing brief content and optional file data in context
- [ ] `buyer-persona/personas-generation/versions/1.0.0/system.md` — persona specialist: synthesizes extraction into 10-section persona
- [ ] `buyer-persona/personas-generation/versions/1.0.0/user.md` — user prompt with extraction context injection + structural constraints

For frontend (`apps/frontend/src/tool-inputs.ts`):
- [ ] Remove `'buyer-persona': DEFAULT_INPUTS` (line 60) — tool has no text inputs
- [ ] Add `BUYER_PERSONA_FILES` to `TOOL_FILES`: `{ key: 'instructions', label: 'Dati supplementari', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: survey, competitor analysis...' }`

### Backend
- [ ] No API changes needed (generic tool API handles all tools)
- [ ] `ContextEnricher` already injects `[Asset - brief]\n{content}` for asset-backed steps — no code changes
- [ ] `AssetResolver` resolves `brief` assets from workspace — already supports `selectedAssetIds` filtering (Phase 4 of multi-asset promotion)

### Testing
- [ ] `npx tsc --noEmit` passes in all packages
- [ ] `npx vitest run` passes in all packages
- [ ] Smoke test: start session, verify extraction step outputs 5-field JSON, personas-generation step outputs 10-section persona
- [ ] Asset promotion: verify `produces: 'persona'` creates a `persona` asset in the workspace

## Key Differences from Brief Tool

| Dimension | Brief Tool | Persona Generator |
|-----------|-----------|-------------------|
| Acquisition | `files` (required) + `userText` (optional) | `assets: brief` (required) + `files` (optional) |
| Input philosophy | From-scratch: extracts from raw briefing document | Derived: enriches existing brief with supplemental data |
| Step 2 model tier | `balanced` | `premium` — psychological depth requires stronger model |
| Step 2 complexity | 11 sections, document synthesis | 10 sections + Persona Naming Convention + safe-inference taxonomy |
| Persona Naming Convention | Not applicable | Deterministic rules embedded in system prompt |
| Safe Inference Taxonomy | Simple (tone from product type) | 4-category taxonomy (safe to infer vs never infer) |
| Downstream consumers | Tools consume sections as structural inputs | Tools consume persona as behavioral/psychological reference |
| Asset Usage Rule | Brief is an orchestration document | Persona is an abstract reference profile (not a real person) |

## Sources

- [[sources/personas-generator]] — source summary of both prompt prototypes
- [[sources/personas-generator/prompt_extraction]] — Step 1 extraction prompt (raw)
- [[sources/personas-generator/prompt_personas_generation]] — Step 2 persona generation prompt (raw)
- [[Brief Tool - Prompt Architecture]] — Reference implementation (same 2-step asset tool pattern)

## Frontend Readiness (2026-08-06)

All frontend gaps identified by the [[Persona Generator - Prompt Architecture#Frontend Readiness|UI design audit]] have been closed. No changes needed when the backend ToolDefinition ships.

### Fixes Applied

| # | Gap | File | Fix |
|---|-----|------|-----|
| W1 | SetupPanel mostra "Nessun input richiesto" per tool con zero text ma asset richiesti | `SetupPanel.tsx:154-161` | Aggiunto `assetDef` prop; condizione differenziata: `!assetDef?.length` → "no inputs", `assetDef?.length > 0` → "seleziona asset" |
| W2 | Singolo brief da selezionare manualmente | `ToolPageLayout.tsx:97-107` | `useEffect` auto-seleziona quando esattamente 1 asset matching per tipo required single-select |
| W3 | AssetPicker vuoto senza guida | `AssetPicker.tsx:33-57` | Aggiunto `Button` CTA `[Crea {type}]` che naviga al tool corretto via `ASSET_TOOL_MAP` |
| W4 | Copy module | `packages/copy/src/it/tool-page.ts` | Aggiunte chiavi: `readiness.assetsOnly`, `assets.createAssetCta`, `assets.autoSelected` |
| W5 | CompletionBanner `stepCount: 1` errato | `SetupPanel.tsx` + `ToolPageLayout.tsx` | `stepCount` aggiunto a `ToolDefinitionData`, derivato da API (`tool.stepCount`) o fallback |
| W7 | `tool-inputs.ts` aveva input errati per buyer-persona | `tool-inputs.ts:60,65-68` | `TOOL_INPUTS['buyer-persona']` = `[]`; aggiunto fallback `TOOL_FILES['buyer-persona']` |

### Exports Added
- `AssetCoverageBar.tsx`: `ASSET_LABELS` e `ASSET_TOOL_MAP` ora esportati (usati da `AssetPicker` + `ToolPageLayout`)

### Verification
- `npx tsc --noEmit` in `apps/frontend`: ✅ zero errori

## Implementation Status (2026-08-06) — ✅ Domain + Backend Complete

The `buyerPersonaTool` definition replaces the `blogPostTool` stub in `toolRegistry`. 4 prompt template files created. All typechecks and tests pass.

### Domain & Backend

| File | Change |
|------|--------|
| `packages/domain/src/generation/tools/index.ts` | `buyerPersonaTool`: 2-step pipeline, `produces: 'persona'`, `acquisition.assets: [{ assetType: 'brief', required: true }]`, optional file upload |
| `apps/backend/src/prompts/buyer-persona/extraction/.../system.md` | Market Research Data Extractor — 5-field JSON, anti-hallucination, good/bad examples |
| `apps/backend/src/prompts/buyer-persona/extraction/.../user.md` | User prompt: extract from brief asset + optional file |
| `apps/backend/src/prompts/buyer-persona/personas-generation/.../system.md` | Buyer Persona Specialist — 10-section persona, Persona Naming Convention, safe inference taxonomy |
| `apps/backend/src/prompts/buyer-persona/personas-generation/.../user.md` | User prompt: generate persona from extraction JSON |

### Frontend (already applied on branch)

| File | Change |
|------|--------|
| `apps/frontend/src/components/tool/SetupPanel.tsx` | W1: `assetDef` prop, differentiated empty-state message |
| `apps/frontend/src/components/layout/ToolPageLayout.tsx` | W2: auto-select single asset; W3: `onCreateAsset` wiring; W5: `stepCount` from API |
| `apps/frontend/src/components/shared/AssetPicker.tsx` | W3: CTA button in empty state |
| `apps/frontend/src/components/workspace/AssetCoverageBar.tsx` | Export `ASSET_LABELS` and `ASSET_TOOL_MAP` |
| `apps/frontend/src/tool-inputs.ts` | W7: `buyer-persona` text inputs → `[]`, file fallback |
| `packages/copy/src/it/tool-page.ts` | W4: `readiness.assetsOnly`, `assets.createAssetCta`, `assets.autoSelected` |

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅  frontend ✅
vitest        →  720/720 (72 files) ✅
```