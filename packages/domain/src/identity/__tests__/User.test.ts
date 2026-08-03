import { describe, it, expect } from 'vitest';
import { User } from '../User';
import { Email } from '../value-objects/Email';
import { UserRole } from '../value-objects/UserRole';
import { UserStatus } from '../value-objects/UserStatus';

describe('User', () => {
  describe('create()', () => {
    it('sets role to Member and status to Active', () => {
      const user = User.create(Email.create('test@example.com'));
      expect(user.role).toBe(UserRole.Member);
      expect(user.isActive).toBe(true);
      expect(user.status).toBe(UserStatus.Active);
    });

    it('stores passwordHash when provided', () => {
      const user = User.create(Email.create('test@example.com'), { passwordHash: 'hash123' });
      expect(user.passwordHash).toBe('hash123');
    });

    it('defaults passwordHash to null', () => {
      const user = User.create(Email.create('test@example.com'));
      expect(user.passwordHash).toBeNull();
    });

    it('generates a unique id', () => {
      const a = User.create(Email.create('a@example.com'));
      const b = User.create(Email.create('b@example.com'));
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('reconstitute()', () => {
    it('pass-through all props', () => {
      const email = Email.create('test@example.com');
      const now = new Date();
      const user = User.reconstitute({
        id: 'custom-id',
        email,
        passwordHash: 'hash',
        role: UserRole.Admin,
        status: UserStatus.Disabled,
        createdAt: now,
        updatedAt: now,
      });
      expect(user.id).toBe('custom-id');
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBe('hash');
      expect(user.role).toBe(UserRole.Admin);
      expect(user.status).toBe(UserStatus.Disabled);
    });
  });

  describe('disable() / enable()', () => {
    it('disable() sets status to Disabled', () => {
      const user = User.create(Email.create('test@example.com'));
      expect(user.isActive).toBe(true);
      user.disable();
      expect(user.isActive).toBe(false);
      expect(user.status).toBe(UserStatus.Disabled);
    });

    it('enable() sets status back to Active', () => {
      const user = User.create(Email.create('test@example.com'));
      user.disable();
      expect(user.isActive).toBe(false);
      user.enable();
      expect(user.isActive).toBe(true);
      expect(user.status).toBe(UserStatus.Active);
    });
  });

  describe('verifyPassword()', () => {
    it('returns false when passwordHash is null', async () => {
      const user = User.create(Email.create('test@example.com'));
      const hasher = { hash: async (p: string) => p, verify: async () => true };
      expect(await user.verifyPassword('pass', hasher)).toBe(false);
    });

    it('delegates to hasher.verify when hash exists', async () => {
      const user = User.create(Email.create('test@example.com'), { passwordHash: 'stored-hash' });
      const hasher = {
        hash: async (p: string) => p,
        verify: async (plain: string, hash: string) => plain === 'correct' && hash === 'stored-hash',
      };
      expect(await user.verifyPassword('correct', hasher)).toBe(true);
      expect(await user.verifyPassword('wrong', hasher)).toBe(false);
    });
  });
});
