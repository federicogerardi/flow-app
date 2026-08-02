---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/remediation
  - wiki/governance
date_updated: 2026-08-02
confidence: high
status: executed
---

# High-Severity Remediation Plan — Code Review 2026-08-02

**Source**: [[code-review-2026-08-02]] — 10 findings 🟠 alta priorità
**DDD Rules referenced**: Rule 3 (DomainError), Rule 4 (Value Object classes), Rule 6 (factory naming)
**Previous**: [[critical-fix-plan-2026-08-02]] (8 critical findings — all closed)

---

## Overview

10 high-severity findings across 4 categories: DDD rule violations (H1–H3, H10), data integrity (H4–H5), auth flow bug (H6), and frontend gaps (H7–H9). Estimated 15 files touched, 6–8 hours.

## Architecture Changes

- `ModelTier` converted from `type` alias to class Value Object (H3) — ripples through tool-definition.ts, model-registry.ts, worker, and all step definitions
- `Conversation.start()` renamed `create()` (H1) — DDD Rule 6
- `User.register()` + `User.fromOAuth()` unified into `User.create()` (H2) — DDD Rule 6
- `WorkspaceRepository.saveWithLock()` wrapped in `db.transaction()` (H4)
- `Session.apply()` exhaustiveness check replaced (H10)
- New errors: `SessionNotFoundError`, `InvalidModelTierError` (H3, H5)
- OAuth flow hardened: `AuthContext.trySilentRefresh()` falls back to in-memory token + `/api/auth/me` (H6)
- `useSession()` gets error state (H7)
- `ToolPage` reads `toolRegistry` to render per-tool input fields (H8)
- `countStalled()` replaced with BullMQ stalled event listener (H9)

---

## Implementation Steps

### Phase 1: Domain DDD violations (4 findings, ~2h)

These are pure domain changes with low blast radius but high cascading impact. Do them first so downstream callers can be updated in subsequent phases.

#### H1 — `Conversation.start()` → `create()` (File: packages/domain/src/agent-chat/entities/Conversation.ts:63)

- **Action**: Rename `static start(...)` to `static create(...)` on line 63
- **Why**: DDD Rule 6 — "Every aggregate root has exactly one `static create()`". `start()` is explicitly cited as a violation in both the rule table and CLAUDE.md.
- **Dependencies**: None
- **Risk**: Low — pure rename, compiler catches all callers

**Caller update** (File: apps/backend/src/application/agent-chat/start-conversation.usecase.ts:20):
```typescript
// ✅ rename
const conversation = Conversation.create(cmd.workspaceId, cmd.userId, cmd.agentKey);
```

#### H2 — Unify `User.register()` + `User.fromOAuth()` into `create()` (File: packages/domain/src/identity/User.ts:32-40)

- **Action**: Replace both factory methods with single `static create(email: Email, opts?: { passwordHash?: string }): User`
- **Why**: DDD Rule 6 — "No custom factory names on aggregate roots". Two factories violate the single-create rule. The only difference is `passwordHash` (present for registration, absent for OAuth).
- **Dependencies**: None
- **Risk**: Low

**New factory signature**:
```typescript
static create(email: Email, opts?: { passwordHash?: string }): User {
  const now = new Date();
  return new User(randomUUID(), email, opts?.passwordHash ?? null, UserRole.Member, UserStatus.Active, now, now);
}
```

**Caller updates** (File: apps/backend/src/api/auth/auth-service.ts):
- Line 43: `User.register(emailVo, passwordHash)` → `User.create(emailVo, { passwordHash })`
- Line 109: `User.fromOAuth(emailVo)` → `User.create(emailVo)`

#### H3 — `ModelTier` type alias → class Value Object (File: packages/domain/src/generation/tools/tool-definition.ts:3)

- **Action**: Convert `type ModelTier = 'premium' | 'balanced' | 'light' | 'search'` into a class with `private constructor`, `static readonly` instances, `static from()`, `equals()`, `toString()`
- **Why**: DDD Rule 4 — "Value Objects with constrained domains must be classes, not type aliases." A 4-value finite domain with zero runtime validation. Pattern already established by `ToolKey`, `AgentKey`, `SessionStatus`, etc.
- **Dependencies**: H1, H2 (none technically, but do after to keep domain changes grouped)
- **Risk**: Medium — type alias → class conversion requires updating all usages. TypeScript will catch every missing import/adapter point.

**New class location**: `packages/domain/src/generation/value-objects/ModelTier.ts` (new file)

