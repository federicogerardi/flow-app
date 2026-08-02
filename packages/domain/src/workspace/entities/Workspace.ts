import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '../../shared/domain-event';
import { MembershipRole } from '../value-objects/MembershipRole';
import { MembershipStatus } from '../value-objects/MembershipStatus';
import { WorkspaceMembership } from './WorkspaceMembership';
import {
  NotWorkspaceOwnerError,
  NotAWorkspaceMemberError,
  MemberAlreadyExistsError,
  CannotRemoveOwnerError,
  NotAnActiveMemberError,
} from '../errors';

export class Workspace {
  private _memberships: WorkspaceMembership[];
  private _version: number;

  private constructor(
    readonly workspaceId: string,
    readonly createdBy: string,
    private _name: string,
    readonly createdAt: Date,
    private _updatedAt: Date,
    version: number,
    memberships: WorkspaceMembership[],
  ) {
    this._version = version;
    this._memberships = memberships;
  }

  static create(name: string, createdBy: string): Workspace {
    const workspaceId = randomUUID();
    const now = new Date();
    const ownerMembership = WorkspaceMembership.reconstitute(
      createdBy,
      workspaceId,
      MembershipRole.Owner,
      MembershipStatus.Active,
      createdBy,
      now,
      now,
    );
    return new Workspace(workspaceId, createdBy, name, now, now, 1, [ownerMembership]);
  }

  static reconstitute(
    workspaceId: string,
    createdBy: string,
    name: string,
    createdAt: Date,
    updatedAt: Date,
    version: number,
    memberships: WorkspaceMembership[],
  ): Workspace {
    return new Workspace(workspaceId, createdBy, name, createdAt, updatedAt, version, memberships);
  }

  inviteMember(userId: string, role: MembershipRole, invitedBy: string): DomainEvent {
    this.assertIsOwner(invitedBy);
    if (this._memberships.some((m) => m.userId === userId)) {
      throw new MemberAlreadyExistsError(userId, this.workspaceId);
    }
    const membership = WorkspaceMembership.invite(userId, this.workspaceId, role, invitedBy);
    this._memberships.push(membership);
    this._version++;
    return {
      eventType: 'MemberInvited',
      occurredAt: new Date(),
      aggregateId: this.workspaceId,
    };
  }

  acceptInvitation(userId: string): DomainEvent {
    const idx = this._memberships.findIndex(
      (m) => m.userId === userId && m.status.isPending,
    );
    if (idx === -1) throw new NotAWorkspaceMemberError(userId, this.workspaceId);
    this._memberships[idx] = this._memberships[idx].accept();
    this._version++;
    return {
      eventType: 'MemberJoined',
      occurredAt: new Date(),
      aggregateId: this.workspaceId,
    };
  }

  removeMember(userId: string, removedBy: string): DomainEvent {
    this.assertIsOwner(removedBy);
    if (this.isOwner(userId)) throw new CannotRemoveOwnerError();
    this._memberships = this._memberships.filter((m) => m.userId !== userId);
    this._version++;
    return {
      eventType: 'MemberRemoved',
      occurredAt: new Date(),
      aggregateId: this.workspaceId,
    };
  }

  transferOwnership(from: string, to: string): DomainEvent {
    this.assertIsOwner(from);
    const newOwner = this._memberships.find((m) => m.userId === to && m.isActive);
    if (!newOwner) throw new NotAnActiveMemberError(to, this.workspaceId);
    const currentOwner = this._memberships.find((m) => m.userId === from);
    if (currentOwner) currentOwner.changeRole(MembershipRole.Editor);
    newOwner._setRoleAsOwner();
    this._version++;
    return {
      eventType: 'OwnershipTransferred',
      occurredAt: new Date(),
      aggregateId: this.workspaceId,
    };
  }

  changeMemberRole(userId: string, newRole: MembershipRole, changedBy: string): void {
    this.assertIsOwner(changedBy);
    const member = this._memberships.find((m) => m.userId === userId && m.isActive);
    if (!member) throw new NotAWorkspaceMemberError(userId, this.workspaceId);
    member.changeRole(newRole);
    this._version++;
  }

  isOwner(userId: string): boolean {
    return this._memberships.some((m) => m.userId === userId && m.isOwner);
  }

  isMember(userId: string): boolean {
    return this._memberships.some((m) => m.userId === userId && m.isActive);
  }

  getMemberRole(userId: string): MembershipRole | null {
    return this._memberships.find((m) => m.userId === userId && m.isActive)?.role ?? null;
  }

  canEdit(userId: string): boolean {
    const role = this.getMemberRole(userId);
    return role?.isOwner === true || role?.isEditor === true;
  }

  canView(userId: string): boolean {
    return this.isMember(userId);
  }

  get name(): string {
    return this._name;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get version(): number {
    return this._version;
  }

  get memberships(): ReadonlyArray<WorkspaceMembership> {
    return this._memberships;
  }

  private assertIsOwner(userId: string): void {
    if (!this.isOwner(userId)) {
      throw new NotWorkspaceOwnerError(userId, this.workspaceId);
    }
  }
}
