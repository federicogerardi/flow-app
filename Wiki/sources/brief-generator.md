---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-06
source_count: 2
---

# Source Summary — Brief Generator Prompts

> Raw sources: `Wiki/sources/brief-generator/prompt_extraction.md`, `Wiki/sources/brief-generator/prompt_brief_generation.md`
> 
> **Name mapping**: `brief-generator` → `brief` (v1 → v3 rename). The prototype refers to the tool as `brief-generator`; the canonical Flow App `toolKey` is `brief`.

## What It Is

Two prototype prompt templates that define the **2-step architecture** of the Brief Generator. Together they describe a pipeline: extract structured data from a briefing file, then synthesize that data into a complete creative brief serving as input for downstream tools.

## Step 1 — Extraction (`prompt_extraction.md`)

**Step key**: `extraction`

Reads an unstructured briefing document and extracts 5 core data points into a structured JSON payload:

| Field | Description |
|---|---|
| `product_or_service` | Core product/service/brand with key descriptors |
| `target_audience` | Role, industry, company size, demographics |
| `campaign_objective` | Awareness, lead-gen, sales, retention |
| `primary_offer` | Specific offer, mechanism, price range if stated |
| `tone` | Adjectives, register, style notes (marks inferred tone) |

Key design properties:
- **Anti-hallucination**: uses `"non disponibile"` for missing data; never invents metrics, testimonials, or claims
- **Output format**: raw JSON (no markdown fences)
- **Good/bad examples**: provided for each field to calibrate extraction quality
- **Internal checklist**: 7 verification points before output

## Step 2 — Brief Generation (`prompt_brief_generation.md`)

**Step key**: `brief-generation`

Takes the 5-field JSON extraction from Step 1 and synthesizes a complete creative brief in **Italian markdown**. The brief is designed as the single source of truth consumed by downstream tools (`landing-funnel`, `ad-copy`, `marketing-angle`, `video-script-long-form`, `landing-page`).

### Required Output Structure (11 sections)

| # | Section | Purpose |
|---|---------|---------|
| 1 | `## Panoramica` | Product, category, UVP |
| 2 | `## Obiettivo Campagna` | Primary/secondary objectives, KPIs |
| 3 | `## Target Audience` | Persona, demographics, psychographics, pain points, desired outcomes, objections |
| 4 | `## Offerta e Meccanismo` | Core offer, differentiation, risk reversal |
| 5 | `## Mercato e Competizione` | Positioning, competitors, competitive advantage |
| 6 | `## Brand Voice e Tono` | Tone adjectives, words to use/avoid |
| 7 | `## Pilastri di Messaggio` | 3 key message pillars with proof |
| 8 | `## Proof e Credibilità` | Social proof, authority markers, data, testimonials |
| 9 | `## Vincoli Creativi` | Required elements, prohibited elements, format constraints, regulatory notes |
| 10 | `## Contesto Funnel` | Funnel goal, stage, primary CTA, next step after conversion |
| 11 | *(implicit)* Internal checklist — 8 verification points before output |

### Design Principles

| Principle | Description |
|---|---|
| **Downstream-first** | Every section answers a question another tool will need to produce artifact output |
| **Anchored to source** | Every claim traces back to the extraction payload; `"Non specificato nel documento di input"` for missing data |
| **Specific over generic** | `"Aumentare le vendite del 20% in 6 mesi..."` beats `"Crescita del business"` |
| **No self-promotion** | Describes positioning, doesn't sell it; no superlatives |
| **Safe inference** | Tone from product type, audience register from market, funnel stage from objective, CTA from offer — but never specific metrics, competitor claims, or UVPs |

### Output Rules

- Markdown only, raw (no code fences)
- Italian only (`it-IT`)
- No preamble, greetings, or closing remarks
- 2-5 bullet points per section
- All 11 sections mandatory

## Sources

- [[sources/brief-generator/prompt_extraction]] — Step 1 extraction prompt template
- [[sources/brief-generator/prompt_brief_generation]] — Step 2 brief generation prompt template
