import { DomainError } from './domain-error';

/** Thrown when required infrastructure is unavailable (e.g. REDIS_URL not set, DB connection refused). */
export class InfrastructureError extends DomainError {
  readonly code = 'INFRASTRUCTURE_UNAVAILABLE';
  readonly retryable = true;
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when environment configuration is invalid at startup. */
export class ConfigurationError extends DomainError {
  readonly code = 'INVALID_CONFIGURATION';
  readonly retryable = false;
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when an unreachable code path is entered (should never happen). */
export class UnreachableError extends DomainError {
  readonly code = 'SYSTEM_UNREACHABLE';
  readonly retryable = false;
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when a required implementation is not yet provided (stub/placeholder). */
export class NotImplementedError extends DomainError {
  readonly code = 'NOT_IMPLEMENTED';
  readonly retryable = false;
  constructor(message: string) {
    super(message);
  }
}