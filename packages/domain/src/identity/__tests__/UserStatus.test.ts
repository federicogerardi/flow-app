import { describe, it, expect } from 'vitest';
import { UserStatus, InvalidUserStatusError } from '../value-objects/UserStatus';

describe('UserStatus', () => {
  it('has Active and Disabled static instances', () => {
    expect(UserStatus.Active).toBeDefined();
    expect(UserStatus.Disabled).toBeDefined();
  });

  it('from("active") returns Active', () => {
    expect(UserStatus.from('active')).toBe(UserStatus.Active);
  });

  it('from("disabled") returns Disabled', () => {
    expect(UserStatus.from('disabled')).toBe(UserStatus.Disabled);
  });

  it('from("invalid") throws InvalidUserStatusError', () => {
    expect(() => UserStatus.from('invalid')).toThrow(InvalidUserStatusError);
  });

  it('isActive returns true for Active', () => {
    expect(UserStatus.Active.isActive).toBe(true);
    expect(UserStatus.Disabled.isActive).toBe(false);
  });

  it('isDisabled returns true for Disabled', () => {
    expect(UserStatus.Disabled.isDisabled).toBe(true);
    expect(UserStatus.Active.isDisabled).toBe(false);
  });

  it('equals() returns true for same status', () => {
    expect(UserStatus.Active.equals(UserStatus.from('active'))).toBe(true);
  });

  it('equals() returns false for different statuses', () => {
    expect(UserStatus.Active.equals(UserStatus.Disabled)).toBe(false);
  });

  it('toString() returns the status value', () => {
    expect(UserStatus.Active.toString()).toBe('active');
    expect(UserStatus.Disabled.toString()).toBe('disabled');
  });
});
