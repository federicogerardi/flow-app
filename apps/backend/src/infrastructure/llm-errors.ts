import { DomainError } from '@flow-app/domain';

export class LlmGatewayError extends DomainError {
  readonly code = 'LLM_GATEWAY_ERROR';
  readonly retryable: boolean;

  constructor(
    message: string,
    readonly modelTier: string,
    readonly modelId: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'LlmGatewayError';
    this.retryable = statusCode === 429
      || statusCode === 503
      || statusCode === 500
      || !statusCode;
  }
}

export class LlmRateLimitError extends LlmGatewayError {
  constructor(modelTier: string, modelId: string) {
    super(`Rate limited by LLM provider (${modelId})`, modelTier, modelId, 429);
    this.name = 'LlmRateLimitError';
  }
}

export class LlmTimeoutError extends LlmGatewayError {
  constructor(modelTier: string, modelId: string, timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms (${modelId})`, modelTier, modelId, 504);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmUnavailableError extends LlmGatewayError {
  constructor(modelTier: string, modelId: string, statusCode?: number) {
    super(`LLM provider unavailable (${modelId})`, modelTier, modelId, statusCode ?? 503);
    this.name = 'LlmUnavailableError';
  }
}
