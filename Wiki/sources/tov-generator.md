---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-11
source_count: 2
---

# Source Summary — TOV Generator Prompts

> Raw sources: `Wiki/sources/tov-generator/prompt_extraction.md`, `Wiki/sources/tov-generator/prompt_tov_generation.md`

## What It Is

Two prototype prompt templates that define a **2-step architecture** for extracting brand identity data and synthesizing it into a complete Tone of Voice document. Adapted as the initial `brand-voice` asset tool in Flow App's [[Creating a New Tool|tool creation pipeline]].

## Step 1 — Extraction (`prompt_extraction.md`)

**Step key**: `extraction`

Reads unstructured brand documents (company profiles, mission statements, brand guidelines) and extracts 5 core data points into a structured JSON payload:

| Field | Description |
|---|---|
| `brand_or_company` | Primary brand/company name, tagline, descriptor |
| `target_audience` | Explicit audience segments, demographics, psychographics |
| `tone` | Stated tone descriptors, communication style, register preferences |
| `product_or_service` | Core offering, category, format, key characteristics |
| `market` | Market position, industry, competitive context, brand archetype |

Key design properties:
- **Anti-hallucination**: uses `"non disponibile"` for missing data; `tone` field never inferred — must be explicit in source
- **Output format**: raw JSON with all 5 keys (no markdown fences)
- **Good/bad examples**: provided for `tone`, `brand_or_company`, and `market` fields
- **Internal checklist**: 7 verification points before output

## Step 2 — TOV Generation (`prompt_tov_generation.md`)

**Step key**: `tov-generation`

Takes the 5-field JSON extraction from Step 1 and synthesizes a complete Brand Tone of Voice document in **Italian markdown**. The TOV serves as the authoritative `brand-voice` asset consumed by downstream content tools (landing pages, ad copy, video scripts, blog posts, marketing angles).

### Required Output Structure (8 sections)

| # | Section | Purpose |
|---|---------|---------|
| 1 | `## Identità del Brand` | Nome, Settore/Categoria, Personalità (archetipo, 3 aggettivi) |
| 2 | `## Valori e Posizionamento` | Valori Fondamentali, Posizionamento di Mercato, Promessa al Cliente |
| 3 | `## Voce e Tono` | Tono di Voce Primario, Toni Secondari, Registro Linguistico |
| 4 | `## Linguaggio` | Parole da Usare (con esempi), Parole da Evitare (con spiegazioni), Struttura Frasi, Punteggiatura |
| 5 | `## Adattamento per Canale` | Social Media, Email Marketing, Landing Page, Advertising, Contenuti Lunghi |
| 6 | `## Esempi` | Esempio Corretto + Esempio Sbagliato (con annotazioni) |
| 7 | `## Adattamento per Awareness Level` | Unaware/Problem/Solution/Product Aware per ogni livello |
| 8 | *(implicit)* Internal checklist — 8 verification points before output |

### Design Principles

| Principle | Description |
|---|---|
| **Downstream-first** | TOV is consumed by 7 downstream tools: landing-funnel, landing-page, video-script-long-form, angle-generator, ad-copy, video-description, blog-post |
| **Anchored to source** | Every voice characteristic traces back to extraction; `"Non specificato nel documento di input"` for missing data |
| **Actionable, not abstract** | "Usa il 'tu' diretto, frasi sotto le 25 parole, evita il congiuntivo" — not vague like "Professionale ma amichevole" |
| **Channel-specific** | Concrete adjustments per channel (e.g., "max 125 caratteri per headline Meta Ads") |
| **Contrast is clarity** | Wrong examples must clearly violate the TOV in a recognizable way |

### Safe Inference Taxonomy

| Safe to infer | Never infer |
|---|---|
| Voice register from market segment (B2B → formale; B2C → informale) | Specific brand values or mission statements |
| Channel adaptations from industry norms | Brand personality adjectives not grounded in source |
| Sentence structure from audience education level | "Words to avoid" without contraindication from stated tone |
| Punctuation style from stated tone | Channel-specific rules for channels not mentioned in source |

### Output Rules

- Markdown only, raw (no code fences)
- Italian only (`it-IT`)
- No preamble, greetings, or closing remarks
- All 8 sections mandatory
- Inferred content marked with `"(inferito dal contesto)"`
- Persona assets used only to calibrate voice — never referenced by name in TOV document

## Sources

- [[sources/tov-generator/prompt_extraction]] — Step 1 extraction prompt template
- [[sources/tov-generator/prompt_tov_generation]] — Step 2 TOV generation prompt template