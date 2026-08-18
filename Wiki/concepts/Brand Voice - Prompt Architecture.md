---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-13
source_count: 3
confidence: high
implementation: complete
current_version: 1.1.0
---

# Brand Voice — Prompt Architecture

> 2-step extraction→generation pipeline for the `brand-voice` asset tool  
> Prompt prototypes from [[sources/tov-generator]] — raw source for the `brand-voice` `ToolDefinition`  
> **Current prompt version**: `1.1.0` (2026-08-13) — user prompt enrichment, synthetic TOV transparency

## Architecture

The brand voice tool is an **Asset Tool** that produces a `brand-voice` AssetType consumed by 7 downstream content tools. It follows the 2-step extraction→generation pattern.

```
ACQUISITION                     STEP 1 (extraction)        STEP 2 (tov-generation)
────────────                    ────────────────────       ───────────────────────────
┌─────────────────┐             ┌──────────────────┐       ┌─────────────────────────────┐
│ brief asset (1) │──┐          │ Brand Analysis     │       │ Brand Strategist +           │
│ (required)       │  │          │ Specialist          │ JSON  │ Tone of Voice Specialist     │
└─────────────────┘  │          │                     │─────▶│                              │
                     │ ┌──────┐ │ Input: brief +      │       │ Input: extraction JSON       │
┌─────────────────┐  ├▶│Enricher│▶ optional material  │       │ Output: 8-section TOV        │
│ file opt. (.txt/│──┘ └──────┘ │ Output: 5-field JSON│       │ (Italian, Markdown)          │
│ .md/.docx)       │             │                      │       └─────────────────────────────┘
│ material         │             │ fields: brand_or_    │                         │
└─────────────────┘             │ company, target_      │                         ▼
                                │ audience, tone,       │             `produces: 'brand-voice'`
                                │ product_or_service,   │
                                │ market                │          ┌────────────────────┐
                                └──────────────────┘          │ Asset Promotion    │
                                                              │ (AssetType.brand-  │
                                                              │  voice)            │
                                                              └────────────────────┘
```

### Step 1: Extraction

**Step key**: `extraction`  
**Model tier**: `balanced`  
**Prompt component**: `output-json/v1`  
**Enrichment**: `serial` (receives brief asset content + optional file data)

Extracts 5 core data points from the brief and any supplemental brand material:

| Field | Description | Special rule |
|---|---|---|
| `brand_or_company` | Primary brand/company name, tagline, descriptor | — |
| `target_audience` | Explicit audience segments, demographics, psychographics | — |
| `tone` | Explicit tone descriptors from the source | **Never inferred** — use "non disponibile" if no explicit mention |
| `product_or_service` | Core offering, category, format, key characteristics | — |
| `market` | Market position, industry, competitive context, brand archetype | — |

The `tone` field has the strictest anti-inference rule in the entire Flow App tool catalog: if the source doesn't explicitly state tone descriptors, the field is "non disponibile." The TOV generation step will infer tone from market and audience context if needed — but the extraction must never fabricate it.

### Step 2: TOV Generation

