import { describe, it, expect } from 'vitest';
import type { AssetInput, ToolDefinition } from '../tools/tool-definition';

describe('AssetInput', () => {
  it('should accept minimal required fields', () => {
    const input: AssetInput = { assetType: 'persona', required: true };
    expect(input.assetType).toBe('persona');
    expect(input.required).toBe(true);
    expect(input.multiple).toBeUndefined();
  });

  it('should accept multiple: true', () => {
    const input: AssetInput = { assetType: 'persona', required: true, multiple: true };
    expect(input.multiple).toBe(true);
  });

  it('should accept multiple: false', () => {
    const input: AssetInput = { assetType: 'brief', required: true, multiple: false };
    expect(input.multiple).toBe(false);
  });

  it('should accept optional asset with multiple: true', () => {
    const input: AssetInput = { assetType: 'tone-of-voice', required: false, multiple: true };
    expect(input.required).toBe(false);
    expect(input.multiple).toBe(true);
  });
});

describe('ToolDefinition.acquisition.assets', () => {
  it('should allow undefined assets (backward compat)', () => {
    const def = {
      toolKey: 'blog-post',
      name: 'Blog Post',
      description: 'test',
      acquisition: {},
      steps: [],
    } as unknown as ToolDefinition;
    expect(def.acquisition.assets).toBeUndefined();
  });

  it('should allow empty assets array', () => {
    const def = {
      toolKey: 'blog-post',
      name: 'Blog Post',
      description: 'test',
      acquisition: { assets: [] },
      steps: [],
    } as unknown as ToolDefinition;
    expect(def.acquisition.assets).toEqual([]);
  });

  it('should accept mixed multiple/required combinations', () => {
    const assets: AssetInput[] = [
      { assetType: 'brief', required: true, multiple: false },
      { assetType: 'persona', required: true, multiple: true },
      { assetType: 'tone-of-voice', required: false, multiple: false },
      { assetType: 'competitor', required: false, multiple: true },
    ];
    expect(assets).toHaveLength(4);
    expect(assets.filter((a) => a.required)).toHaveLength(2);
    expect(assets.filter((a) => a.multiple)).toHaveLength(2);
  });
});
