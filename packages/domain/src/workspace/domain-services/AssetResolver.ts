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

export class AssetResolver {
  constructor(private readonly workspaceRepo: WorkspaceRepository) {}

  async resolve(
    workspaceId: string,
    tool: ToolDefinition,
  ): Promise<Map<string, string>> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);

    const resolvedAssets = new Map<string, string>();

    for (const mapping of tool.acquisition.assets ?? []) {
      const type = AssetType.from(mapping.assetType);
      const asset = workspace.getAssetByType(type);

      if (asset) {
        resolvedAssets.set(mapping.assetType, asset.content);
      } else if (mapping.required) {
        throw new MissingRequiredAssetError(mapping.assetType);
      }
      // Optional assets: silently skip
    }

    return resolvedAssets;
  }
}
