---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompt-architecture
date_updated: 2026-08-13
source_count: 11
confidence: high
---

# Blog Article Generator — Prompt Architecture

> **Canonical tool key**: `blog-post`. **v1 name**: `blog-article-generator`. Content producer — output is NOT promotable to a [[Asset|workspace asset]].

## Overview

The Blog Article Generator produces ~800-word SEO-optimized articles in Italian from a user-provided title and optional custom instructions. It uses a **3-step serial pipeline** where each step feeds the next: SEO structure → in-depth research → final article.

## Acquisition

| Input | Key | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Article title | `topic` | `short` text | Yes | Becomes the H1 — never rewritten |
| Custom instructions | `instructions` | `long` text (textarea) | No | User-provided guidance for generation |
| Brand Voice | `brand-voice` asset | workspace asset | No | Injected into article step for tone |
| Persona | `persona` asset | workspace asset | No | Abstract reference — never named in article |

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

**Prompt**: [[sources/blog-article-generator#Step 1 — SEO Structure (prompt_blog_seo_structure.md)|prompt_blog_seo_structure.md]]

Acts as a Senior SEO Strategist. Performs **real-time online research** on the topic (blocking requirement — cannot proceed from memory). Analyzes top-ranking Italian-language results to determine the optimal H2 information architecture.

**Output**: Markdown with 1 H1 (exact topic title) + 2–4 H2 sections + list of consulted sources.

**Placeholders**: `{{titolo}}`

### Step 2 — Research

**Prompt**: [[sources/blog-article-generator#Step 2 — Research (prompt_blog_research.md)|prompt_blog_research.md]]

Takes the SEO structure from Step 1 and performs in-depth research on each H2 section. Produces structured data: key information, concrete data/statistics, semantically related keywords, practical examples — all focused on the Italian market.

**Output**: Structured content organized by H2 section. First line is research data (no preamble).

**Placeholders**: `{{output_step_blog_seo_structure}}`, `{{titolo}}`

### Step 3 — Article

**Prompt**: [[sources/blog-article-generator#Step 3 — Article (prompt_blog_article.md)|prompt_blog_article.md]]

Acts as a professional copywriter. Writes the final ~800-word article in Italian, filling the SEO-validated H2 skeleton with research-backed content. **Anti-hallucination guardrails are intentionally NOT applied here** — this step can elaborate beyond raw research data with context, examples, and narrative depth. Includes a **gold standard example** (React 19 article excerpt) as a quality benchmark.

**Non-negotiable constraints**:
- H1 = exactly the user-provided title (SEO requirement)
- H2 headings = exactly as determined by Step 1 — no additions, removals, reordering, rewording
- Source citations: cite primary/authoritative sources; never mention container blogs/sites
- Prose rules: max 1 bullet list, no bold at paragraph start, rhythmic variety
- Output determinism: first character = H1, zero preamble

**Placeholders**: `{{output_step_blog_research}}`, `{{output_step_blog_seo_structure}}`, `{{titolo}}`

## Model Tier Rationale

| Step | Tier | Model | Rationale |
|------|------|-------|-----------|
| 1 — SEO Structure | `search` | `google/gemini-2.5-pro` | Requires real-time web search — static knowledge insufficient |
| 2 — Research | `balanced` | `openai/gpt-4o-mini` | Structured extraction from research data — no creative synthesis |
| 3 — Article | `premium` | `anthropic/claude-sonnet-5` | Creative Italian prose, editorial rhythm, quality benchmark. No anti-hallucination constraints — allowed to elaborate beyond research data |

## Domain Definition

**File**: `packages/domain/src/generation/tools/index.ts`

```typescript
const blogPostTool: ToolDefinition = {
  toolKey: 'blog-post',
  name: 'Blog Post',
  description: 'Generate a complete blog article with SEO optimization',
  creditCost: 1,
  outputCategory: ToolOutputCategory.ContentProducer,
  // produces is NOT set — content tool, output is not promotable to an asset
  // defaultComponents is NOT set — every step declares its full component list explicitly.
  // This is because per-step components REPLACE, not merge (see [[Creating a New Tool#Prompt Component Resolution]]).
  acquisition: {
    userText: [
      { key: 'topic', label: 'Title', required: true, type: 'short' },
      { key: 'instructions', label: 'Custom Instructions', required: false, type: 'long', placeholder: 'Additional generation instructions...' },
    ],
    files: [
      { key: 'briefing', label: 'Briefing', accept: ['.txt', '.md', '.docx'], required: false },
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
      prompt: { templateId: 'blog-post/seo-structure', version: '1.0.0', model: ModelTier.Search, components: ['output-markdown/v1', 'anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'research',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/research', version: '1.0.0', model: ModelTier.Balanced, components: ['anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'article',
      enrichment: 'serial',
      // No anti-hallucination component — this is the creative synthesis step.
      // Full format components: markdown output + SEO guidelines + Italian tone.
      prompt: { templateId: 'blog-post/article', version: '1.0.0', model: ModelTier.Premium, components: ['output-markdown/v1', 'seo-optimized/v1', 'italian-formal/v1'] },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

### Required codebase changes to align with this prompt architecture

The current `blogPostTool` in `toolRegistry` (lines 16–59 of `tools/index.ts`) defines steps as `SEO Structure → Outline → Article` with `Balanced`, `Balanced`, `Premium` model tiers. To align with this prompt architecture:

| Change | Current | Target |
|--------|---------|--------|
| Step 1 model tier | `Balanced` | `Search` (requires online research) |
| Step 2 label | `Outline` | `research` (in-depth data, not outline) |
| Step 2 model tier | `Balanced` | `Balanced` (unchanged) |
| Step 3 label | `Article` | `article` (kebab-case consistency) |
| `acquisition.userText` | `topic` + `language` select | `topic` (short) + `instructions` (long textarea) |
| `defaultComponents` | `['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1']` (applies to all steps) | Removed — every step declares full `components` list explicitly |
| Step 1 `components` | (none, inherited from default) | `['output-markdown/v1', 'anti-hallucination/v1']` |
| Step 2 `components` | (none, inherited from default) | `['anti-hallucination/v1']` |
| Step 3 `components` | (none, inherited from default) | `['output-markdown/v1', 'seo-optimized/v1', 'italian-formal/v1']` (NO anti-hallucination) |
| `DEFAULT_COMPONENTS['blog-post']` | `['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1']` | `['output-markdown/v1', 'seo-optimized/v1']` (safe fallback without anti-hallucination) |
| Prompt templates | None exist | Create `blog-post/seo-structure/`, `blog-post/research/`, `blog-post/article/` under `versions/1.0.0/` |

> **Note**: the current `blogPostTool` has no corresponding prompt templates (`apps/backend/src/prompts/blog-post/` does not exist). The tool runs with the old Blog Post stubs. This prompt architecture represents the first real implementation.

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

## Step-by-Step Implementation Guide

Follow [[Creating a New Tool]] with these specifics:

### 1. Tool Key
Already exists as `blog-post` in `ToolKey.ts` (line 9, line 27, line 39). **No change needed**.

### 2. Domain Definition
Modify `tools/index.ts` lines 16–59 — replace the existing `blogPostTool` definition with the updated one above (3-step: search → balanced → premium, `instructions` textarea).

### 3. Prompt Templates
Create 6 files (2 per step):

```
apps/backend/src/prompts/blog-post/seo-structure/versions/1.0.0/system.md
apps/backend/src/prompts/blog-post/seo-structure/versions/1.0.0/user.md
apps/backend/src/prompts/blog-post/research/versions/1.0.0/system.md
apps/backend/src/prompts/blog-post/research/versions/1.0.0/user.md
apps/backend/src/prompts/blog-post/article/versions/1.0.0/system.md
apps/backend/src/prompts/blog-post/article/versions/1.0.0/user.md
```

Source material: `Wiki/sources/blog-article-generator/prompt_blog_seo_structure.md`, `prompt_blog_research.md`, `prompt_blog_article.md`.

The `system.md` should contain the role definition, rules, output format, and (for Steps 1-2 only) anti-hallucination guardrails. Step 3's `system.md` must NOT include anti-hallucination rules — it should focus on writing quality, prose style, and editorial rhythm. The `user.md` should contain the task instruction with placeholder references.

### 4. Frontend Input Definitions
Modify `apps/frontend/src/tool-inputs.ts`:

```typescript
const BLOG_POST_INPUTS: TextInput[] = [
  { key: 'topic', label: 'Titolo articolo', required: true, type: 'short' },
  { key: 'instructions', label: 'Istruzioni personalizzate', required: false, type: 'long', placeholder: 'Istruzioni aggiuntive per la generazione...' },
];
```

Replace the existing `BLOG_POST_INPUTS` (lines 37–40) which only has `topic` + `language` select. The `language` field is removed — Italian is enforced in the prompt.

### 5. Copy Module
No changes needed — the tool uses generic copy keys from `packages/copy/src/it/tool-page.ts`.

### 6. Registration
Already registered at `toolRegistry['blog-post']` (line 308). Replace the existing definition — no new entry needed.

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