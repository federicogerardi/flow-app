---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/generation
date_updated: 2026-08-06
source_count: 6
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
User clicks "Promote" button
  │
  ├── PromoteDialog opens
  │     │ Name: [optional, e.g. "Decision Maker B2B"]
  │     │ Enter → Promuovi
  │     └── POST /api/artifacts/:id/promote
  │           └── PromoteToAssetUseCase.execute({ ..., name })
  │                 └── Asset.create({ ..., name })
  │                       └── assetRepo.save(asset)
  │
  └── Snackbar: '"{name}" promosso ad asset'
        └── [Vedi asset →] link to AssetDetailPage

(SessionCompleted event → PromoteToAssetUseCase path deferred)
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
- **Asset name**: optional user-defined label collected via `PromoteDialog`. Null if skipped — type label used as fallback. Max 80 chars, trimmed on save
- **Multi-asset idempotency (F2 fix)**: promoting the same artifact twice returns the same `assetId` — the use case pre-checks by `sourceArtifactId` before calling `Asset.create()`. Different artifacts of the same type produce different rows (DB constraint: `UNIQUE(workspace_id, asset_type, source_ref)`)
- **F3 fix**: `PromoteToAssetResult` no longer includes `created: boolean` — it was dead code (API hardcoded `promoted: true`, frontend never read it)

## Implementation Status (2026-08-06)

| Layer | Status | Detail |
|-------|:------:|--------|
| Domain entities (`Asset`, `AssetType`, `AssetSource`) | ✅ | In `packages/domain` — `Asset.create()`, `Asset.reconstitute()`, `Asset.withName()` |
| Asset `name` field | ✅ | `name: string \| null` in Asset entity, DB migration 012, Kysely repository, contracts DTO |
| `findByArtifactId` on `SessionRepository` | ✅ | Domain interface + Kysely implementation |
| `PromoteToAssetUseCase` | ✅ | `apps/backend/src/application/workspace/promote-to-asset.usecase.ts` — 5 domain errors, session completion check, workspace auth, optional `name` in command/result |
| API endpoint (`POST /api/artifacts/:id/promote`) | ✅ | Accepts `{ workspaceId, name? }`, delegates to `PromoteToAssetUseCase`, returns `{ ..., name }` |
| Frontend `PromoteButton` | ✅ | Opens `PromoteDialog` (name input) instead of direct API call. "done" state via `promotedAssetId` |
| `PromoteDialog` component | ✅ | MUI Dialog, type-specific placeholder, optional name, Enter=submit, loading/error states |
| `RenameAssetDialog` component | ✅ | Triggered from AssetList edit icon, `api.updateAsset({ name })` |
| `api.updateAsset` | ✅ | Now accepts `{ content?, name? }` — PATCH semantics |
| `assetType` derivation from `tool.produces` | ✅ | `AssetType.from(tool.produces)` — domain-driven, not from request body |
| `AssetRepository.save()` with provenance | ✅ | `sourceSessionId` + `sourceArtifactId` tracked |
| `PromoteButton` persistent state | ✅ | `promotedAssetId` in session detail response → button starts in "done" state across page refreshes |
| Toast notification post-promotion | ✅ | MUI Snackbar + Alert with name when present (`"{name}" promosso ad asset`), type fallback |
| `AssetDetailPage` | ✅ | `/workspaces/:wid/assets/:aid` — full markdown view, header + breadcrumbs use `asset.name ?? typeLabel` |
| `AssetList` rename + name display | ✅ | Edit icon triggers `RenameAssetDialog`. Card title: `name ?? typeLabel`. Secondary line shows type when name present |
| `AssetPicker` name display | ✅ | Label prefers `asset.name`, shows content snippet as secondary line when name exists |
| `AssetList` click-to-detail | ✅ | Cards navigate to AssetDetailPage, delete stopPropagation-protected |
| EventBus wiring (`SessionCompleted → PromoteToAssetUseCase`) | 🔴 | Use case invoked via API handler, not via `eventBus.subscribe()` |
| `AssetCreated` domain event on promotion | 🔴 | Not published — `Workspace.addAsset()` doesn't emit events |

> **Note**: The use case is wired via the API handler (`POST /api/artifacts/:id/promote`) — it is NOT yet wired to the `SessionCompleted` domain event. This means promotion is explicit (user clicks the button and optionally names the asset) rather than automatic on session completion. The event-driven wiring (SessionCompleted → PromoteToAssetUseCase → AssetCreated) is documented in [[Application Services#PromoteToAssetUseCase|the canonical version]] but intentionally deferred: explicit promotion gives the user control over when to create an asset and what to name it. The `AssetCreated` event is also deferred pending the `Workspace.addAsset()` event emission.

## Sources

- [[sources/STARTUP]] — Artifact vs Asset
- [[sources/PRD]] — FR-A04
- [[sources/USER-STORIES]] — US-AS07
- [[sources/APP-CONCEPT]] — AssetFieldMapping
- [[log]] — 2026-08-06 implementation + name field
- [[log]] — 2026-08-06 promote dialog + rename dialog