```typescript
export class ModelTier {
  private constructor(private readonly _value: string) {}

  static readonly Premium  = new ModelTier('premium');
  static readonly Balanced = new ModelTier('balanced');
  static readonly Light    = new ModelTier('light');
  static readonly Search   = new ModelTier('search');

  static from(value: string): ModelTier {
    switch (value) {
      case 'premium':  return ModelTier.Premium;
      case 'balanced': return ModelTier.Balanced;
      case 'light':    return ModelTier.Light;
      case 'search':   return ModelTier.Search;
      default: throw new InvalidModelTierError(value);
    }
  }

  equals(other: ModelTier): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): string { return this._value; }
}
```

**Ripple updates** (4 files):
1. `packages/domain/src/generation/tools/tool-definition.ts:3` — replace `type ModelTier` with `import { ModelTier } from '../value-objects/ModelTier'`; update `model: ModelTier` in `StepPromptDefinition` (line 43)
2. `packages/domain/src/generation/tools/index.ts` — update all step definitions: `model: 'balanced'` → `model: ModelTier.Balanced`, `model: 'premium'` → `model: ModelTier.Premium`
3. `apps/backend/src/infrastructure/model-registry.ts:1-2,9` — `import type { ModelTier }` → `import { ModelTier }`, convert `Record<ModelTier, ModelConfig>` keys from string-based to symbolic
4. `apps/backend/src/generation/worker/session-worker.ts:107` — `model: step.prompt.model` stays since `LlmGateway.generate()` accepts the `toString()` form

**Model registry update pattern**:
```typescript
// ❌ before — string-keyed
const MODEL_REGISTRY: Record<ModelTier, ModelConfig> = {
  premium: { ... },
};
const config = MODEL_REGISTRY[tier]; // tier was string

// ✅ after — Map-based with VO keys
const MODEL_REGISTRY = new Map<ModelTier, ModelConfig>([
  [ModelTier.Premium,  { ... }],
  [ModelTier.Balanced, { ... }],
  [ModelTier.Light,    { ... }],
  [ModelTier.Search,   { ... }],
]);
const config = MODEL_REGISTRY.get(tier);
```

**New error**: `packages/domain/src/generation/value-objects/ModelTier.ts`
```typescript
export class InvalidModelTierError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid model tier: "${value}". Expected premium, balanced, light, or search.`);
  }
}
```

**Export updates**:
- `packages/domain/src/generation/index.ts` — add `export { ModelTier, InvalidModelTierError } from './value-objects/ModelTier'`
- Remove `type ModelTier` from the `export type` line for `tool-definition`

#### H10 — Replace `default: return null` with exhaustiveness check (File: packages/domain/src/generation/entities/Session.ts:181-182)

- **Action**: Replace the `default` case with TypeScript exhaustiveness assertion
- **Why**: Suppresses compiler verification. If a new `SessionEventType` is added, the compiler won't flag the missing case.
- **Dependencies**: None
- **Risk**: Low — pure type safety

```typescript
// ❌ before
default:
  return null;

