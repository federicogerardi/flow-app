import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { KyselyUserRepository } from '../repositories/user-repository.js';
import { User, Email, UserRole, UserStatus } from '@flow-app/domain';
import { createTestDb } from '../../test/setup.js';
import type { Kysely } from 'kysely';
import type { DB } from '../types.js';

describe('KyselyUserRepository', () => {
  let db: Kysely<DB>;
  let repo: KyselyUserRepository;

  beforeAll(async () => {
    db = createTestDb();
    repo = new KyselyUserRepository(db);
  });

  beforeEach(async () => {
    await db.deleteFrom('oauth_accounts').execute();
    await db.deleteFrom('auth_sessions').execute();
    await db.deleteFrom('users').where('email', '=', 'repo-test@example.com').execute();
  });

  describe('save() and findById()', () => {
    it('should insert and retrieve a user with all fields', async () => {
      const user = User.create(Email.create('repo-test@example.com'));
      await repo.save(user);

      const found = await repo.findById(user.id);
      expect(found).not.toBeNull();
      expect(found!.email.toString()).toBe('repo-test@example.com');
      expect(found!.role).toBe(UserRole.Member);
      expect(found!.status).toBe(UserStatus.Active);
    });
  });

  describe('findByEmail()', () => {
    it('should retrieve user by email (case-insensitive)', async () => {
      const user = User.create(Email.create('Repo-Test@Example.com'));
      await repo.save(user);

      const found = await repo.findByEmail('Repo-Test@Example.com');
      expect(found).not.toBeNull();
      expect(found!.email.toString()).toBe('repo-test@example.com');
    });

    it('should return null for unknown email', async () => {
      const found = await repo.findByEmail('nobody@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should return null for unknown user', async () => {
      const found = await repo.findById('ffffffff-ffff-ffff-ffff-ffffffffffff');
      expect(found).toBeNull();
    });
  });

  describe('saveAuthSession() and findByRefreshToken()', () => {
    it('should round-trip an auth session', async () => {
      const user = User.create(Email.create('repo-test@example.com'));
      await repo.save(user);

      const authSession = {
        id: '50000000-0000-0000-0000-000000000001',
        userId: user.id,
        refreshToken: '60000000-0000-0000-0000-000000000001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      await repo.saveAuthSession(authSession);

      const found = await repo.findByRefreshToken('60000000-0000-0000-0000-000000000001');
      expect(found).not.toBeNull();
      expect(found!.userId).toBe(user.id);
      expect(found!.refreshToken).toBe('60000000-0000-0000-0000-000000000001');
    });
  });

  describe('deleteAuthSession()', () => {
    it('should remove a single session', async () => {
      const user = User.create(Email.create('repo-test@example.com'));
      await repo.save(user);

      const authSession = {
        id: '50000000-0000-0000-0000-000000000001',
        userId: user.id,
        refreshToken: '60000000-0000-0000-0000-000000000001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      await repo.saveAuthSession(authSession);

      await repo.deleteAuthSession('50000000-0000-0000-0000-000000000001');

      const found = await repo.findByRefreshToken('60000000-0000-0000-0000-000000000001');
      expect(found).toBeNull();
    });
  });

  describe('deleteAllAuthSessionsForUser()', () => {
    it('should clear all sessions for a user', async () => {
      const user = User.create(Email.create('repo-test@example.com'));
      await repo.save(user);

      const session1 = {
        id: '50000000-0000-0000-0000-000000000001',
        userId: user.id,
        refreshToken: '60000000-0000-0000-0000-000000000001',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      const session2 = {
        id: '50000000-0000-0000-0000-000000000002',
        userId: user.id,
        refreshToken: '60000000-0000-0000-0000-000000000002',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      await repo.saveAuthSession(session1);
      await repo.saveAuthSession(session2);

      await repo.deleteAllAuthSessionsForUser(user.id);

      expect(await repo.findByRefreshToken('60000000-0000-0000-0000-000000000001')).toBeNull();
      expect(await repo.findByRefreshToken('60000000-0000-0000-0000-000000000002')).toBeNull();
    });
  });

  describe('saveOAuthAccount() and findByOAuth()', () => {
    it('should round-trip an OAuth account', async () => {
      const user = User.create(Email.create('repo-test@example.com'));
      await repo.save(user);

      const oauthAccount = {
        id: '70000000-0000-0000-0000-000000000001',
        userId: user.id,
        provider: 'google',
        providerId: 'google-12345',
        createdAt: new Date(),
      };
      await repo.saveOAuthAccount(oauthAccount);

      const found = await repo.findByOAuth('google', 'google-12345');
      expect(found).not.toBeNull();
      expect(found!.userId).toBe(user.id);
      expect(found!.provider).toBe('google');
      expect(found!.providerId).toBe('google-12345');
    });
  });
});
