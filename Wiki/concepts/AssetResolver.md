---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
date_updated: 2026-08-06
source_count: 5
confidence: high
---

# AssetResolver

> Domain Service — [[Workspace & Assets]] context

## Definition

The `AssetResolver` is a domain service that, given a `ToolKey` and `WorkspaceId`, returns the [[Asset]]s that should be injected into a [[Content Generation|generation]] prompt. It is the bridge between the [[Workspace & Assets]] context and the [[Content Generation]] context. Since the multi-asset feature (2026-08-06), it supports returning multiple assets of the same type.

## Signature

```typescript
// packages/domain/src/workspace/domain-services/AssetResolver.ts

class AssetResolver {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async resolve(
    workspaceId: string,
    tool: ToolDefinition,
    selectedAssetIds?: string[],
  ): Promise<Map<string, string[]>> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);

    // F1 fix: validate selectedAssetIds if provided
    if (selectedAssetIds?.length) {
      const allIds = new Set(workspace.assets.map(a => a.assetId));
      const invalid = selectedAssetIds.filter(id => !allIds.has(id));
      if (invalid.length) throw new InvalidAssetSelectionError(invalid);
    }

    const selectedSet = selectedAssetIds?.length
      ? new Set(selectedAssetIds) : null;

    const resolved = new Map<string, string[]>();

    for (const mapping of tool.acquisition.assets ?? []) {
      const type = AssetType.from(mapping.assetType);
      const assets = workspace.getAssetsByType(type);
      const filtered = selectedSet
        ? assets.filter(a => selectedSet.has(a.assetId))
        : assets;
      const contents = filtered.map(a => a.content);

      if (contents.length > 0) {
        resolved.set(mapping.assetType, contents);
      } else if (mapping.required) {
        throw new MissingRequiredAssetError(mapping.assetType);
      }
    }

    return resolved;
  }
}
```

## Integration

Called by `StartSessionUseCase` unconditionally (not gated on `selectedAssets.length`):

```typescript
// In StartSessionUseCase — BA-C4 fix
const resolvedAssets = await this.assetResolver.resolve(
  cmd.workspaceId, tool, cmd.inputs.selectedAssets,
);
```

The resolver handles all cases:
- No `selectedAssetIds` → returns ALL assets of each type (D3)
- Empty `[]` → same as no selection
- Populated → validates IDs (F1) + filters

## Invariants

- If an Asset is marked `required: true` in `ToolDefinition.acquisition.assets[]` and no matching assets exist in the Workspace → `MissingRequiredAssetError`
- If an Asset is `required: false` and no matches → empty array (silently skipped)
- If `selectedAssetIds` contains IDs not found in workspace assets → `InvalidAssetSelectionError` (F1 fix)
- Returns `Map<string, string[]>` — always arrays, even for single assets (e.g. `['content']`)
- `multiple` flag on `AssetInput` is informational for the UI — the resolver always returns all matching assets unless filtered by `selectedAssetIds`

## Sources

- [[sources/APP-CONCEPT]] — Knowledge Panel, AssetFieldMapping
- [[sources/PRD]] — FR-A02 (asset injection)
- [[sources/STARTUP]] — Domain definitions
- [[sources/USER-STORIES]] — US-AS04, US-AS05, US-AS06
- [[synthesis/multi-asset-implementation-plan]] — Step 7 refactor