// ✅ after
default: {
  const _exhaustive: never = event;
  return _exhaustive;
}
```

---

### Phase 2: Data Integrity (2 findings, ~1h)

#### H4 — Wrap `saveWithLock()` in transaction (File: packages/infra-db/src/repositories/workspace-repository.ts:104-153)

- **Action**: Wrap the UPDATE workspace + membership sync loop in `db.transaction().execute(async (trx) => {...})`
- **Why**: Without a transaction, if the workspace UPDATE succeeds but a membership INSERT fails mid-loop, the workspace version is incremented but members are corrupted. The caller has no way to recover.
- **Dependencies**: None
- **Risk**: Low — Kysely supports `transaction()` natively. The method already handles both write paths.

```typescript
async saveWithLock(workspace: Workspace, expectedVersion: number): Promise<void> {
  await this.db.transaction().execute(async (trx) => {
    const result = await trx
      .updateTable('workspaces')
      .set({ name: workspace.name, version: workspace.version, updated_at: new Date() })
      .where('id', '=', workspace.workspaceId)
      .where('version', '=', expectedVersion)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      const current = await trx
        .selectFrom('workspaces')
        .where('id', '=', workspace.workspaceId)
        .select('version')
        .executeTakeFirst();
      throw new ConcurrencyError(workspace.workspaceId, expectedVersion, current?.version ?? -1);
    }

    for (const m of workspace.memberships) {
      await trx
        .insertInto('workspace_memberships')
        .values({ workspace_id: m.workspaceId, user_id: m.userId, role: m.role.value, status: m.status.value, invited_by: m.invitedBy, invited_at: m.invitedAt, joined_at: m.joinedAt })
        .onConflict((oc) => oc.columns(['workspace_id', 'user_id']).doUpdateSet({ role: m.role.value, status: m.status.value, joined_at: m.joinedAt, updated_at: new Date() }))
        .execute();
    }
  });
}
```

#### H5 — Replace `throw new Error()` with `DomainError` in worker + model-registry (Files: session-worker.ts, model-registry.ts)

- **Action**:
  1. Create `SessionNotFoundError` in `packages/domain/src/generation/entities/Session.ts` (alongside existing `InvalidSessionStateError`)
  2. Create `ToolNotFoundError` in `packages/domain/src/generation/tools/index.ts` or a new errors file
  3. Create `UnknownModelTierError` in `apps/backend/src/infrastructure/model-registry.ts`
  4. Replace 4 `throw new Error(...)` occurrences with proper DomainErrors
- **Why**: DDD Rule 3 — "Every domain and application error must extend `DomainError`." Bare `new Error()` bypasses the `ErrorMapper → HTTP status` pipeline. The code `SESSION_NOT_FOUND` is already mapped in `error-handler.ts:28` but is dead code — no error class carries it. These errors currently produce `500 INTERNAL_ERROR` instead of the correct `404`.
- **Dependencies**: None (H5a SessionNotFoundError can be in same file as H10 change, Session.ts)
- **Risk**: Low

**New errors** (3 files):

```typescript
// 1. packages/domain/src/generation/entities/Session.ts (alongside InvalidSessionStateError)
export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly retryable = false;
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
  }
}

// 2. packages/domain/src/generation/tools/index.ts
import { DomainError } from '../../shared/domain-error';
export class ToolNotFoundError extends DomainError {
  readonly code = 'TOOL_NOT_FOUND';
  readonly retryable = false;
  constructor(toolKey: unknown) {
    super(`Tool ${String(toolKey)} not found in registry`);
  }
}

