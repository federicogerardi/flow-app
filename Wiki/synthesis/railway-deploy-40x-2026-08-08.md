---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/deployment
  - wiki/gamification
  - wiki/gamification-ux
  - wiki/auth
  - wiki/api-client
date_updated: 2026-08-08
---

# Railway Deploy 40X Analysis — 2026-08-08

> Deployment `7c5f7c22` log sweep across ~2 hours of production traffic. Identified 1 real bug and 1 log-noise pattern.

## Findings

### 🔴 F1 — `PUT /api/me/profile → 404` (real bug)

**Severity**: High — user-facing toggle silently fails

`StreakModeToggle` component ([[Gamification UX]]) calls `PUT /api/me/profile { streakMode }` but the backend has no route, domain entity, use case, or DB column for `streakMode`. The component gracefully reverts UI state on error (`catch { setMode(mode) }`), so the user sees a flash and thinks it's broken.

**Layers implemented**:
- ✅ Copy strings: `gamification.streakMode.*`
- ✅ Frontend UI: `StreakModeToggle.tsx` with toggle state
- ❌ API client: no typed `setStreakMode()` method — uses raw `api.request('PUT', ...)`
- ❌ Backend route: `PUT /api/me/profile` does not exist
- ❌ Use case / application layer
- ❌ Domain (no entity, VO, or aggregate field)
- ❌ DB column / migration

**Occurrences**: 1 request (`[15:00:51]`, 1ms response time — the route doesn't match, Express 404 is instant)

### ⚠️ F2 — 401 log noise from auth race condition

**Severity**: Low — no user impact, autorisolto

14 x 401 across 3 clusters, all occurring on page load or after session inactivity (~24min / ~15min gaps). Pattern:

```
[Page mount / session expired]
  → SWR fires authenticated requests (no token / expired token)
  → Server returns 401 (WARN level)
  → AuthProvider trySilentRefresh() OR ApiClient attemptTokenRefresh()
  → POST /refresh → 200 (within 50ms)
  → Retry with new token → 200
```

The `attemptTokenRefresh()` already deduplicates concurrent calls via `refreshPromise`. The 401s occur because SWR hooks fire before the auth state resolves, not because the refresh fails. The ApiClient correctly retries after refresh.

**Root cause**: SWR fetchers (`useSWR('workspaces', ...)`, `useSWR('player-profile', ...)`, etc.) fire on mount without checking `isAuthenticated`. SWR supports conditional fetching via `null` key — this is not used.

**Clusters**:
| Time | Count | Trigger |
|------|-------|---------|
| 14:31:17 | 4 | Initial page load (pre-refresh) |
| 14:55:56 | 7 | Token expired after ~24min inactivity |
| 15:11:29 | 3 | Token expired after ~15min inactivity |

## Implementation Plan

### Phase A — Full streak mode feature

1. **DB migration** — `014_streak_mode.sql`: add `streak_mode` column to `player_profiles` table (default `'daily'`, check constraint `daily | business`)
2. **Domain** — add `streakMode` field to `PlayerProfile` aggregate root (factory, reconstitute, getter)
3. **Repository** — update `PlayerProfileRepository.save()` to persist `streakMode`; add `updateStreakMode()` method
4. **Use case** — `SetStreakModeUseCase` in `apps/backend/src/application/gamification/`
5. **Route** — `PUT /api/me/profile` in `gamification-routes.ts`, validating `streakMode ∈ {daily, business}`
6. **GET update** — include `streakMode` in `GET /api/me/profile` response
7. **API client** — add typed `setStreakMode(mode: StreakMode)` method
8. **Frontend** — `StreakModeToggle.tsx` already built — just switch from raw `api.request()` to typed method
9. **Copy** — already done (`gamification.streakMode.*`)

### Phase B — Silent 401 retry via authenticated SWR guard

1. Create `useAuthSWR` wrapper or defer SWR fetchers with `isAuthenticated` guard
2. Key pattern: `useSWR(isAuthenticated ? key : null, fetcher)` — SWR skips fetching when key is null
3. Affected hooks: `AppShell.tsx`, `DashboardPage.tsx`, `App.tsx`, `GamificationZone.tsx`, `QuotaCounter.tsx`
4. Alternative: single global SWR provider that holds all fetches until auth resolves

## Files Modified

| File | Phase | Change |
|------|-------|--------|
| `packages/infra-db/migrations/014_streak_mode.sql` | A | New migration |
| `packages/domain/src/gamification/entities/PlayerProfile.ts` | A | Add `streakMode` field |
| `packages/domain/src/gamification/repositories/PlayerProfileRepository.ts` | A | Add `updateStreakMode` |
| `apps/backend/src/infrastructure/player-profile-repository.ts` | A | Persist `streakMode` |
| `apps/backend/src/application/gamification/set-streak-mode.usecase.ts` | A | New use case |
| `apps/backend/src/api/gamification/gamification-routes.ts` | A | Add `PUT /api/me/profile`, update GET |
| `apps/frontend/src/api/client.ts` | A+B | Add `setStreakMode()`, deferred auth requests |
| `apps/frontend/src/components/gamification/StreakModeToggle.tsx` | A | Switch to typed client method |
| `apps/frontend/src/hooks/useAuthSWR.ts` | B | New hook (optional) |
| `apps/frontend/src/layout/AppShell.tsx` | B | Gate SWR on auth |
| `apps/frontend/src/pages/DashboardPage.tsx` | B | Gate SWR on auth |
| `apps/frontend/src/App.tsx` | B | Gate SWR on auth |

## Cross-References

- [[Gamification]] — PlayerProfile aggregate, streak XP multipliers
- [[Gamification UX]] — StreakModeToggle component
- [[Auth Middleware]] — 401 behavior, token validation
- [[API Client + SSE Client]] — request retry logic, attemptTokenRefresh
- [[CI-CD Promotion Policy]] — deployment validation
- [[synthesis/railway-backend-diagnostics-2026-08-07]] — prior health sweep