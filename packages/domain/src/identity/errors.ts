import { DomainError } from '../shared/domain-error';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly retryable = false;
  constructor() {
    super('Invalid email or password');
  }
}

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'CONFLICT';
  readonly retryable = false;
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

export class UserDisabledError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly retryable = false;
  constructor(userId: string) {
    super(`User ${userId} is disabled`);
  }
}

export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly retryable = false;
  constructor() {
    super('Refresh token is expired or revoked');
  }
}
