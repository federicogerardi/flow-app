import { randomUUID } from '../../shared/random-uuid';
import type { DomainEvent } from '../../shared/domain-event';
import { MembershipRole } from '../value-objects/MembershipRole';
import { MembershipStatus } from '../value-objects/MembershipStatus';
import { WorkspaceMembership } from './WorkspaceMembership';
import { Asset } from './Asset';
import { AssetType } from '../value-objects/AssetType';
import {
  NotWorkspaceOwnerError,
  NotAWorkspaceMemberError,
  MemberAlreadyExistsError,
  CannotRemoveOwnerError,
  NotAnActiveMemberError,
} from '../errors';

export class Workspace {
  private _memberships: WorkspaceMembership[];
  private _assets: Asset[];
  private _version: number;

  private constructor(
    readonly workspaceId: string,
    readonly createdBy: string,
    private _name: string,
    private _accentColor: string,
    readonly createdAt: Date,
    private _updatedAt: Date,
    version: number,
    memberships: WorkspaceMembership[],
    assets: Asset[] = [],
  ) {
    this._version = version;
    this._memberships = memberships;
    this._assets = assets;
  }

  static create(name: string, createdBy: string, accentColor?: string): Workspace {
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
    return new Workspace(workspaceId, createdBy, name, accentColor ?? '#2563eb', now, now, 1, [ownerMembership]);
  }

  static reconstitute(
    workspaceId: string,
    createdBy: string,
    name: string,
    accentColor: string,
    createdAt: Date,
    updatedAt: Date,
    version: number,
    memberships: WorkspaceMembership[],
    assets?: Asset[],
  ): Workspace {
    return new Workspace(workspaceId, createdBy, name, accentColor, createdAt, updatedAt, version, memberships, assets);
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

  get assets(): ReadonlyArray<Asset> {
    return this._assets;
  }

  addAsset(asset: Asset): void {
    this._assets.push(asset);
    this._version++;
  }

  getAssetsByType(assetType: AssetType): Asset[] {
    return this._assets.filter((a) => a.assetType.equals(assetType));
  }

  /** @deprecated Use getAssetsByType() — returns first match only */
  getAssetByType(assetType: AssetType): Asset | null {
    return this._assets.find((a) => a.assetType.equals(assetType)) ?? null;
  }

  rename(newName: string, userId: string): void {
    this.assertIsOwner(userId);
    const trimmed = newName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw new Error('Workspace name must be between 2 and 50 characters');
    }
    this._name = trimmed;
    this._updatedAt = new Date();
    this._version++;
  }

  changeAccentColor(newColor: string, userId: string): void {
    this.assertIsOwner(userId);
    this._accentColor = newColor;
    this._updatedAt = new Date();
    this._version++;
  }

  get accentColor(): string {
    return this._accentColor;
  }

  private assertIsOwner(userId: string): void {
    if (!this.isOwner(userId)) {
      throw new NotWorkspaceOwnerError(userId, this.workspaceId);
    }
  }
}
