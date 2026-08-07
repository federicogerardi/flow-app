---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-07
source_count: 3
---

# Source Summary — Meta Ads Prompts

> Raw sources: `Wiki/sources/meta-ads/prompt_extraction.md`, `prompt_context_generation.md`, `prompt_ads_generation.md`
>
> **Name mapping**: `meta-ads` → `ad-copy` (prototype → canonical Flow App `toolKey`).

## What It Is

Three prototype prompt templates that define the architecture of the Meta Ads generator. Together they implement a 3-step pipeline: extract structured ad context from brief + targeting data, build a cluster-based strategy canvas, and generate production-ready Meta Ads with cluster → angle → awareness formatting and user-selectable copy length.

## Step 1 — Extraction (`prompt_extraction.md`)

**Step key**: `extraction`

Reads briefing context and optional "AngleDetector" data. Produces a structured extraction in English:

| Field | Description |
|---|---|
| Product or Service | What is being advertised |
| Target Audience | Who the ads target |
| Campaign Objective | Conversion goal |
| Budget Context | Budget constraints |
| Primary Offer | Core value proposition |
| Proof Points | Credibility markers |
| Dominant Pain Points | Key audience frustrations |
| Objections | Purchase barriers |
| Awareness Priority | Primary awareness target level |
| LF8 Priority | Psychological trigger focus (LF8 framework) |
| Unique Mechanism | Differentiator |
| Cluster Opportunities | Persona-based audience clusters |
| Angle Candidates | Communication strategies per cluster |

## Step 2 — Context Generation (`prompt_context_generation.md`)

**Step key**: `context-generation`

Transforms extraction into an activation-ready strategy canvas in Italian:

- **Strategic Snapshot**: Product, audience, objective, budget
- **Target Clusters**: 3+ audience clusters with characteristics, pain points, desired outcomes, messaging tone
- **Messaging Angles per Cluster**: 2 angles per cluster with core narrative, awareness fit, key differentiators
- **Brand Facts Bank**: Credibility markers, social proof, authority indicators, trust signals
- **Objection Handling Matrix**: Counter-messaging with required proof per objection
- **Offer Positioning**: Core promise, mechanism, risk reversal
- **Compliance Notes**: Industry regulatory considerations

Uses 3 awareness levels: Problem Aware, Solution Aware, Product Aware (simplified from the 5-level angle generator model).

## Step 3 — Ads Generation (`prompt_ads_generation.md`)

**Step key**: `ads-generation`

Takes the context-generation artifact and a user-selected copy length format (short/medium/long) to produce production-ready Meta Ads:

| Format | Characters | Structure |
|--------|-----------|-----------|
| Short | 400-600 | Hook → Problem → Solution → CTA |
| Medium | 800-1000 | Hook → Problem → Agitate → Solution → Proof → CTA |
| Long | 1200+ | Hook → Story → Problem → Agitate → Solution → Proof → Mechanism → CTA |

For every cluster, every angle, produces **3 awareness versions**:
- **Problem Aware**: Full PAS (Problem-Agitate-Solve)
- **Solution Aware**: Competitive differentiation focus
- **Product Aware**: Direct offer + social proof, attenuated PAS

Output includes: Primary Text (awareness-coherent, length-compliant), Headline (~40 chars), Description (~30 chars), Targeting Suggestions, Visual Suggestions, Psychological Triggers Matrix.

## Shared Design Properties

| Property | Application |
|----------|-------------|
| Anti-hallucination | Never invent data, metrics, testimonials. "Not available" for missing |
| Persona asset rule | Personas are abstract reference profiles — never use names in cluster labels or ad copy |
| Output format | Markdown only. Italian (extraction is English). No JSON, no code fences |
| No preamble | Output starts directly with the artifact |
| LF8 framework | Psychological triggers referenced across steps (not fully defined in prototype) |

## Flow App Mapping

The prototype maps to the existing `ad-copy` toolKey. Key considerations for implementation:

| Aspect | Prototype | Flow App adaptation |
|--------|-----------|---------------------|
| Platform scope | Meta-specific (Facebook/Instagram) | `ad-copy` is platform-agnostic (Meta, Google, LinkedIn, TikTok) |
| Copy length | User-selectable per generation (short/medium/long) | Map to `userText` input: `copyLength` select |
| Awareness model | 3 levels (Problem/Solution/Product Aware) | Could expand to 5 or keep 3 as Meta-specific subset |
| LF8 triggers | Referenced but undefined in source | Map to standard Cialdini principles or omit until defined |

See [[Meta Ads - Prompt Architecture]] for the full ToolDefinition and implementation plan.

## Sources

- [[sources/meta-ads/prompt_extraction]] — Step 1: structured ad context extraction
- [[sources/meta-ads/prompt_context_generation]] — Step 2: cluster-based strategy canvas
- [[sources/meta-ads/prompt_ads_generation]] — Step 3: production-ready ad copy generation