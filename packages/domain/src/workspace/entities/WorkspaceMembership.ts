import type { MembershipRole } from '../value-objects/MembershipRole';
import type { MembershipStatus } from '../value-objects/MembershipStatus';

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
    if (role === 'owner') {
      throw new Error('Cannot invite a user as owner. Use transferOwnership().');
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
      throw new Error(`Cannot accept: membership is ${this._status}, expected invited`);
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
    if (newRole === 'owner') {
      throw new Error('Cannot assign owner role via changeRole(). Use transferOwnership().');
    }
    this._role = newRole;
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
    return this._role === 'owner' && this.isActive;
  }
}
