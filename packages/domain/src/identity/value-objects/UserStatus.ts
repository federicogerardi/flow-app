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
        throw new Error(`Invalid UserStatus: ${value}`);
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
