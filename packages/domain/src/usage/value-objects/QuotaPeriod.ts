import { DomainError } from '../../shared/domain-error';

export class InvalidQuotaPeriodError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid quota period: ${value}. Expected format YYYY-MM`);
  }
}

export class QuotaPeriod {
  private constructor(private readonly _value: string) {}

  static from(value: string): QuotaPeriod {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new InvalidQuotaPeriodError(value);
    }
    return new QuotaPeriod(value);
  }

  static current(): QuotaPeriod {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return new QuotaPeriod(`${year}-${month}`);
  }

  equals(other: QuotaPeriod): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
