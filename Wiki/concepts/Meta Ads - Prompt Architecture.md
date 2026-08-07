---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-07
source_count: 3
confidence: high
implementation: complete
frontend_ready: true
smoke_test: passed
---

# Meta Ads — Prompt Architecture

> 3-step extraction→context→generation pipeline for the `ad-copy` tool (Meta Ads specialization)  
> Prompt prototypes from [[sources/meta-ads]] — raw source for the `ad-copy` `ToolDefinition`

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
**Prompt component**: `output-json/v1`  
**Enrichment**: `serial`

Extracts structured ad context from brief + personas + angles + text inputs:

| Field | Source |
|-------|--------|
| Product/Service | brief asset |
| Target Audience | personas + `audience` input |
| Campaign Objective | `goal` input |
| Primary Offer | brief |
| Proof Points | brief + brand facts |
| Dominant Pain Points | personas |
| Objections | personas + brief |
| Cluster Opportunities | synthesized from personas |
| Angle Candidates | synthesized from pain points + objectives |

Output is JSON in English (prototype convention — extraction is the only English step).

## Step 2 — Context Generation

**Step key**: `context-generation`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial`

Transforms extraction into a strategy canvas in Italian:
- Target Clusters (3+) with characteristics, pain points, desired outcomes, messaging tone
- Messaging Angles (2 per cluster) with core narrative, awareness fit, differentiators
- Brand Facts Bank (credibility markers, social proof, authority, trust signals)
- Objection Handling Matrix (counter-message + required proof per objection)
- Offer Positioning (core promise, mechanism, risk reversal)

## Step 3 — Ads Generation

**Step key**: `ads-generation`  
**Model tier**: `premium`  
**Prompt components**: `output-plain-text/v1`, `italian-formal/v1`  
**Enrichment**: `serial`

Generates production-ready Meta Ads library in Italian. For every cluster × angle × awareness level:
- **Primary Text** respecting selected copy length + strategic whitespace (long format)
- **Headline** (~40 chars)
- **Description** (~30 chars)
- **Targeting Suggestions** per cluster
- **Visual Suggestions** per angle
- **Psychological Triggers Matrix**

## ToolDefinition (Planned)

```typescript
const adCopyTool: ToolDefinition = {
  toolKey: 'ad-copy',
  name: 'Meta Ads',
  description: 'Genera copy per campagne Meta (Facebook/Instagram) con sistema cluster → angolo → awareness',
  creditCost: 2,
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
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
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'context-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/context-generation',
        version: '1.0.0',
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
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 180000, maxRetries: 2 },
    },
  ],
};
```

> **Current state**: `'ad-copy': blogPostTool` stub in `toolRegistry`. Replace with `adCopyTool`.

## Platform Scope Decision

The prototype is Meta-specific. The `ad-copy` toolKey is platform-agnostic in the current stub (`platform` select with Meta/Google/LinkedIn/TikTok). Two options:

| Option | Approach | Trade-off |
|--------|----------|-----------|
| **A) Meta-specific** | Remove `platform` input, implement Meta-only pipeline | Simpler prompt, higher quality. Other platforms need new tools |
| **B) Platform-agnostic** | Keep `platform` input, pass to LLM as context variable | One tool, lower per-platform quality. Prompt must handle 4 platforms |

The prototype strongly favors option A — the cluster/angle/awareness system and copy length format are Meta Ads native (Primary Text, Headline, Description fields). Google/LinkedIn/TikTok have different ad formats and creative requirements.

**Recommendation**: implement `ad-copy` as Meta-specific with the cluster → angle → awareness system. Create separate tools for Google Ads, LinkedIn Ads, TikTok Ads if needed later.

## Prompt Template Files

6 files to create under `apps/backend/src/prompts/ad-copy/`:

```
ad-copy/
├── extraction/
│   └── versions/1.0.0/
│       ├── system.md    # Ad Context Extractor — structured 13-field extraction in English
│       └── user.md      # Extract from brief + personas + text inputs
├── context-generation/
│   └── versions/1.0.0/
│       ├── system.md    # Meta Ads Strategist — cluster segmentation, angle development, objection matrix
│       └── user.md      # Build strategy canvas from extraction
└── ads-generation/
    └── versions/1.0.0/
        ├── system.md    # Meta Ads Copywriter — cluster → angle → awareness with copy length control
        └── user.md      # Generate ad library from strategy canvas + copy length format
```

## Implementation Checklist

### Domain
- [ ] `adCopyTool` definition replaces `blogPostTool` stub in `toolRegistry`
- [ ] `acquisition.userText`: `goal`, `tone`, `copyLength` — all selects, no free-text inputs
- [ ] `acquisition.assets`: `brief` (required), `persona` (optional, multiple), `angle` (optional, multiple)
- [ ] `creditCost: 2` — 3 steps, 2 premium models
- [ ] 3 steps: extraction (balanced) → context-generation (premium) → ads-generation (premium, 180s timeout)
- [ ] `npx tsc --noEmit` passes in `packages/domain`

### Prompt Templates
- [ ] 6 files created under `apps/backend/src/prompts/ad-copy/`
- [ ] `extraction/system.md` — Ad Context Extractor with cluster detection
- [ ] `extraction/user.md` — extract from brief + personas + text
- [ ] `context-generation/system.md` — Meta Ads Strategist with cluster → angle system
- [ ] `context-generation/user.md` — build canvas from extraction
- [ ] `ads-generation/system.md` — Meta Ads Copywriter with copy length + awareness matrix
- [ ] `ads-generation/user.md` — generate ads from canvas
- [ ] Persona asset rule in all non-extraction prompts

### Frontend
- [ ] `tool-inputs.ts`: replace `AD_COPY_INPUTS` with updated fields (remove `platform`, add `copyLength`)
- [ ] No file inputs (tool has no `files` in acquisition)
- [ ] `npx tsc --noEmit` passes in `apps/frontend`

### Backend
- [ ] No API changes needed (generic tool API)
- [ ] `npx tsc --noEmit` passes in `apps/backend`

### Testing
- [ ] `npx vitest run` passes in all packages
- [ ] Smoke test: start session, verify 3-step pipeline
- [ ] Verify 3 clusters × 2 angles × 3 awareness levels = 18 ad variants in output

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