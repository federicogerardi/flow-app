import { MembershipRole } from '../value-objects/MembershipRole';
import type { MembershipStatus } from '../value-objects/MembershipStatus';
import { DomainError } from '../../shared/domain-error';

export class WorkspaceMembership {
  private constructor(
    readonly userId: string,
    readonly workspaceId: string,
    private _role: MembershipRole,
    private _status: MembershipStatus,
    readonly invitedBy: string,
    readonly invitedAt: Date,
    readonly joinedAt: Date | null,
  ) {}

  static invite(
    userId: string,
    workspaceId: string,
    role: MembershipRole,
    invitedBy: string,
  ): WorkspaceMembership {
    if (role.isOwner) {
      throw new CannotInviteAsOwnerError();
    }
    return new WorkspaceMembership(
      userId,
      workspaceId,
      role,
      'invited',
      invitedBy,
      new Date(),
      null,
    );
  }

  static reconstitute(
    userId: string,
    workspaceId: string,
    role: MembershipRole,
    status: MembershipStatus,
    invitedBy: string,
    invitedAt: Date,
    joinedAt: Date | null,
  ): WorkspaceMembership {
    return new WorkspaceMembership(userId, workspaceId, role, status, invitedBy, invitedAt, joinedAt);
  }

  accept(): WorkspaceMembership {
    if (this._status !== 'invited') {
      throw new InvalidMembershipAcceptError(this._status);
    }
    return new WorkspaceMembership(
      this.userId,
      this.workspaceId,
      this._role,
      'active',
      this.invitedBy,
      this.invitedAt,
      new Date(),
    );
  }

  changeRole(newRole: MembershipRole): void {
    if (newRole.isOwner) {
      throw new CannotAssignOwnerRoleError();
    }
    this._role = newRole;
  }

  /**
   * Internal: set role to owner during ownership transfer.
   * Only the Workspace aggregate root should call this.
   */
  _setRoleAsOwner(): void {
    this._role = MembershipRole.Owner;
  }

  get role(): MembershipRole {
    return this._role;
  }

  get status(): MembershipStatus {
    return this._status;
  }

  get isActive(): boolean {
    return this._status === 'active';
  }

  get isOwner(): boolean {
    return this._role.isOwner && this.isActive;
  }
}

export class CannotInviteAsOwnerError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Cannot invite a user as owner. Use transferOwnership().');
  }
}

export class InvalidMembershipAcceptError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(currentStatus: string) {
    super(`Cannot accept: membership is ${currentStatus}, expected invited`);
  }
}

export class CannotAssignOwnerRoleError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Cannot assign owner role via changeRole(). Use transferOwnership().');
  }
}
