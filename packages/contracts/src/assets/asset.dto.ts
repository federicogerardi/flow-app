export interface AssetDTO {
  id: string;
  workspaceId: string;
  assetType: string;
  name: string | null;
  source: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
