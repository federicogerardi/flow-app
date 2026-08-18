---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-18
source_count: 5
confidence: high
---

# Auth Dependencies

> Context7-verified authentication and security stack for Flow App  
> `apps/backend/package.json`

## Principle

Authentication is standardized by Node.js ecosystem patterns. Passport.js is the industry standard for Express auth — modular, strategy-based, and eliminates 200+ lines of OAuth boilerplate. Security is layered: bcrypt for storage, Helmet for transport, rate limiting for abuse prevention.

---

## Dependencies

| Package | Context7 Library ID | Purpose |
|---------|-------------------|---------|
| `passport` | `/jaredhanson/passport` | Authentication middleware framework |
| `passport-local` | `/jaredhanson/passport-local` | Email/password strategy |
| `passport-google-oauth2` | `/jaredhanson/passport-google-oauth2` | Google OAuth 2.0 strategy |
| `passport-oauth2` | `/jaredhanson/passport-oauth2` | GitHub OAuth 2.0 strategy (generic OAuth2 base) |
| `bcrypt` | `/kelektiv/node.bcrypt.js` | Password hashing (salt rounds, timing-safe compare) |
| `helmet` | `/helmetjs/helmet` | HTTP security headers (11 headers, one line of middleware) |
| `express-rate-limit` | `/express-rate-limit/express-rate-limit` | Sliding-window rate limiting per IP |
| `jsonwebtoken` | *(existing)* | JWT sign/verify for access tokens |
| `csrf` | *(existing)* | CSRF token generation and verification |

### What we DON'T add

| ❌ Not added | Why |
|-------------|-----|
| `express-session` | JWT tokens + httpOnly cookies — no server-side session store needed |
| `connect-redis` | No server-side sessions — Redis already used for BullMQ + idempotency |
| `oauth2orize` | Passport handles OAuth server + client |
| `lock` / `passwordless` | Overengineering for our scale |

---

## Strategy: JWT + Refresh Tokens

```
Login (email/pw) ───▶ bcrypt.compare() ───▶ jwt.sign() ───▶ accessToken (15min) + refreshToken (7d, httpOnly cookie)
OAuth (Google)  ───▶ passport.authenticate('google') ───▶ same token flow
Every request   ───▶ Authorization: Bearer <accessToken> ───▶ jwt.verify() ───▶ req.user
Token expired   ───▶ POST /auth/refresh (reads httpOnly cookie) ───▶ new accessToken
Proactive refresh ──▶ setTimeout at 80% TTL (12 min) ───▶ silent POST /auth/refresh ───▶ new accessToken (no 401)
```

