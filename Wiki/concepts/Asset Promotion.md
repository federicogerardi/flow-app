---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Asset Promotion

> Cross-context operation — [[Content Generation]] → [[Workspace & Assets]]

## Definition

Asset Promotion transforms a `final` [[Artifact]] (produced by the last step of a [[Session]]) into a reusable [[Asset]] in the [[Workspace & Assets]] context.

## Flow

```
Content Generation                    Workspace & Assets
─────────────────                    ──────────────────
Session.complete()
  └── SessionCompleted event  ───▶  PromoteToAssetHandler
       (DomainEventBus)                  │
                                         ▼
                                    Workspace.addAsset(
                                      content: finalArtifact.content,
                                      type: toolKeyToAssetType(toolKey),
                                      source: 'generated',
                                      sourceRef: artifactId
                                    )
```

## ToolKey → AssetType Mapping

Con la [[Tool as Static Configuration|convenzione di naming unificata]], il mapping è **1:1 per gli asset tool**:

| toolKey | → | AssetType |
|---------|---|-----------|
| `brief` | → | `brief` |
| `brand-voice` | → | `brand-voice` |
| `buyer-persona` | → | `persona` |
| `marketing-angle` | → | `angle` |

I content tool (`landing-funnel`, `video-script-long-form`, `blog-post`, etc.) e il tool di analisi (`ai-overview-analysis`) non producono Asset promovibili.

**Regola**: se `toolKey` corrisponde a un `AssetType` noto, la promozione è automatica. Altrimenti, il tool non produce Asset.

## Invariants

- Solo l'ultimo step produce un Artifact promovibile
- La promozione crea un **nuovo** Asset — l'Artifact originale resta nella Session
- Asset con `source = 'generated'` deve tracciare `sourceRef` all'Artifact originale

## Sources

- [[doodle/STARTUP]] — Artifact vs Asset
- [[doodle/PRD]] — FR-A04
- [[doodle/USER-STORIES]] — US-AS07
- [[doodle/APP-CONCEPT]] — AssetFieldMapping