export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
