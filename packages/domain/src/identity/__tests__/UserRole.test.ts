import { describe, it, expect } from 'vitest';
import { UserRole, InvalidUserRoleError } from '../value-objects/UserRole';

describe('UserRole', () => {
  it('has Admin and Member static instances', () => {
    expect(UserRole.Admin).toBeDefined();
    expect(UserRole.Member).toBeDefined();
  });

  it('from("admin") returns Admin', () => {
    expect(UserRole.from('admin')).toBe(UserRole.Admin);
  });

  it('from("member") returns Member', () => {
    expect(UserRole.from('member')).toBe(UserRole.Member);
  });

  it('from("invalid") throws InvalidUserRoleError', () => {
    expect(() => UserRole.from('invalid')).toThrow(InvalidUserRoleError);
  });

  it('equals() returns true for same role', () => {
    expect(UserRole.Admin.equals(UserRole.from('admin'))).toBe(true);
  });

  it('equals() returns false for different roles', () => {
    expect(UserRole.Admin.equals(UserRole.Member)).toBe(false);
  });

  it('toString() returns the role value', () => {
    expect(UserRole.Admin.toString()).toBe('admin');
    expect(UserRole.Member.toString()).toBe('member');
  });

  it('canManageWorkspace() returns true for Admin', () => {
    expect(UserRole.Admin.canManageWorkspace()).toBe(true);
  });

  it('canManageWorkspace() returns false for Member', () => {
    expect(UserRole.Member.canManageWorkspace()).toBe(false);
  });
});
