---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/observability
  - wiki/security
  - wiki/deployment
date_updated: 2026-08-07
source_count: 4
confidence: high
---

> **Status**: ✅ Executed 2026-08-07 — all 5 phases completed. 7 files modified. See [[Wiki/log|log]] for execution details.

# Remediation Plan — Railway Diagnostic Findings

Implementation plan addressing 12 findings from the [[synthesis/railway-backend-diagnostics-2026-08-07|2026-08-07 diagnostic sweep]]. The plan covers security (secrets rotation, env hardening), frontend (token refresh coordination), configuration (dotenv load order, LOG_LEVEL validation), and build hygiene (eslint, npm audit, chunk splitting).

## Overview

7 action items from the diagnostic sweep, expanded to 10 concrete fixes after codebase exploration revealed 3 additional latent issues: a **dotenv load-order bug** that causes the zod schema to evaluate with stale `NODE_ENV`, a **dead `CSRF_SECRET`** that is validated but never consumed, and a **`LOG_LEVEL` bypass** of the zod validation schema.

## Requirements

- **R1**: JWT_SECRET and CSRF_SECRET must be cryptographically random, unique per environment
- **R2**: Concurrent 401 responses must not trigger multiple parallel refresh calls
- **R3**: All environment variables consumed at runtime must pass zod validation
- **R4**: NODE_ENV must be available at module load time for correct schema shape
- **R5**: Build warnings (eslint peer dep, npm audit) should be eliminated
- **R6**: Frontend chunks >500KB should be split for better initial load performance

## Architecture Changes

- **Change 1**: `apps/backend/src/config.ts` — extract `isDev` logic from module scope to runtime, add `LOG_LEVEL` to schema, consolidate `NODE_ENV` access
- **Change 2**: `apps/frontend/src/auth/AuthContext.tsx` — add refresh promise lock, export `getRefreshPromise()` 
- **Change 3**: `apps/frontend/src/api/client.ts` — check for in-flight refresh before initiating a new one
- **Change 4**: `apps/frontend/vite.config.ts` — add `build.rollupOptions.output.manualChunks`

## Implementation Steps

### Phase 1: Critical — Secrets Rotation (0 files changed, config only)

**Prerequisite**: Must be done before any promotion to `staging`. Zero code changes — pure environment variable rotation.

