import { DomainError } from '../../shared/domain-error';

export type UserRoleValue = 'admin' | 'member';

export class UserRole {
  private constructor(private readonly _value: UserRoleValue) {}

  static readonly Admin = new UserRole('admin');
  static readonly Member = new UserRole('member');

  static from(value: string): UserRole {
    switch (value) {
      case 'admin':
        return UserRole.Admin;
      case 'member':
        return UserRole.Member;
      default:
        throw new InvalidUserRoleError(value);
    }
  }

  canManageWorkspace(): boolean {
    return this._value === 'admin';
  }

  equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  toString(): UserRoleValue {
    return this._value;
  }

  get value(): UserRoleValue {
    return this._value;
  }
}

export class InvalidUserRoleError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid UserRole: ${value}`);
  }
}
