import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserDisabledError,
  InvalidRefreshTokenError,
  type UserRepository,
  type PasswordHasher,
  type AuthSession,
  type User,
} from '@flow-app/domain';
import type { TokenService } from '../../../infrastructure/token-service.js';
import { AuthService } from '../auth-service.js';

function createTokenService() {
  return {
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    refreshTokenExpiry: vi.fn(),
    accessTokenExpirySeconds: 900,
  } as unknown as TokenService;
}

function createUserRepo() {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    save: vi.fn(),
    saveAuthSession: vi.fn(),
    findByRefreshToken: vi.fn(),
    deleteAuthSession: vi.fn(),
    deleteAllAuthSessionsForUser: vi.fn(),
    saveOAuthAccount: vi.fn(),
    findByOAuth: vi.fn(),
  } as unknown as UserRepository;
}

function createHasher() {
  return {
    hash: vi.fn(),
    verify: vi.fn(),
  } as PasswordHasher;
}

function createUser(overrides: Partial<{ id: string; email: string; role: string; isActive: boolean }> = {}): User {
  return {
    id: overrides.id ?? 'user-1',
    email: { toString: () => overrides.email ?? 'test@example.com' },
    role: { toString: () => overrides.role ?? 'member' },
    isActive: overrides.isActive ?? true,
    verifyPassword: vi.fn(),
  } as unknown as User;
}

describe('AuthService', () => {
  let userRepo: UserRepository;
  let hasher: PasswordHasher;
  let tokenService: TokenService;
  let authService: AuthService;

  beforeEach(() => {
    userRepo = createUserRepo();
    hasher = createHasher();
    tokenService = createTokenService();
    authService = new AuthService(userRepo, hasher, tokenService);

    vi.mocked(tokenService.generateAccessToken).mockReturnValue('access-token-jwt');
    vi.mocked(tokenService.generateRefreshToken).mockResolvedValue('a'.repeat(64));
    vi.mocked(tokenService.refreshTokenExpiry).mockReturnValue(new Date('2026-08-11T00:00:00Z'));
    vi.mocked(hasher.hash).mockResolvedValue('hashed-password');
    vi.mocked(hasher.verify).mockResolvedValue(true);
  });

  describe('register', () => {
    it('returns user + tokens on successful registration', async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
      const result = await authService.register('test@example.com', 'secure123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('member');
      expect(result.accessToken).toBe('access-token-jwt');
      expect(result.refreshToken).toBe('a'.repeat(64));
      expect(result.expiresIn).toBe(900);
      expect(hasher.hash).toHaveBeenCalledWith('secure123');
      expect(userRepo.save).toHaveBeenCalled();
      expect(userRepo.saveAuthSession).toHaveBeenCalled();
    });

    it('throws UserAlreadyExistsError for duplicate email', async () => {
      const existing = createUser({ email: 'test@example.com' });
      vi.mocked(userRepo.findByEmail).mockResolvedValue(existing);

      await expect(authService.register('test@example.com', 'secure123'))
        .rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const user = createUser({ id: 'user-2', email: 'dev@flow.com', isActive: true });
      vi.mocked(userRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(user.verifyPassword).mockResolvedValue(true);

      const result = await authService.login('dev@flow.com', 'correct-password');

      expect(result.user.id).toBe('user-2');
      expect(result.accessToken).toBe('access-token-jwt');
      expect(result.refreshToken).toBe('a'.repeat(64));
      expect(user.verifyPassword).toHaveBeenCalledWith('correct-password', hasher);
    });

    it('throws InvalidCredentialsError for wrong password', async () => {
      const user = createUser({ isActive: true });
      vi.mocked(userRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(user.verifyPassword).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrong'))
        .rejects.toThrow(InvalidCredentialsError);
    });

    it('throws InvalidCredentialsError when user does not exist', async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);

      await expect(authService.login('ghost@flow.com', 'pw'))
        .rejects.toThrow(InvalidCredentialsError);
    });

    it('throws UserDisabledError for disabled user', async () => {
      const disabled = createUser({ isActive: false });
      vi.mocked(userRepo.findByEmail).mockResolvedValue(disabled);

      await expect(authService.login('disabled@flow.com', 'pw'))
        .rejects.toThrow(UserDisabledError);
    });
  });

  describe('refresh', () => {
    it('rotates session and returns new tokens', async () => {
      const session: AuthSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'a'.repeat(64),
        expiresAt: new Date('2026-08-11T00:00:00Z'),
        createdAt: new Date('2026-08-04T00:00:00Z'),
      };
      const user = createUser({ isActive: true });
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(session);
      vi.mocked(userRepo.findById).mockResolvedValue(user);

      const result = await authService.refresh('a'.repeat(64));

      expect(userRepo.deleteAuthSession).toHaveBeenCalledWith('session-1');
      expect(userRepo.findById).toHaveBeenCalledWith('user-1');
      expect(result.accessToken).toBe('access-token-jwt');
      expect(result.refreshToken).toBe('a'.repeat(64));
    });

    it('throws InvalidRefreshTokenError for invalid token', async () => {
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(null);

      await expect(authService.refresh('dead-token'))
        .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws InvalidRefreshTokenError if user is disabled after session exists', async () => {
      const session: AuthSession = {
        id: 'session-2',
        userId: 'user-1',
        refreshToken: 'b'.repeat(64),
        expiresAt: new Date('2026-08-11T00:00:00Z'),
        createdAt: new Date('2026-08-04T00:00:00Z'),
      };
      const disabledUser = createUser({ isActive: false });
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(session);
      vi.mocked(userRepo.findById).mockResolvedValue(disabledUser);

      await expect(authService.refresh('b'.repeat(64)))
        .rejects.toThrow(InvalidRefreshTokenError);
      expect(userRepo.deleteAuthSession).toHaveBeenCalledWith('session-2');
    });

    it('throws InvalidRefreshTokenError if user not found', async () => {
      const session: AuthSession = {
        id: 'session-3',
        userId: 'user-1',
        refreshToken: 'c'.repeat(64),
        expiresAt: new Date('2026-08-11T00:00:00Z'),
        createdAt: new Date('2026-08-04T00:00:00Z'),
      };
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(session);
      vi.mocked(userRepo.findById).mockResolvedValue(null);

      await expect(authService.refresh('c'.repeat(64)))
        .rejects.toThrow(InvalidRefreshTokenError);
      expect(userRepo.deleteAuthSession).toHaveBeenCalledWith('session-3');
    });
  });

  describe('logout', () => {
    it('deletes session when token is valid', async () => {
      const session: AuthSession = {
        id: 'session-10',
        userId: 'user-1',
        refreshToken: 'd'.repeat(64),
        expiresAt: new Date('2026-08-11T00:00:00Z'),
        createdAt: new Date('2026-08-04T00:00:00Z'),
      };
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(session);

      await authService.logout('d'.repeat(64));

      expect(userRepo.deleteAuthSession).toHaveBeenCalledWith('session-10');
    });

    it('is a no-op when token is not found', async () => {
      vi.mocked(userRepo.findByRefreshToken).mockResolvedValue(null);

      await authService.logout('unknown-token');

      expect(userRepo.deleteAuthSession).not.toHaveBeenCalled();
    });
  });
});