The refresh endpoint (`POST /api/auth/refresh`) returns `{ user, accessToken, expiresIn }` and rotates the refresh token (old session deleted, new one created). The `expiresIn` field enables the frontend to schedule the next silent refresh before the token expires — see [[#Frontend Proactive Refresh]].

### Frontend Proactive Refresh

**File**: `apps/frontend/src/auth/AuthContext.tsx`

The frontend uses `expiresIn` to schedule a silent refresh at **80% of the access token TTL** (12 minutes for the default 15m TTL). This eliminates the 401-then-refresh pattern: the token is refreshed before it ever expires.

```
scheduleProactiveRefresh(expiresIn)
  │
  └── setTimeout(() => attemptTokenRefresh(), expiresIn × 0.8 × 1000)
        │
        └── POST /api/auth/refresh → OK
              │
              ├── setAccessToken(newToken)
              └── scheduleProactiveRefresh(newExpiresIn)  // re-schedule recursively
```

**Key behaviors**:

- **Minimum clamp**: delay is clamped to ≥60 seconds to prevent tight loops on misconfigured TTLs
- **Timer cleanup**: `clearRefreshTimer()` on logout and before re-scheduling — no timer leaks
- **Dedup queue**: `attemptTokenRefresh()` uses a module-level `refreshPromise` singleton — concurrent 401s from the API client interceptor coalesce into a single `POST /api/auth/refresh` call
- **No proactive refresh on failure**: if mount refresh fails (no session), no timer is scheduled — the user sees the login page

**Net effect**: 0 requests hit the backend with an expired token during a single tab session. The 12×401 burst pattern (every 15 minutes, all SWR hooks fire before the refresh completes) is eliminated.

```typescript
// Module-level timer state (apps/frontend/src/auth/AuthContext.tsx)
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProactiveRefresh(expiresIn: number): void {
  clearRefreshTimer();
  const delay = Math.floor(expiresIn * 1000 * 0.8);
  const clamped = Math.max(delay, 60_000);  // minimum 60s
  refreshTimer = setTimeout(() => { attemptTokenRefresh(); }, clamped);
}
```

---

## Passport Configuration

```typescript
// apps/backend/src/auth/passport.ts

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '@flow-app/domain/identity';

// ──── Serialization ────

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as any).id);
});

passport.deserializeUser(async (id: string, done) => {
  const user = await userRepo.findById(UserId.from(id));
  done(null, user ?? undefined);
});

// ──── Local Strategy (email/password) ────

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    const user = await userRepo.findByEmail(Email.from(email));
    if (!user) return done(null, false, { message: 'Invalid credentials' });
    if (user.status === 'disabled') return done(null, false, { message: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.passwordHash!);
    if (!valid) return done(null, false, { message: 'Invalid credentials' });

    return done(null, user);
  }
));

// ──── Google OAuth Strategy ────

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    let user = await userRepo.findByOAuth('google', profile.id);

    if (!user) {
      user = await userRepo.save(User.create({
        email: Email.from(profile.emails![0].value),
        role: Role.Member,
      }));
      await userRepo.linkOAuth(user.userId, 'google', profile.id);
    }

    return done(null, user);
  }
));

// ──── GitHub OAuth Strategy ────

passport.use(new OAuth2Strategy(
  {
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL:         'https://github.com/login/oauth/access_token',
    clientID:         process.env.GITHUB_CLIENT_ID!,
    clientSecret:     process.env.GITHUB_CLIENT_SECRET!,
    callbackURL:      process.env.GITHUB_CALLBACK_URL!,
  },
  async (accessToken, _refreshToken, profile, done) => {
    // Similar flow to Google — find or create user
    const githubProfile = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json());

    let user = await userRepo.findByOAuth('github', githubProfile.id.toString());
    if (!user) {
      user = await userRepo.save(User.create({
        email: Email.from(githubProfile.email),
        role: Role.Member,
      }));
      await userRepo.linkOAuth(user.userId, 'github', githubProfile.id.toString());
    }

    return done(null, user);
  }
));
```

---

## Token Management

```typescript
// apps/backend/src/auth/tokens.ts

import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateTokens(user: User): TokenPair {
  const accessToken = jwt.sign(
    {
      sub: user.userId.value,
      email: user.email.value,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = randomBytes(48).toString('hex');

  return { accessToken, refreshToken };
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 3600 * 1000, // 7 days
    path: '/auth/refresh',
  });
}
```

---

## Password Hashing

```typescript
// apps/backend/src/auth/password.ts

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // ~250ms on modern hardware — good balance

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Why bcrypt, not argon2?**
- bcrypt is Context7-verified (`/kelektiv/node.bcrypt.js`)
- Argon2 is stronger but requires native bindings that complicate Railway deploys
- bcrypt with 12 rounds is sufficient for our threat model (B2B SaaS, not a password manager)

---

## Security Headers — Helmet

```typescript
// apps/backend/src/app.ts

import helmet from 'helmet';

// Default: 11 headers including CSP, HSTS, X-Frame-Options, etc.
app.use(helmet());

// Customize CSP for our needs
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'"],
    styleSrc:   ["'self'", "'unsafe-inline'"], // MUI requires inline styles
    imgSrc:     ["'self'", 'data:'],
    connectSrc: ["'self'"],  // SSE connections to same origin
  },
}));
```

---

## Rate Limiting

```typescript
// apps/backend/src/app.ts

import rateLimit from 'express-rate-limit';

// Global: 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60_000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests', retryable: true },
  },
}));

// Auth endpoints: stricter — 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 900_000,
  max:      5,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts', retryable: true },
  },
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
```

---

## Auth Routes

```typescript
// apps/backend/src/routes/auth.ts

import { Router } from 'express';
import passport from 'passport';
import { generateTokens, setRefreshCookie } from '../auth/tokens';
import { hashPassword } from '../auth/password';

const router = Router();

