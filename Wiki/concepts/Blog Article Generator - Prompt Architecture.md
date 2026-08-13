---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompt-architecture
date_updated: 2026-08-13
source_count: 11
confidence: high
implementation: complete
current_version: 1.1.0
---

# Blog Article Generator — Prompt Architecture

> **Canonical tool key**: `blog-post`. **v1 name**: `blog-article-generator`. Content producer — output is NOT promotable to a [[Asset|workspace asset]].
> **Current prompt version**: `1.1.0` (2026-08-13) — `instructions` wired to all steps, brand-voice + persona assets connected, context documentation, Feedback Incorporation completed

## Overview

The Blog Article Generator produces ~800-word SEO-optimized articles in Italian from a user-provided title and optional custom instructions. It uses a **3-step serial pipeline** where each step feeds the next: SEO structure → in-depth research → final article.

## Acquisition

| Input | Key | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Article title | `topic` | `short` text | Yes | Becomes the H1 — never rewritten |
| Custom instructions | `instructions` | `long` text (textarea) | No | Wired to all 3 steps (v1.1.0). Step 1: guides SEO strategy; Step 2: weights research depth; Step 3: adjusts emphasis/tone/scope |
| Brand Voice | `brand-voice` asset | workspace asset | No | Wired to all 3 steps (v1.1.0). Injected via `[Asset - brand-voice]` context. Calibrates tone register throughout pipeline |
| Persona | `persona` asset | workspace asset | No | Wired to all 3 steps (v1.1.0). Calibrates reading level, example relevance, information depth |

## Pipeline

```
User Input (title + instructions)
         │
         ▼
┌─────────────────────────────────┐
│ Step 1 — SEO Structure          │  Model: search
│ Real-time web research          │  Timeout: 90s, retries: 2
│ Output: H1 + 2–4 H2 sections    │
└──────────────┬──────────────────┘
               │ output_step_blog_seo_structure
               ▼
┌─────────────────────────────────┐
│ Step 2 — Research               │  Model: balanced
│ In-depth data per H2 section    │  Timeout: 90s, retries: 2
│ Output: structured research data │
└──────────────┬──────────────────┘
               │ output_step_blog_research
               ▼
┌─────────────────────────────────┐
│ Step 3 — Article                │  Model: premium
│ ~800-word Italian article       │  Timeout: 120s, retries: 2
│ Output: final Markdown artifact │
└─────────────────────────────────┘
```

## Step Details

### Step 1 — SEO Structure

**Prompt**: `blog-post/seo-structure/versions/1.1.0/system.md` + `user.md`

Acts as a Senior SEO Strategist. Performs **real-time online research** on the topic (blocking requirement — cannot proceed from memory). Analyzes top-ranking Italian-language results to determine the optimal H2 information architecture.

**Context documented** (v1.1.0): `[Input - topic]`, `[Input - instructions]`, `[Asset - brand-voice]`, `[Asset - persona]` — no bare placeholders. Instructions are authoritative supplements that can override default SEO strategy decisions (e.g., "focus on cost comparison" → prioritize cost-oriented H2s).

**Output**: Markdown with 1 H1 (exact topic title) + 2–4 H2 sections + list of consulted sources.

### Step 2 — Research

**Prompt**: `blog-post/research/versions/1.1.0/system.md` + `user.md`

Takes the SEO structure from Step 1 and performs in-depth research on each H2 section. Produces structured data: key information, concrete data/statistics, semantically related keywords, practical examples — all focused on the Italian market.

**Context documented** (v1.1.0): `[Input - topic]`, `[Input - instructions]`, `[Asset - brand-voice]`, `[Asset - persona]`, `[Previous Step 1]`. Instructions weight research depth across sections.

**Output**: Structured content organized by H2 section. First line is research data (no preamble).

### Step 3 — Article

**Prompt**: `blog-post/article/versions/1.1.0/system.md` + `user.md`

Acts as a professional copywriter. Writes the final ~800-word article in Italian, filling the SEO-validated H2 skeleton with research-backed content. **Anti-hallucination guardrails are intentionally NOT applied here** — this step can elaborate beyond raw research data with context, examples, and narrative depth. Includes a **gold standard example** (React 19 article excerpt) as a quality benchmark.

