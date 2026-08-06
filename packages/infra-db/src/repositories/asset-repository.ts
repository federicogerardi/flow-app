import type { Kysely } from 'kysely';
import type { DB } from '../types';
import { Asset, AssetType, AssetSource, type AssetRepository } from '@flow-app/domain';

export class KyselyAssetRepository implements AssetRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findByWorkspace(workspaceId: string): Promise<Asset[]> {
    const rows = await this.db
      .selectFrom('assets')
      .where('workspace_id', '=', workspaceId)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r) =>
      Asset.reconstitute(
        r.id,
        r.workspace_id,
        AssetType.from(r.asset_type),
        AssetSource.from(r.source),
        r.content,
        r.source_ref,
        null,
        r.name ?? null,
        r.created_at,
        r.updated_at,
      ),
    );
  }

  async findById(assetId: string): Promise<Asset | null> {
    const row = await this.db
      .selectFrom('assets')
      .where('id', '=', assetId)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    return Asset.reconstitute(
      row.id,
      row.workspace_id,
      AssetType.from(row.asset_type),
      AssetSource.from(row.source),
      row.content,
      row.source_ref,
      null,
      row.name ?? null,
      row.created_at,
      row.updated_at,
    );
  }

  async findByWorkspaceAndType(workspaceId: string, assetType: AssetType): Promise<Asset[]> {
    const rows = await this.db
      .selectFrom('assets')
      .where('workspace_id', '=', workspaceId)
      .where('asset_type', '=', assetType.value)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r) =>
      Asset.reconstitute(
        r.id,
        r.workspace_id,
        AssetType.from(r.asset_type),
        AssetSource.from(r.source),
        r.content,
        r.source_ref,
        null,
        r.name ?? null,
        r.created_at,
        r.updated_at,
      ),
    );
  }

  async save(asset: Asset): Promise<void> {
    await this.db
      .insertInto('assets')
      .values({
        id: asset.assetId,
        workspace_id: asset.workspaceId,
        asset_type: asset.assetType.value,
        source: asset.source.value,
        source_ref: asset.sourceArtifactId,
        name: asset.name,
        content: asset.content,
      })
      .onConflict((oc) =>
        oc.columns(['id']).doUpdateSet({
          content: asset.content,
          name: asset.name,
          source: asset.source.value,
          updated_at: asset.updatedAt,
        }),
      )
      .execute();
  }

  async delete(assetId: string): Promise<void> {
    await this.db.deleteFrom('assets').where('id', '=', assetId).execute();
  }
}
