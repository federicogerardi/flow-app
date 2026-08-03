import { describe, it, expect } from 'vitest';
import { DomainError } from '../domain-error';
import { ConcurrencyError } from '../concurrency-error';

describe('DomainError', () => {
  it('subclass sets name to constructor name', () => {
    const err = new ConcurrencyError('res-1', 1, 2);
    expect(err.name).toBe('ConcurrencyError');
  });

  it('message is accessible', () => {
    const err = new ConcurrencyError('res-1', 1, 2);
    expect(err.message).toContain('res-1');
  });

  it('is an instance of DomainError', () => {
    const err = new ConcurrencyError('res-1', 1, 2);
    expect(err).toBeInstanceOf(DomainError);
  });
});

describe('ConcurrencyError', () => {
  it('has code CONFLICT', () => {
    const err = new ConcurrencyError('res-1', 1, 2);
    expect(err.code).toBe('CONFLICT');
  });

  it('has retryable true', () => {
    const err = new ConcurrencyError('res-1', 1, 2);
    expect(err.retryable).toBe(true);
  });

  it('message contains resourceId', () => {
    const err = new ConcurrencyError('workspace-42', 3, 7);
    expect(err.message).toContain('workspace-42');
    expect(err.message).toContain('v3');
    expect(err.message).toContain('v7');
  });

  it('exposes constructor params', () => {
    const err = new ConcurrencyError('res-99', 5, 10);
    expect(err.resourceId).toBe('res-99');
    expect(err.expectedVersion).toBe(5);
    expect(err.actualVersion).toBe(10);
  });
});
