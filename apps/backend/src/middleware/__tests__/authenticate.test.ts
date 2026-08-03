import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { TokenService } from '../../infrastructure/token-service.js';
import { authenticate, authenticateOrDev } from '../authenticate.js';

function createMocks() {
  const req = {
    headers: {} as Record<string, string | undefined>,
  } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

function createTokenService() {
  return {
    verifyAccessToken: vi.fn(),
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    refreshTokenExpiry: vi.fn(),
    accessTokenExpirySeconds: 0,
  } as unknown as TokenService;
}

describe('authenticate', () => {
  let tokenService: TokenService;
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    tokenService = createTokenService();
    const mocks = createMocks();
    req = mocks.req;
    res = mocks.res;
    next = mocks.next;
  });

  it('returns 401 MISSING_TOKEN when Authorization header is missing', () => {
    const middleware = authenticate(tokenService);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'MISSING_TOKEN', message: 'Authorization header required', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 MISSING_TOKEN when Authorization header is not Bearer', () => {
    req.headers.authorization = 'Basic dXNlcjpwYXNz';
    const middleware = authenticate(tokenService);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'MISSING_TOKEN', message: 'Authorization header required', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_TOKEN when token is expired or invalid', () => {
    req.headers.authorization = 'Bearer expired.token.here';
    vi.mocked(tokenService.verifyAccessToken).mockReturnValue(null);
    const middleware = authenticate(tokenService);

    middleware(req, res, next);

    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('expired.token.here');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets authUser when token is valid', () => {
    req.headers.authorization = 'Bearer valid.token.here';
    const payload = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    vi.mocked(tokenService.verifyAccessToken).mockReturnValue(payload);
    const middleware = authenticate(tokenService);

    middleware(req, res, next);

    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid.token.here');
    expect((req as Record<string, unknown>).user).toEqual(payload);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe('authenticateOrDev', () => {
  it('uses real auth when Authorization header is present', () => {
    const tokenService = createTokenService();
    const payload = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    vi.mocked(tokenService.verifyAccessToken).mockReturnValue(payload);
    const devMiddleware = vi.fn();
    const { req, res, next } = createMocks();
    req.headers.authorization = 'Bearer real.token';
    const middleware = authenticateOrDev(tokenService, devMiddleware);

    middleware(req, res, next);

    expect((req as Record<string, unknown>).user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(devMiddleware).not.toHaveBeenCalled();
  });

  it('falls back to dev auth when Authorization header is absent', () => {
    const tokenService = createTokenService();
    const devMiddleware = vi.fn((_req, _res, _next) => _next());
    const { req, res, next } = createMocks();
    const middleware = authenticateOrDev(tokenService, devMiddleware);

    middleware(req, res, next);

    expect(devMiddleware).toHaveBeenCalledWith(req, res, next);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });
});
