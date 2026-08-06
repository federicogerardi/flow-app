import { AssetType } from '../value-objects/AssetType';
import type { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import type { ToolDefinition } from '../../generation/tools/tool-definition';
import { WorkspaceNotFoundError } from '../errors';
import { DomainError } from '../../shared/domain-error';

export class MissingRequiredAssetError extends DomainError {
  readonly code = 'ASSET_MISSING';
  readonly retryable = false;
  constructor(assetType: string) {
    super(`Required asset "${assetType}" not found in workspace`);
  }
}

export class InvalidAssetSelectionError extends DomainError {
  readonly code = 'ASSET_NOT_FOUND';
  readonly retryable = false;
  constructor(assetIds: string[]) {
    super(`Invalid asset selection: [${assetIds.join(', ')}] not found in workspace`);
  }
}

export class AssetResolver {
  constructor(private readonly workspaceRepo: WorkspaceRepository) {}

  async resolve(
    workspaceId: string,
    tool: ToolDefinition,
    selectedAssetIds?: string[],
  ): Promise<Map<string, string[]>> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);

    // F1: validate selectedAssetIds if provided
    if (selectedAssetIds && selectedAssetIds.length > 0) {
      const allWorkspaceAssets = workspace.assets;
      const allIds = new Set(allWorkspaceAssets.map((a) => a.assetId));
      const invalidIds = selectedAssetIds.filter((id) => !allIds.has(id));
      if (invalidIds.length > 0) {
        throw new InvalidAssetSelectionError(invalidIds);
      }
    }

    const selectedSet = selectedAssetIds?.length
      ? new Set(selectedAssetIds)
      : null;

    const resolvedAssets = new Map<string, string[]>();

    for (const mapping of tool.acquisition.assets ?? []) {
      const type = AssetType.from(mapping.assetType);
      const assets = workspace.getAssetsByType(type);

      // Filter by selectedAssetIds if provided
      const filtered = selectedSet
        ? assets.filter((a) => selectedSet.has(a.assetId))
        : assets;

      const contents = filtered.map((a) => a.content);

      if (contents.length > 0) {
        resolvedAssets.set(mapping.assetType, contents);
      } else if (mapping.required) {
        throw new MissingRequiredAssetError(mapping.assetType);
      }
      // Optional assets: silently skip (empty array)
    }

    return resolvedAssets;
  }
}
