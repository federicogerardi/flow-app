---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-07-30
source_count: 5
confidence: high
---

# Auth Middleware

> JWT authentication, role-based guards, CSRF protection  
> `apps/backend/src/middleware/auth.ts`

## Architecture

Authentication is a **cross-cutting concern** — middleware verifies the token and attaches user context to the request. The [[Auth Dependencies]] bounded context owns the `User` aggregate; the middleware just validates claims.

## Token Flow

Token flow, JWT strategy, and refresh mechanics are owned by [[Auth Dependencies]]. See [[Auth Dependencies#Strategy JWT + Refresh Tokens]] for the full specification.

---

## JWT Middleware

```typescript
// apps/backend/src/middleware/auth.ts

import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;     // userId
  email: string;
  role: 'admin' | 'member';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token', retryable: true }
    });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired', retryable: true }
    });
  }
}
```

---

## Role Guard

```typescript
function requireRole(...roles: ('admin' | 'member')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', retryable: true } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions', retryable: false } });
      return;
    }

    next();
  };
}
```

---

## CSRF Protection

Fail-closed: server refuses to start if CSRF config is missing.

```typescript
import csrf from('csrf');

const tokens = new csrf();

function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next(); // safe methods
  }

  const secret = req.cookies?.['csrf-secret'];
  const token  = req.headers['x-csrf-token'] as string;

  if (!secret || !token || !tokens.verify(secret, token)) {
    res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token', retryable: false } });
    return;
  }

  next();
}

// Startup invariant
function validateCsrfConfig(): void {
  if (!process.env.CSRF_SECRET) {
    throw new Error('FATAL: CSRF_SECRET not set. Server refuses to start.');
  }
}
```

---

## Refresh Token

```typescript
// POST /auth/refresh
router.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token', retryable: true } });
  }

  const session = await authRepo.findByRefreshToken(refreshToken);
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired', retryable: false } });
  }

  const accessToken = jwt.sign(
    { sub: session.userId, email: session.email, role: session.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  res.json({ accessToken });
});
```

---

## Route Protection

```typescript
// apps/backend/src/routes/index.ts

import { authenticate, requireRole } from '../middleware/auth';

// Public
router.get('/health', healthHandler);
router.post('/auth/login', loginHandler);
router.post('/auth/register', registerHandler);

// Authenticated
router.use('/api', authenticate);
router.get('/api/workspaces', listWorkspaces);
router.post('/api/tools/:toolKey/sessions', startSession);

// Admin only
router.use('/admin', authenticate, requireRole('admin'));
router.get('/admin/users', listUsers);
router.get('/admin/models', listModels);
```

## Sources

- [[Auth Dependencies]] — Passport.js, bcrypt, Helmet stack
- [[User]] — aggregate root in Identity & Access
- [[API Routes]] — route protection
- [[sources/PRD]] — FR-S01 to FR-S06
- [[synthesis/phase-8-real-auth-plan]] — Implementation plan for Phase 8 auth middleware