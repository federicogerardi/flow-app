import { DomainError, ConcurrencyError } from '@flow-app/domain';
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
}

export class ErrorMapper {
  toHttpStatus(error: Error): number {
    if (error instanceof ConcurrencyError) {
      return 409;
    }

    if (error instanceof DomainError) {
      switch (error.code) {
        case 'READINESS_FAILED':
        case 'ASSET_MISSING':
        case 'VALIDATION_ERROR':
          return 422;
        case 'TOOL_NOT_FOUND':
        case 'SESSION_NOT_FOUND':
        case 'WORKSPACE_NOT_FOUND':
        case 'ARTIFACT_NOT_FOUND':
        case 'ASSET_NOT_FOUND':
        case 'CONVERSATION_NOT_FOUND':
          return 404;
        case 'ASSET_TYPE_EXISTS':
        case 'INVALID_STATE':
        case 'CONFLICT':
          return 409;
        case 'ARTIFACT_GATE_EXCEEDED':
        case 'QUOTA_EXCEEDED':
        case 'RATE_LIMITED':
          return 429;
        case 'LLM_GATEWAY_ERROR':
          return 502;
        case 'UNAUTHORIZED':
          return 401;
        case 'FORBIDDEN':
          return 403;
        default:
          return 500;
      }
    }
    return 500;
  }

  toResponse(error: Error): ErrorResponse {
    if (error instanceof ConcurrencyError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          details: {
            resourceId: error.resourceId,
            expectedVersion: error.expectedVersion,
            actualVersion: error.actualVersion,
          },
          retryable: error.retryable,
        },
      };
    }

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

const errorMapper = new ErrorMapper();

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const status = errorMapper.toHttpStatus(err);
  const response = errorMapper.toResponse(err);

  logger.error({
    err,
    correlationId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
  }, `${err.constructor.name}: ${err.message}`);

  res.status(status).json(response);
}
