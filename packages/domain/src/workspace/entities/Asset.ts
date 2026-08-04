import { randomUUID } from 'node:crypto';
import { AssetType, type AssetTypeValue } from '../value-objects/AssetType';
import { AssetSource, type AssetSourceValue } from '../value-objects/AssetSource';

export class Asset {
  private constructor(
    readonly assetId: string,
    readonly workspaceId: string,
    readonly assetType: AssetType,
    readonly source: AssetSource,
    readonly content: string,
    readonly sourceSessionId: string | null,
    readonly sourceArtifactId: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(params: {
    workspaceId: string;
    assetType: AssetType | AssetTypeValue;
    source: AssetSource | AssetSourceValue;
    content: string;
    sourceSessionId?: string;
    sourceArtifactId?: string;
  }): Asset {
    return new Asset(
      randomUUID(),
      params.workspaceId,
      typeof params.assetType === 'string' ? AssetType.from(params.assetType) : params.assetType,
      typeof params.source === 'string' ? AssetSource.from(params.source) : params.source,
      params.content,
      params.sourceSessionId ?? null,
      params.sourceArtifactId ?? null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(
    assetId: string,
    workspaceId: string,
    assetType: AssetType,
    source: AssetSource,
    content: string,
    sourceSessionId: string | null,
    sourceArtifactId: string | null,
    createdAt: Date,
    updatedAt: Date,
  ): Asset {
    return new Asset(assetId, workspaceId, assetType, source, content, sourceSessionId, sourceArtifactId, createdAt, updatedAt);
  }

  withContent(newContent: string): Asset {
    return new Asset(
      this.assetId, this.workspaceId, this.assetType, this.source,
      newContent, this.sourceSessionId, this.sourceArtifactId,
      this.createdAt, new Date(),
    );
  }
}
