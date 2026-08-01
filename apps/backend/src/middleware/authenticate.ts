import type { Request, Response, NextFunction } from 'express';
import type { TokenService } from '../infrastructure/token-service.js';
import { setAuthUser } from './auth-types.js';

export function authenticate(tokenService: TokenService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'MISSING_TOKEN', message: 'Authorization header required', retryable: false },
      });
      return;
    }

    const token = header.slice(7);
    const payload = tokenService.verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid', retryable: false },
      });
      return;
    }

    setAuthUser(req, {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    next();
  };
}

export function authenticateOrDev(tokenService: TokenService, devAuthMiddleware: (req: Request, res: Response, next: NextFunction) => void) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.headers.authorization) {
      return authenticate(tokenService)(req, res, next);
    }
    devAuthMiddleware(req, res, next);
  };
}
