---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-06
source_count: 2
---

# Source Summary — Persona Generator Prompts

> Raw sources: `Wiki/sources/personas-generator/prompt_extraction.md`, `Wiki/sources/personas-generator/prompt_personas_generation.md`
>
> **Name mapping**: `personas-generator` → `buyer-persona` (prototype → canonical Flow App `toolKey`).

## What It Is

Two prototype prompt templates that define the **2-step architecture** of the Persona Generator. Together they describe a pipeline: extract structured audience data from a brief (required workspace asset) plus optional supplemental data (file upload), then synthesize into a complete Buyer Persona document serving as input for 6 downstream content tools.

## Step 1 — Extraction (`prompt_extraction.md`)

**Step key**: `extraction`

Reads an unstructured audience/market document (or a brief + supplemental file) and extracts 5 core data points into a structured JSON payload:

| Field | Description |
|---|---|
| `demographics` | Age, gender, income, education, location, socio-economic context |
| `goals` | Desired outcomes, aspirations — primary vs secondary |
| `pain_point` | Frustrations, unmet needs, practical + emotional pains |
| `behaviors` | Buying habits, media consumption, decision patterns, preferred channels |
| `objections` | Barriers to purchase — rational objections + emotional barriers |

Key design properties:
- **Anti-hallucination**: uses `"non disponibile"` for missing data; never invents data, metrics, or entities
- **Output format**: raw JSON with all 5 keys (no markdown fences)
- **Good/bad examples**: provided for `demographics`, `pain_point`, and `objections` fields to calibrate extraction quality
- **Internal checklist**: 7 verification points before output

## Step 2 — Personas Generation (`prompt_personas_generation.md`)

**Step key**: `personas-generation`

Takes the 5-field JSON extraction from Step 1 and synthesizes a complete Buyer Persona document in **Italian markdown**. The persona is designed as an authoritative reference asset consumed by 6 downstream content tools.

### Required Output Structure (10 sections)

| # | Section | Purpose |
|---|---------|---------|
| 1 | `## Nome Persona` | Nome Rappresentativo (label, not real person), Età, Occupazione/Ruolo |
| 2 | `## Dati Demografici` | Età, Genere, Reddito, Istruzione, Localizzazione, Situazione Familiare |
| 3 | `## Obiettivi e Motivazioni` | Obiettivo Primario, Secondari, Motivazioni Profonde, Cosa Vuole Evitare |
| 4 | `## Pain Point e Frustrazioni` | Problema Principale, Frustrazioni Quotidiane, Tentativi Falliti, Costo Emotivo |
| 5 | `## Comportamenti e Abitudini` | Canali Informativi, Abitudini di Acquisto, Processo Decisionale, Dispositivi, Timing |
| 6 | `## Obiezioni e Barriere` | Obiezione Principale, Secondarie, Fattori di Fiducia, Cosa Deve Vedere per Convertire |
| 7 | `## Messaggistica Efficace` | Tono di Voce, Parole che Risuonano, Parole da Evitare, Tipi di Prova |
| 8 | `## Trigger di Acquisto` | Trigger Primario, Secondari, Stagionalità, Urgenza Percepita |
| 9 | `## Nota sull'Input` | Qualità dei Dati, Aree Insufficienti, Assunzioni Fatte |
| 10 | *(implicit)* Internal checklist — 10 verification points before output |

### Design Principles

| Principle | Description |
|---|---|
| **Downstream-first** | Persona is consumed by 6 tools: `funnel-pages`, `nextland`, `youtube-lf-script`, `angle-generator`, `meta-ads`, `blog-article-generator` |
| **Anchored to source** | Every demographic claim, behavior, and pain point traces back to extraction; `"Non specificato nel documento di input"` for missing data |
| **Psychological depth** | Goes beyond demographics — surfaces fears, failures, emotional drivers that make messaging resonate |
| **Objection-first thinking** | Surfaces every objection explicitly so downstream tools can build counter-messaging |
| **Persona Asset — Critical Usage Rule** | Personas are abstract reference profiles, NOT real people. Nome Rappresentativo is a label. Downstream tools address abstract "tu" — never persona names |
| **Persona Naming Convention** | Deterministic rules: age-appropriate Italian names, gender-aligned, regional variation, no celebrity names, no name reuse across personas |

### Safe Inference Taxonomy

| Safe to infer | Never infer |
|---|---|
| Education from professional role | Exact age, income, location not in source |
| Information channels from demographic profile | Named competitors or brands |
| Purchase process from price point | Personal life details (family, hobbies) |
| Messaging triggers from stated pain points | Specific objections without stated pain points |

### Output Rules

- Markdown only, raw (no code fences)
- Italian only (`it-IT`)
- No preamble, greetings, or closing remarks — begins directly with `## Nome Persona`
- All 10 sections mandatory
- Inferred content marked with `"(inferito dal contesto)"`

## Sources

- [[sources/personas-generator/prompt_extraction]] — Step 1 extraction prompt template
- [[sources/personas-generator/prompt_personas_generation]] — Step 2 persona generation prompt template