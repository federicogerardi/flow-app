---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
date_updated: 2026-07-31
source_count: 4
---

# Workspace

> Aggregate Root — [[Workspace & Assets]] context

## Definition

A `Workspace` is a named container owned by a [[User]] that groups [[Asset]]s. It is the central organizational unit from the user's perspective — the "project folder" for a campaign or client. Users see workspaces as their primary work objects.

[[Artifact]]s are owned by [[Session]]s, not by Workspaces. When a Session completes, its final Artifact can be **promoted** to an Asset that the Workspace then owns. The Workspace never directly contains Artifacts.

## Ubiquitous Language

> "A named workspace owned by a User that groups related Artifacts."

The term comes directly from the original domain definition in [[sources/STARTUP]].

## Internal Entities

- **[[Asset]]** (1:N) — Reusable brand resources scoped to this workspace

## Invariants

- Owned by exactly one [[User]] (via `userId` reference)
- At most one [[Asset]] per `AssetType` per Workspace — **enforced by `addAsset()`** which throws `AssetTypeExistsError` if an Asset of the same type already exists (database `UNIQUE` constraint is a redundant safety net)
- An [[Asset]] with `source = 'generated'` must have a valid `sourceRef` (traceability to original [[Artifact]]) — **enforced by `addAsset()`** via `ArtifactId` VO type on `sourceRef` parameter
- Deleting a Workspace cascades to all contained Assets (database: `ON DELETE CASCADE`)

## Methods

### `addAsset()`

```typescript
class Workspace {
  private _assets: Asset[];

  addAsset(
    content: AssetContent,
    assetType: AssetType,
    source: AssetSource,
    sourceRef?: ArtifactId,      // required when source === 'generated'
  ): Asset {
    // Invariant: at most one Asset per AssetType
    if (this._assets.some(a => a.assetType === assetType)) {
      throw new AssetTypeExistsError(assetType);
    }

    // Invariant: generated assets must reference their source Artifact
    if (source === AssetSource.Generated && !sourceRef) {
      throw new ValidationError('Generated assets require a sourceRef (ArtifactId)');
    }

    const asset = new Asset(
      AssetId.generate(),
      assetType,
      source,
      content,
      sourceRef ?? null,
    );
    this._assets.push(asset);

    return asset;
  }

  get assets(): ReadonlyArray<Asset> {
    return this._assets;
  }
}
```

> **Type-design audit (2026-07-31)**: Previously these invariants were enforced only at the database layer (`uq_assets_workspace_type` UNIQUE constraint, no FK on `source_ref`). The aggregate root must be the primary enforcer — the database constraint is a redundant safety net, not the sole guard.

## Value Objects

| VO | Description |
|----|-------------|
| `WorkspaceId` | Unique identifier |
| `WorkspaceName` | User-facing name |

## Domain Services

- **[[AssetResolver]]**: Given a `ToolKey` and `WorkspaceId`, returns the Assets that should be auto-injected into a generation prompt. If a required Asset is missing, throws `MissingRequiredAssetsError`.

## Cross-Context Interactions

| Direction | Pattern | Description |
|-----------|---------|-------------|
| → [[Content Generation]] | Query (sync) | Generation calls `AssetResolver.resolve()` before starting |
| ← [[Content Generation]] | Domain Event (async) | `SessionCompleted` → promote final [[Artifact]] to [[Asset]] |
| → [[Identity & Access]] | Shared ID | References `UserId` |

## Sources

- [[sources/STARTUP]] — Original Workspace definition, Artifact vs Asset
- [[sources/PRD]] — FR-A01 to FR-A05 (Workspace & Asset requirements)
- [[sources/USER-STORIES]] — US-W01 to US-W06, US-AS01 to US-AS08
- [[sources/APP-CONCEPT]] — Knowledge Panel, Asset auto-injection