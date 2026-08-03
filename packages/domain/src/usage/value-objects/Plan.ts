import { DomainError } from '../../shared/domain-error';

export class InvalidPlanTypeError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid plan type: ${value}`);
  }
}

export class PlanType {
  private constructor(private readonly _value: 'free') {}

  static readonly Free = new PlanType('free');

  static from(value: string): PlanType {
    switch (value) {
      case 'free':
        return PlanType.Free;
      default:
        throw new InvalidPlanTypeError(value);
    }
  }

  equals(other: PlanType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type PlanTypeValue = 'free';

interface PlanConfig {
  type: PlanTypeValue;
  artifactLimit: number;
  creditLimit: number;
  features: string[];
}

const PLANS: Record<string, PlanConfig> = {
  free: { type: 'free', artifactLimit: 1000, creditLimit: 250, features: ['basic_tools'] },
};

export class Plan {
  private constructor(private readonly config: PlanConfig) {}

  static free(): Plan {
    return new Plan(PLANS.free);
  }

  static fromType(type: PlanType): Plan {
    return new Plan(PLANS[type.toString()]);
  }

  get artifactLimit(): number {
    return this.config.artifactLimit;
  }

  get creditLimit(): number {
    return this.config.creditLimit;
  }

  get type(): PlanType {
    return PlanType.from(this.config.type);
  }
}

export class InvalidCreditAmountError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(message: string) {
    super(message);
  }
}

export class CreditAmount {
  private constructor(private readonly _value: number) {}

  static from(value: number): CreditAmount {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidCreditAmountError(`Credit amount must be a non-negative integer, got ${value}`);
    }
    return new CreditAmount(value);
  }

  equals(other: CreditAmount): boolean {
    return this._value === other._value;
  }

  toValue(): number {
    return this._value;
  }
}
