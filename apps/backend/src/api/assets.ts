import { Router } from 'express';
import type { AssetRepository } from '@flow-app/domain';
import { Asset, AssetType, AssetSource } from '@flow-app/domain';

export function createAssetRoutes(assetRepo: AssetRepository) {
  const router = Router();

  // GET /api/workspaces/:id/assets — list assets
  router.get('/api/workspaces/:id/assets', async (req, res, next) => {
    try {
      const workspaceId = req.params.id as string;
      const assets = await assetRepo.findByWorkspace(workspaceId);

      res.json({
        assets: assets.map((a) => ({
          id: a.assetId,
          workspaceId: a.workspaceId,
          assetType: a.assetType.value,
          source: a.source.value,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/workspaces/:id/assets — create asset
  router.post('/api/workspaces/:id/assets', async (req, res, next) => {
    try {
      const workspaceId = req.params.id as string;
      const { assetType, content, source } = req.body as { assetType: string; content: string; source?: string };

      if (!assetType || !content) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'assetType and content are required' } });
      }

      const asset = Asset.create({
        workspaceId,
        assetType: AssetType.from(assetType),
        source: source ? AssetSource.from(source) : AssetSource.Manual,
        content,
      });

      await assetRepo.save(asset);

      res.status(201).json({
        id: asset.assetId,
        workspaceId: asset.workspaceId,
        assetType: asset.assetType.value,
        source: asset.source.value,
        createdAt: asset.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/workspaces/:wid/assets/:aid — get asset
  router.get('/api/workspaces/:wid/assets/:aid', async (req, res, next) => {
    try {
      const asset = await assetRepo.findById(req.params.aid as string);
      if (!asset) {
        return res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } });
      }

      res.json({
        id: asset.assetId,
        workspaceId: asset.workspaceId,
        assetType: asset.assetType.value,
        source: asset.source.value,
        content: asset.content,
        sourceSessionId: asset.sourceSessionId,
        sourceArtifactId: asset.sourceArtifactId,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/workspaces/:wid/assets/:aid — update asset
  router.put('/api/workspaces/:wid/assets/:aid', async (req, res, next) => {
    try {
      const asset = await assetRepo.findById(req.params.aid as string);
      if (!asset) {
        return res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' } });
      }

      const { content } = req.body as { content?: string };
      if (!content) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'content is required' } });
      }

      const updated = asset.withContent(content);
      await assetRepo.save(updated);

      res.json({ id: updated.assetId, updatedAt: updated.updatedAt.toISOString() });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/workspaces/:wid/assets/:aid — delete asset
  router.delete('/api/workspaces/:wid/assets/:aid', async (req, res, next) => {
    try {
      await assetRepo.delete(req.params.aid as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
