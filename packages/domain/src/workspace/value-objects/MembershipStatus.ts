import { DomainError } from '../../shared/domain-error';

export class InvalidMembershipStatusError extends DomainError {
  readonly code = 'INVALID_MEMBERSHIP_STATUS';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid MembershipStatus: "${value}". Expected "invited" or "active".`);
  }
}

export class MembershipStatus {
  private static readonly VALID = new Set<string>(['invited', 'active']);

  private constructor(private readonly _value: 'invited' | 'active') {}

  static readonly Invited = new MembershipStatus('invited');
  static readonly Active = new MembershipStatus('active');

  static from(value: string): MembershipStatus {
    if (!MembershipStatus.VALID.has(value)) {
      throw new InvalidMembershipStatusError(value);
    }
    return value === 'invited' ? MembershipStatus.Invited : MembershipStatus.Active;
  }

  get value(): string {
    return this._value;
  }

  get isPending(): boolean {
    return this._value === 'invited';
  }

  get isActive(): boolean {
    return this._value === 'active';
  }

  equals(other: MembershipStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type MembershipStatusValue = 'invited' | 'active';
