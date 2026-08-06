---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
date_updated: 2026-08-06
source_count: 6
---

# Asset

> Entity — owned by [[Workspace]] aggregate in [[Workspace & Assets]] context

## Definition

An `Asset` is a persistent, workspace-scoped resource reusable across [[Tool as Static Configuration|Tools]]. It represents brand knowledge that survives individual generation sessions and gets auto-injected into prompts to maintain strategic and stylistic coherence.

Each Asset can optionally have a user-defined **name** (`name: string | null`). When set, the name becomes the primary identifier across all UI surfaces (card titles, picker labels, breadcrumbs). When null, the asset type label (e.g. "Brief", "Buyer Persona") is used as fallback.

## Ubiquitous Language

> "Asset = workspace property, persistent and reusable as input for subsequent tools."

From [[sources/STARTUP]]: the core distinction from [[Artifact]] — Artifact = what you produced in a session; Asset = what you saved in a workspace.

## Asset Types

| Type | Produced By | Used By |
|------|------------|---------|
| `brief` | `brief` tool | All content tools |
| `brand-voice` | `brand-voice` tool | 7 downstream tools |
| `persona` | `buyer-persona` tool | Content tools |
| `angle` | `marketing-angle` tool | `ad-copy`, content tools |
| `ad-copy` | `ad-copy` tool | Reuse in campaigns |

## Origin Modes

| Source | Meaning |
|--------|---------|
| `generated` | Promoted from a `final` [[Artifact]] via [[Asset Promotion]] |
| `uploaded` | User-uploaded file |
| `manual` | Created directly in workspace |

## Value Objects

| VO | Description |
|----|-------------|
| `AssetId` | Unique identifier |
| `AssetType` | Enum: `brief` \| `brand-voice` \| `persona` \| `angle` \| `ad-copy` |
| `AssetSource` | Enum: `generated` \| `uploaded` \| `manual` |
| `AssetContent` | Immutable content |

## Structure

```typescript
// packages/domain/src/workspace/entities/Asset.ts

class Asset {
  constructor(
    readonly assetId: AssetId,
    readonly assetType: AssetType,
    readonly source: AssetSource,
    readonly content: AssetContent,
    readonly sourceSessionId: string | null,
    readonly sourceArtifactId: ArtifactId | null,  // ✅ domain VO, not raw UUID
    readonly name: string | null,                   // user-defined, optional
    readonly createdAt: DateTime = DateTime.now(),
    readonly updatedAt: DateTime = DateTime.now(),
  ) {}

  static create(params: { ..., name?: string | null }): Asset
  static reconstitute(..., name: string | null, ...): Asset
  withContent(newContent: string): Asset
  withName(newName: string | null): Asset          // preserves other fields
}
```

> **Type-design audit (2026-07-31)**: `sourceRef` was documented as a raw UUID without FK constraint. It is now typed as `ArtifactId | null` — a compile-time guarantee that the reference is a valid Artifact identifier. The `Workspace.addAsset()` method enforces `sourceRef` is non-null when `source === AssetSource.Generated`.
>
> **name field (2026-08-06)**: `name: string | null` added as optional user-defined label. `Asset.create()` accepts `name?: string | null`, trimming whitespace automatically. `withName()` creates a new instance with updated name + `updatedAt`. DB column `assets.name VARCHAR(255)` — nullable for backward compatibility.

## Lifecycle

```
created → available → updated → available → (deleted with Workspace)
```

Assets can be updated (content changes) while retaining their `AssetType` and `sourceRef`. There is no "archived" state — deletion is cascade from Workspace deletion.

## Cross-Tool Injection

The [[AssetResolver]] resolves which Assets are injected into a tool's generation prompt. Multiple assets of the same type are supported (e.g. 3 buyer personas). The `multiple` flag on `AssetInput` controls UI behavior (radio vs checkbox), but the resolver always returns all matching assets unless filtered by `selectedAssetIds`.

## Sources

- [[sources/STARTUP]] — Asset definition, source types
- [[sources/PRD]] — FR-A01 to FR-A05
- [[sources/USER-STORIES]] — US-AS01 to US-AS08
- [[sources/APP-CONCEPT]] — Tool catalog, AssetFieldMapping
- [[synthesis/multi-asset-implementation-plan]] — Multi-asset support
- [[log]] — 2026-08-06 name field implementation
