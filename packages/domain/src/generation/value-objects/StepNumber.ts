import { DomainError } from '../../shared/domain-error';

export class StepNumber {
  private constructor(readonly value: number) {
    if (value < 1) {
      throw new InvalidStepNumberError(value);
    }
  }

  static of(value: number): StepNumber {
    return new StepNumber(value);
  }

  equals(other: StepNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

export class InvalidStepNumberError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: number) {
    super(`StepNumber must be >= 1, got ${value}`);
  }
}
