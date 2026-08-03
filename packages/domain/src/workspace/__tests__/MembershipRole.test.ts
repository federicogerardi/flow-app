import { describe, it, expect } from 'vitest';
import { MembershipRole, InvalidMembershipRoleError } from '../value-objects/MembershipRole';

describe('MembershipRole', () => {
  describe('static instances', () => {
    it('should expose Owner', () => {
      expect(MembershipRole.Owner.value).toBe('owner');
    });

    it('should expose Editor', () => {
      expect(MembershipRole.Editor.value).toBe('editor');
    });

    it('should expose Viewer', () => {
      expect(MembershipRole.Viewer.value).toBe('viewer');
    });
  });

  describe('from', () => {
    it('should return Owner for "owner"', () => {
      expect(MembershipRole.from('owner')).toBe(MembershipRole.Owner);
    });

    it('should return Editor for "editor"', () => {
      expect(MembershipRole.from('editor')).toBe(MembershipRole.Editor);
    });

    it('should return Viewer for "viewer"', () => {
      expect(MembershipRole.from('viewer')).toBe(MembershipRole.Viewer);
    });

    it('should throw InvalidMembershipRoleError for invalid value', () => {
      expect(() => MembershipRole.from('invalid')).toThrow(InvalidMembershipRoleError);
    });
  });

  describe('isOwner', () => {
    it('should return true for Owner', () => {
      expect(MembershipRole.Owner.isOwner).toBe(true);
    });

    it('should return false for Editor', () => {
      expect(MembershipRole.Editor.isOwner).toBe(false);
    });

    it('should return false for Viewer', () => {
      expect(MembershipRole.Viewer.isOwner).toBe(false);
    });
  });

  describe('isEditor', () => {
    it('should return true for Editor', () => {
      expect(MembershipRole.Editor.isEditor).toBe(true);
    });

    it('should return false for Owner', () => {
      expect(MembershipRole.Owner.isEditor).toBe(false);
    });

    it('should return false for Viewer', () => {
      expect(MembershipRole.Viewer.isEditor).toBe(false);
    });
  });

  describe('isViewer', () => {
    it('should return true for Viewer', () => {
      expect(MembershipRole.Viewer.isViewer).toBe(true);
    });

    it('should return false for Owner', () => {
      expect(MembershipRole.Owner.isViewer).toBe(false);
    });

    it('should return false for Editor', () => {
      expect(MembershipRole.Editor.isViewer).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(MembershipRole.Owner.equals(MembershipRole.Owner)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(MembershipRole.Owner.equals(MembershipRole.Editor)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(MembershipRole.Owner.toString()).toBe('owner');
    });
  });
});
