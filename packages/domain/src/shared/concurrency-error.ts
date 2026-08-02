import { DomainError } from './domain-error';

export class ConcurrencyError extends DomainError {
  readonly code = 'CONFLICT';
  readonly retryable = true;

  constructor(
    readonly resourceId: string,
    readonly expectedVersion: number,
    readonly actualVersion: number,
  ) {
    super(
      `Resource ${resourceId} modified by another actor (expected v${expectedVersion}, actual v${actualVersion})`,
    );
  }
}
