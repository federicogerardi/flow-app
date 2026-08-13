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

# Meta Ads — Prompt Architecture

> 3-step extraction→context→generation pipeline for the `ad-copy` tool (Meta Ads specialization)  
> Prompt prototypes from [[sources/meta-ads]] — raw source for the `ad-copy` `ToolDefinition`  
> **Current prompt version**: `1.1.0` (2026-08-13) — `tone` input wired to all 3 steps, context documentation, anti-hallucination safety net on Step 1, `creditCost: 2`

## Architecture

The meta-ads generator is a **Content Tool** that produces Meta Ads copy across audience clusters, angles, and awareness levels. It follows the cluster → angle → awareness system, generating production-ready ad assets with user-selectable copy length.

```
ACQUISITION                     STEP 1 (extraction)        STEP 2 (context-gen)        STEP 3 (ads-generation)
────────────                    ────────────────────       ───────────────────────     ───────────────────────────
┌─────────────────┐             ┌──────────────────┐       ┌─────────────────────┐     ┌──────────────────────────┐
│ brief asset (1)  │──┐          │ Ad Context          │       │ Meta Ads              │     │ Meta Ads Copywriter       │
│ (required)        │  │          │ Extractor            │ MARK  │ Strategist            │     │                           │
└─────────────────┘  │          │                     │ DOWN  │                       │     │                           │
                     │ ┌──────┐ │ Input: brief +      │──────▶│ Input: extraction     │────▶│ Input: strategy canvas    │
┌─────────────────┐  ├▶│Enricher│▶ personas + angles   │       │ Output: strategy      │     │ + copy length format      │
│ persona assets  │──┘ └──────┘ │ + text inputs        │       │ canvas (clusters,     │     │ Output: Meta Ads library   │
│ (N, optional)   │             │ Output: structured   │       │ angles, objections)   │     │ (Italian, Markdown)       │
└─────────────────┘             │ context (English)     │       └─────────────────────┘     └──────────────────────────┘
┌─────────────────┐             └──────────────────┘
│ angle assets    │
│ (N, optional)   │

┌─────────────────┐
│ text inputs:     │
│ audience, goal,  │
│ tone, copyLength │
└─────────────────┘
```

## Cluster → Angle → Awareness System

The core innovation of this tool is the three-dimensional output matrix:

```
CLUSTER 1                 CLUSTER 2                 CLUSTER 3
├── Angle A               ├── Angle A               ├── Angle A
│   ├── Problem Aware     │   ├── Problem Aware     │   ├── Problem Aware
│   ├── Solution Aware    │   ├── Solution Aware    │   ├── Solution Aware
│   └── Product Aware     │   └── Product Aware     │   └── Product Aware
└── Angle B               └── Angle B               └── Angle B
    ├── Problem Aware         ├── Problem Aware         ├── Problem Aware
    ├── Solution Aware        ├── Solution Aware        ├── Solution Aware
    └── Product Aware         └── Product Aware         └── Product Aware
```

- **3 clusters** = 3 audience segments with distinct pain points and motivations
- **2 angles per cluster** = 2 different communication strategies
- **3 awareness versions per angle** = Problem Aware, Solution Aware, Product Aware
- **Total**: up to 18 distinct ad variants from a single generation

## Awareness Model (3 levels)

Simpler than the 5-level angle generator model — focused on direct-response Meta Ads:

| Level | Ad strategy |
|-------|-------------|
| **Problem Aware** | Full PAS (Problem-Agitate-Solve). The audience knows the pain — agitate it, then solve |
| **Solution Aware** | Competitive differentiation. Position your solution category as superior |
| **Product Aware** | Direct offer + social proof. Attenuated PAS — lead with credibility and offer |

## Copy Length Formats

User-selectable per generation via `copyLength` text input:

| Format | Characters | Structure | Use case |
|--------|-----------|-----------|----------|
| **Short** | 400-600 | Hook → Problem → Solution → CTA | Feed ads, remarketing |
| **Medium** | 800-1000 | Hook → Problem → Agitate → Solution → Proof → CTA | Consideration campaigns |
| **Long** | 1200+ | Hook → Story → Problem → Agitate → Solution → Proof → Mechanism → CTA | Cold traffic, high-ticket |

## Step 1 — Extraction

**Step key**: `extraction`  
**Model tier**: `balanced`  
**Prompt components**: `output-json/v1`, `anti-hallucination/v1`  
**Enrichment**: `serial`

Extracts structured ad context from brief + personas + angles + text inputs:

| Field | Source |
|-------|--------|
| Product/Service | brief asset |
| Target Audience | personas |
| Campaign Objective | `goal` input |
| Primary Offer | brief |
| Proof Points | brief + brand facts |
| Dominant Pain Points | personas |
| Objections | personas + brief |
| Cluster Opportunities | synthesized from personas |
| Angle Candidates | synthesized from pain points + objectives |
| **Tone** (v1.1.0) | `tone` input — direct pass-through from user selection |

