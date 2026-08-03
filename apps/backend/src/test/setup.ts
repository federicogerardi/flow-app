import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long-for-ci';
process.env.CSRF_SECRET = 'test-csrf-secret-16';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://flow_app:flow_app@localhost:5432/flow_app';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function createMockTokenService() {
  return {
    generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    verifyAccessToken: vi.fn().mockReturnValue(null),
    generateRefreshToken: vi.fn().mockReturnValue('a'.repeat(64)),
    refreshTokenExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    accessTokenExpirySeconds: vi.fn().mockReturnValue(900),
  };
}

export function createMockLlmGateway() {
  return {
    complete: vi.fn().mockResolvedValue({
      content: 'Mock LLM response',
      model: 'mock-model',
      tokensUsed: 100,
    }),
  };
}

export function createMockEventBridge() {
  return {
    publish: vi.fn(),
    subscribe: vi.fn(),
  };
}

export function createMockQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJobCounts: vi.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}
