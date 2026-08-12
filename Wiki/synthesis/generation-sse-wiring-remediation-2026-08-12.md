---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/backend
  - wiki/plan
date_updated: 2026-08-12
source_count: 6
confidence: high
resolution: pending — plan approved, implementation deferred
---

# Generation SSE & FE Wiring — Unified Remediation Plan

> End-to-end diagnostic (15 files, 4 audits) + unified remediation (13 files, ~110 lines)  
> Fixes: duplicate SSE events (2N-1→N), error propagation, label bugs, timer drift, UI disorganization

## Root Cause

The backend XState `actor.subscribe()` publishes `step_completed` on **every state transition**, not just step completion. The machine flow is:

```
executingStep → persistingStep → stepCompleted → always → executingStep (...or #session.completed)
```

Each step produces 2 transitions through the subscriber — one correct, one duplicate with inflated `stepNumber` and `progress.current`. For N steps: `2N-1` events instead of `N`.

The frontend partially masks this via `artifact.stepNumber` dedup in `useSession`, but:
- `progress.current` values are still briefly inflated (causing "one step ahead" visual)
- `useLiveSession` (SessionList) has no dedup — cards show wrong step counts
- `currentStepLabel` reads wrong field (`progress.label` doesn't exist)
- `session_started` event completely ignored → queued→running transition invisible via SSE
- REST artifacts lost on mount → blank FeedbackPanel for already-running sessions
- Timer uses mount time, not `session.startedAt`

---

## Diagnostic Summary

### 🔴 CRITICAL — Functional Bugs

| # | Finding | File | Root Cause |
|---|---------|------|------------|
| B1 | Duplicate `step_completed` events (2N-1) | `apps/backend/src/generation/worker/session-worker.ts:179-208` | Subscriber fires on every XState transition; no filter for already-published artifacts |
| B2 | `currentStepLabel` always `undefined` in SessionList | `apps/frontend/src/api/hooks.ts:112` | Reads `progress.label` — field doesn't exist in SSE payload; correct path is `data.stepLabel` |
| B3 | `session_started` ignored by both hooks | `apps/frontend/src/api/hooks.ts` | Neither `useSession` nor `useLiveSession` registers `onStarted` callback |

### 🟠 HIGH — UX Misalignments

| # | Finding | File |
|---|---------|------|
| H1 | `ElapsedTimer` uses mount time, not `session.startedAt` | `apps/frontend/src/components/tool/FeedbackPanel.tsx:128` |
| H2 | REST artifacts lost on mount (`stepArtifacts` reset to `[]`) | `apps/frontend/src/api/hooks.ts:38` |
| H3 | Non-quota errors silently swallowed | `apps/frontend/src/components/layout/ToolPageLayout.tsx:164-166` |
| H4 | `onCompleted`/`onFailed` discard SSE payload, refetch REST | `apps/frontend/src/api/hooks.ts:62-63, 119-142` |
| H5 | Three different architectures for same SSE data | `useSession` (React state), `useLiveSession` (React state), ToolPage machine (XState) |

### 🟡 MEDIUM — UI Disorder & Duplication

| # | Finding | File |
|---|---------|------|
| M1 | `toolKey → toolLabel` transform duplicated 6× | `*Card.tsx` (×4), `SessionPage.tsx`, `SessionList.tsx` |
| M2 | `formatElapsed` / `formatDuration` identical functions, different names | `RunningCard.tsx`, `CompletedCard.tsx` |
| M3 | CompletedCard has no visual accent (other 3 cards do) | `CompletedCard.tsx:40` |
| M4 | `submitted` maps to `'submitting'` UI — stuck screen risk | `ToolPageLayout.tsx:27` |
| M5 | File read errors silently drop files from submission | `tool-page-machine.ts:94-100` |

### 🔵 LOW — Code Quality

| # | Finding |
|---|---------|
| L1 | Duplicated validation: `requiredMissing` vs `canSubmitGuard` |
| L2 | `RESET` event unreachable — no component sends it |
| L3 | `FeedbackPanel` dead-code check (`completed`/`failed` unreachable) |

---

## Unified Remediation Plan

### Implementation Order (by dependency)

```
BACKEND (deploy first — fixes data at source)
├── Step 1: session-machine.ts — failSession action (+6 lines, ×2 edits)
└── Step 2: session-worker.ts — subscriber by artifact count (~30 lines replaced)
         │
         ▼  (SSE now publishes exactly N events for N steps)
         │
FRONTEND (parallel batches where independent)
├── Batch A: Step 3 (session-utils.ts NEW) + Step 7 (4 card files)
├── Batch B: Step 4 (hooks.ts — 3 fixes)
├── Batch C: Step 5 (FeedbackPanel.tsx) + Step 6 (SessionPage.tsx)
├── Batch D: Step 8 (ToolPageLayout.tsx)
└── Batch E: Step 9 (tool-page-machine.ts)
```

### Backend

#### Step 1: `session-machine.ts` — Propagate actual error info

**File**: `apps/backend/src/generation/machines/session-machine.ts`

Add `failSession` action that applies `FAIL` to the session aggregate with the actual error from the XState error event (currently hardcoded defaults). Attach to both `onError` handlers in `executingStep` and `persistingStep`.

```typescript
failSession: ({ context, event }) => {
  const err = (event as unknown as { error: Error & { code?: string } }).error;
  context.session.apply({
    type: 'FAIL',
    errorCode: err?.code ?? 'SESSION_FAILED',
    errorMessage: err?.message ?? 'Session failed',
  });
},
```

#### Step 2: `session-worker.ts` — Filter subscriber by artifact count

**File**: `apps/backend/src/generation/worker/session-worker.ts`, lines 177-208

Replace the entire `actor.subscribe()` block. Use a `lastPublishedArtifactCount` counter — only publish when `stepResults.length > lastPublishedArtifactCount`. This eliminates setup-transition events (artifact: null), duplicate state transitions, and inflated `stepNumber`/`progress.current` from `stepCompleted → executingStep`.

Also uses `artifact.stepNumber` (1-based from entity) instead of `currentStepIndex` (0-based from context), and `progress.current = artifactCount` (1:1 with stepResults, no offset).

**Result**: exactly N events for N-step tool. Zero `artifact: null` events. Error publishing already reads `session.errorCode`/`session.errorMessage` — Step 1's `failSession` action makes those carry actual error info.

### Frontend

#### Step 3: New shared utility `session-utils.ts`

**File**: `apps/frontend/src/shared/session-utils.ts` (NEW)

Extract two functions duplicated across 6+ files:

- `formatToolLabel(toolKey: string): string` — `"blog-post"` → `"Blog Post"`
- `formatElapsedSeconds(seconds: number | undefined | null): string` — `45` → `"45s"`, `125` → `"2m 5s"`

#### Step 4: `hooks.ts` — Three targeted fixes

**File**: `apps/frontend/src/api/hooks.ts`

- **B2** (line 112): `progress.label` → `data.stepLabel as string | undefined`
- **B3**: Add `onStarted` callback to both `useSession` and `useLiveSession` — updates `status: 'running'` and `startedAt`
- **H2** (lines 38-42): After `api.getSession().then()`, also seed `stepArtifacts` from `session.artifacts` when non-empty, so FeedbackPanel shows existing content immediately on mount

#### Step 5: `FeedbackPanel.tsx` — Accept `startedAt` prop, remove dead code

**File**: `apps/frontend/src/components/tool/FeedbackPanel.tsx`

- **H1**: Add optional `startedAt?: string | null` prop. If provided, seed `ElapsedTimer` with `new Date(startedAt).getTime()` instead of `Date.now()`.
- **L3**: Remove unreachable `if (status === 'completed' || status === 'failed') return null` block.

#### Step 6: `SessionPage.tsx` — Pass `startedAt`, use shared utility

**File**: `apps/frontend/src/pages/SessionPage.tsx`

- Add `startedAt={session.startedAt}` to `<FeedbackPanel>`
- Replace inline `toolKey.replace(...)` with `formatToolLabel(session.toolKey)`

#### Step 7: Card components — Extract utilities, add visual accent

**Files**: `QueuedCard.tsx`, `RunningCard.tsx`, `CompletedCard.tsx`, `FailedCard.tsx`

All four:
- Import `formatToolLabel` from `../../shared/session-utils`
- Remove inline `toolKey.replace(...)` duplicate

`RunningCard.tsx` + `CompletedCard.tsx`:
- Import `formatElapsedSeconds`, remove local `formatElapsed`/`formatDuration`

`CompletedCard.tsx` (M3):
- Add `sx={{ borderLeft: 3, borderLeftColor: 'success.main' }}` to Card

#### Step 8: `ToolPageLayout.tsx` — Generic error alert + escape hatch

**File**: `apps/frontend/src/components/layout/ToolPageLayout.tsx`

- **H3**: Add catch-all `<Alert>` for errors with code ≠ `QUOTA_EXCEEDED`/`ARTIFACT_GATE_EXCEEDED`
- **M4**: After 5s in `submitted` state without redirect, show retry button — uses `send({ type: 'RESET' })` to escape the stuck screen

#### Step 9: `tool-page-machine.ts` — Surface errors + allow RESET in submitted

**File**: `apps/frontend/src/machines/tool-page-machine.ts`

- **M5**: Replace silent `catch {}` with `throw new Error(...)` — surfaces file read failures to the user via the error alert
- **M4**: Remove `type: 'final'` from `submitted` state; add `on: { RESET: { target: 'draftEmpty' } }`

---

## Verification

```bash
# Backend
cd apps/backend && npx vitest run src/generation/__tests__/session-worker.test.ts
# T4, T5, T6 must pass unchanged (count-based filter compatible with mocks)

# Frontend
cd apps/frontend && npx vitest run
# All existing tests pass (formatToolLabel produces identical output)

# TypeScript
cd apps/backend && npx tsc --noEmit    # ✅
cd apps/frontend && npx tsc --noEmit   # ✅
```

### Manual scenarios

| Scenario | Expected |
|----------|----------|
| Open already-running session | FeedbackPanel shows existing step artifacts immediately (not all "pending") |
| Open session 30s after generation start | Timer shows ~30s, not 00:00 |
| Start new generation, watch SessionList | `stepLabel` visible on RunningCard |
| Watch SessionList during generation start | QueuedCard transitions to RunningCard via `session_started` |
| Submit with corrupt file | Error alert appears, user stays on setup page |
| Network failure on submit | Error alert with specific message |
| Completed card in session list | Green left border accent |

---

## Blast Radius

**13 files total** (2 backend, 11 frontend — 1 new, 12 modified), ~110 net lines changed.

| Area | Files | Risk |
|------|-------|------|
| Backend | `session-machine.ts`, `session-worker.ts` | Low — additive only, no test changes needed |
| Frontend shared | `session-utils.ts` (new) | None — pure functions |
| Frontend hooks | `hooks.ts` | Medium — touches SSE consumption in 2 hooks |
| Frontend components | `FeedbackPanel.tsx`, `SessionPage.tsx`, 4 card files, `ToolPageLayout.tsx` | Low — import swaps + prop additions |
| Frontend machine | `tool-page-machine.ts` | Medium — state definition change (final → non-final) |

**Deferred items** (out of scope):
- Full unification of `useSession` + `useLiveSession` into single hook (low ROI — shared SSE client already handles the real duplicated concern)
- L1 (duplicated validation) — `requiredMissing` check serves Button `disabled` prop independently of XState guard; requires wiring button state through machine selector
- L2 (RESET dead code) — Step 9 adds `RESET` in `submitted`; the `configuring` RESET handler remains dead but harmless
- `queuePosition` and `xpEarned` — known deferred gaps, not addressed by this plan

## Sources

- [[API Client + SSE Client]] — SSE client implementation
- [[Session Machine (XState v5)]] — Backend XState machine definition
- [[ToolPage Machine (XState v5)]] — Frontend XState machine definition
- [[Session List - Live Status]] — SessionList component spec
- [[SessionPage]] — Canonical session detail page
- [[Tool UX Architecture]] — Tool page UX spec
