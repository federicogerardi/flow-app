---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-07
source_count: 5
---

# Source Summary — Angle Generator Prompts

> Raw sources: `Wiki/sources/angle-generator/prompt_root.md`, `prompt_extraction.md`, `prompt_context_and_angle_matrix.md`, `prompt_angle_prioritization.md`, `prompt_creative_activation.md`
>
> **Name mapping**: `angle-generator` → `marketing-angle` (prototype → canonical Flow App `toolKey`).

## What It Is

Five prototype prompt templates that define the architecture of the Angle Generator. Together they implement a 4-step pipeline based on the PDA Framework (Persona, Desire, Awareness): extract awareness evidence from brief + personas, build an angle matrix with scoring, rank to top 3, and produce creative activation foundations for Meta campaigns.

## Root Prompt (`prompt_root.md`)

System-level methodology applied across all steps:

- **PDA Framework**: Persona → Desire → Awareness stage matching
- **5 canonical awareness levels** (always in English): Completely Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware
- **4 decision parameters**: potential ROI, differentiation, ease of communication, credibility and demonstrability
- **Awareness boundary rules**: classify by strongest concrete purchase-readiness signal; Solution Aware = outcome-first reasoning; Product Aware = recognizes specific brand/competitor; Most Aware = direct buying intent
- **Operational constraints**: ground every claim in inputs; never invent data; keep language concrete
- **Output baseline**: prompt instructions in English; artifacts in Italian; awareness labels in English

## Step 1 — Extraction (`prompt_extraction.md`)

**Step key**: `extraction`

Reads merged dual-source context (Brief + personas/"AngleDetectorFile") and produces a structured awareness evidence map:

| Field | Description |
|---|---|
| Persona | Extracted persona profile |
| Desire | Core desire mapping |
| Awareness | Current awareness assessment |
| Awareness Evidence by Level | 5 levels with nature check + message function + source evidence |
| Pain Points | Prioritized |
| Objections | Sales and form objections |
| Market Signals | Social/community, reviews, search questions, sales feedback |
| Angle Candidates | 10-15 with name + strategic rationale |
| Candidate Scoring | ROI, differentiation, ease, credibility per angle |
| Top 3 Priority Angles | Selected + awareness assignment with evidence-based rationale |

## Step 2 — Context and Angle Matrix (`prompt_context_and_angle_matrix.md`)

**Step key**: `context-and-angle-matrix`

Takes extraction output and produces:
- **Context Map**: persona clusters, core desires, awareness distribution, priority objections
- **Angle Matrix (10-15)**: each with persona focus, desire focus, awareness level, awareness-fit message function, trigger problem, promise shape, proof requirement, strategic rationale
- **Awareness Coverage Check**: angle count per level, gaps or over-concentration flagged

## Step 3 — Angle Prioritization (`prompt_angle_prioritization.md`)

**Step key**: `angle-prioritization`

Takes the angle matrix and applies a deterministic scoring model:

- Score each angle 1-5 on 4 dimensions → total /20
- Tie-break sequence: (1) awareness-fit coherence, (2) evidence traceability, (3) ease of communication, (4) lower awareness level
- Outputs scored angles + top 3 ranked + risk notes

## Step 4 — Creative Activation (`prompt_creative_activation.md`)

**Step key**: `creative-activation`

Takes the top 3 ranked angles and produces Meta campaign-ready creative foundations:

- Per angle: awareness anchor, 3 scroll-stopper headlines, copy guidelines (framework, objections, proof, CTA)
- Final launch note: which angle to test first and why
- Output: Italian markdown, direct-response style, awareness-coherent mechanics

## Shared Design Properties

| Property | Application |
|----------|-------------|
| Anti-hallucination | Never invent data, metrics, testimonials. "Non emerso dalle fonti fornite" for missing |
| Persona asset rule | Personas are abstract reference profiles — never use persona names in output |
| Output format | Markdown only (no JSON except extraction). Italian. Awareness labels in English |
| No preamble | Output starts directly with the artifact — no "Ecco", "Di seguito", "Certamente" |
| Chain propagation | Awareness evidence must flow step-to-step without drift |

## Flow App Consolidation

The prototype's 4 steps are consolidated to 3 in the Flow App `ToolDefinition`:

| Prototype | Flow App | Rationale |
|-----------|----------|-----------|
| extraction | extraction (Step 1) | Same |
| context-and-angle-matrix | angle-matrix (Step 2) | Consolidated with angle-prioritization — matrix + scoring + ranking are one analytical unit |
| angle-prioritization | (merged into angle-matrix) | Redundant re-scoring when extraction already produces candidate scores |
| creative-activation | creative-activation (Step 3) | Same |

See [[Angle Generator - Prompt Architecture]] for the full ToolDefinition and implementation plan.

## Sources

- [[sources/angle-generator/prompt_root]] — Root methodology: PDA, awareness levels, operational constraints
- [[sources/angle-generator/prompt_extraction]] — Step 1 extraction prompt template
- [[sources/angle-generator/prompt_context_and_angle_matrix]] — Step 2 context map + angle matrix template
- [[sources/angle-generator/prompt_angle_prioritization]] — Step 3 scoring + ranking template
- [[sources/angle-generator/prompt_creative_activation]] — Step 4 creative activation template