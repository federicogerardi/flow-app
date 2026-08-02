import { DomainError } from '../../shared/domain-error';

export type MembershipRoleValue = 'owner' | 'editor' | 'viewer';

export class MembershipRole {
  private constructor(private readonly _value: MembershipRoleValue) {}

  static readonly Owner = new MembershipRole('owner');
  static readonly Editor = new MembershipRole('editor');
  static readonly Viewer = new MembershipRole('viewer');

  static from(value: string): MembershipRole {
    switch (value) {
      case 'owner': return MembershipRole.Owner;
      case 'editor': return MembershipRole.Editor;
      case 'viewer': return MembershipRole.Viewer;
      default:
        throw new InvalidMembershipRoleError(value);
    }
  }

  equals(other: MembershipRole): boolean {
    return this._value === other._value;
  }

  toString(): MembershipRoleValue {
    return this._value;
  }

  get value(): MembershipRoleValue {
    return this._value;
  }

  get isOwner(): boolean { return this._value === 'owner'; }
  get isEditor(): boolean { return this._value === 'editor'; }
  get isViewer(): boolean { return this._value === 'viewer'; }
}

export class InvalidMembershipRoleError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid MembershipRole: ${value}`);
  }
}