**Step key**: `tov-generation`  
**Model tier**: `premium` (creative synthesis of brand voice requires a strong model)  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial` (receives Step 1's JSON output)

Synthesizes the extraction into a complete Brand Tone of Voice document in **Italian markdown** with 8 mandatory sections. The TOV is the authoritative `brand-voice` asset consumed by 7 downstream content tools.

## Downstream-First Design

The TOV is consumed by every content tool in Flow App:

| Tool | How it uses brand-voice |
|------|------------------------|
| `landing-funnel` | Voice-aligned headlines, CTAs, section copy |
| `landing-page` | Tone consistency across page sections |
| `video-script-long-form` | Hook tone, narrative voice, CTA style |
| `video-description` | Description tone, keyword integration style |
| `ad-copy` | Ad copy voice, headline patterns, CTA language |
| `blog-post` | Article tone, paragraph rhythm, transition style |
| `marketing-angle` | Angle messaging calibrated to brand voice register |

## Anti-Hallucination Guardrails

| Rule | Application |
|------|-------------|
| Never invent data, metrics, or entities not in source | Both steps |
| `"non disponibile"` / `"Non specificato nel documento di input"` for missing data | Step 1 (JSON) / Step 2 (prose) |
| Never attribute brand qualities not stated in source | Both steps |
| `tone` field never inferred in extraction | Step 1 |
| Inferred content marked with `"(inferito dal contesto)"` | Step 2 |

## Synthetic TOV Warning (v1.1.0)

If the extraction has `tone = "non disponibile"` (no explicit tone data in source), the TOV is 100% synthetic — built entirely from market segment and audience inference. The TOV generation step adds a mandatory warning at the top of the document:

> ⚠️ This Tone of Voice was built entirely by inference from market and audience context. The input documents contained no explicit tone of voice indications. Validate with the brand team before using in production.

This is critical: a synthetic TOV used without validation will produce inconsistent brand voice across downstream tools.

## ToolDefinition

```typescript
const brandVoiceTool: ToolDefinition = {
  toolKey: 'brand-voice',
  name: 'Brand Voice',
  description: 'Estrae il tone of voice da un brief e materiali aziendali, producendo linee guida complete per la comunicazione del brand su ogni canale',
  creditCost: 1,
  outputCategory: ToolOutputCategory.AssetProducer,
  produces: 'brand-voice',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
    ],
    files: [
      { key: 'material', label: 'Materiale aggiuntivo', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: carica documenti con specifiche aggiuntive sulla brand identity' },
    ],
    userText: [],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'brand-voice/extraction',
        version: '1.1.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'tov-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'brand-voice/tov-generation',
        version: '1.1.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

## Prompt Template Files

```
apps/backend/src/prompts/brand-voice/
├── extraction/
│   └── versions/1.1.0/
│       ├── system.md    # Brand Analysis Specialist — 5-field JSON, tone never inferred
│       └── user.md      # Extract from brief (primary) + optional material (supplemental)
└── tov-generation/
    └── versions/1.1.0/
        ├── system.md    # Brand Strategist — 8-section TOV, synthetic warning guardrail
        └── user.md      # Field→Section mapping, Section-Specific Instructions
```

## Key Differences from Other Asset Tools

| Dimension | Brief | Buyer Persona | Brand Voice |
|-----------|-------|---------------|-------------|
| Steps | 2 | 2 | 2 |
| Consumes | file (required) + userText | brief (required) + optional file | brief (required) + optional file |
| Produces | `brief` | `persona` | `brand-voice` |
| Step 2 model | `balanced` | `premium` | `premium` |
| userText | objective (required) | none | none |
| Unique constraint | Downstream orchestration doc | Persona Naming Convention | `tone` never inferred in extraction |
| Synthetic fallback | Conditional sections | Provenienza Dati section | Synthetic TOV warning |

## v1.1.0 — Context Structure & Synthetic TOV Transparency (2026-08-13)

**Problem**: The v1.0.0 extraction user.md referenced a "brief asset" incorrectly — the original prompt was written for file-only acquisition, but the ToolDefinition uses `assets: [{ assetType: 'brief', required: true }]` with optional file. Both user.md files were thin (5 lines each). Additionally, when extraction returned `tone = "non disponibile"`, the TOV was built entirely from inference with no warning to the user.

### Changes

| File | Change |
|------|--------|
| `extraction/1.1.0/system.md` | Updated role description to reference brief as primary data source |
| `extraction/1.1.0/user.md` | Documented context structure (`[Asset - brief]` primary, `[File - material]` supplemental). Added extraction priority rules, source hierarchy, field list. |
| `tov-generation/1.1.0/system.md` | Added Strategic Guardrail #6: mandatory synthetic TOV warning when tone = "non disponibile". Added checklist item. |
| `tov-generation/1.1.0/user.md` | Added Field→Section mapping table. Added Section-Specific Instructions. Added Synthetic TOV rules. |
| `tools/index.ts` | Both steps: `version: '1.0.0'` → `version: '1.1.0'` |

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅
vitest        →  domain 490/490 ✅  backend 145/145 ✅
```

## Sources

- [[sources/tov-generator]] — source summary of both prompt prototypes
- [[sources/tov-generator/prompt_extraction]] — Step 1 extraction prompt (raw)
- [[sources/tov-generator/prompt_tov_generation]] — Step 2 TOV generation prompt (raw)