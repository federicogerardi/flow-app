export class ConcurrencyError extends Error {
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
    this.name = 'ConcurrencyError';
  }
}
