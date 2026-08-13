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
  name: 'Articolo Blog',
  description: 'Genera un articolo blog ottimizzato SEO a partire da un titolo e istruzioni personalizzate',
  creditCost: 1,
  outputCategory: ToolOutputCategory.ContentProducer,
  // produces is NOT set — content tool, output is not promotable to an asset
  // defaultComponents is NOT set — every step declares its full component list explicitly.
  // This is because per-step components REPLACE (not merge). See Creating a New Tool#Prompt Component Resolution.
  acquisition: {
    userText: [
      { key: 'topic', label: 'Titolo articolo', required: true, type: 'short' },
      { key: 'instructions', label: 'Istruzioni personalizzate', required: false, type: 'long', placeholder: 'Aggiungi istruzioni per la generazione...' },
    ],
  },
  steps: [
    {
      order: 1,
      label: 'seo-structure',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/seo-structure', version: '1.0.0', model: ModelTier.Search, components: ['output-markdown/v1', 'anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'research',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/research', version: '1.0.0', model: ModelTier.Balanced, components: ['anti-hallucination/v1'] },
      execution: { timeoutMs: 90000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'article',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/article', version: '1.0.0', model: ModelTier.Premium, components: ['output-markdown/v1', 'seo-optimized/v1', 'italian-formal/v1'] },
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
        version: '1.1.0',
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
        version: '1.1.0',
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
        version: '1.1.0',
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
        version: '1.1.0',
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
        version: '1.1.0',
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
        version: '1.1.0',
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
        version: '1.1.0',
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

const brandVoiceTool: ToolDefinition = {
  toolKey: 'brand-voice',
  name: 'Brand Voice',
  description: 'Estrae il tone of voice da un brief e materiali aziendali, producendo linee guida complete per la comunicazione del brand su ogni canale',
  creditCost: 1,
  outputCategory: ToolOutputCategory.AssetProducer,
  produces: 'brand-voice',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  acquisition: {
    assets: [
      { assetType: 'brief', required: true },
    ],
    files: [
      { key: 'material', label: 'Materiale aggiuntivo', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: carica documenti con specifiche aggiuntive sulla brand identity, esempi di comunicazione, o linee guida esistenti' },
    ],
    userText: [],
  },
  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: {
        templateId: 'brand-voice/extraction',
        version: '1.0.0',
        model: ModelTier.Balanced,
        components: ['output-json/v1'],
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'tov-generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'brand-voice/tov-generation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-plain-text/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

export const toolRegistry: Record<ToolKeyValue, ToolDefinition> = {
  'blog-post': blogPostTool,
  'brief': briefTool,
  'ad-copy': adCopyTool,
  'buyer-persona': buyerPersonaTool,
  'marketing-angle': marketingAngleTool,

  // Content producers — inherit blogPostTool structure, override identity fields
  'landing-funnel': {
    ...blogPostTool,
    toolKey: 'landing-funnel' as ToolKeyValue,
    name: 'Landing Funnel',
    description: 'Landing page + opt-in + quiz + VSL',
    outputCategory: ToolOutputCategory.ContentProducer,
  },
  'landing-page': {
    ...blogPostTool,
    toolKey: 'landing-page' as ToolKeyValue,
    name: 'Landing Page',
    description: 'Landing page + thank-you',
    outputCategory: ToolOutputCategory.ContentProducer,
  },
  'video-script-long-form': {
    ...blogPostTool,
    toolKey: 'video-script-long-form' as ToolKeyValue,
    name: 'Video Script',
    description: 'Long-form video script',
    outputCategory: ToolOutputCategory.ContentProducer,
  },
  'video-description': {
    ...blogPostTool,
    toolKey: 'video-description' as ToolKeyValue,
    name: 'Video Description',
    description: 'YouTube video description',
    outputCategory: ToolOutputCategory.ContentProducer,
  },
  'ai-overview-analysis': {
    ...blogPostTool,
    toolKey: 'ai-overview-analysis' as ToolKeyValue,
    name: 'AI Overview',
    description: 'Google AI Overview presence analysis',
    outputCategory: ToolOutputCategory.ContentProducer,
  },

  'brand-voice': brandVoiceTool,
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
