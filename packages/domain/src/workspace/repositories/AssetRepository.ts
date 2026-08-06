import type { Asset } from '../entities/Asset';
import type { AssetType } from '../value-objects/AssetType';

export interface AssetRepository {
  findByWorkspace(workspaceId: string): Promise<Asset[]>;
  findById(assetId: string): Promise<Asset | null>;
  findByWorkspaceAndType(workspaceId: string, assetType: AssetType): Promise<Asset[]>;
  save(asset: Asset): Promise<void>;
  delete(assetId: string): Promise<void>;
}