Output is JSON in English (prototype convention — extraction is the only English step).

**Context documented** (v1.1.0): `[Asset - brief]`, `[Asset - persona]`, `[Asset - angle]`, `[Input - goal]`, `[Input - tone]`, `[Input - copyLength]` — 6 labeled sections with extraction priority.

## Step 2 — Context Generation

**Step key**: `context-generation`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial`

Transforms extraction into a strategy canvas in Italian:
- Target Clusters (3+) with characteristics, pain points, desired outcomes, **tone-calibrated messaging** (v1.1.0)
- Messaging Angles (2 per cluster) with core narrative, awareness fit, differentiators
- Brand Facts Bank (credibility markers, social proof, authority, trust signals)
- Objection Handling Matrix (counter-message + required proof per objection)
- Offer Positioning (core promise, mechanism, risk reversal)

**Tone input** (v1.1.0): The user-selected tone calibrates the "Messaging Tone" for every cluster via a 5-register mapping table (Professional→data-driven, Casual→conversational, Urgente→scarcity, Empatico→emotional, Autorevole→expert). Applied consistently across all clusters.

**Context documented** (v1.1.0): 11-field extraction mapping, Field→Canvas table, tone calibration rule.

## Step 3 — Ads Generation

**Step key**: `ads-generation`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial`

Generates production-ready Meta Ads library in Italian. For every cluster × angle × awareness level:
- **Primary Text** respecting selected copy length + **user-selected tone** (v1.1.0)
- **Headline** (~40 chars)
- **Description** (~30 chars)
- **Targeting Suggestions** per cluster
- **Visual Suggestions** per angle

**Tone input** (v1.1.0): The tone affects register, rhythm, CTA style, hook approach, and vocabulary for ALL copy. 6-register mapping table (Professional/Casual/Urgente/Empatico/Autorevole/Not provided). Global directive — applied consistently across all clusters, angles, and awareness versions. QA checklist includes tone verification.

**Context documented** (v1.1.0): 5 data sources with Data Priority Chain (Canvas > Tone > Copy Length > Brand Facts > Objections). Tone Override Rule: user's tone takes priority over cluster messaging tone.

## ToolDefinition

**File**: `packages/domain/src/generation/tools/index.ts` (lines 203–258)

```typescript
const adCopyTool: ToolDefinition = {
  toolKey: 'ad-copy',
  name: 'Meta Ads',
  description: 'Genera copy per campagne Meta (Facebook/Instagram) con sistema cluster → angolo → awareness',
  creditCost: 2,
  outputCategory: ToolOutputCategory.ContentProducer,
  acquisition: {
    userText: [
      { key: 'goal', label: 'Campaign Goal', required: true, type: 'select', options: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Sales'] },
      { key: 'tone', label: 'Tone', required: false, type: 'select', options: ['Professional', 'Casual', 'Urgente', 'Empatico', 'Autorevole'] },
      { key: 'copyLength', label: 'Copy Length', required: true, type: 'select', options: ['short', 'medium', 'long'] },
    ],
    assets: [
      { assetType: 'brief', required: true },
      { assetType: 'persona', required: true, multiple: true },
      { assetType: 'angle', required: false, multiple: true },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/extraction',
        version: '1.1.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1', 'anti-hallucination/v1'],
      },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'context-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/context-generation',
        version: '1.1.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'ads-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/ads-generation',
        version: '1.1.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 180000, maxRetries: 2 },
    },
  ],
};
```

> **Current state**: `'ad-copy': adCopyTool` in `toolRegistry`. Fully implemented.

## Platform Scope Decision

The prototype is Meta-specific. The `ad-copy` toolKey is platform-agnostic in the current stub (`platform` select with Meta/Google/LinkedIn/TikTok). Two options:

| Option | Approach | Trade-off |
|--------|----------|-----------|
| **A) Meta-specific** | Remove `platform` input, implement Meta-only pipeline | Simpler prompt, higher quality. Other platforms need new tools |
| **B) Platform-agnostic** | Keep `platform` input, pass to LLM as context variable | One tool, lower per-platform quality. Prompt must handle 4 platforms |

The prototype strongly favors option A — the cluster/angle/awareness system and copy length format are Meta Ads native (Primary Text, Headline, Description fields). Google/LinkedIn/TikTok have different ad formats and creative requirements.

**Recommendation**: implement `ad-copy` as Meta-specific with the cluster → angle → awareness system. Create separate tools for Google Ads, LinkedIn Ads, TikTok Ads if needed later.

## Prompt Template Files