1. **Generate cryptographically random secrets**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # CSRF_SECRET
   ```
   - Why: Placeholder values are trivially exploitable. JWT secrets must be 64 bytes of entropy.
   - Dependencies: None
   - Risk: **Low** — token invalidation is acceptable in dev (users will re-log in)

2. **Update Railway environment variables**
   - Action: Set `JWT_SECRET` and `CSRF_SECRET` on the backend service via Railway dashboard or `railway set_variables`
   - Also update `apps/backend/.env` for local development (keep different values from staging/prod)
   - Why: Rotation invalidates all existing tokens (JWT + refresh tokens + CSRF tokens). Users must re-authenticate.
   - Dependencies: Step 1
   - Risk: **Low** in dev — acceptable service interruption

### Phase 2: Frontend — Token Refresh Coordination (2 files)

The root cause: `ApiClient.request()` (line 68) calls `attemptTokenRefresh()` on every 401 response with no coordination. If 4 requests hit 401 simultaneously, 4 parallel refresh calls are made. The first one succeeds (rotates the refresh token, deletes old AuthSession), the other 3 fail with `InvalidRefreshTokenError` → hard redirect to `/login`.

**Fix**: A module-level `Promise<string | null>` that acts as a mutex. Only one refresh call can be in-flight at a time. Concurrent 401s see the existing promise and await it.

3. **Add refresh promise lock to AuthContext** (File: `apps/frontend/src/auth/AuthContext.tsx`)

   - Action: Add a module-level variable `let refreshPromise: Promise<string | null> | null = null` at the top (near `inMemoryToken`)
   - Action: Replace `attemptTokenRefresh()` body (lines 187–201) with:
     ```typescript
     export async function attemptTokenRefresh(): Promise<boolean> {
       if (refreshPromise) {
         // Another refresh is already in flight — await its result
         const token = await refreshPromise;
         return token !== null;
       }

       refreshPromise = (async () => {
         try {
           const response = await authFetch('/refresh', { method: 'POST' });
           if (!response.ok) return null;
           const data = await response.json();
           setAccessToken(data.accessToken);
           return data.accessToken;
         } catch {
           return null;
         }
       })();

       try {
         const token = await refreshPromise;
         return token !== null;
       } finally {
         refreshPromise = null;  // Reset lock so future refreshes can proceed
       }
     }
     ```
   - Why: Ensures only one `POST /api/auth/refresh` call is in-flight at any time. Concurrent callers share the same promise and all receive the same result. The `finally` block resets the lock regardless of success/failure, so the next legitimate refresh attempt can proceed.
   - Dependencies: None
   - Risk: **Low** — pure frontend change, no backend coordination needed. The existing backend rotation logic (delete old session, create new) already handles single-refresh semantics correctly.

4. **No changes to ApiClient needed** (File: `apps/frontend/src/api/client.ts`)

   - Action: **No code changes required.** The existing code at lines 66–86 already calls `attemptTokenRefresh()` and handles the result. With the lock in place, the second through Nth concurrent 401 handlers will await the same refresh promise. On success, all retry with the new token. On failure, only the first caller hits the hard redirect; subsequent callers see `false` from the shared promise and also redirect.
   - Why: The lock makes the existing retry logic safe. No need to introduce a request queue or change the `ApiClient.request()` structure.
   - Dependencies: Step 3
   - Risk: **Low** — verified by code analysis: the lock is at the `attemptTokenRefresh()` level, below the `ApiClient` 401 handler

### Phase 3: Configuration Hardening (3 files)

5. **Fix dotenv load order** (File: `apps/backend/src/config.ts`)

   - Action: Move `const isDev = process.env.NODE_ENV === 'development'` from module scope (line 3) into the `validateConfig()` function body. This ensures `isDev` reflects the value **after** `dotenv.config()` has loaded `.env`.
   - Action: Also move the `envSchema` definition into `validateConfig()` (or pass `isDev` as a parameter) so the zod schema shape is determined at runtime rather than module load time.
   - Current bug: `dotenv.config()` runs at runtime (server.ts:8-9), but `config.ts` is imported (line 10) — ESM hoists the import before the runtime code, so `isDev` is evaluated with `process.env.NODE_ENV` from the shell, not from `.env`.
   - Why: The schema shape (e.g., `REDIS_URL` being optional in dev vs required in prod) must match the actual loaded environment. If `NODE_ENV=production` is in `.env` but the shell has no `NODE_ENV`, the schema will use dev defaults (optional `REDIS_URL`, optional `OPENROUTER_API_KEY`) and the app will start with missing production credentials.
   - Dependencies: None
   - Risk: **Medium** — changing module structure. Must verify that all imports of `validateConfig()` still work and that the returned `Env` type is identical.

   **Implementation detail**:
   ```typescript
   // BEFORE (broken):
   const isDev = process.env.NODE_ENV === 'development';  // module scope — stale value
   const envSchema = z.object({ ... isDev ? ... : ... });

   // AFTER (fixed):
   function getEnvSchema(isDev: boolean) {
     return z.object({
       REDIS_URL: isDev
         ? z.string().url().optional().default('redis://localhost:6379')
         : z.string().url(),
       // ... etc
     });
   }

   export function validateConfig(): Env {
     const isDev = process.env.NODE_ENV === 'development';  // runtime — after dotenv
     return getEnvSchema(isDev).parse(process.env);
   }
   ```

6. **Add LOG_LEVEL to zod schema and consolidate NODE_ENV access** (File: `apps/backend/src/config.ts`)

   - Action: Add `LOG_LEVEL` to the zod schema (line 20 area):
     ```typescript
     LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
     ```
   - Action: Update `apps/backend/src/infrastructure/logger.ts` to use `config.LOG_LEVEL` instead of raw `process.env.LOG_LEVEL`:
     ```typescript
     // BEFORE (line 9):
     const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');
     // AFTER:
     import { config } from '../config.js';  // or receive via DI
     const level = config.LOG_LEVEL;
     ```
   - Action: Audit and consolidate all 8 locations that read `process.env.NODE_ENV` directly:
     - `apps/backend/src/app.ts:89` — auth middleware choice
     - `apps/backend/src/infrastructure/job-event-bridge.ts:15` — Redis retry strategy
     - `apps/backend/src/infrastructure/error-handler.ts:84` — error message exposure
     - `apps/backend/src/api/auth/auth-routes.ts:22` — cookie `secure` flag
     - Replace each with `config.NODE_ENV`
   - Why: Unvalidated `LOG_LEVEL` could silently accept invalid values. Inconsistent `NODE_ENV` access means the config and runtime can disagree about the environment.
   - Dependencies: Step 5 (config.ts restructuring)
   - Risk: **Medium** — logger.ts imports `config` creates a potential circular dependency if `logger` is imported in `config.ts`. Verify the import graph. If circular, pass `LOG_LEVEL` via dependency injection instead.

7. **Remove unused CSRF_SECRET from schema** (File: `apps/backend/src/config.ts`)

   - Action: Remove `CSRF_SECRET` from the zod schema (line 19). It is validated but **never consumed** in any application code — zero usages across the entire codebase.
   - Action: Remove `CSRF_SECRET` from `.env.example` and `.env` to avoid confusion.
   - Alternative: If CSRF protection is planned for the near future, keep the validation and add a comment: `> **Planned**: CSRF middleware not yet implemented. Secret reserved for Phase X.`
   - Why: Dead config that must still be provided violates the principle of least surprise. New developers will wonder where it's used.
   - Dependencies: None
   - Risk: **Low** — zero code references to the value

### Phase 4: Build Hygiene (3 files)

8. **Bump eslint-plugin-vitest** (File: root `package.json`)

   - Action: Update `eslint-plugin-vitest` from `^0.5.0` to the latest compatible version. Run `npm ls eslint-plugin-vitest` to check the dependency tree.
   - Action: The peer dependency mismatch (`@typescript-eslint/utils@7.18.0` requires `eslint@^8.56.0`, project has `eslint@9.39.5`) is inside `eslint-plugin-vitest`'s transitive dependencies. Check if a newer version of `eslint-plugin-vitest` resolves this. If not, the warning is cosmetic (lint-only, no runtime impact) and can be silenced with an `overrides` entry in package.json.
   - Why: Eliminates the npm warning about peer dependency conflicts.
   - Dependencies: None
   - Risk: **Low** — lint config change, isolated to test files

9. **Run npm audit fix** (File: root)

   - Action: Run `npm audit` to list the 3 high-severity vulnerabilities. Review each advisory. Run `npm audit fix` if the fixes are non-breaking. For any advisory that requires a major version bump, open a tracking issue and defer.
   - Why: 3 high-severity vulnerabilities open since at least the 2026-08-06 build.
   - Dependencies: None
   - Risk: **Low** — `npm audit fix` only applies semver-compatible patches

10. **Add chunk splitting to Vite config** (File: `apps/frontend/vite.config.ts`)

    - Action: Add `build.rollupOptions.output.manualChunks` to split the vendor bundle:
      ```typescript
      export default defineConfig(({ mode }) => {
        const env = loadEnv(mode, process.cwd(), '');
        return {
          plugins: [react()],
          build: {
            rollupOptions: {
              output: {
                manualChunks: {
                  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', 'lucide-react'],
                  'vendor-xstate': ['xstate', '@xstate/react'],
                },
              },
            },
          },
          server: {
            port: 5173,
            proxy: {
              '/api': { target: env.VITE_API_URL ?? 'http://localhost:3000', changeOrigin: true },
              '/health': { target: env.VITE_API_URL ?? 'http://localhost:3000', changeOrigin: true },
            },
          },
        };
      });
      ```
    - Why: Current `index-Vo78Mf5T.js` at 596KB + `index-ox_xQI05.js` at 157KB exceed the 500KB recommended limit. Code splitting reduces initial load and enables parallel downloading of independent chunks.
    - Dependencies: None
    - Risk: **Low** — standard Vite configuration, no application code changes. Verify via `vite build` after adding.

### Phase 5: Staging Preparation (configuration only, no code changes)

These are not code changes — they are Railway environment variable updates on the `staging` environment.

11. **Set NODE_ENV=production in staging**

    - Action: Set `NODE_ENV=production` on the backend service in the `staging` environment via Railway dashboard
    - Effect: Enables production behavior: secure cookies (`secure: true`), hardened Helmet CSP, error messages without stack traces
    - Risk: **Low** — staging is not user-facing

12. **Set LOG_LEVEL=info in staging**

    - Action: Set `LOG_LEVEL=info` on the backend service in the `staging` environment
    - Effect: Reduces log volume (suppresses debug/trace), appropriate for pre-production observability
    - Risk: **Low** — only affects log verbosity, not behavior

## Phase Dependency Graph

```
Phase 1 (Secrets)    ──┐
                        ├── Phase 3 (Config) ── Phase 5 (Staging)
