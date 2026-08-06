import { describe, it, expect } from 'vitest';
import { ContextEnricher } from '../domain-services/ContextEnricher';
import type { AcquisitionData } from '../value-objects/ReadinessPolicy';
import type { StepDefinition } from '../tools/tool-definition';
import { Artifact } from '../entities/Artifact';

function makeStep(overrides: Partial<StepDefinition> = {}): StepDefinition {
  return {
    order: 1,
    label: 'test-step',
    prompt: { model: 'standard' as any },
    enrichment: 'serial',
    execution: { timeoutMs: 30000, maxRetries: 3 },
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

describe('ContextEnricher', () => {
  const enricher = new ContextEnricher();

  it('should return combined context from acquisition data', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({
        userInputs: { topic: 'AI trends' },
        resolvedAssets: new Map([['logo', 'https://cdn.example.com/logo.png']]),
      }),
    });

    expect(result).toContain('[Input - topic]');
    expect(result).toContain('AI trends');
    expect(result).toContain('[Asset - logo]');
    expect(result).toContain('https://cdn.example.com/logo.png');
  });

  it('should handle empty previous results', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({ userInputs: { topic: 'AI' } }),
    });

    expect(result).toContain('[Input - topic]');
    expect(result).not.toContain('[Previous Step');
  });

  it('should handle empty acquisition data', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData(),
    });

    expect(result).toBe('');
  });

  it('should include previous step results', () => {
    const artifact = Artifact.reconstitute(
      'art-1',
      'sess-1',
      1,
      'Generated outline content',
      'completed' as any,
      new Date(),
    );

    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [artifact],
      acquisitionData: makeData(),
    });

    expect(result).toContain('[Previous Step 1]');
    expect(result).toContain('Generated outline content');
  });

  it('should include user inputs', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({ userInputs: { topic: 'AI', tone: 'professional' } }),
    });

    expect(result).toContain('[Input - topic]');
    expect(result).toContain('AI');
    expect(result).toContain('[Input - tone]');
    expect(result).toContain('professional');
  });

  it('should include resolved assets', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({
        resolvedAssets: new Map([['brand-guide', 'https://cdn.example.com/guide.pdf']]),
      }),
    });

    expect(result).toContain('[Asset - brand-guide]');
    expect(result).toContain('https://cdn.example.com/guide.pdf');
  });

  it('should include API data for hybrid steps with matching sources', () => {
    const result = enricher.enrich({
      step: makeStep({ enrichment: 'hybrid', apiSources: ['seo-api'] }),
      previousResults: [],
      acquisitionData: makeData({
        apiResponses: [{ source: 'seo-api', data: { keywords: ['AI', 'ML'] } }],
      }),
    });

    expect(result).toContain('[API Data - seo-api]');
    expect(result).toContain('AI');
  });

  it('should not include API data for serial steps', () => {
    const result = enricher.enrich({
      step: makeStep({ enrichment: 'serial', apiSources: ['seo-api'] }),
      previousResults: [],
      acquisitionData: makeData({
        apiResponses: [{ source: 'seo-api', data: { keywords: ['AI'] } }],
      }),
    });

    expect(result).not.toContain('[API Data');
  });

  it('should include file contents from acquisition data', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({
        fileContents: {
          briefing: '# Product Overview\nAcme Corp is a SaaS platform...',
        },
      }),
    });

    expect(result).toContain('[File - briefing]');
    expect(result).toContain('Acme Corp is a SaaS platform');
  });

  it('should handle multiple file contents', () => {
    const result = enricher.enrich({
      step: makeStep(),
      previousResults: [],
      acquisitionData: makeData({
        fileContents: {
          briefing: 'Brief content',
          context: 'Context document',
        },
      }),
    });

    expect(result).toContain('[File - briefing]');
    expect(result).toContain('[File - context]');
  });
});
