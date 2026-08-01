---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/generation
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# Project Brand Persona

> Workspace-level brand behavior profile auto-injected into generation prompts.

## Definition

**Project Brand Persona** is a workspace-scoped profile that defines the writing voice, tone boundaries, vocabulary constraints, and strategic positioning for generated content. It is injected automatically into tool execution context.

## Purpose

The objective is coherence: outputs across different tools must follow the same brand identity without requiring repeated manual instructions in each session.

## Source of Truth

The persona is derived from existing workspace assets:

- `brand-voice`
- `buyer-persona`
- `brief` (optional contextual enrichment)

When no explicit `brand-voice` asset exists, generation remains available but marked as lower-confidence brand alignment in readiness output.

## Injection Contract

The profile is exposed as `{{slot:workspace:brand-persona}}` and is assembled before the first elaboration step.

Minimum structure:

- `tone`
- `doNotUse`
- `preferredLexicon`
- `valueProposition`
- `audienceSignals`

## Runtime Behavior

1. `AssetResolver` collects relevant assets from workspace context.
2. Persona assembler builds normalized profile JSON.
3. `PromptComposer` injects persona slot into system/user templates.
4. Resolved prompt metadata logs persona profile version hash for replay.

## Governance

- Persona assembly is deterministic for the same asset set.
- Any asset change produces a new persona hash.
- Session snapshots store the effective persona hash used during execution.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Workspace-scoped** | One canonical profile per workspace at execution time |
| **Auto-injected** | No per-tool manual copy-paste required |
| **Deterministic** | Same assets produce same persona payload/hash |
| **Traceable** | Persona hash persisted with session snapshot |

## Sources

- [[sources/PRD]] — FR-W09 Project Brand Persona proposal
- [[Workspace & Assets]] — asset ownership and workspace context
- [[AssetResolver]] — asset selection and injection source
- [[Context Injection]] — slot-based prompt context system
- [[PromptComposer]] — final prompt assembly
