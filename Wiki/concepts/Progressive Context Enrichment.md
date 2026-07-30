---
type: concept
tags:
  - wiki/concept
  - wiki/generation
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# Progressive Context Enrichment

> Domain pattern — [[Content Generation]] context

## Definition

The output of each `WorkflowStep` in a [[Session]] becomes part of the input context for the next step. Each step builds on the accumulated work of all previous steps, progressively enriching the LLM prompt until the `final` [[Artifact]] contains the complete chain of reasoning and generation.

## Mechanism

```
Step 1 (extraction)  →  Artifact A (intermediate)
                          ↓ context for Step 2
Step 2 (generation)  →  Artifact B (intermediate)
                          ↓ context for Step 3
Step 3 (generation)  →  Artifact C (final)
                          ↓
                     C contains the accumulated work of A + B + C
```

## Domain Service: ContextEnricher

The `ContextEnricher` domain service in `packages/domain` is responsible for assembling the enriched context for each step:

```typescript
class ContextEnricher {
  enrich(
    step: WorkflowStep,
    previousArtifacts: Artifact[],
    resolvedAssets: Map<AssetType, AssetContent>,
    userInput: GenerationInput
  ): EnrichedContext {
    // Merges: previous step outputs + injected Assets + user input
    // Returns a structured context object for the LLM prompt
  }
}
```

## Why It Matters

- **No context loss**: the final artifact encapsulates all reasoning. The user doesn't need to review intermediate steps.
- **Deterministic chain**: same inputs → same enrichment path → predictable outputs
- **UI simplicity**: user sees only the final artifact. Intermediate artifacts are `role: intermediate`, hidden.
- **Asset injection point**: resolved [[Asset]]s (brand-voice, persona) are injected here, ensuring brand coherence throughout the chain

## Source

From [[doodle/STARTUP]]:

> "L'output prodotto da uno step viene immesso logicamente come contesto di input per lo step successivo, consentendo un affinamento sequenziale del contenuto."

## Sources

- [[doodle/STARTUP]] — Progressive Context Enrichment definition
- [[doodle/APP-CONCEPT]] — Tool pipelines, step chain execution