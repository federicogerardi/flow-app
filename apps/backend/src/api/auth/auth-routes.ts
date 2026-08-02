import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import passport from 'passport';
import type { AuthService, AuthResult } from './auth-service.js';
import type { TokenService } from '../../infrastructure/token-service.js';
import { createAuthRateLimiter } from '../../middleware/auth-rate-limit.js';
import { getAuthUser } from '../../middleware/auth-types.js';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export function createAuthRoutes(
  authService: AuthService,
  _tokenService: TokenService,
  authRateLimitWindowMs: number,
  authRateLimitMaxAttempts: number,
) {
  const router = Router();
  const loginRateLimiter = createAuthRateLimiter(authRateLimitWindowMs, authRateLimitMaxAttempts);

  // POST /api/auth/register
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = registerSchema.safeParse(req.body);
      if (!body.success) {
        res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
            retryable: false,
          },
        });
        return;
      }

      const result = await authService.register(body.data.email, body.data.password);

      res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTIONS);
      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return next(err);
    }
  });

  // POST /api/auth/login
  router.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.safeParse(req.body);
      if (!body.success) {
        res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
            retryable: false,
          },
        });
        return;
      }

      const result = await authService.login(body.data.email, body.data.password);

      res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return next(err);
    }
  });

  // POST /api/auth/refresh
  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (!refreshToken) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token required',
            retryable: false,
          },
        });
        return;
      }

      const result = await authService.refresh(refreshToken);

      res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return next(err);
    }
  });

  // POST /api/auth/logout
  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      res.json({ message: 'Logged out' });
    } catch (err) {
      return next(err);
    }
  });

  // GET /api/auth/me
  router.get('/me', async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    res.json({
      id: user.sub,
      email: user.email,
      role: user.role,
    });
  });

  // GET /api/auth/google
  router.get('/google', (req: Request, res: Response, next) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Google OAuth is not configured',
          retryable: false,
        },
      });
      return;
    }
    passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, next);
  });

  // GET /api/auth/google/callback
  router.get('/google/callback', (req: Request, res: Response, next) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Google OAuth is not configured',
          retryable: false,
        },
      });
      return;
    }

    passport.authenticate('google', { session: false }, (err: Error | null, authResult: AuthResult | false) => {
      if (err || !authResult) {
        const frontendUrl = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
        res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        return;
      }

      res.cookie(REFRESH_COOKIE, authResult.refreshToken, REFRESH_COOKIE_OPTIONS);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      const frontendUrl = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${authResult.accessToken}&expiresIn=${authResult.expiresIn}`,
      );
    })(req, res, next);
  });

  return router;
}
