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

With the [[Tool as Static Configuration|unified naming convention]], the mapping is **1:1 for asset tools**:

| toolKey | → | AssetType |
|---------|---|-----------|
| `brief` | → | `brief` |
| `brand-voice` | → | `brand-voice` |
| `buyer-persona` | → | `persona` |
| `marketing-angle` | → | `angle` |

Content tools (`landing-funnel`, `video-script-long-form`, `blog-post`, etc.) and the analysis tool (`ai-overview-analysis`) do not produce promotable Assets.

**Rule**: if `toolKey` matches a known `AssetType`, promotion is automatic. Otherwise, the tool does not produce an Asset.

## Invariants

- Only the last step produces a promotable Artifact
- Promotion creates a **new** Asset — the original Artifact remains in the Session
- An Asset with `source = 'generated'` must track `sourceRef` to the original Artifact

## Sources

- [[sources/STARTUP]] — Artifact vs Asset
- [[sources/PRD]] — FR-A04
- [[sources/USER-STORIES]] — US-AS07
- [[sources/APP-CONCEPT]] — AssetFieldMapping