// Local login
router.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: info?.message ?? 'Invalid credentials', retryable: true },
    });

    const tokens = generateTokens(user);
    setRefreshCookie(res, tokens.refreshToken);

    res.json({
      user: { id: user.userId.value, email: user.email.value, role: user.role },
      accessToken: tokens.accessToken,
    });
  })(req, res, next);
});

// Register
router.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  const existing = await userRepo.findByEmail(Email.from(email));
  if (existing) return res.status(409).json({
    error: { code: 'EMAIL_EXISTS', message: 'Email already registered', retryable: false },
  });

  const passwordHash = await hashPassword(password);
  const user = await userRepo.save(User.create({ email: Email.from(email), passwordHash }));

  const tokens = generateTokens(user);
  setRefreshCookie(res, tokens.refreshToken);

  res.status(201).json({
    user: { id: user.userId.value, email: user.email.value, role: user.role },
    accessToken: tokens.accessToken,
  });
});

// OAuth — Google
router.get('/api/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/api/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const tokens = generateTokens(req.user as User);
  setRefreshCookie(res, tokens.refreshToken);
  res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?token=${tokens.accessToken}`);
});

// Refresh
router.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'No refresh token', retryable: true },
  });

  const session = await authRepo.findByRefreshToken(refreshToken);
  if (!session || session.expiresAt < new Date()) {
    res.clearCookie('refreshToken');
    return res.status(401).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Session expired', retryable: false },
    });
  }

  const user = await userRepo.findById(session.userId);
  const newTokens = generateTokens(user!);
  setRefreshCookie(res, newTokens.refreshToken);

  res.json({ accessToken: newTokens.accessToken });
});

// Logout
router.post('/api/auth/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await authRepo.deleteByRefreshToken(refreshToken);
  }
  res.clearCookie('refreshToken');
  res.status(204).send();
});

export { router as authRouter };
```

---

## Comparison: Before vs After

| Aspect | Without dedicated deps | With dedicated deps |
|--------|----------------------|---------------------|
| **OAuth flow** | Manual implementation (~150 loc) | Passport strategy (~30 loc each) |
| **Password hashing** | Manual (or missing) | bcrypt with 12 rounds |
| **Security headers** | None (or manual) | Helmet — 11 headers, 1 line |
| **Rate limiting** | Manual Redis counters | express-rate-limit middleware |
| **Strategy extensibility** | Rewrite auth for each provider | Add a Passport strategy module |
| **Industry alignment** | Custom, harder to audit | Standard, security-audited by community |

---

## Bounded Context: Auth Dependencies

The Auth Dependencies bounded context (`packages/domain/src/identity/`) provides user identity, authentication, and role-based access control. It is a generic subdomain — mostly off-the-shelf patterns (OAuth, JWT, RBAC).

**Aggregate Root**: [[User]] — an authenticated platform user with a role.

**Key concepts**:
- OAuth (Google, GitHub) + email/password
- JWT + refresh token session management
- RBAC: `admin` vs `member`
- Session listing and revocation

**Cross-context role**: all other contexts reference `UserId` (shared identifier). Auth Dependencies does not depend on any other context.

---

## Middleware Implementation

JWT authentication + role guard + CSRF (cross-cutting, `apps/backend/src/middleware/auth.ts`):

- **JWT middleware** (`authenticate`): verifies `Authorization: Bearer <token>`, attaches `JwtPayload { sub, email, role, iat, exp }` to `req.user`. Missing/invalid token → 401 `UNAUTHORIZED` / `TOKEN_EXPIRED`.
- **Role guard** (`requireRole(...roles)`): 401 if unauthenticated, 403 `FORBIDDEN` if `req.user.role` not in allowed roles.
- **CSRF** (fail-closed): safe methods (`GET`/`HEAD`/`OPTIONS`) bypass; otherwise verifies `x-csrf-token` against the `csrf-secret` cookie → 403 `CSRF_INVALID`. Server refuses to start if `CSRF_SECRET` is missing.
- **Route protection**: public routes (`/health`, `/api/auth/*`) unguarded; `/api/*` requires `authenticate`; `/admin/*` requires `authenticate + requireRole('admin')`.

## Sources

- [[API Routes]] — auth endpoint definitions
- [[User]] — Auth Dependencies aggregate root
- [[Environment Configuration]] — OAuth env vars
- [[sources/PRD]] — FR-S01 to FR-S06
- [[sources/USER-STORIES]] — US-A01 to US-A07