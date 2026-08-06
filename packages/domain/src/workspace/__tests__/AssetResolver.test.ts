import { describe, it, expect, vi } from 'vitest';
import { AssetResolver, MissingRequiredAssetError, InvalidAssetSelectionError } from '../domain-services/AssetResolver';
import { Workspace } from '../entities/Workspace';
import { Asset } from '../entities/Asset';
import { AssetType } from '../value-objects/AssetType';
import { AssetSource } from '../value-objects/AssetSource';
import { WorkspaceNotFoundError } from '../errors';
import type { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import type { ToolDefinition } from '../../generation/tools/tool-definition';

function makeTool(assets?: Array<{ assetType: string; required: boolean; multiple?: boolean }>): ToolDefinition {
  return {
    toolKey: 'test-tool' as any,
    name: 'Test Tool',
    description: 'A test tool',
    acquisition: { assets },
    steps: [],
  };
}

function makeWorkspaceWithAssets(workspaceId: string, assetData: Array<{ type: string; content: string; id: string }>) {
  const now = new Date();
  const ws = Workspace.reconstitute(
    workspaceId, 'owner-1', 'Test WS', now, now, 1, [],
    assetData.map((d) =>
      Asset.reconstitute(d.id, workspaceId, AssetType.from(d.type), AssetSource.Generated, d.content, null, null, null, now, now),
    ),
  );
  return ws;
}

function makeMockWorkspaceRepo(workspace: Workspace | null): WorkspaceRepository {
  return {
    findById: vi.fn(async () => workspace),
    findByUser: vi.fn(async () => []),
    save: vi.fn(async () => {}),
  };
}

describe('AssetResolver', () => {
  const workspaceId = 'ws-1';

  it('should resolve single asset to Map<string, [content]>', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [{ type: 'persona', content: 'Persona A', id: 'a1' }]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(workspaceId, makeTool([{ assetType: 'persona', required: true }]));

    expect(result.get('persona')).toEqual(['Persona A']);
  });

  it('should resolve multiple assets of same type to Map<string, [c1, c2, ...]>', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [
      { type: 'persona', content: 'Persona A', id: 'a1' },
      { type: 'persona', content: 'Persona B', id: 'a2' },
      { type: 'persona', content: 'Persona C', id: 'a3' },
    ]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(workspaceId, makeTool([{ assetType: 'persona', required: true, multiple: true }]));

    expect(result.get('persona')).toEqual(['Persona A', 'Persona B', 'Persona C']);
  });

  it('should throw MissingRequiredAssetError when required asset is absent', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, []);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));

    await expect(
      resolver.resolve(workspaceId, makeTool([{ assetType: 'persona', required: true }])),
    ).rejects.toThrow(MissingRequiredAssetError);
  });

  it('should silently skip optional absent assets', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, []);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(workspaceId, makeTool([{ assetType: 'persona', required: false }]));

    expect(result.has('persona')).toBe(false);
  });

  it('should throw WorkspaceNotFoundError when workspace not found', async () => {
    const resolver = new AssetResolver(makeMockWorkspaceRepo(null));

    await expect(
      resolver.resolve('missing-ws', makeTool()),
    ).rejects.toThrow(WorkspaceNotFoundError);
  });

  it('should return empty Map when tool has no asset mappings', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [{ type: 'persona', content: 'P', id: 'a1' }]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(workspaceId, makeTool());

    expect(result.size).toBe(0);
  });

  it('should filter by selectedAssetIds when provided', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [
      { type: 'persona', content: 'Persona A', id: 'a1' },
      { type: 'persona', content: 'Persona B', id: 'a2' },
    ]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(
      workspaceId,
      makeTool([{ assetType: 'persona', required: true, multiple: true }]),
      ['a1'],
    );

    expect(result.get('persona')).toEqual(['Persona A']);
  });

  it('should throw InvalidAssetSelectionError for invalid selectedAssetIds (F1)', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [{ type: 'persona', content: 'P', id: 'a1' }]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));

    await expect(
      resolver.resolve(
        workspaceId,
        makeTool([{ assetType: 'persona', required: true }]),
        ['a1', 'nonexistent-id'],
      ),
    ).rejects.toThrow(InvalidAssetSelectionError);
  });

  it('should throw MissingRequiredAssetError when selectedAssetIds filters out all assets of required type', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [
      { type: 'persona', content: 'P', id: 'a1' },
      { type: 'brief', content: 'B', id: 'a2' },
    ]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));

    await expect(
      resolver.resolve(
        workspaceId,
        makeTool([{ assetType: 'persona', required: true }]),
        ['a2'], // selects only brief, not persona
      ),
    ).rejects.toThrow(MissingRequiredAssetError);
  });

  it('should handle empty selectedAssetIds (no filter)', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [
      { type: 'persona', content: 'Persona A', id: 'a1' },
      { type: 'persona', content: 'Persona B', id: 'a2' },
    ]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(
      workspaceId,
      makeTool([{ assetType: 'persona', required: true, multiple: true }]),
      [],
    );

    expect(result.get('persona')).toEqual(['Persona A', 'Persona B']);
  });

  it('should resolve mixed single and multi types', async () => {
    const ws = makeWorkspaceWithAssets(workspaceId, [
      { type: 'brief', content: 'Brief content', id: 'a1' },
      { type: 'persona', content: 'Persona A', id: 'a2' },
      { type: 'persona', content: 'Persona B', id: 'a3' },
    ]);
    const resolver = new AssetResolver(makeMockWorkspaceRepo(ws));
    const result = await resolver.resolve(
      workspaceId,
      makeTool([
        { assetType: 'brief', required: true },
        { assetType: 'persona', required: true, multiple: true },
      ]),
    );

    expect(result.get('brief')).toEqual(['Brief content']);
    expect(result.get('persona')).toEqual(['Persona A', 'Persona B']);
  });
});
