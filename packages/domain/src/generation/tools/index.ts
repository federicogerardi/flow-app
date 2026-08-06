import type { ToolDefinition } from './tool-definition';
import type { ToolKeyValue } from '../value-objects/ToolKey';
import { ToolKey } from '../value-objects/ToolKey';
import { ModelTier } from '../value-objects/ModelTier';
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
  description: 'Genera un brief marketing strutturato — il documento base per tutti i tool di generazione',
  creditCost: 1,
  produces: 'brief',
  acquisition: {
    userText: [
      { key: 'objective', label: 'Obiettivo', required: true, type: 'long', placeholder: 'Descrivi obiettivo e contesto del brief...' },
    ],
    files: [
      { key: 'briefing', label: 'Documento briefing', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: carica un documento briefing per un\'estrazione più completa' },
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

export const toolRegistry: Record<ToolKeyValue, ToolDefinition> = {
  'blog-post': blogPostTool,
  'brief': briefTool,
  'landing-funnel': blogPostTool,
  'landing-page': blogPostTool,
  'video-script-long-form': blogPostTool,
  'video-description': blogPostTool,
  'ad-copy': blogPostTool,
  'brand-voice': blogPostTool,
  'buyer-persona': blogPostTool,
  'marketing-angle': blogPostTool,
  'ai-overview-analysis': blogPostTool,
};

export function getTool(key: ToolKey): ToolDefinition | undefined {
  return toolRegistry[key.value];
}
