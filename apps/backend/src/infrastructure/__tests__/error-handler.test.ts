import { describe, it, expect, beforeEach } from 'vitest';
import { DomainError, ConcurrencyError } from '@flow-app/domain';
import { ErrorMapper } from '../error-handler.js';

class TestDomainError extends DomainError {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
    details?: unknown,
  ) {
    super(message, details);
  }
}

describe('ErrorMapper', () => {
  let mapper: ErrorMapper;

  beforeEach(() => {
    mapper = new ErrorMapper();
  });

  describe('toHttpStatus', () => {
    it('returns 409 for ConcurrencyError', () => {
      const error = new ConcurrencyError('res-1', 3, 5);
      expect(mapper.toHttpStatus(error)).toBe(409);
    });

    it('returns 404 for TOOL_NOT_FOUND', () => {
      const error = new TestDomainError('TOOL_NOT_FOUND', false, 'Tool not found');
      expect(mapper.toHttpStatus(error)).toBe(404);
    });

    it('returns 404 for SESSION_NOT_FOUND', () => {
      const error = new TestDomainError('SESSION_NOT_FOUND', false, 'Session not found');
      expect(mapper.toHttpStatus(error)).toBe(404);
    });

    it('returns 404 for WORKSPACE_NOT_FOUND', () => {
      const error = new TestDomainError('WORKSPACE_NOT_FOUND', false, 'Workspace not found');
      expect(mapper.toHttpStatus(error)).toBe(404);
    });

    it('returns 404 for ARTIFACT_NOT_FOUND', () => {
      const error = new TestDomainError('ARTIFACT_NOT_FOUND', false, 'Artifact not found');
      expect(mapper.toHttpStatus(error)).toBe(404);
    });

    it('returns 404 for CONVERSATION_NOT_FOUND', () => {
      const error = new TestDomainError('CONVERSATION_NOT_FOUND', false, 'Conversation not found');
      expect(mapper.toHttpStatus(error)).toBe(404);
    });

    it('returns 422 for VALIDATION_ERROR', () => {
      const error = new TestDomainError('VALIDATION_ERROR', false, 'Invalid input');
      expect(mapper.toHttpStatus(error)).toBe(422);
    });

    it('returns 422 for READINESS_FAILED', () => {
      const error = new TestDomainError('READINESS_FAILED', false, 'Missing inputs');
      expect(mapper.toHttpStatus(error)).toBe(422);
    });

    it('returns 422 for ASSET_MISSING', () => {
      const error = new TestDomainError('ASSET_MISSING', false, 'Asset missing');
      expect(mapper.toHttpStatus(error)).toBe(422);
    });

    it('returns 409 for ASSET_TYPE_EXISTS', () => {
      const error = new TestDomainError('ASSET_TYPE_EXISTS', false, 'Already exists');
      expect(mapper.toHttpStatus(error)).toBe(409);
    });

    it('returns 409 for INVALID_STATE', () => {
      const error = new TestDomainError('INVALID_STATE', false, 'Invalid state');
      expect(mapper.toHttpStatus(error)).toBe(409);
    });

    it('returns 409 for CONFLICT', () => {
      const error = new TestDomainError('CONFLICT', true, 'Conflict');
      expect(mapper.toHttpStatus(error)).toBe(409);
    });

    it('returns 429 for QUOTA_EXCEEDED', () => {
      const error = new TestDomainError('QUOTA_EXCEEDED', false, 'Quota exceeded');
      expect(mapper.toHttpStatus(error)).toBe(429);
    });

    it('returns 429 for RATE_LIMITED', () => {
      const error = new TestDomainError('RATE_LIMITED', false, 'Rate limited');
      expect(mapper.toHttpStatus(error)).toBe(429);
    });

    it('returns 502 for LLM_GATEWAY_ERROR', () => {
      const error = new TestDomainError('LLM_GATEWAY_ERROR', true, 'Gateway error');
      expect(mapper.toHttpStatus(error)).toBe(502);
    });

    it('returns 401 for UNAUTHORIZED', () => {
      const error = new TestDomainError('UNAUTHORIZED', false, 'Unauthorized');
      expect(mapper.toHttpStatus(error)).toBe(401);
    });

    it('returns 403 for FORBIDDEN', () => {
      const error = new TestDomainError('FORBIDDEN', false, 'Forbidden');
      expect(mapper.toHttpStatus(error)).toBe(403);
    });

    it('returns 500 for unknown DomainError code', () => {
      const error = new TestDomainError('SOME_FUTURE_CODE', false, 'Unknown');
      expect(mapper.toHttpStatus(error)).toBe(500);
    });

    it('returns 500 for plain Error', () => {
      const error = new Error('Something went wrong');
      expect(mapper.toHttpStatus(error)).toBe(500);
    });
  });

  describe('toResponse', () => {
    it('returns structured error response for DomainError', () => {
      const error = new TestDomainError('VALIDATION_ERROR', false, 'Bad input', { field: 'email' });
      const response = mapper.toResponse(error);

      expect(response).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bad input',
          details: { field: 'email' },
          retryable: false,
        },
      });
    });

    it('includes resourceId and version details for ConcurrencyError', () => {
      const error = new ConcurrencyError('res-42', 7, 9);
      const response = mapper.toResponse(error);

      expect(response).toEqual({
        error: {
          code: 'CONFLICT',
          message: 'Resource res-42 modified by another actor (expected v7, actual v9)',
          details: {
            resourceId: 'res-42',
            expectedVersion: 7,
            actualVersion: 9,
          },
          retryable: true,
        },
      });
    });

    it('returns INTERNAL_ERROR for plain Error', () => {
      const error = new Error('DB crash');
      const response = mapper.toResponse(error);

      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.retryable).toBe(true);
    });

    it('masks error message in production mode', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Sensitive detail');
      const response = mapper.toResponse(error);

      expect(response.error.message).toBe('An unexpected error occurred');

      process.env.NODE_ENV = prev;
    });

    it('exposes error message in non-production mode', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Debug info');
      const response = mapper.toResponse(error);

      expect(response.error.message).toBe('Debug info');

      process.env.NODE_ENV = prev;
    });
  });
});
