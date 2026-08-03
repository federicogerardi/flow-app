import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { TokenService } from '../token-service.js';
import { UserRole } from '@flow-app/domain';
import type { User } from '@flow-app/domain';

function createUser(overrides: Partial<{ id: string; email: string; role: string }> = {}): User {
  return {
    id: overrides.id ?? 'user-1',
    email: { toString: () => overrides.email ?? 'test@example.com' },
    role: { toString: () => overrides.role ?? 'member' },
  } as unknown as User;
}

const JWT_SECRET = 'a'.repeat(32);
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRY_SEC = 7 * 24 * 60 * 60;

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService(JWT_SECRET, JWT_EXPIRES_IN, REFRESH_EXPIRY_SEC);
  });

  describe('generateAccessToken', () => {
    it('returns a JWT with sub, email, role claims', () => {
      const user = createUser({ id: 'user-1', email: 'test@test.com', role: 'admin' });
      const token = service.generateAccessToken(user);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('admin');
      expect(decoded.exp).toBeDefined();
    });

    it('signs with HS256 algorithm', () => {
      const user = createUser();
      const token = service.generateAccessToken(user);

      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.alg).toBe('HS256');
    });
  });

  describe('verifyAccessToken', () => {
    it('returns payload for a valid token', () => {
      const user = createUser();
      const token = service.generateAccessToken(user);
      const payload = service.verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe('user-1');
      expect(payload!.email).toBe('test@example.com');
    });

    it('returns null for an expired token', async () => {
      const expiredService = new TokenService(JWT_SECRET, '0s', REFRESH_EXPIRY_SEC);
      const user = createUser();
      const token = expiredService.generateAccessToken(user);

      // Defer slightly to ensure expiry passes
      await new Promise((resolve) => setTimeout(resolve, 5));

      const payload = service.verifyAccessToken(token);
      expect(payload).toBeNull();
    });

    it('returns null for a tampered token', () => {
      const user = createUser();
      const token = service.generateAccessToken(user);
      const tampered = token.slice(0, -5) + 'xxxxx';

      const payload = service.verifyAccessToken(tampered);
      expect(payload).toBeNull();
    });

    it('returns null for a token signed with a different secret', () => {
      const otherService = new TokenService('different-secret-key-32chars!!', JWT_EXPIRES_IN, REFRESH_EXPIRY_SEC);
      const user = createUser();
      const token = otherService.generateAccessToken(user);

      const payload = service.verifyAccessToken(token);
      expect(payload).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('returns a 64-character hex string', async () => {
      const token = await service.generateRefreshToken();

      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', async () => {
      const a = await service.generateRefreshToken();
      const b = await service.generateRefreshToken();

      expect(a).not.toBe(b);
    });
  });

  describe('refreshTokenExpiry', () => {
    it('returns a date 7 days in the future', () => {
      const before = Date.now();
      const expiry = service.refreshTokenExpiry();
      const after = Date.now();

      expect(expiry.getTime()).toBeGreaterThan(before);
      expect(expiry.getTime()).toBeLessThan(after + REFRESH_EXPIRY_SEC * 1000 + 100);
    });
  });

  describe('accessTokenExpirySeconds', () => {
    it('returns a positive integer', () => {
      expect(service.accessTokenExpirySeconds).toBe(15 * 60);
      expect(Number.isInteger(service.accessTokenExpirySeconds)).toBe(true);
      expect(service.accessTokenExpirySeconds).toBeGreaterThan(0);
    });
  });
});