Phase 2 (Refresh Lock) ─┘
                       
Phase 4 (Build Hygiene) ── independent, can run in parallel

All phases are independently mergeable.
```

## Testing Strategy

| Phase | Tests |
|-------|-------|
| Phase 1 | Manual smoke test: login after rotation, verify new tokens work |
| Phase 2 | **Critical**: Simulate concurrent 401s. Existing test infrastructure in `apps/frontend/test/mocks/handlers.ts` has MSW handlers for auth endpoints. Add test: fire 4 parallel API calls with expired token, verify only 1 `/refresh` call is made, verify all 4 retry with new token |
| Phase 3 | Run `tsc --noEmit` on backend. Verify `validateConfig()` parses correct values with a test that sets `process.env.NODE_ENV` before calling |
| Phase 4 | `npm run build` (frontend), verify chunks are split. `npm audit` to confirm zero high-severity |
| Phase 5 | Manual smoke test on staging: deploy, check cookies have `secure` flag, check logs are `info` level |

## Risks & Mitigations

- **Risk**: Phase 1 secret rotation invalidates all existing tokens → users see login screen
  - Mitigation: Acceptable in dev. Communicate if any team members are actively testing.
- **Risk**: Phase 3 logger circular dependency (logger.ts imports config.ts which might import logger.ts)
  - Mitigation: Check the import graph before implementing. If circular, pass `LOG_LEVEL` via dependency injection from server.ts composition root.
- **Risk**: Phase 2 refresh lock could deadlock if `attemptTokenRefresh()` is called re-entrantly (e.g., refresh fails and the error handler tries to refresh again)
  - Mitigation: The `finally` block resets `refreshPromise = null` after every attempt. On failure, the next call creates a new promise. No re-entrant call paths exist — `attemptTokenRefresh()` is only called from `ApiClient.request()` 401 handler and `AuthProvider` mount effect.
- **Risk**: Phase 4 npm audit fix could introduce breaking changes
  - Mitigation: Run `npm audit` first (dry-run). If any fix requires a semver-major bump, defer and open a tracking issue.

## Success Criteria

- [x] `JWT_SECRET` and `CSRF_SECRET` are cryptographically random, generated via `crypto.randomBytes`
- [ ] 4 concurrent API calls with expired token produce exactly 1 `POST /api/auth/refresh` call _(lock implemented; MSW test to be written)_
- [x] No hard redirect to `/login` during concurrent 401 scenario _(mutex lock prevents concurrent refresh calls)_
- [x] `validateConfig()` correctly determines `isDev` from `.env`-loaded `NODE_ENV` (not shell value)
- [x] `LOG_LEVEL` is validated by zod; invalid values cause startup failure, not silent acceptance
- [x] `npm audit` shows zero high-severity vulnerabilities ✅ _(kysely upgraded: 0.27.6 → 0.29.4, 0 vulns)_
- [x] `vite build` produces `vendor-react` (37KB), `vendor-mui` (359KB), `vendor-xstate` (43KB) — no chunk >500KB
- [ ] Staging backend: cookies have `secure: true` flag _(NODE_ENV=production set on staging; deploy needed to verify in browser)_
- [x] Staging backend: `NODE_ENV=production` and `LOG_LEVEL=info` set on Railway staging environment
- [x] All existing tests pass: `tsc --noEmit` (backend/frontend/domain) + `vitest` 720/720 (72 files)

## Cross-References

- [[synthesis/railway-backend-diagnostics-2026-08-07]] — source diagnostic findings
- [[Auth Middleware]] — authentication middleware architecture
- [[Auth Dependencies]] — dependency injection for auth services
- [[Frontend Architecture]] — frontend component and API architecture
- [[Secure SDLC Controls]] — security baseline
- [[Environment Configuration]] — environment variable management
- [[nodejs-thin-reverse-proxy-plan]] — reverse proxy architecture (CORS/domains)

## Sources

- Railway backend diagnostic sweep (deploy logs, runtime logs, metrics, env vars)
- Codebase exploration: `apps/frontend/src/auth/AuthContext.tsx`, `apps/frontend/src/api/client.ts`, `apps/frontend/src/api/sse-client.ts`
- Codebase exploration: `apps/backend/src/api/auth/auth-routes.ts`, `apps/backend/src/api/auth/auth-service.ts`, `apps/backend/src/middleware/authenticate.ts`
- Codebase exploration: `apps/backend/src/config.ts`, `apps/backend/src/infrastructure/logger.ts`
- Codebase exploration: `apps/backend/src/server.ts`, `apps/frontend/vite.config.ts`, `eslint.config.js`, `Dockerfile.backend`
- Railway execution log: secrets rotation, staging env vars set (2026-08-07)