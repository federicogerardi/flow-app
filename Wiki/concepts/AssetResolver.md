---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# AssetResolver

> Domain Service — [[Workspace & Assets]] context

## Definition

The `AssetResolver` is a domain service that, given a `ToolKey` and `WorkspaceId`, returns the [[Asset]]s that should be auto-injected into a [[Content Generation|generation]] prompt. It is the bridge between the [[Workspace & Assets]] context and the [[Content Generation]] context.

## Signature

```typescript
// packages/domain/src/workspace/domain-services/AssetResolver.ts

class AssetResolver {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async resolve(
    workspaceId: WorkspaceId,
    tool: ToolDefinition
  ): Promise<Map<AssetType, AssetContent>> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);

    const assets = new Map<AssetType, AssetContent>();

    for (const mapping of tool.acquisition.assets ?? []) {
      const asset = workspace.getAssetByType(mapping.assetType);
      if (asset) {
        assets.set(mapping.assetType, asset.content);
      } else if (mapping.required) {
        throw new MissingRequiredAssetError(mapping.assetType);
      }
      // Optional assets: silently skip if not present
    }

    return assets;
  }
}
```

## Integration

Chiamato da `StartSessionUseCase` prima di creare la [[Session]]:

```typescript
// In StartSessionUseCase
const resolvedAssets = await this.assetResolver.resolve(cmd.workspaceId, tool);
```

## Invariants

- Se un Asset è marcato `required: true` nel `ToolDefinition.acquisition.assets[]` e non esiste nel Workspace → `MissingRequiredAssetError`
- Se un Asset è `required: false` e non esiste → saltato silenziosamente
- Restituisce una `Map<AssetType, AssetContent>`, mai gli oggetti `Asset` completi (il consumer non deve accedere a metadati)

## Sources

- [[doodle/APP-CONCEPT]] — Knowledge Panel, AssetFieldMapping
- [[doodle/PRD]] — FR-A02 (asset injection)
- [[doodle/STARTUP]] — Domain definitions
- [[doodle/USER-STORIES]] — US-AS04, US-AS05, US-AS06