**Context documented** (v1.1.0): `[Input - topic]`, `[Input - instructions]`, `[Asset - brand-voice]`, `[Asset - persona]`, `[Previous Step 1]`, `[Previous Step 2]`. Data priority explicit: H1/H2 (fixed) > Research Data > Brand Voice > Instructions > Persona.

**Non-negotiable constraints**:
- H1 = exactly the user-provided title (SEO requirement)
- H2 headings = exactly as determined by Step 1 — no additions, removals, reordering, rewording
- Source citations: cite primary/authoritative sources; never mention container blogs/sites
- Prose rules: max 1 bullet list, no bold at paragraph start, rhythmic variety
- Output determinism: first character = H1, zero preamble

**Feedback Incorporation** (v1.1.0 — completed section): adjusts only sections mentioned in feedback; never changes uncriticized sections; prioritizes H1/H2 structure over feedback if they conflict; adds `## Note sulla Rigenerazione` for constraint explanations.

## Model Tier Rationale

| Step | Tier | Model | Rationale |
|------|------|-------|-----------|
| 1 — SEO Structure | `search` | `google/gemini-2.5-pro` | Requires real-time web search — static knowledge insufficient |
| 2 — Research | `balanced` | `openai/gpt-4o-mini` | Structured extraction from research data — no creative synthesis |
| 3 — Article | `premium` | `anthropic/claude-sonnet-5` | Creative Italian prose, editorial rhythm, quality benchmark. No anti-hallucination constraints — allowed to elaborate beyond research data |

## Domain Definition

**File**: `packages/domain/src/generation/tools/index.ts` (lines 16–58)

```typescript
const blogPostTool: ToolDefinition = {
  toolKey: 'blog-post',
  name: 'Articolo Blog',
  description: 'Genera un articolo blog ottimizzato SEO a partire da un titolo e istruzioni personalizzate',
  creditCost: 1,
  outputCategory: ToolOutputCategory.ContentProducer,
  // produces is NOT set — content tool, output is not promotable to an asset
  // defaultComponents is NOT set — every step declares its full component list explicitly.
  acquisition: {
    userText: [
      { key: 'topic', label: 'Titolo articolo', required: true, type: 'short' },
      { key: 'instructions', label: 'Istruzioni personalizzate', required: false, type: 'long', placeholder: 'Aggiungi istruzioni per la generazione...' },
    ],
    assets: [
      { assetType: 'brand-voice', required: false },
      { assetType: 'persona', required: false },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'seo-structure',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/seo-structure', version: '1.1.0', model: ModelTier.Search, components: ['output-markdown/v1', 'anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'research',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/research', version: '1.1.0', model: ModelTier.Balanced, components: ['anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'article',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/article', version: '1.1.0', model: ModelTier.Premium, components: ['output-markdown/v1', 'seo-optimized/v1', 'italian-formal/v1'] },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

## Prompt Template Files

```
apps/backend/src/prompts/blog-post/
├── seo-structure/
│   └── versions/1.1.0/
│       ├── system.md    # Senior SEO Strategist — H2 skeleton, anti-hallucination, asset usage
│       └── user.md      # Context documented: [Input - topic], [Input - instructions], assets, research priority
├── research/
│   └── versions/1.1.0/
│       ├── system.md    # Research Analyst — per-H2 research, anti-hallucination, asset usage
│       └── user.md      # Context documented: 5 labeled sections, instructions guidance
└── article/
    └── versions/1.1.0/
        ├── system.md    # Professional Copywriter — gold standard example, Feedback Incorporation, asset-aware
        └── user.md      # Context documented: 6 labeled sections, data priority chain
