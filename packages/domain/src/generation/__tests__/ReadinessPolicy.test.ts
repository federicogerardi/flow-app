import { describe, it, expect } from 'vitest';
import { ReadinessPolicy, type AcquisitionData } from '../value-objects/ReadinessPolicy';
import type { ToolDefinition } from '../tools/tool-definition';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    toolKey: 'test-tool' as any,
    name: 'Test Tool',
    description: 'A test tool',
    acquisition: {},
    steps: [],
    ...overrides,
  };
}

function makeData(overrides: Partial<AcquisitionData> = {}): AcquisitionData {
  return {
    userInputs: {},
    fileContents: {},
    apiResponses: [],
    resolvedAssets: new Map(),
    ...overrides,
  };
}

describe('ReadinessPolicy', () => {
  describe('from', () => {
    it('should create a policy from a tool definition', () => {
      const tool = makeTool();
      expect(ReadinessPolicy.from(tool)).toBeDefined();
    });
  });

  describe('evaluate', () => {
    it('should return isReady true when all required inputs are present', () => {
      const tool = makeTool({
        acquisition: {
          userText: [{ key: 'topic', label: 'Topic', required: true }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData({ userInputs: { topic: 'AI' } }));

      expect(result.isReady).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return isReady false when a required text input is missing', () => {
      const tool = makeTool({
        acquisition: {
          userText: [{ key: 'topic', label: 'Topic', required: true }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData());

      expect(result.isReady).toBe(false);
      expect(result.missing).toEqual([{ type: 'text', key: 'topic', label: 'Topic' }]);
    });

    it('should return isReady true when an optional input is missing', () => {
      const tool = makeTool({
        acquisition: {
          userText: [{ key: 'topic', label: 'Topic', required: false }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData());

      expect(result.isReady).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return isReady false when a required file is missing', () => {
      const tool = makeTool({
        acquisition: {
          files: [{ key: 'brief', label: 'Brief', accept: ['.pdf'], required: true }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData());

      expect(result.isReady).toBe(false);
      expect(result.missing).toEqual([{ type: 'file', key: 'brief', label: 'Brief' }]);
    });

    it('should return isReady false when a required asset is missing', () => {
      const tool = makeTool({
        acquisition: {
          assets: [{ assetType: 'logo', required: true }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData());

      expect(result.isReady).toBe(false);
      expect(result.missing).toEqual([{ type: 'asset', key: 'logo', label: 'logo' }]);
    });

    it('should return isReady true when all required inputs across categories are present', () => {
      const tool = makeTool({
        acquisition: {
          userText: [{ key: 'topic', label: 'Topic', required: true }],
          files: [{ key: 'brief', label: 'Brief', accept: ['.pdf'], required: true }],
          assets: [{ assetType: 'logo', required: true }],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(
        makeData({
          userInputs: { topic: 'AI' },
          fileContents: { brief: 'content' },
          resolvedAssets: new Map([['logo', 'logo-url']]),
        }),
      );

      expect(result.isReady).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return isReady false with multiple missing items', () => {
      const tool = makeTool({
        acquisition: {
          userText: [
            { key: 'topic', label: 'Topic', required: true },
            { key: 'tone', label: 'Tone', required: true },
          ],
        },
      });
      const policy = ReadinessPolicy.from(tool);
      const result = policy.evaluate(makeData());

      expect(result.isReady).toBe(false);
      expect(result.missing).toHaveLength(2);
    });
  });
});