```
apps/backend/src/prompts/ad-copy/
├── extraction/
│   └── versions/1.1.0/
│       ├── system.md    # Ad Context Extractor — 11-field JSON, anti-hallucination, tone pass-through
│       └── user.md      # Context documented: 6 labeled sections, extraction priority
├── context-generation/
│   └── versions/1.1.0/
│       ├── system.md    # Meta Ads Strategist — tone-calibrated clusters, 5-register mapping table
│       └── user.md      # Context documented: Field→Canvas mapping, tone calibration rule
└── ads-generation/
    └── versions/1.1.0/
        ├── system.md    # Meta Ads Copywriter — tone-aware copy, 6-register mapping, QA checklist with tone verification
        └── user.md      # Context documented: 5 data sources, Data Priority Chain, Tone Override Rule
```

## v1.1.0 — Tone Wiring & Context Documentation (2026-08-13)

**Problem**: 5 gaps in v1.0.0:
1. **`tone` input silently ignored** — user selected Professional/Casual/Urgente/Empatico/Autorevole but zero prompt files used it. Extraction had no `tone` field. Context-generation and ads-generation had no tone awareness.
2. **Step 1 missing `anti-hallucination/v1` component** — per-step `components: ['output-json/v1']` REPLACED defaults, dropping the safety net (inline rules covered it, but fragile)
3. **`creditCost: 1`** for a 3-step pipeline with 2 premium models (wiki said 2)
4. **`marketing-tone/v1` in DEFAULT_COMPONENTS but never applied** — Steps 2-3 override components entirely, making it dead code
5. **User prompts thin** (9-16 lines each) — no context structure documentation

### Changes

| File | Change |
|------|--------|
| `tools/index.ts` | `creditCost: 1` → `2`. Step 1: +`anti-hallucination/v1` to components. All 3 steps: `version: '1.0.0'` → `version: '1.1.0'` |
| `default-components.ts` | Replaced `marketing-tone/v1` with `italian-formal/v1` (dead code → aligned with per-step reality) |
| `extraction/1.1.0/system.md` | Added `tone` as 11th field. Updated extraction table. Added tone rule: direct pass-through, do not reinterpret |
| `extraction/1.1.0/user.md` | Documented context: 6 labeled sections (`[Asset - brief]`, `[Asset - persona]`, `[Asset - angle]`, `[Input - goal/tone/copyLength]`). Added extraction priority |
| `context-generation/1.1.0/system.md` | Added Tone Input Usage section: 5-register calibration table. Updated Strategic Snapshot to include Tone field. Updated cluster Messaging Tone annotation |
| `context-generation/1.1.0/user.md` | Documented context: 11-field extraction. Added Field→Canvas mapping table. Added tone calibration rule |
| `ads-generation/1.1.0/system.md` | Added Tone Input Usage section: 6-register copy style table (Professional/Casual/Urgente/Empatico/Autorevole/Not provided). Updated output structure with Tone header. Added tone to QA checklist |
| `ads-generation/1.1.0/user.md` | Documented context: 5 data sources. Added Data Priority Chain. Added Tone Override Rule |

### Result

- **`tone` now influences all 3 steps**: Step 1 extracts it, Step 2 calibrates cluster messaging tones (5-register mapping), Step 3 controls copy register/rhythm/CTA/vocabulary (6-register mapping)
- **Step 1 has anti-hallucination safety net** — inline rules + component backup
- **`creditCost: 2`** — reflects 3-step pipeline with 2 premium models
- **`DEFAULT_COMPONENTS` aligned** — `marketing-tone/v1` (dead) → `italian-formal/v1` (matches per-step)
- **Context documented in all user prompts** — following Brief v1.1.0 / Brand Voice v1.1.0 / blog-post v1.1.0 pattern

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅
vitest        →  domain 490/490 ✅  backend 145/145 ✅
```

## Key Differences from Angle Generator

| Dimension | Angle Generator | Meta Ads |
|-----------|----------------|----------|
| Type | Asset tool | Content tool |
| Produces | `angle` asset | (no asset) |
| Awareness levels | 5 (Completely Unaware → Most Aware) | 3 (Problem → Solution → Product Aware) |
| Output structure | Top 3 angles × creative activation | 3 clusters × 2 angles × 3 awareness levels |
| Copy length | Fixed (creative foundations) | User-selectable (short/medium/long) |
| Primary use | Strategic direction for content tools | Direct ad copy for Meta campaigns |
| Consumes | brief (required) + personas (required) | brief (required) + personas (required) + angles (optional) + 3 selects |

## Downstream Relationship

Meta Ads is the terminal content tool in the pipeline:

```
brief → buyer-persona → marketing-angle → ad-copy (Meta Ads)
                                           → landing-funnel
                                           → landing-page
                                           → video-script-long-form
```

Angles produced by `marketing-angle` inform creative direction; Meta Ads produces the final copy.

## Sources

- [[sources/meta-ads/prompt_extraction]] — Step 1: ad context extraction
- [[sources/meta-ads/prompt_context_generation]] — Step 2: cluster-based strategy canvas
- [[sources/meta-ads/prompt_ads_generation]] — Step 3: cluster → angle → awareness ad generation