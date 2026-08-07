---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/backend
  - wiki/contracts
  - wiki/plan
date_updated: 2026-08-07
source_count: 5
confidence: high
---

# Backend Coordination Plan — SessionListItemDTO & SSE Alignment

> Coordinates backend changes required by [[frontend-drift-remediation-plan-2026-08-07|Phase 3]] of the frontend drift remediation.
> The frontend now expects 16 fields on `SessionListItemDTO` and artifact content in SSE events. The backend currently returns 5 fields and omits artifact data from SSE payloads.

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

### Step 1: Fix `createdAt` mapping in `listSessions` response

**File**: `apps/backend/src/api/generation.ts` (line ~68)

```typescript
// ❌ Current
createdAt: s.startedAt?.toISOString() ?? new Date().toISOString(),

// ✅ Correct
createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
```

**Risk**: Low — single field change. Verify `Session` entity exposes `createdAt` (it does via domain).

### Step 2: Populate `stepCount` from tool definition

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

```typescript
// Load tool definitions once, map stepCount per session
const toolDefs = await toolRegistry.getAll();
const toolDefMap = new Map(toolDefs.map(t => [t.key, t]));

data: sessions.map((s) => ({
  // ... existing fields
  stepCount: toolDefMap.get(s.toolKey)?.stepCount ?? 1,
}))
```

**Risk**: Low — tool definitions are cached. `stepCount` is an optional field on `SessionListItemDTO`.

### Step 3: Populate `currentStepIndex`, `completedAt`, `errorMessage`, `failedAtStep`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

These fields already exist on the domain `Session` entity but are not mapped:

```typescript
data: sessions.map((s) => ({
  // ... existing fields
  currentStepIndex: s.status.toString() === 'running' ? s.currentStepIndex : undefined,
  completedAt: s.completedAt?.toISOString() ?? undefined,
  errorMessage: s.status.toString() === 'failed' ? s.errorMessage : undefined,
  failedAtStep: s.status.toString() === 'failed' ? s.currentStepIndex : undefined,
}))
```

**Risk**: Low — domain fields already exist.

### Step 4: Populate `lastArtifactId`, `lastArtifactPreview`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

Requires joining artifacts in the list query OR a separate batch query:

```typescript
// Option A: Separate batch query (recommended — avoids N+1 on the main query)
const sessionIds = sessions.map(s => s.sessionId);
const lastArtifacts = await artifactRepo.findLastBySessionIds(sessionIds);
const artifactMap = new Map(lastArtifacts.map(a => [a.sessionId, a]));

data: sessions.map((s) => ({
  // ... existing fields
  lastArtifactId: artifactMap.get(s.sessionId)?.id,
  lastArtifactPreview: artifactMap.get(s.sessionId)?.content?.slice(0, 150),
}))
```

**Risk**: Medium — requires new `findLastBySessionIds` method on `ArtifactRepository`. Verify index on `artifacts(session_id, step_number)`.

### Step 5: Populate `isPromotable`

**File**: `apps/backend/src/api/generation.ts` (`listSessions` handler)

```typescript
data: sessions.map((s) => ({
  // ... existing fields
  isPromotable: !!toolDefMap.get(s.toolKey)?.produces,
}))
```

**Risk**: Low — `produces` field exists on tool definitions.

### Step 6: Populate `elapsedSeconds`, `durationSeconds`, `queuePosition`

**`elapsedSeconds`**: Compute from `startedAt` for running sessions:
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

**`queuePosition`**: Requires queue awareness. If BullMQ provides job position:
```typescript
queuePosition: s.status.toString() === 'queued'
  ? await jobQueue.getPosition(s.sessionId)
  : undefined,
```

**Risk**: Medium — `queuePosition` depends on BullMQ API. `elapsedSeconds` is computed at request time (stale by 1 poll interval — acceptable for 30s poll).

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
```typescript
// At the start of worker execution, after session status = 'running'
deps.eventBridge.publish(sessionId, {
  event: 'session_started',
  data: { sessionId, status: 'running', startedAt: new Date().toISOString() },
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

**File**: `apps/backend/src/api/workspaces.ts` (new handler)

```typescript
getActivity: async (req, res) => {
  const workspaceId = req.params.id;
  // Query recent session activity for the workspace
  const recentSessions = await sessionRepo.findAll({ workspaceId, limit: 10 });
  const activeUsers = recentSessions
    .filter(s => s.status.toString() === 'running' || s.status.toString() === 'completed')
    .map(s => ({
      name: s.userId, // TODO: resolve to display name
      lastAction: s.startedAt?.toISOString() ?? s.createdAt?.toISOString(),
      actionType: s.status.toString() === 'running' ? 'generating' : 'completed',
    }));
  res.json({ activeUsers });
},
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

## Priority Order

| Step | Effort | Impact | Priority |
|------|--------|--------|----------|
| 1. Fix createdAt | 5min | Correct timestamps | P0 |
| 2. stepCount | 15min | Card shows step count | P0 |
| 3. currentStepIndex, completedAt, errorMessage | 15min | Card status info | P0 |
| 7. Fix step_completed SSE | 30min | Live progress + artifact preview | P0 |
| 8. Fix session_completed SSE | 15min | Final artifact in SSE | P0 |
| 9. Publish session_started/failed | 20min | SSE event coverage | P1 |
| 4. lastArtifactId/Preview | 30min | Card artifact preview | P1 |
| 5. isPromotable | 5min | Promote button on cards | P1 |
| 6. elapsed/duration/queue | 30min | Time + queue display | P2 |
| 10. GET /activity | 15min | Gamification UX | P2 |
| 11. POST /challenges/vote | 10min | Gamification UX | P2 |

**Total estimated effort**: ~3h

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