```

## Anti-Hallucination Guardrails

**Steps 1 and 2 only** enforce the standard guardrails (see [[Brief Tool - Prompt Architecture#Anti-Hallucination Guardrails]]):

- Never invent data, metrics, results, testimonials, or case studies
- Use "Not available in the provided context" for missing information
- Never attribute quotes, phrases, or names to people not cited in sources
- When in doubt, omit — specificity from context > plausible fabrication

**Step 3 (Article) is deliberately exempt** from anti-hallucination guardrails. This is the creative synthesis step — the model is expected to elaborate on research data with context, narrative detail, examples, and explanatory depth. The H1/H2 structure and source citation rules provide sufficient guardrails without constraining prose quality.

**Step 3 structural/style rules** (not anti-hallucination):
- Personas are abstract reference profiles — never use persona names in article text, headings, or examples
- Source citation rules: cite primary/authoritative sources (laws, studies, institutes); never mention container blogs/sites or insert hyperlinks
- Feedback incorporation: on regeneration, adjust only sections mentioned in feedback — do not rewrite from scratch

## v1.1.0 — Asset Wiring & Context Documentation (2026-08-13)

**Problem**: 4 critical gaps in v1.0.0:
1. **`instructions` input was silently ignored** — collected in the UI but consumed by zero prompt files
2. **Brand Voice and Persona assets were referenced in system prompts but not wired** — prompts described "Persona Asset Usage" and "Brand Voice" that could never be present
3. **Bare placeholders `{{titolo}}` and `{{output_step_*}}` passed through unresolved** — PromptComposer gets `{}` empty context, the session-worker appends enriched context after `---`. The model compensated by reading data from the injected context, but the placeholders were noise
4. **Feedback Incorporation section was incomplete** — missing constraint resolution rules and regeneration notes format

### Changes

| File | Change |
|------|--------|
| `tools/index.ts` | Added `assets: [{ assetType: 'brand-voice' }, { assetType: 'persona' }]` to acquisition. All 3 steps: `version: '1.0.0'` → `version: '1.1.0'` |
| `default-components.ts` | Added `italian-formal/v1` to `DEFAULT_COMPONENTS['blog-post']` — safe fallback now includes language guidance |
| `seo-structure/1.1.0/system.md` | Added Asset Usage (Persona, Brand Voice, Instructions) sections. Instructions are authoritative supplements for SEO strategy |
| `seo-structure/1.1.0/user.md` | Replaced `{{titolo}}` with documented context structure: `[Input - topic]`, `[Input - instructions]`, `[Asset - brand-voice]`, `[Asset - persona]`. Added research priority chain with instructions as #3 |
| `research/1.1.0/system.md` | Added Asset Usage sections for all 3 assets. Persona/Brand-voice now wired — no longer orphan instructions |
| `research/1.1.0/user.md` | Replaced `{{titolo}}` + `{{output_step_blog_seo_structure}}` with documented context: 5 labeled sections. Added instructions-as-research-weight guidance |
| `article/1.1.0/system.md` | Added Asset Usage sections for all 3 assets (now wired). Completed Feedback Incorporation section: 5 rules covering adjust-only, structure priority, missing data handling, additive vs scope-expanding feedback |
| `article/1.1.0/user.md` | Replaced `{{titolo}}` + 2 `{{output_step_*}}` placeholders with documented context: 6 labeled sections. Added Data Priority chain: H1/H2 > Research > Brand Voice > Instructions > Persona |

### Result

- **`instructions` now influences all 3 steps**: Step 1 (SEO strategy override), Step 2 (research depth weighting), Step 3 (emphasis/tone/scope adjustment)
- **Brand Voice and Persona assets are now wired** — `ContextEnricher` injects them as `[Asset - brand-voice]` and `[Asset - persona]` into all 3 steps
- **No bare placeholders** — context structure is documented in prose, matching the Brief Tool v1.1.0 pattern
- **Feedback Incorporation is complete** — 5 explicit rules with constraint resolution and regeneration notes format
- **Zero drift** between prompts and code: the system prompts now describe only assets that can actually be present

### Verification

```
tsc --noEmit  →  domain ✅  backend ✅
vitest        →  domain 490/490 ✅  backend 145/145 ✅
```

## Sources

- [[sources/blog-article-generator]] — source summary of the 3 prompt prototypes
- [[Creating a New Tool]] — step-by-step guide for adding tools
- [[Brief Tool - Prompt Architecture]] — reference implementation (content tool, multi-step pipeline)
- [[Content Generation]] — unified tool model, serial enrichment
- [[Tool as Static Configuration]] — ToolDefinition structure, `toolRegistry`
- [[Tool UX Architecture]] — generic SetupPanel, generic components that work for all tools
- [[Context Injection]] — `ContextEnricher` placeholder substitution
- [[Global Deterministic Model Matrix]] — model tier definitions and fallback chains
- [[Prompt Components]] — `anti-hallucination/v1`, `output-markdown/v1`, `seo-optimized/v1`
- [[ToolPage Machine (XState v5)]] — setup → session flow
- [[SessionPage]] — canonical post-submit destination