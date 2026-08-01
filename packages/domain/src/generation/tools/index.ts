import type { ToolDefinition } from './tool-definition';
import type { ToolKey } from '../value-objects/ToolKey';

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
      prompt: { templateId: 'blog-post/seo-structure', version: '1.0.0', model: 'balanced' },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'Outline',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/outline', version: '1.0.0', model: 'balanced' },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 3,
      label: 'Article',
      enrichment: 'serial',
      prompt: { templateId: 'blog-post/article', version: '1.0.0', model: 'premium' },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};

export const toolRegistry: Record<ToolKey, ToolDefinition> = {
  'blog-post': blogPostTool,
  'landing-funnel': blogPostTool,
  'landing-page': blogPostTool,
  'video-script-long-form': blogPostTool,
  'video-description': blogPostTool,
  'ad-copy': blogPostTool,
  'brief': blogPostTool,
  'brand-voice': blogPostTool,
  'buyer-persona': blogPostTool,
  'marketing-angle': blogPostTool,
  'ai-overview-analysis': blogPostTool,
};

export function getTool(key: ToolKey): ToolDefinition | undefined {
  return toolRegistry[key];
}
