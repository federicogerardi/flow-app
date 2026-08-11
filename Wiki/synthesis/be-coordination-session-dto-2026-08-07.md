---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/backend
  - wiki/contracts
  - wiki/plan
date_updated: 2026-08-11
source_count: 5
confidence: high
resolution: Steps 0-8 (P0) + Steps 9-11 (P1) resolved 2026-08-11. queuePosition deferred as stub (undefined). xpEarned deferred (needs gamification wiring). See [[log#2026-08-11 fix G1-G4 generation SSE & DTO remediation|log]].

resolved:
  - "Step 0: createdAt domain entity"
  - "Step 1: Fix createdAt in API"
  - "Step 2: stepCount from tool def"
  - "Step 3: currentStepIndex/currentStepLabel, completedAt, errorMessage, errorCode"
  - "Step 4: lastArtifactId/Preview (SessionRepository method)"
  - "Step 5: isPromotable"
  - "Step 6: elapsed/duration"
  - "Step 7: Fix step_completed SSE"
  - "Step 8: Fix session_completed SSE"
  - "Step 9: Publish session_started/failed events"
  - "Step 10: GET /activity endpoint"
  - "Step 11: POST /challenges/vote endpoint"
deferred:
  - "Step 6b: queuePosition — stub (undefined). BullMQ introspection not implemented."
  - "xpEarned in getSession — no backend XP computation wired yet."
---

# Backend Coordination Plan — SessionListItemDTO & SSE Alignment ✅

> Coordinates backend changes required by [[frontend-drift-remediation-plan-2026-08-07|Phase 3]] of the frontend drift remediation.
> **2026-08-11**: Steps 0–11 resolved. `queuePosition` deferred as stub (`undefined`). `xpEarned` deferred (requires gamification domain wiring).
>
> **DDD-reviewed 2026-08-07**: 7 inaccuracies found and corrected.

## Overview

The frontend drift remediation extended the contracts (`SessionListItemDTO`, `SSEEvent`) to match the canonical UX specs. The backend must now populate these fields. Without backend changes, the 4-state card system renders with missing data (no progress bars, no artifact previews, no error messages, no queue positions).

## Gap Analysis

### SessionListItemDTO — `GET /api/sessions`

**Current backend response** (5 fields):
```json
{ "id", "toolKey", "workspaceId", "status", "createdAt" }
```

**Expected response** (16 fields):
```json
{
  "id", "toolKey", "workspaceId", "status", "stepCount",
  "currentStepIndex?", "currentStepLabel?", "queuePosition?",
  "lastArtifactId?", "lastArtifactPreview?",
  "elapsedSeconds?", "durationSeconds?",
  "errorMessage?", "failedAtStep?",
  "isPromotable?",
  "createdAt", "completedAt?"
}
```

**11 missing fields.** Additionally, `createdAt` is incorrectly mapped from `startedAt` instead of the DB `created_at` column.

### SSE Events — `/api/sessions/:id/events`

| Event | Current Payload | Expected Payload | Gap |
|-------|----------------|-----------------|-----|
| `step_completed` | `{ sessionId, status, stepNumber }` | `{ sessionId, stepNumber, stepLabel, progress: { current, total, label? }, artifact: ArtifactDTO }` | Missing `stepLabel`, `progress`, `artifact` |
| `session_completed` | `{ sessionId, status }` | `{ sessionId, status, finalArtifact: ArtifactDTO, completedAt }` | Missing `finalArtifact`, `completedAt` |
| `session_started` | Never published | `{ sessionId, status: 'running', startedAt }` | Event does not exist |
| `session_failed` | Never published | `{ sessionId, status, failedAtStep, error: { code, message } }` | Event does not exist |

### Missing Endpoints

| Endpoint | Status | Priority |
|----------|--------|----------|
| `GET /api/workspaces/:id/activity` | Does not exist | Medium — gamification UX |
| `POST /api/workspaces/:id/challenges/vote` | Does not exist | Medium — gamification UX |

---

## Implementation Steps

### Step 0: Add `createdAt` to `Session` domain entity (DDD prerequisite)

> **Review finding (2026-08-07)**: The `Session` entity has no `createdAt` field. The DB table has `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, but the domain ignores it. All API handlers use `s.startedAt?.toISOString() ?? new Date().toISOString()` — the fallback produces non-deterministic values for draft/queued sessions.

**File 1**: `packages/domain/src/generation/entities/Session.ts`

Add `createdAt` as an immutable readonly field:

```typescript
private constructor(
  readonly sessionId: string,
  readonly toolKey: ToolKey,
  readonly workspaceId: string,
  readonly userId: string,
  readonly idempotencyKeyHash: string,
  private _status: SessionStatus,
  private _currentStepIndex: number,
  private _startedAt: Date | null,
  private _completedAt: Date | null,
  private _errorCode: string | null,
  private _errorMessage: string | null,
  private _version: number,
  private _artifacts: Artifact[],
  readonly createdAt: Date,  // ← NEW: immutable creation timestamp
) {}

static create(
  toolKey: ToolKey, workspaceId: string, userId: string,
  idempotencyKeyHash: string,
): Session {
  return new Session(
    randomUUID(), toolKey, workspaceId, userId, idempotencyKeyHash,
    SessionStatus.Draft, 0, null, null, null, null, 1, [],
    new Date(),  // ← captured at domain instantiation
  );
}

static reconstitute(
  sessionId: string, toolKey: ToolKey, workspaceId: string, userId: string,
  idempotencyKeyHash: string, status: SessionStatus, currentStepIndex: number,
  startedAt: Date | null, completedAt: Date | null, errorCode: string | null,
  errorMessage: string | null, version: number, artifacts: Artifact[],
  createdAt: Date,  // ← NEW parameter
): Session {
  return new Session(
    sessionId, toolKey, workspaceId, userId, idempotencyKeyHash,
    status, currentStepIndex, startedAt, completedAt,
    errorCode, errorMessage, version, artifacts, createdAt,
  );
}
```

**File 2**: `packages/infra-db/src/repositories/session-repository.ts` — `findAll()` and `findById()`

Pass `row.created_at` to `Session.reconstitute()`:

```typescript
// In findAll() — add createdAt as last parameter
return Session.reconstitute(
  row.id, ToolKey.from(row.tool_key), row.workspace_id, row.user_id,
  row.idempotency_key_hash, SessionStatus.from(row.status),
  row.current_step_index, row.started_at, row.completed_at,
  row.error_code, row.error_message, row.version,
  row.created_at,  // ← NEW
);

// Same for findById() — add row.created_at as last parameter
```

**After this step is complete**, continue to Step 1.

**Risk**: Medium — 3 files, 3 call sites. All existing tests pass because `createdAt` is additive — no existing code accesses it yet.

### Step 1: Fix `createdAt` mapping in `listSessions` response

**File**: `apps/backend/src/api/generation.ts` (line ~68)

After Step 0, the domain entity has `createdAt`:

```typescript
// ❌ Current (and broken — non-deterministic for draft/queued)
createdAt: s.startedAt?.toISOString() ?? new Date().toISOString(),

// ✅ Correct (after Step 0)
createdAt: s.createdAt.toISOString(),  // never null — DB has NOT NULL DEFAULT NOW()
```

**Risk**: Low — `createdAt` is now a guaranteed non-null domain field.

### Step 2: Populate `stepCount` from tool definition

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

`toolRegistry` is a plain `Record<ToolKeyValue, ToolDefinition>`, not a class:

```typescript
// Load tool definitions once, map stepCount per session
const toolDefs = Object.values(toolRegistry);
const toolDefMap = new Map(toolDefs.map(t => [t.toolKey, t]));

data: sessions.map((s) => ({
  // ... existing fields
  stepCount: toolDefMap.get(s.toolKey)?.stepCount ?? 1,
}))
```

**Risk**: Low — tool definitions are statically defined. No async needed.

### Step 3: Populate `currentStepIndex`, `completedAt`, `errorMessage`, `failedAtStep` in both `listSessions` and `getSession`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` AND `getSession` handlers)

These fields already exist on the domain `Session` entity but are not mapped in either endpoint:

**`listSessions`** (Step 3a):
```typescript
data: sessions.map((s) => ({
  // ... existing fields
  currentStepIndex: s.status.toString() === 'running' ? s.currentStepIndex : undefined,
  completedAt: s.completedAt?.toISOString() ?? undefined,
  errorMessage: s.status.toString() === 'failed' ? s.errorMessage : undefined,
  errorCode: s.status.toString() === 'failed' ? s.errorCode : undefined,
  failedAtStep: s.status.toString() === 'failed' ? s.currentStepIndex : undefined,
}))
```

**`getSession`** (Step 3b — detail endpoint also lacks these fields):
```typescript
// Add to the getSession response object:
errorMessage: s.status.toString() === 'failed' ? s.errorMessage : undefined,
errorCode: s.status.toString() === 'failed' ? s.errorCode : undefined,
failedAtStep: s.status.toString() === 'failed' ? s.currentStepIndex : undefined,
```

**Risk**: Low — domain fields already exist on the entity. Both endpoints must expose them for consistency.

### Step 4: Populate `lastArtifactId`, `lastArtifactPreview`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

**DDD constraint**: There is no `ArtifactRepository` — artifacts are owned entities of the Session aggregate (DDD Rule 5). Creating a separate repository would violate aggregate boundaries. Instead, add a read-optimized method to `SessionRepository`.

**Option A — Add method to `SessionRepository` interface** (recommended):

`packages/domain/src/generation/repositories/SessionRepository.ts`:
```typescript
interface SessionRepository {
  // ... existing methods
  findLastArtifactsBySessionIds(sessionIds: string[]): Promise<Map<string, Artifact>>;
}
```

`packages/infra-db/src/repositories/session-repository.ts`:
```typescript
async findLastArtifactsBySessionIds(sessionIds: string[]): Promise<Map<string, Artifact>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await this.db
    .selectFrom('artifacts')
    .where('session_id', 'in', sessionIds)
    .selectAll()
    .orderBy('step_number', 'asc')
    .execute();
  
  const map = new Map<string, Artifact>();
  for (const r of rows) {
    map.set(r.session_id, Artifact.reconstitute(
      r.id, r.session_id, r.step_number, r.content,
      ArtifactStatus.from(r.status), r.created_at,
    ));
  }
  return map;
}
```

**Option B — Raw Kysely in handler** (consistent with `getSession`):
```typescript
const sessionIds = sessions.map(s => s.sessionId);
const artifactRows = await db
  .selectFrom('artifacts')
  .where('session_id', 'in', sessionIds)
  .selectAll()
  .execute();
const artifactMap = new Map<string, string>();
for (const r of artifactRows) {
  if (!artifactMap.has(r.session_id)) {
    artifactMap.set(r.session_id, r.content?.slice(0, 150));
  }
}

data: sessions.map((s) => ({
  lastArtifactId: [...] // map from artifactRows
  lastArtifactPreview: artifactMap.get(s.sessionId),
}))
```

**Risk**: Medium — Option A adds a new repository method (preferred for DDD consistency). Option B is simpler but less testable.

### Step 5: Populate `isPromotable`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

Uses the same `toolDefMap` from Step 2:

```typescript
data: sessions.map((s) => ({
  // ... existing fields
  isPromotable: !!(toolDefMap.get(s.toolKey)?.produces),
}))
```

**Risk**: Low — `produces` field exists on tool definitions.

### Step 6: Populate `elapsedSeconds`, `durationSeconds`

**`elapsedSeconds`**: Compute from `createdAt` (or `startedAt`) for running sessions:
```typescript
elapsedSeconds: s.status.toString() === 'running' && s.startedAt
  ? Math.floor((Date.now() - s.startedAt.getTime()) / 1000)
  : undefined,
```

**`durationSeconds`**: Compute from `startedAt` and `completedAt`:
```typescript
durationSeconds: s.completedAt && s.startedAt
  ? Math.floor((s.completedAt.getTime() - s.startedAt.getTime()) / 1000)
  : undefined,
```

**`queuePosition`**: DEFERRED to separate investigation.

The DB has no `queue_position` column. BullMQ's `Queue.getJobs(['waiting'])` can compute position but requires inspecting how job IDs map to session IDs. This is a P3 task:

```typescript
// Separate investigation needed before this can be implemented:
// const waitingJobs = await sessionQueue.getJobs(['waiting'], 0, 500);
// const position = waitingJobs.findIndex(j => j.data.sessionId === s.sessionId);
// queuePosition: s.status.toString() === 'queued' ? position : undefined,
```

**Risk**: Low for elapsed/duration (simple math). Deferred for queuePosition.

### Step 7: Fix `step_completed` SSE payload

**File**: `apps/backend/src/infrastructure/session-worker.ts` (line ~157)

```typescript
// ❌ Current
deps.eventBridge.publish(sessionId, {
  event: 'step_completed',
  data: { sessionId, status: state.value, stepNumber: state.context.currentStepIndex ?? 0 },
});

// ✅ Correct
const artifact = state.context.artifacts[state.context.artifacts.length - 1];
deps.eventBridge.publish(sessionId, {
  event: 'step_completed',
  data: {
    sessionId,
    stepNumber: state.context.currentStepIndex ?? 0,
    stepLabel: state.context.currentStepLabel ?? `Step ${state.context.currentStepIndex}`,
    progress: {
      current: (state.context.currentStepIndex ?? 0) + 1,
      total: state.context.stepCount ?? 1,
    },
    artifact: artifact ? {
      id: artifact.id,
      stepNumber: artifact.stepNumber,
      status: artifact.status,
      createdAt: artifact.createdAt?.toISOString(),
      sessionId: artifact.sessionId,
      content: artifact.content,
    } : undefined,
  },
});
```

**Risk**: Medium — artifact content may be large. Consider adding `contentPreview` (first 500 chars) instead of full content for SSE efficiency.

### Step 8: Fix `session_completed` SSE payload

**File**: `apps/backend/src/infrastructure/session-worker.ts` (line ~199)

```typescript
// ❌ Current
deps.eventBridge.publish(sessionId, {
  event: 'session_completed',
  data: { sessionId, status: 'completed' },
});

// ✅ Correct
const finalArtifact = session.artifacts[session.artifacts.length - 1];
deps.eventBridge.publish(sessionId, {
  event: 'session_completed',
  data: {
    sessionId,
    status: 'completed',
    finalArtifact: finalArtifact ? {
      id: finalArtifact.id,
      stepNumber: finalArtifact.stepNumber,
      status: finalArtifact.status,
      createdAt: finalArtifact.createdAt?.toISOString(),
      sessionId: finalArtifact.sessionId,
      content: finalArtifact.content,
    } : undefined,
    completedAt: session.completedAt?.toISOString(),
  },
});
```

**Risk**: Low — final artifact is already persisted at this point.

### Step 9: Publish `session_started` and `session_failed` events

**`session_started`**: Emit when the session transitions to `running` in the worker:

**DDD note**: Use the domain entity's `startedAt`, not `new Date()` — the infra layer must not invent timestamps the domain already owns:

```typescript
// At the start of worker execution, after session status = 'running'
deps.eventBridge.publish(sessionId, {
  event: 'session_started',
  data: { sessionId, status: 'running', startedAt: session.startedAt!.toISOString() },
});
```

**`session_failed`**: Emit when the worker catches an error:
```typescript
// In the catch block
deps.eventBridge.publish(sessionId, {
  event: 'session_failed',
  data: {
    sessionId,
    status: 'failed',
    failedAtStep: session.currentStepIndex,
    error: { code: error.code ?? 'UNKNOWN', message: error.message },
  },
});
```

**Risk**: Low — additive events. Frontend already listens for them.

### Step 10: Add `GET /api/workspaces/:id/activity` endpoint

**File**: `apps/backend/src/api/gamification/gamification-routes.ts` (new handler)

Gamification routes are mounted via `app.use(gamificationRoutes)`, not in `workspaces.ts`:

```typescript
// Add to the router
router.get('/api/workspaces/:id/activity', async (req, res) => {
  const workspaceId = req.params.id;
  // Query recent session activity for the workspace
  const recentSessions = await sessionRepo.findAll({ workspaceId, limit: 10 });
  const activeUsers = recentSessions
    .filter(s => s.status.toString() === 'running' || s.status.toString() === 'completed')
    .map(s => ({
      name: s.userId, // TODO: resolve to display name
      lastAction: s.startedAt?.toISOString() ?? s.createdAt.toISOString(),
      actionType: s.status.toString() === 'running' ? 'generating' : 'completed',
    }));
  res.json({ activeUsers });
});
```

**Risk**: Low — read-only endpoint. Returns empty array if no activity.

### Step 11: Add `POST /api/workspaces/:id/challenges/vote` endpoint

**File**: `apps/backend/src/api/gamification-routes.ts` (new handler)

```typescript
voteChallenge: async (req, res) => {
  const workspaceId = req.params.id;
  const { challengeId, vote } = req.body;
  // TODO: implement vote persistence when challenge voting domain is built
  res.json({ voted: true });
},
```

**Risk**: Low — stub endpoint. Returns success until domain is implemented.

---

## Data Flow Summary

```
Session Worker (XState actor)
  ├─ session_started → eventBridge.publish → SSE → frontend machine (SESSION_STARTED)
  ├─ step_completed  → eventBridge.publish → SSE → frontend machine (STEP_COMPLETED)
  ├─ session_completed → eventBridge.publish → SSE → frontend machine (SESSION_COMPLETED)
  └─ session_failed  → eventBridge.publish → SSE → frontend machine (SESSION_FAILED)

GET /api/sessions (list)
  ├─ sessionRepo.findAll() → sessions[]
  ├─ artifactRepo.findLastBySessionIds() → lastArtifacts
  └─ mapper → SessionListItemDTO[] (16 fields)

GET /api/sessions/:id (detail)
  └─ sessionRepo.findById() → Session (with artifacts) → SessionDetailDTO
```

## Priority Order (Resolved 2026-08-11)

| Step | Effort | Impact | Status |
|------|--------|--------|--------|
| 0. Add `createdAt` to domain entity | 30min | Foundation for correct timestamps | ✅ Resolved |
| 1. Fix createdAt in API | 5min | Correct timestamps (depends on Step 0) | ✅ Resolved |
| 2. stepCount | 15min | Card shows step count | ✅ Resolved |
| 3. currentStepIndex, currentStepLabel, completedAt, errorMessage, errorCode (list + detail) | 20min | Card status info + detail consistency | ✅ Resolved |
| 7. Fix step_completed SSE | 30min | Live progress + artifact preview | ✅ Resolved |
| 8. Fix session_completed SSE | 15min | Final artifact in SSE | ✅ Resolved |
| 9. Publish session_started/failed | 20min | SSE event coverage (use domain startedAt) | ✅ Resolved |
| 4. lastArtifactId/Preview (SessionRepository method) | 45min | Card artifact preview | ✅ Resolved |
| 5. isPromotable | 5min | Promote button on cards | ✅ Resolved |
| 6. elapsed/duration | 10min | Time display | ✅ Resolved |
| 6b. queuePosition (deferred) | — | Queue position — stub `undefined` | 🔵 Deferred |
| 10. GET /activity | 15min | Gamification UX | ✅ Resolved |
| 11. POST /challenges/vote | 10min | Gamification UX | ✅ Resolved |

**Total estimated effort**: ~3h (core) + deferred queuePosition investigation

## Testing

- Verify `GET /api/sessions` returns all 16 fields (with `?` for optional)
- Verify SSE events match contract types in `packages/contracts/src/generation/events.ts`
- Verify backward compatibility: old frontend clients ignore new fields
- Verify `createdAt` maps to `created_at` DB column, not `started_at`

## Sources

- [[frontend-drift-remediation-plan-2026-08-07]] — Phase 3 contract changes
- [[API Contract Baseline v1]] — current API contract
- [[API Routes]] — route inventory
- [[Session]] — domain entity
- [[SessionRepository]] — persistence interface
