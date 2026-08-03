import { DomainError } from '../../shared/domain-error';

export class InvalidTransactionReasonError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid transaction reason: ${value}`);
  }
}

export class TransactionReason {
  private constructor(private readonly _value: 'generation' | 'admin_grant' | 'purchase' | 'plan_upgrade') {}

  static readonly Generation = new TransactionReason('generation');
  static readonly AdminGrant = new TransactionReason('admin_grant');
  static readonly Purchase = new TransactionReason('purchase');
  static readonly PlanUpgrade = new TransactionReason('plan_upgrade');

  static from(value: string): TransactionReason {
    switch (value) {
      case 'generation':
        return TransactionReason.Generation;
      case 'admin_grant':
        return TransactionReason.AdminGrant;
      case 'purchase':
        return TransactionReason.Purchase;
      case 'plan_upgrade':
        return TransactionReason.PlanUpgrade;
      default:
        throw new InvalidTransactionReasonError(value);
    }
  }

  equals(other: TransactionReason): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): string {
    return this._value;
  }
}
