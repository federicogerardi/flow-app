import type { ModelTier } from '@flow-app/domain';

export interface ModelConfig {
  primary: string;
  fallback: string;
  maxTokens: number;
}

const MODEL_REGISTRY: Record<ModelTier, ModelConfig> = {
  premium: {
    primary:   'anthropic/claude-sonnet-4-20250514',
    fallback:  'openai/gpt-4o',
    maxTokens: 16000,
  },
  balanced: {
    primary:   'openai/gpt-4o-mini',
    fallback:  'google/gemini-2.0-flash-001',
    maxTokens: 8000,
  },
  light: {
    primary:   'google/gemini-2.0-flash-lite-001',
    fallback:  'meta-llama/llama-4-maverick:free',
    maxTokens: 4000,
  },
  search: {
    primary:   'google/gemini-2.5-pro-preview-05-06',
    fallback:  'perplexity/sonar-reasoning-pro',
    maxTokens: 8000,
  },
};

export function getModelConfig(tier: ModelTier): ModelConfig {
  const config = MODEL_REGISTRY[tier];
  if (!config) throw new Error(`Unknown model tier: ${tier}`);
  return config;
}
