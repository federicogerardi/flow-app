import OpenAI from 'openai';
import type { ModelTier } from '@flow-app/domain';
import { getModelConfig } from './model-registry.js';
import { LlmGatewayError, LlmRateLimitError, LlmUnavailableError } from './llm-errors.js';
import { logger } from './logger.js';

export interface LlmGatewayConfig {
  apiKey: string;
  baseUrl: string;
  appName: string;
  defaultTimeoutMs: number;
}

export interface GenerateParams {
  model: ModelTier;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeout?: number;
}

export interface GenerateResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  fallbackUsed?: boolean;
}

export class LlmGateway {
  private client: OpenAI;

  constructor(private config: LlmGatewayConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': config.appName,
        'X-Title': config.appName,
      },
    });
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const modelConfig = getModelConfig(params.model);
    const timeout = params.timeout ?? this.config.defaultTimeoutMs;

    const log = logger.child({
      modelTier: params.model,
      primaryModel: modelConfig.primary,
    });

    log.info({ timeout }, 'llm_generate_start');

    try {
      const result = await this.callModel(modelConfig.primary, modelConfig.maxTokens, params, timeout);
      log.info({
        model: result.model,
        latencyMs: result.latencyMs,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      }, 'llm_generate_success');
      return result;
    } catch (error) {
      log.warn({
        error: error instanceof Error ? error.message : 'unknown',
        statusCode: error instanceof OpenAI.APIError ? error.status : undefined,
      }, 'llm_generate_primary_failed');

      if (modelConfig.fallback && this.isRetryable(error)) {
        log.info({ fallbackModel: modelConfig.fallback }, 'llm_generate_fallback');
        try {
          const result = await this.callModel(modelConfig.fallback, modelConfig.maxTokens, params, timeout);
          log.info({
            model: result.model,
            latencyMs: result.latencyMs,
            fallbackUsed: true,
          }, 'llm_generate_fallback_success');
          return { ...result, fallbackUsed: true };
        } catch (fallbackError) {
          log.error({
            error: fallbackError instanceof Error ? fallbackError.message : 'unknown',
          }, 'llm_generate_fallback_failed');
          throw this.toDomainError(fallbackError, params.model, modelConfig.fallback);
        }
      }

      throw this.toDomainError(error, params.model, modelConfig.primary);
    }
  }

  private async callModel(
    modelId: string,
    maxTokens: number,
    params: GenerateParams,
    timeoutMs: number,
  ): Promise<GenerateResult> {
    const startTime = Date.now();

    const response = await this.client.chat.completions.create(
      {
        model: modelId,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: params.temperature ?? 0.7,
      },
      { timeout: timeoutMs },
    );

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - startTime,
    };
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      return error.status === 429 || error.status === 503 || error.status === 500;
    }
    return true;
  }

  private toDomainError(error: unknown, modelTier: ModelTier, modelId: string): LlmGatewayError {
    const tier = modelTier.toString();
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) return new LlmRateLimitError(tier, modelId);
      if (error.status === 503 || error.status === 500) {
        return new LlmUnavailableError(tier, modelId, error.status);
      }
      return new LlmGatewayError(error.message, tier, modelId, error.status);
    }

    if (error instanceof LlmGatewayError) return error;

    return new LlmGatewayError(
      error instanceof Error ? error.message : 'Unknown LLM error',
      tier,
      modelId,
    );
  }
}
