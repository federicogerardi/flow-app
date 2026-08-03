import { describe, it, expect } from 'vitest';
import {
  WorkspaceMembership,
  CannotInviteAsOwnerError,
  InvalidMembershipAcceptError,
  CannotAssignOwnerRoleError,
} from '../entities/WorkspaceMembership';
import { MembershipRole } from '../value-objects/MembershipRole';
import { MembershipStatus } from '../value-objects/MembershipStatus';

describe('WorkspaceMembership', () => {
  const userId = 'user-1';
  const workspaceId = 'ws-1';
  const invitedBy = 'owner-1';

  describe('invite', () => {
    it('should create an invited membership with correct role', () => {
      const membership = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);

      expect(membership.userId).toBe(userId);
      expect(membership.workspaceId).toBe(workspaceId);
      expect(membership.role.equals(MembershipRole.Editor)).toBe(true);
      expect(membership.status.equals(MembershipStatus.Invited)).toBe(true);
      expect(membership.invitedBy).toBe(invitedBy);
      expect(membership.invitedAt).toBeInstanceOf(Date);
      expect(membership.joinedAt).toBeNull();
    });

    it('should throw CannotInviteAsOwnerError when role is Owner', () => {
      expect(() =>
        WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Owner, invitedBy),
      ).toThrow(CannotInviteAsOwnerError);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const invitedAt = new Date('2026-01-01');
      const joinedAt = new Date('2026-01-02');
      const membership = WorkspaceMembership.reconstitute(
        userId,
        workspaceId,
        MembershipRole.Viewer,
        MembershipStatus.Active,
        invitedBy,
        invitedAt,
        joinedAt,
      );

      expect(membership.userId).toBe(userId);
      expect(membership.workspaceId).toBe(workspaceId);
      expect(membership.role.equals(MembershipRole.Viewer)).toBe(true);
      expect(membership.status.equals(MembershipStatus.Active)).toBe(true);
      expect(membership.invitedBy).toBe(invitedBy);
      expect(membership.invitedAt).toBe(invitedAt);
      expect(membership.joinedAt).toBe(joinedAt);
    });
  });

  describe('accept', () => {
    it('should transition to active and return new instance', () => {
      const invited = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      const accepted = invited.accept();

      expect(accepted.status.equals(MembershipStatus.Active)).toBe(true);
      expect(accepted.joinedAt).toBeInstanceOf(Date);
      expect(accepted.role.equals(MembershipRole.Editor)).toBe(true);
    });

    it('should throw InvalidMembershipAcceptError on already-active membership', () => {
      const invited = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      const accepted = invited.accept();

      expect(() => accepted.accept()).toThrow(InvalidMembershipAcceptError);
    });
  });

  describe('changeRole', () => {
    it('should update the role', () => {
      const membership = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Viewer, invitedBy);
      membership.changeRole(MembershipRole.Editor);

      expect(membership.role.equals(MembershipRole.Editor)).toBe(true);
    });

    it('should throw CannotAssignOwnerRoleError when changing to Owner', () => {
      const membership = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);

      expect(() => membership.changeRole(MembershipRole.Owner)).toThrow(CannotAssignOwnerRoleError);
    });
  });

  describe('_setRoleAsOwner', () => {
    it('should set role to Owner', () => {
      const membership = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      membership._setRoleAsOwner();

      expect(membership.role.equals(MembershipRole.Owner)).toBe(true);
    });
  });

  describe('isActive', () => {
    it('should return false for invited membership', () => {
      const membership = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      expect(membership.isActive).toBe(false);
    });

    it('should return true for accepted membership', () => {
      const invited = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      const accepted = invited.accept();
      expect(accepted.isActive).toBe(true);
    });
  });

  describe('isOwner', () => {
    it('should return false when role is Owner but status is invited', () => {
      const membership = WorkspaceMembership.reconstitute(
        userId,
        workspaceId,
        MembershipRole.Owner,
        MembershipStatus.Invited,
        invitedBy,
        new Date(),
        null,
      );
      expect(membership.isOwner).toBe(false);
    });

    it('should return true when role is Owner and status is active', () => {
      const membership = WorkspaceMembership.reconstitute(
        userId,
        workspaceId,
        MembershipRole.Owner,
        MembershipStatus.Active,
        invitedBy,
        new Date(),
        new Date(),
      );
      expect(membership.isOwner).toBe(true);
    });

    it('should return false when role is Editor and status is active', () => {
      const invited = WorkspaceMembership.invite(userId, workspaceId, MembershipRole.Editor, invitedBy);
      const accepted = invited.accept();
      expect(accepted.isOwner).toBe(false);
    });
  });
});
