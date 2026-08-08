import type { ToolDefinition } from './tool-definition';
import type { ToolKeyValue } from '../value-objects/ToolKey';
import { ToolKey } from '../value-objects/ToolKey';
import { ModelTier } from '../value-objects/ModelTier';
import { ToolOutputCategory } from '../value-objects/ToolOutputCategory';
import { DomainError } from '../../shared/domain-error';

export class ToolNotFoundError extends DomainError {
  readonly code = 'TOOL_NOT_FOUND';
  readonly retryable = false;
  constructor(toolKey: unknown) {
    super(`Tool ${String(toolKey)} not found in registry`);
  }
}

const blogPostTool: ToolDefinition = {
  toolKey: 'blog-post',
  name: 'Blog Post',
  description: 'Generate a complete blog article with SEO optimization',
  creditCost: 1,
  outputCategory: ToolOutputCategory.ContentProducer,
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1'],
  acquisition: {
    userText: [
      { key: 'topic', label: 'Topic', required: true, type: 'short' },
      { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'] },
    ],
    files: [
      { key: 'briefing', label: 'Briefing', accept: ['.txt', '.md', '.docx'], required: false },
    ],
    assets: [
      { assetType: 'brand-voice', required: false },
      { assetType: 'persona', required: false },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'SEO Structure',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/seo-structure', version: '1.0.0', model: ModelTier.Balanced },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'Outline',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/outline', version: '1.0.0', model: ModelTier.Balanced },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'Article',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/article', version: '1.0.0', model: ModelTier.Premium },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

const briefTool: ToolDefinition = {
  toolKey: 'brief',
  name: 'Brief',
  description: 'Genera un brief marketing strutturato',
  creditCost: 1,
  outputCategory: ToolOutputCategory.AssetProducer,
  produces: 'brief',
  acquisition: {
    userText: [
      { key: 'objective', label: 'Obiettivo', required: true, type: 'long', placeholder: 'Descrivi obiettivo e contesto del brief...' },
    ],
    files: [
      { key: 'briefing', label: 'Documento briefing', accept: ['.txt', '.md', '.docx'], required: true, description: 'Carica un documento briefing (.txt, .md, .docx)' },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'brief/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'brief-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'brief/brief-generation',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

const buyerPersonaTool: ToolDefinition = {
  toolKey: 'buyer-persona',
  name: 'Buyer Persona',
  description: 'Genera buyer persona completi a partire da un brief — con dati supplementari opzionali',
  creditCost: 1,
  outputCategory: ToolOutputCategory.AssetProducer,
  produces: 'persona',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
    ],
    files: [
      { key: 'instructions', label: 'Dati supplementari', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: carica survey, competitor analysis, dati di mercato aggiuntivi' },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'buyer-persona/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'personas-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'buyer-persona/personas-generation',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

const marketingAngleTool: ToolDefinition = {
  toolKey: 'marketing-angle',
  name: 'Angoli di Attacco',
  description: 'Genera angoli marketing testabili per campagne Meta, basati su brief e buyer personas',
  // marketing-angle is asset producer first
  creditCost: 1,
  outputCategory: ToolOutputCategory.AssetProducer,
  produces: 'angle',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
      { assetType: 'persona', required: true, multiple: true },
    ],
    userText: [],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'angle-matrix',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/angle-matrix',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 180000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'creative-activation',
      enrichment: 'serial',
      prompt: {
        templateId: 'marketing-angle/creative-activation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

const adCopyTool: ToolDefinition = {
  toolKey: 'ad-copy',
  name: 'Meta Ads',
description: 'Genera copy per campagne Meta (Facebook/Instagram) con sistema cluster → angolo → awareness',
  creditCost: 1,
  outputCategory: ToolOutputCategory.ContentProducer,
  acquisition: {
    userText: [
      { key: 'goal', label: 'Campaign Goal', required: true, type: 'select', options: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Sales'] },
      { key: 'tone', label: 'Tone', required: false, type: 'select', options: ['Professional', 'Casual', 'Urgente', 'Empatico', 'Autorevole'] },
      { key: 'copyLength', label: 'Copy Length', required: true, type: 'select', options: ['short', 'medium', 'long'] },
    ],
    assets: [
      { assetType: 'brief', required: true },
      { assetType: 'persona', required: true, multiple: true },
      { assetType: 'angle', required: false, multiple: true },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'context-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/context-generation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'ads-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'ad-copy/ads-generation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 180000, maxRetries: 2 },
    },
  ],
};

export const toolRegistry: Record<ToolKeyValue, ToolDefinition> = {
  'blog-post': blogPostTool,
  'brief': briefTool,
  'landing-funnel': blogPostTool,
  'landing-page': blogPostTool,
  'video-script-long-form': blogPostTool,
  'video-description': blogPostTool,
  'ad-copy': adCopyTool,
  'brand-voice': blogPostTool,
  'buyer-persona': buyerPersonaTool,
  'marketing-angle': marketingAngleTool,
  'ai-overview-analysis': blogPostTool,
};

export function getTool(key: ToolKey): ToolDefinition | undefined {
  return toolRegistry[key.value];
}

/** Returns all tools whose output is reusable context (promotable to assets) */
export function getAssetProducerTools(): ToolDefinition[] {
  return Object.values(toolRegistry).filter((t) => t.outputCategory.isAssetProducer());
}

/** Returns all tools whose output is a final document (consumes assets as context) */
export function getContentProducerTools(): ToolDefinition[] {
  return Object.values(toolRegistry).filter((t) => t.outputCategory.isContentProducer());
}
