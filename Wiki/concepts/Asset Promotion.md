---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/generation
date_updated: 2026-08-06
source_count: 5
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

## Implementation Status (2026-08-06)

| Layer | Status | Detail |
|-------|:------:|--------|
| Domain entities (`Asset`, `AssetType`, `AssetSource`) | ✅ | In `packages/domain` — `Asset.create()`, `Asset.reconstitute()` |
| `findByArtifactId` on `SessionRepository` | ✅ | Domain interface + Kysely implementation |
| `PromoteToAssetUseCase` | ✅ | `apps/backend/src/application/workspace/promote-to-asset.usecase.ts` — 5 domain errors, session completion check, workspace auth |
| API endpoint (`POST /api/artifacts/:id/promote`) | ✅ | Delegates to `PromoteToAssetUseCase`, no raw SQL |
| Frontend `PromoteButton` | ✅ | Visible only when `tool.produces` is set (derived from tool config) |
| `assetType` derivation from `tool.produces` | ✅ | `AssetType.from(tool.produces)` — domain-driven, not from request body |
| `AssetRepository.save()` with provenance | ✅ | `sourceSessionId` + `sourceArtifactId` tracked |
| `PromoteButton` persistent state | ✅ | `promotedAssetId` in session detail response → button starts in "done" state across page refreshes |
| EventBus wiring (`SessionCompleted → PromoteToAssetUseCase`) | 🔴 | Use case invoked via API handler, not via `eventBus.subscribe()` |
| `AssetCreated` domain event on promotion | 🔴 | Not published — `Workspace.addAsset()` doesn't emit events |

> **Note**: The use case is wired via the API handler (`POST /api/artifacts/:id/promote`) — it is NOT yet wired to the `SessionCompleted` domain event. This means promotion is explicit (user clicks the button) rather than automatic on session completion. The event-driven wiring (SessionCompleted → PromoteToAssetUseCase → AssetCreated) is documented in [[Application Services#PromoteToAssetUseCase|the canonical version]] but intentionally deferred: explicit promotion gives the user control over when to create an asset. The `AssetCreated` event is also deferred pending the `Workspace.addAsset()` event emission.

## Sources

- [[sources/STARTUP]] — Artifact vs Asset
- [[sources/PRD]] — FR-A04
- [[sources/USER-STORIES]] — US-AS07
- [[sources/APP-CONCEPT]] — AssetFieldMapping
- [[log]] — 2026-08-06 implementation