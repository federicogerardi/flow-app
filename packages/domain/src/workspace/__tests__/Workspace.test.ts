import { describe, it, expect } from 'vitest';
import { Workspace } from '../entities/Workspace';
import { MembershipRole } from '../value-objects/MembershipRole';
import { MembershipStatus } from '../value-objects/MembershipStatus';
import { WorkspaceMembership, CannotAssignOwnerRoleError } from '../entities/WorkspaceMembership';
import {
  NotWorkspaceOwnerError,
  NotAWorkspaceMemberError,
  MemberAlreadyExistsError,
  CannotRemoveOwnerError,
  NotAnActiveMemberError,
} from '../errors';
import { DomainError } from '../../shared/domain-error';

describe('Workspace', () => {
  const ownerId = 'owner-1';
  const memberId = 'member-1';
  const outsiderId = 'outsider-1';

  function createWorkspace(): Workspace {
    return Workspace.create('Test Workspace', ownerId);
  }

  function createWorkspaceWithEditor(): { workspace: Workspace; editorId: string } {
    const workspace = createWorkspace();
    workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
    workspace.acceptInvitation(memberId);
    return { workspace, editorId: memberId };
  }

  describe('create', () => {
    it('should initialize with owner membership', () => {
      const workspace = createWorkspace();

      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.isOwner(ownerId)).toBe(true);
      expect(workspace.isMember(ownerId)).toBe(true);
      expect(workspace.memberships).toHaveLength(1);
      expect(workspace.version).toBe(1);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const now = new Date();
      const ownerMembership = WorkspaceMembership.reconstitute(
        ownerId,
        'ws-1',
        MembershipRole.Owner,
        MembershipStatus.Active,
        ownerId,
        now,
        now,
      );
      const workspace = Workspace.reconstitute('ws-1', ownerId, 'My Workspace', now, now, 5, [ownerMembership]);

      expect(workspace.name).toBe('My Workspace');
      expect(workspace.version).toBe(5);
      expect(workspace.memberships).toHaveLength(1);
    });
  });

  describe('inviteMember', () => {
    it('should add invited membership and return MemberInvited event', () => {
      const workspace = createWorkspace();
      const event = workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);

      expect(event.eventType).toBe('MemberInvited');
      expect(event.aggregateId).toBe(workspace.workspaceId);
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(workspace.memberships).toHaveLength(2);
    });

    it('should throw NotWorkspaceOwnerError if caller is not owner', () => {
      const workspace = createWorkspace();

      expect(() =>
        workspace.inviteMember(memberId, MembershipRole.Editor, outsiderId),
      ).toThrow(NotWorkspaceOwnerError);
    });

    it('should throw MemberAlreadyExistsError on duplicate userId', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);

      expect(() =>
        workspace.inviteMember(memberId, MembershipRole.Viewer, ownerId),
      ).toThrow(MemberAlreadyExistsError);
    });
  });

  describe('acceptInvitation', () => {
    it('should transition invited member to active', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      const event = workspace.acceptInvitation(memberId);

      expect(event.eventType).toBe('MemberJoined');
      expect(workspace.isMember(memberId)).toBe(true);
    });

    it('should throw NotAWorkspaceMemberError if userId has no pending invitation', () => {
      const workspace = createWorkspace();

      expect(() => workspace.acceptInvitation(outsiderId)).toThrow(NotAWorkspaceMemberError);
    });
  });

  describe('removeMember', () => {
    it('should remove an active member', () => {
      const { workspace } = createWorkspaceWithEditor();
      const event = workspace.removeMember(memberId, ownerId);

      expect(event.eventType).toBe('MemberRemoved');
      expect(workspace.isMember(memberId)).toBe(false);
      expect(workspace.memberships).toHaveLength(1);
    });

    it('should throw CannotRemoveOwnerError if target is the owner', () => {
      const workspace = createWorkspace();

      expect(() => workspace.removeMember(ownerId, ownerId)).toThrow(CannotRemoveOwnerError);
    });

    it('should throw NotWorkspaceOwnerError if caller is not owner', () => {
      const { workspace } = createWorkspaceWithEditor();

      expect(() => workspace.removeMember(ownerId, memberId)).toThrow(NotWorkspaceOwnerError);
    });
  });

  describe('transferOwnership', () => {
    it('should swap roles atomically', () => {
      const { workspace } = createWorkspaceWithEditor();
      const event = workspace.transferOwnership(ownerId, memberId);

      expect(event.eventType).toBe('OwnershipTransferred');
      expect(workspace.isOwner(memberId)).toBe(true);
      expect(workspace.isOwner(ownerId)).toBe(false);
      expect(workspace.getMemberRole(ownerId)?.equals(MembershipRole.Editor)).toBe(true);
    });

    it('should throw NotWorkspaceOwnerError if caller is not owner', () => {
      const { workspace } = createWorkspaceWithEditor();

      expect(() => workspace.transferOwnership(memberId, ownerId)).toThrow(NotWorkspaceOwnerError);
    });

    it('should throw NotAnActiveMemberError if target is not an active member', () => {
      const workspace = createWorkspace();

      expect(() => workspace.transferOwnership(ownerId, outsiderId)).toThrow(NotAnActiveMemberError);
    });
  });

  describe('changeMemberRole', () => {
    it('should update the member role', () => {
      const { workspace } = createWorkspaceWithEditor();
      workspace.changeMemberRole(memberId, MembershipRole.Viewer, ownerId);

      expect(workspace.getMemberRole(memberId)?.equals(MembershipRole.Viewer)).toBe(true);
    });

    it('should throw NotWorkspaceOwnerError if caller is not owner', () => {
      const { workspace } = createWorkspaceWithEditor();

      expect(() =>
        workspace.changeMemberRole(memberId, MembershipRole.Viewer, memberId),
      ).toThrow(NotWorkspaceOwnerError);
    });

    it('should throw when assigning owner role to a member', () => {
      const { workspace } = createWorkspaceWithEditor();

      expect(() =>
        workspace.changeMemberRole(memberId, MembershipRole.Owner, ownerId),
      ).toThrow(CannotAssignOwnerRoleError);
    });
  });

  describe('isOwner', () => {
    it('should return true for owner', () => {
      const workspace = createWorkspace();
      expect(workspace.isOwner(ownerId)).toBe(true);
    });

    it('should return false for non-owner', () => {
      const workspace = createWorkspace();
      expect(workspace.isOwner(outsiderId)).toBe(false);
    });
  });

  describe('isMember', () => {
    it('should return true for active member', () => {
      const { workspace } = createWorkspaceWithEditor();
      expect(workspace.isMember(memberId)).toBe(true);
    });

    it('should return false for non-member', () => {
      const workspace = createWorkspace();
      expect(workspace.isMember(outsiderId)).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('should return true for owner', () => {
      const workspace = createWorkspace();
      expect(workspace.canEdit(ownerId)).toBe(true);
    });

    it('should return true for editor', () => {
      const { workspace } = createWorkspaceWithEditor();
      expect(workspace.canEdit(memberId)).toBe(true);
    });

    it('should return false for viewer', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Viewer, ownerId);
      workspace.acceptInvitation(memberId);
      expect(workspace.canEdit(memberId)).toBe(false);
    });
  });

  describe('canView', () => {
    it('should return true for any active member', () => {
      const { workspace } = createWorkspaceWithEditor();
      expect(workspace.canView(ownerId)).toBe(true);
      expect(workspace.canView(memberId)).toBe(true);
    });

    it('should return false for non-member', () => {
      const workspace = createWorkspace();
      expect(workspace.canView(outsiderId)).toBe(false);
    });
  });

  describe('getMemberRole', () => {
    it('should return correct role for active member', () => {
      const { workspace } = createWorkspaceWithEditor();
      expect(workspace.getMemberRole(memberId)?.equals(MembershipRole.Editor)).toBe(true);
    });

    it('should return null for non-member', () => {
      const workspace = createWorkspace();
      expect(workspace.getMemberRole(outsiderId)).toBeNull();
    });
  });

  describe('memberships', () => {
    it('should return ReadonlyArray', () => {
      const workspace = createWorkspace();
      const memberships = workspace.memberships;
      expect(memberships).toHaveLength(1);
    });
  });

  describe('version', () => {
    it('should increment on inviteMember', () => {
      const workspace = createWorkspace();
      const v1 = workspace.version;
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      expect(workspace.version).toBe(v1 + 1);
    });

    it('should increment on acceptInvitation', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      const vBefore = workspace.version;
      workspace.acceptInvitation(memberId);
      expect(workspace.version).toBe(vBefore + 1);
    });

    it('should increment on removeMember', () => {
      const { workspace } = createWorkspaceWithEditor();
      const vBefore = workspace.version;
      workspace.removeMember(memberId, ownerId);
      expect(workspace.version).toBe(vBefore + 1);
    });

    it('should increment on transferOwnership', () => {
      const { workspace } = createWorkspaceWithEditor();
      const vBefore = workspace.version;
      workspace.transferOwnership(ownerId, memberId);
      expect(workspace.version).toBe(vBefore + 1);
    });

    it('should increment on changeMemberRole', () => {
      const { workspace } = createWorkspaceWithEditor();
      const vBefore = workspace.version;
      workspace.changeMemberRole(memberId, MembershipRole.Viewer, ownerId);
      expect(workspace.version).toBe(vBefore + 1);
    });
  });
});