// 3. apps/backend/src/infrastructure/model-registry.ts
import { DomainError } from '@flow-app/domain';
export class UnknownModelTierError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(tier: string) {
    super(`Unknown model tier: "${tier}"`);
  }
}
```

**Replacements** (4 throw sites):
- `session-worker.ts:54` — `throw new Error(...)` → `throw new SessionNotFoundError(sessionId)`
- `session-worker.ts:57` — `throw new Error(...)` → `throw new ToolNotFoundError(session.toolKey.value)`
- `session-worker.ts:66` — `throw new Error(...)` → `throw new Error(...)` — keep this one? No, it's inside a callback that throws into an xstate `fromPromise` which catches and re-throws. Actually, let's see: `throw new Error(`Step ${stepIndex} not found...`)` — this is a programming error (stepIndex out of bounds), not a domain error the external caller should handle differently. It's fine as-is.
- `model-registry.ts:34` — `throw new Error(...)` → `throw new UnknownModelTierError(tier)`

**Updates to domain exports** (packages/domain/src/generation/index.ts):
```typescript
export { Session, InvalidSessionStateError, SessionNotFoundError } from './entities/Session';
export { toolRegistry, getTool, ToolNotFoundError } from './tools';
```

---

### Phase 3: Auth Flow Bug (1 finding, ~1.5h)

#### H6 — OAuth token valid after Google login (File: apps/frontend/src/auth/AuthContext.tsx:81-115)

- **Action**: When `trySilentRefresh()` fails (cookie not yet set) but `getAccessToken()` holds a token (set by `OAuthCallback`), call `GET /api/auth/me` with the in-memory token to populate the user.
- **Why**: After Google OAuth, `OAuthCallback` stores the access token in memory and navigates to `/dashboard`. `AuthProvider` mounts, calls `POST /api/auth/refresh` — but the httpOnly cookie might not be set yet (race with the OAuth redirect response). Refresh fails → `user` stays `null` → `isAuthenticated = false` → `AuthGuard` redirects to `/login`. The user completed Google login successfully but gets booted.
- **Dependencies**: None (AuthContext is self-contained)
- **Risk**: Medium — auth flow changes must be tested with both OAuth and email-password paths

**Fix** (File: apps/frontend/src/auth/AuthContext.tsx, lines 85-108):

```typescript
// In trySilentRefresh(), after refresh fails:
if (!response.ok) {
  // ⬇️ NEW: fallback to in-memory OAuth token
  const existingToken = getAccessToken();
  if (existingToken) {
    try {
      const meResponse = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${existingToken}` },
        credentials: 'include',
      });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        if (!cancelled) {
          // Token is still valid — keep it, populate user
          setUser(meData.user ?? meData);
          // Token already stored by OAuthCallback
          return;
        }
      }
      // Token invalid — clear it
      setAccessToken(null);
    } catch {
      setAccessToken(null);
    }
  }
  // No fallback available — user must log in
  return; // ← existing early return
}
```

**Verification**: The `GET /api/auth/me` endpoint must exist and return `{ user: { id, email, role } }`. Let's check it exists.

Check (File: apps/backend/src/api/auth/auth-routes.ts):
```bash
rg "router.*me" apps/backend/src/api/auth/
```
If `/api/auth/me` doesn't exist yet, create it as a simple protected route that returns `res.json({ user: { ... } })` from the JWT payload. Add this as a sub-step if needed.

---

### Phase 4: Frontend Gaps (2 UI findings, ~1.5h)

#### H7 — `useSession()` without error state (File: apps/frontend/src/api/hooks.ts:11-32)

- **Action**: Add `const [error, setError] = useState<Error | null>(null)`, catch the promise rejection in `useEffect`, return `error` from the hook.
- **Why**: If `api.getSession()` fails (network error, auth expiry, deleted session), the rejection is unhandled — no `.catch()`. `loading` goes to `false`, `session` stays `null`, and the UI renders `<LoadingSkeleton />` forever instead of an error state.
- **Dependencies**: None
- **Risk**: Low

```typescript
export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [progress, setProgress] = useState<StepProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null); // ← NEW

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    setError(null); // reset on new sessionId
    api.getSession(sessionId)
      .then(setSession)
      .catch(setError) // ← NEW: catch the rejection
      .finally(() => setLoading(false));

    const unsubscribe = sseClient.connect(sessionId, {
      onStep: (data) => setProgress(data.progress as StepProgress),
      onCompleted: () => api.getSession(sessionId).then(setSession),
      onFailed: () => api.getSession(sessionId).then(setSession),
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, progress, loading, error }; // ← NEW: expose error
}
```

**Consumer update** (File: apps/frontend/src/pages/SessionPage.tsx):
```typescript
// After destructuring:
const { session, progress, loading, error } = useSession(sessionId ?? null);

// In render:
if (error) return <ErrorState message={error.message} onRetry={() => /* re-mount */} />;
```

#### H8 — ToolPage renders tool-specific input fields (File: apps/frontend/src/pages/ToolPage.tsx:53-67)

- **Action**: Import `toolRegistry` from `@flow-app/domain` (or create a lightweight shared input schema in `packages/contracts`), read the tool's `acquisition.userText` array, and render inputs dynamically instead of the hardcoded `topic` + `language` duo.
- **Why**: Every tool shows "Topic" and "Language" fields regardless of actual tool needs. "Ad Copy" needs `platform`, `audience`, `goal`. "Brief" needs `objective`, `company`, `product`. The current implementation is unusable for all tools except blog-post.
- **Dependencies**: None — `toolRegistry` is already in `@flow-app/domain` and exports `acquisition.userText`
- **Risk**: Low — currently all tools share the same blogPostTool definition (placeholder), but when tools get differentiated, the frontend automatically adapts.

**Fix**:

```typescript
import { toolRegistry, type ToolDefinition, type TextInput } from '@flow-app/domain';

// Inside ToolPage:
const toolDef: ToolDefinition | undefined = toolKey ? toolRegistry[toolKey as ToolKeyValue] : undefined;

// Replace hardcoded topic + language fields with:
{toolDef?.acquisition?.userText?.map((input: TextInput) => (
  <TextField
    key={input.key}
    label={input.label}
    placeholder={input.placeholder}
    value={inputs[input.key] ?? ''}
    onChange={(e) => handleInputChange(input.key, e.target.value)}
    required={input.required}
    select={input.type === 'select'}
    fullWidth={input.type === 'long'}
    sx={input.type !== 'long' ? { maxWidth: 400 } : undefined}
  >
    {input.type === 'select' && input.options?.map((opt) => (
      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
    ))}
  </TextField>
))}
```

**Also update the submit enabled condition** (line 72):
```typescript
// ❌ before
disabled={submitting || !inputs.topic}

// ✅ after — check all required fields
disabled={
  submitting ||
  (toolDef?.acquisition?.userText ?? []).some(
    (input) => input.required && !inputs[input.key]?.trim()
  )
}
```

**Imports to add**: `MenuItem` from `@mui/material`, `ToolKeyValue` type and `TextInput` type from `@flow-app/domain`.

---

### Phase 5: Monitoring Bug (1 finding, ~0.5h)

#### H9 — `countStalled()` counts retry-exhausted jobs, not stalled (File: apps/backend/src/generation/worker/health-monitor.ts:170-173)

- **Action**: Replace `getJobs` + filter logic with a BullMQ `'stalled'` event listener that maintains a counter. Alternatively, filter correctly for truly stalled jobs: `attemptsMade > 0 && finishedOn === undefined` in state `waiting`.
- **Why**: The current implementation searches for jobs with `attemptsMade >= maxAttempts` across all states — these are jobs that exhausted retries, not jobs where the worker died during processing. True stalled jobs are moved by BullMQ into `waiting` state and never show up in this filter. The `stalledJobs` metric is always zero or wrong, making the alert useless.
- **Dependencies**: None
- **Risk**: Low

**Fix (listener approach — recommended)**:

```typescript
export class QueueHealthMonitor {
  private stalledSinceLastCheck = 0;
  // ... existing fields

  start(intervalMs: number = 60_000): void {
    // ... existing code

    // Listen for BullMQ stalled events
    const worker = (this.queue as any).worker; // Worker reference — or pass in constructor
    if (worker) {
      worker.on('stalled', (jobId: string, _prev: unknown) => {
        this.stalledSinceLastCheck++;
        this.log.warn({ jobId }, 'job_stalled');
      });
    }

    this.log.info({ intervalMs }, 'health_monitor_started');
  }

  private async countStalled(): Promise<number> {
    const count = this.stalledSinceLastCheck;
    this.stalledSinceLastCheck = 0; // Reset after each check
    return count;
  }
}
```

**Alternative (query approach — simpler, no Worker ref needed)**:

```typescript
private async countStalled(): Promise<number> {
  // Truly stalled: was being processed but worker died
  // BullMQ moves them to 'waiting' after stalledInterval
  const waiting = await this.queue.getJobs(['waiting'], 0, 200);
  return waiting.filter((j) => j.attemptsMade > 0).length;
}
```

This is simpler — no need for the Worker reference or event listener. BullMQ moves stalled jobs back to `waiting` after `stalledInterval` (30s in our config), so waiting jobs with `attemptsMade > 0` are jobs that were picked up but the worker died before completing them.

---

## Implementation Order

```
Phase 1: H1 → H2 → H3 → H10  (domain DDD — pure domain, no infra)
Phase 2: H4 → H5               (data integrity — infra + domain errors)
Phase 3: H6                     (auth flow — frontend only)
Phase 4: H7 → H8               (frontend UX — independent)
Phase 5: H9                     (monitoring — independent)
```

Phases 3, 4, and 5 are independent of Phases 1–2 and can run in parallel if multiple developers are working.

## Files Touched

| File | Phase | Finding | Change |
|------|-------|---------|--------|
| `packages/domain/src/agent-chat/entities/Conversation.ts` | 1 | H1 | `start()` → `create()` |
| `apps/backend/src/application/agent-chat/start-conversation.usecase.ts` | 1 | H1 | Caller update |
| `packages/domain/src/identity/User.ts` | 1 | H2 | Merge `register()` + `fromOAuth()` → `create()` |
| `apps/backend/src/api/auth/auth-service.ts` | 1 | H2 | Caller update (2 sites) |
| `packages/domain/src/generation/value-objects/ModelTier.ts` | 1 | H3 | NEW — class VO |
| `packages/domain/src/generation/tools/tool-definition.ts` | 1 | H3 | Type alias → import, update `StepPromptDefinition.model` |
| `packages/domain/src/generation/tools/index.ts` | 1 | H3 | String model values → `ModelTier.Balanced` etc. |
| `packages/domain/src/generation/index.ts` | 1 | H3,H5 | Export new types |
| `packages/domain/src/generation/entities/Session.ts` | 1,2 | H5,H10 | Exhaustiveness check + `SessionNotFoundError` |
| `apps/backend/src/infrastructure/model-registry.ts` | 1,2 | H3,H5 | Record → Map, new error |
| `apps/backend/src/generation/worker/session-worker.ts` | 2 | H5 | 2 `throw new Error` → DomainErrors |
| `packages/infra-db/src/repositories/workspace-repository.ts` | 2 | H4 | Wrap in `db.transaction()` |
| `apps/frontend/src/auth/AuthContext.tsx` | 3 | H6 | Fallback to in-memory token + `/api/auth/me` |
| `apps/backend/src/api/auth/auth-routes.ts` | 3 | H6 | MAYBE add `GET /api/auth/me` if missing |
| `apps/frontend/src/api/hooks.ts` | 4 | H7 | Add error state |
| `apps/frontend/src/pages/SessionPage.tsx` | 4 | H7 | Render error state |
| `apps/frontend/src/pages/ToolPage.tsx` | 4 | H8 | Dynamic tool inputs from registry |
| `apps/backend/src/generation/worker/health-monitor.ts` | 5 | H9 | Fix `countStalled()` |
| `apps/backend/src/generation/worker/health-monitor.ts` | 4 | H9 | Fix `queueDepth` (M12 piggyback: sum waiting+active+delayed) |

## Testing Strategy

- **Unit tests**: `ModelTier.from()`, `ModelTier.equals()`, `User.create()` (both opts paths), `SessionNotFoundError` code
- **Integration tests**: `WorkspaceRepository.saveWithLock()` with mid-loop failure (simulate), `GET /api/auth/me` OAuth fallback flow
- **E2E tests**: Google OAuth login → dashboard (no redirect to /login), ToolPage renders correct fields per tool, SessionPage shows error state on fetch failure

## Risks & Mitigations

- **Risk** (H3): `ModelTier` class conversion breaks model-registry compile due to Record key type
  - **Mitigation**: Convert to `Map<ModelTier, ModelConfig>` — cleaner and idiomatic for non-string keys
- **Risk** (H6): `GET /api/auth/me` endpoint doesn't exist
  - **Mitigation**: Add as sub-step in Phase 3. It's a simple route reading from `req.user` (JWT middleware already populates)
- **Risk** (H6): The `POST /api/auth/refresh` cookie race is environment-dependent
  - **Mitigation**: The fallback handles it — if refresh works (cookie is ready), no fallback needed. If refresh fails but token is fresh, use `/me`. If both fail, login.
- **Risk** (H9): The `(this.queue as any).worker` cast is fragile
  - **Mitigation**: Use the query alternative (waiting jobs with `attemptsMade > 0`) — no Worker reference needed
- **Risk** (H8): `toolRegistry` import in frontend bundles all tool definitions
  - **Mitigation**: Already happening — `@flow-app/domain` is a dependency. The registry is ~65 lines. Use `toolRegistry[toolKey]` which is a dictionary lookup, not a loop.

## Success Criteria

- [x] `Conversation.create()` compiles, all tests pass, no references to `Conversation.start` remain
- [x] `User.create(email)` and `User.create(email, { passwordHash })` both work, callers updated
- [x] `ModelTier.from('balanced')` returns `ModelTier.Balanced`, `ModelTier.from('zxy')` throws `InvalidModelTierError`
- [x] `model-registry.ts` uses `Map<ModelTier, ModelConfig>` with symbolic keys
- [x] `workspace-repository.ts saveWithLock()` uses `db.transaction()`
- [x] Worker throws `SessionNotFoundError` (not `Error`) when session missing → `ErrorMapper` maps to 404
- [x] Worker throws `ToolNotFoundError` (not `Error`) when tool missing → `ErrorMapper` maps to 404
- [x] `model-registry.ts` throws `UnknownModelTierError` (not `Error`)
- [x] OAuth flow: Google login → Dashboard (no redirect to /login, no white screen)
- [x] `useSession()` returns `error` state, SessionPage renders `<ErrorState>` on fetch failure
- [x] ToolPage renders tool-specific input fields via local `tool-inputs.ts` (avoids `node:crypto` browser import)
- [x] `countStalled()` returns truly stalled jobs (waiting + attemptsMade > 0)
- [x] `queueDepth` includes `waiting + active + delayed` (M12 piggyback)
- [x] Typecheck 0 errors, domain tests pass, frontend build passes
- [x] `default: return null` removed from `Session.apply()` — exhaustiveness check active

## Sources

- [[code-review-2026-08-02]]
- [[critical-fix-plan-2026-08-02]]
- [[DDD Domain Design Rules]]
- [[Error Mapping (Domain to HTTP)]]
- [[Auth Dependencies]]
- [[Auth Middleware]]