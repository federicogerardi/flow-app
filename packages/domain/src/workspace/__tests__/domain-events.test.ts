import { describe, it, expect } from 'vitest';
import { Workspace } from '../entities/Workspace';
import { MembershipRole } from '../value-objects/MembershipRole';
import type { DomainEvent } from '../../shared/domain-event';

describe('Workspace domain events', () => {
  const ownerId = 'owner-1';
  const memberId = 'member-1';

  function createWorkspace(): Workspace {
    return Workspace.create('Test Workspace', ownerId);
  }

  function isValidDomainEvent(event: DomainEvent): boolean {
    return (
      typeof event.eventType === 'string' &&
      event.occurredAt instanceof Date &&
      typeof event.aggregateId === 'string'
    );
  }

  describe('inviteMember', () => {
    it('should return MemberInvited event conforming to DomainEvent', () => {
      const workspace = createWorkspace();
      const event = workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('MemberInvited');
      expect(event.aggregateId).toBe(workspace.workspaceId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('acceptInvitation', () => {
    it('should return MemberJoined event conforming to DomainEvent', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      const event = workspace.acceptInvitation(memberId);

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('MemberJoined');
      expect(event.aggregateId).toBe(workspace.workspaceId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('removeMember', () => {
    it('should return MemberRemoved event conforming to DomainEvent', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      workspace.acceptInvitation(memberId);
      const event = workspace.removeMember(memberId, ownerId);

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('MemberRemoved');
      expect(event.aggregateId).toBe(workspace.workspaceId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('transferOwnership', () => {
    it('should return OwnershipTransferred event conforming to DomainEvent', () => {
      const workspace = createWorkspace();
      workspace.inviteMember(memberId, MembershipRole.Editor, ownerId);
      workspace.acceptInvitation(memberId);
      const event = workspace.transferOwnership(ownerId, memberId);

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('OwnershipTransferred');
      expect(event.aggregateId).toBe(workspace.workspaceId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });
});
