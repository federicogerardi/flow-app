import { describe, it, expect } from 'vitest';
import { MembershipStatus, InvalidMembershipStatusError } from '../value-objects/MembershipStatus';

describe('MembershipStatus', () => {
  describe('static instances', () => {
    it('should expose Invited', () => {
      expect(MembershipStatus.Invited.value).toBe('invited');
    });

    it('should expose Active', () => {
      expect(MembershipStatus.Active.value).toBe('active');
    });
  });

  describe('from', () => {
    it('should return Invited for "invited"', () => {
      expect(MembershipStatus.from('invited')).toBe(MembershipStatus.Invited);
    });

    it('should return Active for "active"', () => {
      expect(MembershipStatus.from('active')).toBe(MembershipStatus.Active);
    });

    it('should throw InvalidMembershipStatusError for invalid value', () => {
      expect(() => MembershipStatus.from('invalid')).toThrow(InvalidMembershipStatusError);
    });
  });

  describe('isPending', () => {
    it('should return true for Invited', () => {
      expect(MembershipStatus.Invited.isPending).toBe(true);
    });

    it('should return false for Active', () => {
      expect(MembershipStatus.Active.isPending).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true for Active', () => {
      expect(MembershipStatus.Active.isActive).toBe(true);
    });

    it('should return false for Invited', () => {
      expect(MembershipStatus.Invited.isActive).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(MembershipStatus.Invited.equals(MembershipStatus.Invited)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(MembershipStatus.Invited.equals(MembershipStatus.Active)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(MembershipStatus.Invited.toString()).toBe('invited');
    });
  });
});
