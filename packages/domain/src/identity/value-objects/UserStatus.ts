import { DomainError } from '../../shared/domain-error';

export type UserStatusValue = 'active' | 'disabled';

export class UserStatus {
  private constructor(private readonly _value: UserStatusValue) {}

  static readonly Active = new UserStatus('active');
  static readonly Disabled = new UserStatus('disabled');

  static from(value: string): UserStatus {
    switch (value) {
      case 'active':
        return UserStatus.Active;
      case 'disabled':
        return UserStatus.Disabled;
      default:
        throw new InvalidUserStatusError(value);
    }
  }

  isActive(): boolean {
    return this._value === 'active';
  }

  equals(other: UserStatus): boolean {
    return this._value === other._value;
  }

  toString(): UserStatusValue {
    return this._value;
  }

  get value(): UserStatusValue {
    return this._value;
  }
}

export class InvalidUserStatusError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid UserStatus: ${value}`);
  }
}
