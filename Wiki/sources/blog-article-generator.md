---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompt-architecture
date_updated: 2026-08-13
---

# Source Summary — Blog Article Generator Prompts

> **Name mapping**: `blog-article-generator` → `blog-post` (v1 → v3 rename). The canonical tool key is `blog-post`; this directory uses the v1 name.

**Source files** (3 prompt prototypes):

| File | Step | Role |
|------|------|------|
| `prompt_blog_seo_structure.md` | Step 1 — SEO Structure | Senior SEO Strategist — online research to build H2 skeleton |
| `prompt_blog_research.md` | Step 2 — Research | In-depth research per H2 section, structured output |
| `prompt_blog_article.md` | Step 3 — Article | Professional copywriter — ~800-word article from research data |

## Tool Profile

- **Type**: Content producer (output is NOT promotable to an asset — no `produces` field)
- **Acquisition**: article title (required, short text) + custom instructions (optional, long text/textarea)
- **Optional context**: Brand Voice and Persona workspace assets (injected if available)
- **Pipeline**: 3-step serial (`extraction` → `research` → `article`)

## Step 1 — SEO Structure (`prompt_blog_seo_structure.md`)

**Placeholders**: `{{titolo}}`

**Model tier**: `search` (requires real-time online research via web search tool — blocking requirement)

**Behavior**:
- Conducts real-time online research on the provided topic
- Prioritizes Italian-language sources for local search intent
- Analyzes top-ranking content to determine SEO-optimal H2 structure
- Outputs: 1 H1 (exact topic), 2–4 H2 sections (logically ordered, sentence case), source list

**Anti-hallucination guardrails**: standard — never invent data, use "Not available in the provided context" for missing information.

## Step 2 — Research (`prompt_blog_research.md`)

**Placeholders**: `{{output_step_blog_seo_structure}}`, `{{titolo}}`

**Model tier**: `balanced`

**Behavior**:
- Takes the SEO structure from Step 1 as the research framework
- For each H2 section, produces: key information, concrete data/statistics, semantically related keywords, practical examples
- Maintains focus on Italian market and context
- Structured output organized by H2 section — feeds directly into Step 3

**Output constraint**: no titles or headers — only structured content per section. First line must contain research data (no preamble).

## Step 3 — Article (`prompt_blog_article.md`)

**Placeholders**: `{{output_step_blog_research}}`, `{{output_step_blog_seo_structure}}`, `{{titolo}}`

**Model tier**: `premium`

**Behavior**:
- Writes ~800-word fluid, engaging article from research data
- **Creative elaboration allowed**: this is the synthesis step — the model CAN add context, examples, narrative details, and explanatory depth beyond the raw research data. Unlike Steps 1-2, anti-hallucination guardrails are intentionally NOT applied here
- **Title constraint (non-negotiable)**: H1 MUST be exactly the provided topic — no rephrasing, no clickbait alternatives
- **Structure constraint (non-negotiable)**: MUST use exactly the H2 headings from SEO Structure — no additions, removals, reordering, or rewording
- **Source management**: cite primary/authoritative sources (laws, studies, institutes); NEVER mention container blogs/sites or insert hyperlinks
- **Prose rules**: max 1 bullet list (max 4 points), no bold at paragraph start, sparse bold in paragraph body, rhythmic variety (short isolated sentences for re-engagement), fluid narrative transitions
- **Language**: Italian
- **Output determinism**: first character = H1 title. Zero preamble, no "Ecco l'articolo", no sign-offs

**Gold standard example**: includes a quality benchmark — React 19 article excerpt demonstrating editorial quality, rhythm, and engagement expectations.

**Feedback incorporation**: on regeneration, adjust only sections mentioned in feedback; preserve structural integrity.

## Cross-Step Dependencies

```
Step 1 (SEO Structure) ──output_step_blog_seo_structure──→ Step 2 (Research)
Step 1 (SEO Structure) ──output_step_blog_seo_structure──→ Step 3 (Article)
Step 2 (Research) ───────output_step_blog_research────────→ Step 3 (Article)
```

Step 3 receives BOTH intermediate outputs — the SEO structure provides the skeleton, the research data fills each section.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 3-step pipeline vs 2-step | SEO structure and research are separate concerns — structure is determined by competitor analysis, research fills the structure. Combining them would lose the SEO-validated H2 framework |
| `search` tier for Step 1 | Requires real-time web search — no memory-based or static knowledge sufficient |
| `balanced` for Step 2 | Structured extraction from research data — no creative synthesis required |
| `premium` for Step 3 | Creative writing, Italian prose quality, editorial rhythm — highest-quality model needed. Anti-hallucination guardrails intentionally NOT applied here — the article step can elaborate beyond raw research data |
| Title = H1 (non-negotiable) | SEO requirement: the user's chosen title IS the H1 — preserves keyword targeting |
| H2 structure = immutable | SEO-validated skeleton — rewriting H2s would undo the Step 1 research |
| Persona as abstract reference | Personas inform tone/depth but NEVER appear by name in article text — prevents hallucinated attributions |
| Italian-language output | Target market constraint — article content and research prioritize Italian context |

## Entities & Concepts Referenced

- [[Tool as Static Configuration]] — ToolDefinition structure, `blog-post` in toolRegistry
- [[Creating a New Tool]] — step-by-step guide for adding tools
- [[Content Generation]] — unified tool model, serial enrichment
- [[Context Injection]] — `ContextEnricher` placeholder substitution (`{{titolo}}`, `{{output_step_*}}`)
- [[Prompt Components]] — `anti-hallucination/v1`, `output-markdown/v1`, `italian-formal/v1`
- [[Brief Tool - Prompt Architecture]] — reference implementation (content tool, similar multi-step pipeline)
- [[Persona Generator - Prompt Architecture]] — reference for persona asset usage in prompts
- [[Brand Voice Tool - Prompt Architecture]] — referenced via Brand Voice asset injection in Step 3
- [[Global Deterministic Model Matrix]] — model tier definitions (premium, balanced, search)
- [[ToolPage Machine (XState v5)]] — setup → session flow
- [[SessionPage]] — canonical post-submit destination