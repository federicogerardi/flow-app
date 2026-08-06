import { ModelTier, DomainError } from '@flow-app/domain';

export interface ModelConfig {
  primary: string;
  fallback: string;
  maxTokens: number;
}

export class UnknownModelTierError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(tier: string) {
    super(`Unknown model tier: "${tier}"`);
  }
}

const MODEL_REGISTRY = new Map<ModelTier, ModelConfig>([
  [ModelTier.Premium,  { primary: 'anthropic/claude-sonnet-5', fallback: 'openai/gpt-4o', maxTokens: 16000 }],
  [ModelTier.Balanced, { primary: 'openai/gpt-4o-mini', fallback: 'google/gemini-2.5-flash', maxTokens: 8000 }],
  [ModelTier.Light,    { primary: 'google/gemini-2.5-flash-lite', fallback: 'meta-llama/llama-4-maverick', maxTokens: 4000 }],
  [ModelTier.Search,   { primary: 'google/gemini-2.5-pro', fallback: 'perplexity/sonar-reasoning-pro', maxTokens: 8000 }],
]);

export function getModelConfig(tier: ModelTier): ModelConfig {
  const config = MODEL_REGISTRY.get(tier);
  if (!config) throw new UnknownModelTierError(tier.toString());
  return config;
}
