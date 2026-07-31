---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# Error Mapping — Domain → HTTP

> Maps domain exceptions to HTTP status codes and response shapes  
> `apps/backend/src/infrastructure/error-handler.ts`

## Principle

Domain exceptions carry semantic meaning (`ReadinessError`, `QuotaExceededError`). The HTTP layer translates them to status codes and structured error responses. No domain code knows about HTTP.

## Error Catalog

| Domain Error | HTTP | Code | Retryable? |
|-------------|------|------|-----------|
| `ReadinessError` | `422` | `READINESS_FAILED` | Yes (fix inputs) |
| `MissingRequiredAssetError` | `422` | `ASSET_MISSING` | Yes (create asset) |
| `ValidationError` | `422` | `VALIDATION_ERROR` | Yes (fix inputs) |
| `ToolNotFoundError` | `404` | `TOOL_NOT_FOUND` | No |
| `SessionNotFoundError` | `404` | `SESSION_NOT_FOUND` | No |
| `WorkspaceNotFoundError` | `404` | `WORKSPACE_NOT_FOUND` | No |
| `ArtifactNotFoundError` | `404` | `ARTIFACT_NOT_FOUND` | No |
| `AssetTypeExistsError` | `409` | `ASSET_TYPE_EXISTS` | No |
| `QuotaExceededError` | `429` | `QUOTA_EXCEEDED` | Yes (next period) |
| `RateLimitError` | `429` | `RATE_LIMITED` | Yes (wait) |
| `InvalidSessionStateError` | `409` | `INVALID_STATE` | No |
| `LlmGatewayError` | `502` | `LLM_GATEWAY_ERROR` | Yes (retry) |
| `UnauthorizedError` | `401` | `UNAUTHORIZED` | Yes (login) |
| `ForbiddenError` | `403` | `FORBIDDEN` | No |

## Implementation

```typescript
// apps/backend/src/infrastructure/error-handler.ts

import { DomainError } from '@flow-app/domain';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
}

class ErrorMapper {
  toHttpStatus(error: Error): number {
    if (error instanceof ReadinessError)              return 422;
    if (error instanceof MissingRequiredAssetError)   return 422;
    if (error instanceof ValidationError)             return 422;
    if (error instanceof ToolNotFoundError)           return 404;
    if (error instanceof SessionNotFoundError)        return 404;
    if (error instanceof WorkspaceNotFoundError)      return 404;
    if (error instanceof ArtifactNotFoundError)       return 404;
    if (error instanceof AssetTypeExistsError)        return 409;
    if (error instanceof QuotaExceededError)          return 429;
    if (error instanceof RateLimitError)              return 429;
    if (error instanceof InvalidSessionStateError)    return 409;
    if (error instanceof LlmGatewayError)             return 502;
    if (error instanceof UnauthorizedError)           return 401;
    if (error instanceof ForbiddenError)              return 403;

    // Unknown errors → 500
    return 500;
  }

  toResponse(error: Error): ErrorResponse {
    if (error instanceof DomainError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
        },
      };
    }

    // Unknown errors — mask details in production
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
        retryable: true,
      },
    };
  }
}
```

## Domain Error Base Class

```typescript
// packages/domain/src/shared/domain-error.ts

abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
```

## Express Middleware

```typescript
// apps/backend/src/infrastructure/error-middleware.ts

import { type Request, type Response, type NextFunction } from 'express';

const errorMapper = new ErrorMapper();

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const status   = errorMapper.toHttpStatus(err);
  const response = errorMapper.toResponse(err);

  // Structured logging with correlation ID
  logger.error({
    err,
    correlationId: req.headers['x-correlation-id'],
    path: req.path,
    method: req.method,
  }, `${err.constructor.name}: ${err.message}`);

  res.status(status).json(response);
}

export { errorHandler };
```

## Sources

- [[Domain Events Catalog]] — error events (SessionFailed)
- [[API Routes]] — error response format per endpoint