import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { createAuthRoutes } from '../auth/auth-routes.js';

const mockAuthResult = {
  user: { id: 'user-1', email: 'test@test.com', role: 'member' },
  accessToken: 'token-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
};

function createMockAuthService() {
  return {
    register: vi.fn().mockResolvedValue(mockAuthResult),
    login: vi.fn().mockResolvedValue(mockAuthResult),
    refresh: vi.fn().mockResolvedValue(mockAuthResult),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockTokenService() {
  return {
    generateAccessToken: vi.fn().mockReturnValue('mock-token'),
    verifyAccessToken: vi.fn().mockReturnValue(null),
    generateRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
    refreshTokenExpiry: vi.fn().mockReturnValue(new Date()),
    accessTokenExpirySeconds: 900,
  };
}

describe('Auth Routes (HTTP)', () => {
  let app: express.Express;
  let authService: ReturnType<typeof createMockAuthService>;
  let tokenService: ReturnType<typeof createMockTokenService>;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    authService = createMockAuthService();
    tokenService = createMockTokenService();

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use((req, _res, next) => {
      (req as Record<string, unknown>).log = { info: vi.fn(), error: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) };
      next();
    });

    const router = createAuthRoutes(authService, tokenService, 900_000, 100);
    app.use('/api/auth', router);

    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: err.message, retryable: false },
      });
    });

    request = supertest(app);
  });

  describe('POST /api/auth/register', () => {
    it('should return 201 with user and accessToken', async () => {
      const res = await request
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual(mockAuthResult.user);
      expect(res.body.accessToken).toBe(mockAuthResult.accessToken);
      expect(res.body.expiresIn).toBe(mockAuthResult.expiresIn);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 422 on invalid email', async () => {
      const res = await request
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 on missing password', async () => {
      const res = await request
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 with accessToken', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockAuthResult.user);
      expect(res.body.accessToken).toBe(mockAuthResult.accessToken);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 when authService.login throws', async () => {
      authService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      const res = await request
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 200 with new token when refresh cookie is present', async () => {
      const res = await request
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=refresh-1');

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe(mockAuthResult.accessToken);
      expect(res.body.expiresIn).toBe(mockAuthResult.expiresIn);
    });

    it('should return 401 without refresh cookie', async () => {
      const res = await request
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 and clear cookie', async () => {
      const res = await request
        .post('/api/auth/logout')
        .set('Cookie', 'refresh_token=refresh-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
    });

    it('should return 200 even without refresh cookie', async () => {
      const res = await request
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 200 with user when req.user is set', async () => {
      const authUser = { sub: 'user-1', email: 'test@test.com', role: 'member' };

      app.use('/api/auth2', (req, _res, next) => {
        (req as Record<string, unknown>).user = authUser;
        next();
      });

      const router2 = createAuthRoutes(authService, tokenService, 900_000, 100);
      app.use('/api/auth2', router2);

      const res = await request.get('/api/auth2/me');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('user-1');
      expect(res.body.email).toBe('test@test.com');
      expect(res.body.role).toBe('member');
    });

    it('should return 401 when req.user is not set', async () => {
      const res = await request.get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
