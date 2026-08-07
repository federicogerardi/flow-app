---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/plan
date_updated: 2026-08-07
source_count: 8
confidence: high
---

# Frontend Drift Remediation Plan — 2026-08-07

> Phased remediation of 27 findings from [[frontend-drift-report-2026-08-07]].
> 8 phases, each independently deliverable and mergeable.
> Dependency chain: Phase 1 → Phase 2 → Phase 3 → Phase 4 • Phase 5 • Phase 6 • Phase 7 • Phase 8

## Overview

27 drift findings across the Flow App frontend were identified comparing the actual codebase (`apps/frontend/src/`) against canonical UX wiki specifications. This plan fixes all 27 findings in 8 phases. Phases 1–3 are **critical and sequential** (each blocks the next). Phases 4–8 are **parallelizable** once Phase 3 is complete. Each phase is independently mergeable into `dev`.

## Requirements

- Fix all 15 Critical + 12 High drift findings from the audit report
- Align XState machine with [[ToolPage Machine (XState v5)|canonical spec]]
- Align ToolPageLayout to derive UI state from the machine (zero local overrides)
- Extend DTOs and SSE contracts to match [[Session List - Live Status|4-state card system spec]]
- Implement the 4-state SessionCard system per spec
- Fix all individual component signature/behavior drifts
- Complete design tokens per [[Design Tokens]]
- Add missing routes, nav items, and accessibility attributes

## Architecture Changes

| File | Change | Phase |
|------|--------|-------|
| `apps/frontend/src/machines/tool-page-machine.ts` | Complete rewrite to canonical spec (8 states, 2 actors, 2 guards, 8 actions, full context) | 1 |
| `apps/frontend/src/components/layout/ToolPageLayout.tsx` | Remove local state; derive UI from machine via `deriveUIState()` | 2 |
| `packages/contracts/src/generation/session.dto.ts` | Add 10 fields to `SessionListItemDTO` | 3 |
| `packages/contracts/src/generation/events.ts` | Add artifact content to SSE event payloads | 3 |
| `apps/frontend/src/api/client.ts` | Add `getWorkspaceActivity`, `voteChallenge` methods | 3 |
| `apps/frontend/src/components/workspace/SessionList.tsx` | Full rewrite: 3-tab interface + 4 card variants | 4 |
| `apps/frontend/src/components/workspace/QueuedCard.tsx` | NEW | 4 |
| `apps/frontend/src/components/workspace/RunningCard.tsx` | NEW | 4 |
| `apps/frontend/src/components/workspace/CompletedCard.tsx` | NEW | 4 |
| `apps/frontend/src/components/workspace/FailedCard.tsx` | NEW | 4 |
| `apps/frontend/src/api/hooks.ts` | Add `useLiveSession` hook | 4 |
| `apps/frontend/src/components/LoadingSkeleton.tsx` | Add `variant` prop with 8 layout variants | 5 |
| `apps/frontend/src/theme/tokens.ts` | Add rarity, gradient, shadow tokens | 6 |
| `apps/frontend/src/theme/WorkspaceAccentProvider.tsx` | Add `--workspace-accent-light` CSS var | 6 |
| `apps/frontend/src/App.tsx` | Add `/templates`, `/audit` routes | 7 |
| `apps/frontend/src/layout/AppShell.tsx` | Add ⚡ Tools nav item | 7 |
| Multiple component files | Accessibility attributes (7 components) | 8 |

---

## Implementation Steps

### Phase 1: XState Machine Foundation (CRITICAL — blocks Phases 2–8)

**Scope**: Complete rewrite of `tool-page-machine.ts` to canonical spec.
**Dependencies**: None.
**Deliverable**: A fully conformant `toolPageMachine` with all 8 states, 2 actors, 2 guards, 8 actions, and full context ready for ToolPageLayout to consume.

#### 1.1 Rewrite ToolPageContext (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Replace the 6-field context with the 8-field canonical context:
  ```typescript
  interface ToolPageContext {
    tool: ToolDefinition | null;
    workspaceId: string;
    inputs: {
      text: Record<string, string>;
      files: Record<string, File>;
      selectedAssetIds: string[];
      selectedAssetsByType: Partial<Record<AssetType, string>>;
    };
    session: SessionDTO | null;
    artifacts: ArtifactDTO[];
    progress: StepProgress | null;
    error: { code: string; message: string } | null;
  }
  ```
- **Why**: Current flat `Record<string, string>` for inputs cannot represent files, assets, or multi-type acquisition. Missing `tool`, `workspaceId`, `session`, `artifacts`, `progress` fields mean the machine has no visibility of server state.
- **Risk**: Medium — type imports from `@flow-app/contracts` and `@flow-app/domain` must be available.
- **Drift findings covered**: #2 (critical), #9 (high, flat props).

#### 1.2 Rewrite ToolPageEvent union (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Replace current 7-event union with 11-event canonical union:
  ```typescript
  type ToolPageEvent =
    | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }        // NEW
    | { type: 'CONFIGURE'; inputs: Partial<ToolPageContext['inputs']> }   // CHANGED from {key,value}
    | { type: 'SUBMIT' }
    | { type: 'CANCEL' }
    | { type: 'SESSION_STARTED'; session: SessionDTO }                    // CHANGED from {sessionId}
    | { type: 'STEP_COMPLETED'; artifact: ArtifactDTO; progress: StepProgress } // NEW
    | { type: 'SESSION_COMPLETED'; finalArtifact: ArtifactDTO }           // CHANGED from {}
    | { type: 'SESSION_FAILED'; error: { code: string; message: string } } // CHANGED shape
    | { type: 'RETRY' }                                                   // NEW
    | { type: 'RESET' };
  ```
- **Why**: `STEP_COMPLETED` is missing entirely (finding #3). `RETRY` is missing (finding #3 of High). `CONFIGURE` uses flat `{key,value}` instead of partial `{inputs}` preventing file and asset updates. `SESSION_STARTED`/`SESSION_COMPLETED` carry insufficient data for downstream panels.
- **Risk**: Low — Event definitions are pure types.

#### 1.3 Add actors (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Add two actors inside `setup({ actors: {...} })`:
  1. **`submitSession`**: `fromPromise` calling `POST /api/tools/{toolKey}/sessions` with `{ workspaceId, inputs }`, returns `SessionDTO`, throws on error (already exists in `api.client.ts` as `api.startSession()` — call it directly).
  2. **`subscribeToSSE`**: `fromCallback` creating an `EventSource` to `/api/sessions/{sessionId}/events` with 5 SSE event handlers (`session_started`, `step_completed`, `session_completed`, `session_failed`, `onerror`) each calling `sendBack()` with the appropriate typed event.
- **Why**: Current machine has no actors — `submitSession` and SSE subscription happen in ToolPageLayout's `handleSubmit()` (finding #1, critical). Actors in the machine make state transitions deterministic and testable.
- **Risk**: Medium — `subscribeToSSE` replaces the existing `sseClient` class; ensure cleanup function properly closes `EventSource`.

#### 1.4 Add guards (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Add two guards inside `setup({ guards: {...} })`:
  1. **`canSubmit`**: Checks all required `tool.acquisition.userText` (non-empty text), required `tool.acquisition.files` (file present), required `tool.acquisition.assets` (asset selected by type). Returns boolean.
  2. **`isStillDraft`**: Returns `true` when `context.inputs.text` and `context.inputs.files` are both empty.
- **Why**: `canSubmit` is currently evaluated in ToolPageLayout as `requiredMissing` (finding #1). `isStillDraft` allows clean reset from configuring to draftEmpty.
- **Risk**: Low — Guards are pure functions over context.

#### 1.5 Add all 8 assign actions (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Add actions inside `setup({ actions: {...} })`:
  1. **`setTool`**: assigns `tool`, `workspaceId`, and resets `inputs` to empty defaults.
  2. **`updateInputs`**: deep-merges `event.inputs` into `context.inputs` (text, files, selectedAssetsByType).
  3. **`setSession`**: assigns `session` from event.
  4. **`addArtifact`**: appends `event.artifact` to `context.artifacts`.
  5. **`setProgress`**: assigns `event.progress`.
  6. **`setError`**: assigns `event.error`.
  7. **`setFinalArtifact`**: appends `event.finalArtifact` to `context.artifacts`.
  8. **`reset`**: clears `session`, `artifacts`, `progress`, `error`.
- **Why**: Current machine has only 3 inline `assign()` calls (inputs update, sessionId, error/errorCode). The 8 canonical actions provide granular, named state updates.
- **Risk**: Low — Assign actions are standard XState patterns.

#### 1.6 Add missing states and transitions (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Change `initial: 'draftEmpty'` (was `'configuring'`). Add states per canonical spec:
  - **`draftEmpty`**: on `LOAD` → `configuring` with `setTool` action.
  - **`configuring`**: on `CONFIGURE` re-enter with `updateInputs`; on `RESET` guarded by `isStillDraft` → `draftEmpty`; `always` transition to `ready` when `canSubmit` passes.
  - **`ready`**: on `CONFIGURE` → `configuring` (re-evaluate); on `SUBMIT` → `submitting` with `reset` action.
  - **`submitting`**: `invoke submitSession`; `onDone` → `running` with `setSession`; `onError` → `ready` with `setError` (not `failed` — user can retry).
  - **`running`**: `invoke subscribeToSSE`; handle `STEP_COMPLETED` (actions: `addArtifact`, `setProgress`), `SESSION_COMPLETED` (target: `completed`, actions: `setFinalArtifact`), `SESSION_FAILED` (target: `failed`, action: `setError`), `CANCEL` (target: `cancelled`).
  - **`completed`**: on `RETRY` → `ready` with `reset`; on `RESET` → `draftEmpty`.
  - **`failed`**: on `RETRY` → `submitting` with `reset`; on `RESET` → `draftEmpty`.
  - **`cancelled`**: on `RETRY` → `submitting` with `reset`; on `RESET` → `draftEmpty`.
- **Why**: Six findings fixed here: missing `draftEmpty`/`ready` states (#2 critical, #2 high), no `always` transition (#1), wrong retry targets (#3 high — `RESET → configuring` instead of `RETRY → ready|submitting`), no actor invocations.
- **Risk**: Medium — The `always` transition in `configuring` requires that `canSubmit` guard is correct; test with all 11 tool definitions.

#### 1.7 Initialize context with defaults (File: `apps/frontend/src/machines/tool-page-machine.ts`)
- **Action**: Set initial context:
  ```typescript
  context: {
    tool: null, workspaceId: '',
    inputs: { text: {}, files: {}, selectedAssetIds: [], selectedAssetsByType: {} },
    session: null, artifacts: [], progress: null, error: null,
  }
  ```
- **Why**: Current init has `inputs: {}`, `sessionId: null`, missing `tool`, `workspaceId`, `artifacts`, `progress`.
- **Risk**: Low.

---

### Phase 2: Wire ToolPageLayout to XState (CRITICAL — blocks Phases 4–8)

**Scope**: Rewrite `ToolPageLayout.tsx` to use the machine as the single source of truth.
**Dependencies**: Phase 1 complete.
**Deliverable**: ToolPageLayout derives all UI state from `deriveUIState(state)`, passes `send()` to children, zero local overrides.

#### 2.1 Remove local state overrides (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Delete `phaseOverride`, `localSessionId`, `localError`, `localErrorCode`, `submitting` state variables (lines 52–56).
- **Why**: These bypass the XState machine entirely (#2 critical finding). The machine should own all phase transitions.
- **Risk**: Medium — Depends on Phase 1 being fully functional.

#### 2.2 Implement `deriveUIState()` (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Add the canonical derivation function per spec (mapping 8 machine states → 6 UI states):
  ```typescript
  type UIState = 'loading' | 'setup' | 'submitting' | 'progress' | 'completed' | 'failed' | 'cancelled';
  function deriveUIState(state: Snapshot): UIState {
    if (state.matches('draftEmpty'))  return 'loading';
    if (state.matches('configuring')) return 'setup';
    if (state.matches('ready'))       return 'setup';
    if (state.matches('submitting'))  return 'submitting';
    if (state.matches('running'))     return 'progress';
    if (state.matches('completed'))   return 'completed';
    if (state.matches('failed'))      return 'failed';
    if (state.matches('cancelled'))   return 'cancelled';
    return 'loading';
  }
  ```
- **Why**: Replaces the manual `phase` variable (`phaseOverride ?? state.value as string`). Maps `configuring` and `ready` both to `setup` UI (differ by CTA enabled state).
- **Risk**: Low — Pure function.

#### 2.3 Load tool definition via `LOAD` event (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Replace the `fetchToolDefinitions` + local state pattern (lines 80–98) with:
  ```tsx
  useEffect(() => {
    const tool = toolRegistry[toolKey]; // or fetch
    send({ type: 'LOAD', tool, workspaceId });
  }, [toolKey, workspaceId]);
  ```
- **Why**: Moves initialization into the machine. `LOAD` transitions `draftEmpty → configuring`.
- **Risk**: Medium — `toolRegistry` must return `ToolDefinition` (domain type). Fall back to `fetchToolDefinitions` if registry unavailable.

#### 2.4 Pass `send()` to child components (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Restructure rendering per spec's React Integration example:
  - `uiState === 'loading'`: `<LoadingSkeleton variant="tool-page" />`
  - `uiState === 'setup'`: `<SetupPanel tool={tool} inputs={inputs} onChange={handleInputChange} canSubmit={state.matches('ready')} onSubmit={() => send({type:'SUBMIT'})} />`
  - `uiState === 'submitting'`: `<LinearProgress />`
  - `uiState === 'progress'`: `<FeedbackPanel artifacts={state.context.artifacts} progress={state.context.progress} onCancel={() => send({type:'CANCEL'})} />`
  - `uiState === 'completed'`: `<SessionSummary artifacts={state.context.artifacts} onRetry={() => send({type:'RETRY'})} />`
  - `uiState === 'failed'`: `<ErrorState error={state.context.error} onRetry={() => send({type:'RETRY'})} />`
  - `uiState === 'cancelled'`: `<ErrorState message="..." onRetry={() => send({type:'RETRY'})} />`
- **Why**: Replaces the current manual `handleSubmit()` (163–210 lines) with machine-driven flow. Children receive typed props and `send()` callbacks.
- **Risk**: High — This is the biggest behavioral change. Must ensure all child components accept the new prop signatures.
- **Drift findings covered**: #1, #2, #3 (all critical).

#### 2.5 Replace `useSession` hook with machine actor (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Remove the `useSession(displaySessionId)` call (line 115). The machine's `subscribeToSSE` actor handles SSE events and feeds them back into the machine via `sendBack()`. The `useEffect` on `session.status` (lines 120–128) is no longer needed.
- **Why**: `useSession` + `phaseOverride` pattern is the root of the XState bypass. The machine's `running` state with `invoke subscribeToSSE` handles this natively.
- **Risk**: Medium — Need to ensure SSE reconnection logic works correctly inside `fromCallback`.

#### 2.6 Pass `CONFIGURE` with full inputs object (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
- **Action**: Replace `handleInputChange(key, value)` → `send({ type: 'CONFIGURE', key, value })` with:
  ```typescript
  const handleInputChange = (inputs: Partial<ToolPageContext['inputs']>) => {
    send({ type: 'CONFIGURE', inputs });
  };
  ```
- **Why**: `CONFIGURE` event now takes `Partial<Inputs>` object instead of flat `{key, value}`, enabling file and asset updates in one event.
- **Risk**: Low — Changes a single handler signature.

---

### Phase 3: DTO & SSE Contract Alignment (CRITICAL — blocks Phases 4–5)

**Scope**: Extend contracts and API client to support the SessionList 4-state card system and FeedbackPanel artifact previews.
**Dependencies**: None (can be done in parallel with Phase 1–2).
**Deliverable**: `SessionListItemDTO` has all 16 fields. SSE events carry artifact content. New API endpoints available.

#### 3.1 Extend SessionListItemDTO (File: `packages/contracts/src/generation/session.dto.ts`)
- **Action**: Extend `SessionListItemDTO` to include all 10 missing fields:
  ```typescript
  export interface SessionListItemDTO {
    id: string;
    toolKey: string;
    workspaceId: string;
    status: SessionStatusDTO;
    stepCount: number;
    currentStepIndex?: number;        // NEW: when running
    currentStepLabel?: string;        // NEW: when running
    queuePosition?: number;           // NEW: when queued
    lastArtifactId?: string;          // NEW
    lastArtifactPreview?: string;     // NEW: first 150 chars
    elapsedSeconds?: number;          // NEW: running sessions
    durationSeconds?: number;         // NEW: completed sessions
    errorMessage?: string;            // NEW: failed sessions
    failedAtStep?: number;            // NEW: failed sessions
    isPromotable?: boolean;           // NEW: tool.produces !== undefined
    createdAt: string;
    completedAt?: string;             // NEW
  }
  ```
- **Why**: 10 of 16 spec fields are missing (#5 critical finding). Without these, the 4-state card system cannot render progress, error info, artifact previews, or promote actions.
- **Risk**: Medium — Backend must be updated to populate these fields in `GET /api/sessions` responses. Coordinate with backend team.

#### 3.2 Extend SSE events with artifact content (File: `packages/contracts/src/generation/events.ts`)
- **Action**: Add artifact content to SSE event payloads:
  - `step_completed`: add `artifact: ArtifactDTO` to `data`
  - `session_completed`: change `finalArtifactId: string` to `finalArtifact: ArtifactDTO`
  ```typescript
  | {
      event: 'step_completed';
      data: {
        sessionId: string;
        stepNumber: number;
        stepLabel: string;
        progress: StepProgress;
        artifact: ArtifactDTO;  // NEW
      };
    }
  | {
      event: 'session_completed';
      data: {
        sessionId: string;
        status: 'completed';
        finalArtifact: ArtifactDTO;  // CHANGED from finalArtifactId: string
        completedAt: string;
      };
    }
  ```
- **Why**: `step_completed` carries no artifact content (#6 critical finding). The frontend cannot display artifact previews during generation. `session_completed` only provides an artifact ID, requiring an additional API fetch.
- **Risk**: Medium — Backend SSE emitter must be updated to include artifact objects.

#### 3.3 Add missing API endpoints to client (File: `apps/frontend/src/api/client.ts`)
- **Action**: Add two methods to `ApiClient` class:
  ```typescript
  async getWorkspaceActivity(workspaceId: string) {
    return this.request<{ activeUsers: Array<{ name: string; lastAction: string; actionType: string }> }>(
      'GET', `/api/workspaces/${workspaceId}/activity`
    );
  }
  async voteChallenge(workspaceId: string, challengeId: string, vote: string) {
    return this.request<{ voted: boolean }>(
      'POST', `/api/workspaces/${workspaceId}/challenges/vote`, { challengeId, vote }
    );
  }
  ```
- **Why**: `GET /api/workspaces/:id/activity` is missing (#9 critical). `POST /api/workspaces/:id/challenges/vote` is missing (#10 critical). Gamification UX spec requires both.
- **Risk**: Low — Backend endpoints must exist; coordinate with backend team.

#### 3.4 Export StepProgress from contracts (File: `packages/contracts/src/index.ts`)
- **Action**: Ensure `StepProgress` is exported. Currently exported (line 18), verify it's accessible.
- **Why**: Frontend machine needs to import `StepProgress` from contracts, not redefine it in api/hooks.ts.
- **Risk**: Low.

---

### Phase 4: SessionList 4-State Card System

**Scope**: Implement the full 4-state card system per [[Session List - Live Status]] spec.
**Dependencies**: Phase 3 complete (needs extended DTOs and SSE contracts).
**Deliverable**: Tabbed SessionList with QueuedCard, RunningCard, CompletedCard, FailedCard variants and `useLiveSession` hook.

#### 4.1 Create QueuedCard (NEW File: `apps/frontend/src/components/workspace/QueuedCard.tsx`)
- **Action**: Implement per spec (Session List - Live Status#Queued Card):
  - Props: `session: SessionListItemDTO`
  - `opacity: 0.7` on card
  - Shows tool label, "⌛ Waiting — Queue position: {queuePosition}", Cancel button
- **Why**: #7 critical — no state differentiation currently.
- **Risk**: Low.

#### 4.2 Create RunningCard (NEW File: `apps/frontend/src/components/workspace/RunningCard.tsx`)
- **Action**: Implement per spec (Session List - Live Status#Running Card):
  - Props: `session: LiveSession`
  - `borderLeft: 3px solid primary.main`
  - `LinearProgress variant="determinate"` with correct value
  - Step label: "Step {current}/{total} · {stepLabel} · {elapsed}"
  - Artifact preview: last 150 chars in italic
  - Actions: "View progress" + "Cancel"
- **Why**: #7 critical — running sessions look identical to completed ones.
- **Risk**: Low.

#### 4.3 Create CompletedCard (NEW File: `apps/frontend/src/components/workspace/CompletedCard.tsx`)
- **Action**: Implement per spec (Session List - Live Status#Completed Card):
  - Props: `session: SessionListItemDTO`
  - Shows: tool label, "✅ Completed · {stepCount} steps · {duration}", artifact preview (150 chars)
  - Actions: View, Download, Promote (if `isPromotable`)
- **Why**: #7 critical.
- **Risk**: Low.

#### 4.4 Create FailedCard (NEW File: `apps/frontend/src/components/workspace/FailedCard.tsx`)
- **Action**: Implement per spec (Session List - Live Status#Failed Card):
  - Props: `session: SessionListItemDTO`
  - `borderLeft: 3px solid error.main`
  - Shows: tool label, "❌ {errorMessage} · Step {failedAtStep}", Retry button
- **Why**: #7 critical.
- **Risk**: Low.

#### 4.5 Implement `useLiveSession` hook (File: `apps/frontend/src/api/hooks.ts`)
- **Action**: Add `useLiveSession(sessionId: string | null)` hook:
  1. On mount: fetch current session state via `api.getSession(sessionId)` (catch-up)
  2. Subscribe to SSE via `sseClient.connect(sessionId, callbacks)` with `onStep`, `onCompleted`, `onFailed` updating local state
  3. Merge SSE updates into local `LiveSession` state
  4. On cleanup (return): call `unsubscribe`
  5. Poll fallback: if SSE disconnects, fall back to 30s poll (already in SessionList parent)
  - Export `LiveSession` type: `SessionListItemDTO & { currentStepIndex?, currentStepLabel?, elapsedSeconds?, lastArtifactPreview?, errorMessage? }`
- **Why**: #9 high finding — SessionList uses SWR only, no SSE subscribe. This hook enables cross-tab resilience: close tab, reopen, see live state.
- **Risk**: Medium — SSE reconnection logic must handle `EventSource` lifecycle correctly.

#### 4.6 Refactor SessionList with tabbed interface (File: `apps/frontend/src/components/workspace/SessionList.tsx`)
- **Action**: Full rewrite per spec:
  1. Replace flat list with `<Tabs>`: In Progress (queued+running), Completed, Failed
  2. Each tab shows `<Badge>` count
  3. Fetch sessions with status filters (`queued`, `running`, `completed`, `failed`) on mount + 30s poll
  4. Each card dispatches to the correct variant via `SessionCard` switching on `session.status`
  5. Wire SSE subscribe per running/queued card via `useLiveSession`
- **Why**: #7 critical — entire SessionList is a flat list with no state differentiation.
- **Risk**: Medium — Must handle the SSE per-card lifecycle: subscribe when card mounts, unsubscribe on unmount/terminal state.

---

### Phase 5: Component Drift Fixes

**Scope**: Fix individual component signature/behavior drifts across 11 components.
**Dependencies**: Phase 3 complete (needs extended DTOs and contracts). Phase 1–2 for FeedbackPanel (needs machine artifacts).
**Deliverable**: All 11 component drift findings resolved.

#### 5.1 FeedbackPanel — add `artifacts` prop with content previews (File: `apps/frontend/src/components/tool/FeedbackPanel.tsx`)
- **Action**: 
  1. Add `artifacts: ArtifactDTO[]` to props
  2. For completed steps, show first 150 chars of `artifact.content` below the step label with italic styling and `slideInFade` animation
  3. Keep existing step indicator dots; augment with content previews
- **Why**: #1 high finding — FeedbackPanel shows generic step dots, cannot display artifact content during generation.
- **Risk**: Low.

#### 5.2 PromoteButton — variant + inline confirmation (File: `apps/frontend/src/components/shared/PromoteButton.tsx`)
- **Action**:
  1. Change `variant="outlined"` to `variant="contained"` (finding #8 high)
  2. Replace `PromoteDialog` modal with inline confirmation: show a `<Box>` with confirm/cancel buttons below the promote button instead of opening a modal (finding #8 critical)
  3. Remove `PromoteDialog` import or deprecate
- **Why**: Two findings — wrong variant + modal instead of inline.
- **Risk**: Medium — Inline confirmation requires refactoring the promote flow state machine within the component.

#### 5.3 LoadingSkeleton — 8 variants (File: `apps/frontend/src/components/LoadingSkeleton.tsx`)
- **Action**: Add a `variant` prop:
  ```typescript
  type SkeletonVariant = 'dashboard' | 'card-grid' | 'list' | 'tool-page' | 'session-detail' | 'team-hub' | 'conversation' | 'profile';
  ```
  Implement each variant:
  - **dashboard**: 4 card skeletons (2x2 grid)
  - **card-grid**: 6 card skeletons (3x2)
  - **list**: 5 row skeletons
  - **tool-page**: form field skeletons
  - **session-detail**: artifact content skeleton
  - **team-hub**: agent card + conversation skeletons
  - **conversation**: message bubble skeletons
  - **profile**: stats + badge grid skeletons
  Default variant: `list` (backward-compatible).
- **Why**: #4 critical finding — zero variants currently, single hardcoded layout.
- **Risk**: Low.

#### 5.4 GamificationZone — icon + rank display (File: `apps/frontend/src/components/gamification/GamificationZone.tsx`)
- **Action**:
  1. Replace `"{profile.badges.length} badges"` text with `🏅 {profile.badges.length}` (finding #5 high)
  2. Add weekly rank display: `#3 weekly ████████░░░` below XP bar (requires `profile.weeklyRank` and `profile.weeklyRankProgress` — add to PlayerProfileDTO if missing)
  3. Add full descriptive aria-label (Phase 8 handles this)
- **Why**: #5 high finding.
- **Risk**: Low — Backend may need to provide `weeklyRank` field.

#### 5.5 AgentCard — hover lift + accent glow (File: `apps/frontend/src/components/agent-chat/AgentCard.tsx`)
- **Action**: Add hover effects per design tokens:
  ```typescript
  sx={{
    transition: 'box-shadow 200ms ease, transform 200ms ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: 'var(--shadow-accent)',
    },
  }}
  ```
- **Why**: #7 high finding — no hover lift or accent glow.
- **Risk**: Low — Depends on `--shadow-accent` token existing (Phase 6).

#### 5.6 AgentContextDrawer — add `agent` prop + filter (File: `apps/frontend/src/components/agent-chat/AgentContextDrawer.tsx`)
- **Action**: Add `agent: AgentDTO` prop. When present:
  - Filter `EXPECTED_ASSET_TYPES` to only those relevant to the agent's tools
  - Show agent-specific context alongside workspace context
- **Why**: #12 critical finding — shows generic workspace context, not per-agent filtering.
- **Risk**: Low.

#### 5.7 StreakModeToggle — backend persistence (File: `apps/frontend/src/components/gamification/StreakModeToggle.tsx`)
- **Action**: Replace `useState<StreakMode>('daily')` with a persisted value:
  1. On mount: fetch current mode from `api.getPlayerProfile().streakMode`
  2. On toggle: call `api.updateStreakMode(mode)` (new endpoint or extend `PUT /api/me/profile`)
  3. Show loading state during persistence
- **Why**: #11 critical finding — local `useState` only, no backend persistence.
- **Risk**: Medium — Requires backend endpoint for reading/writing `streak_mode`.

#### 5.8 ChatMessageBubble — workspace accent light for user bubbles (File: `apps/frontend/src/components/agent-chat/ChatMessageBubble.tsx`)
- **Action**:
  1. Change user bubble `bgcolor` from `'primary.main'` to `var(--workspace-accent-light)` (with fallback to `primary.main`) — finding #4 high
  2. Change agent avatar from hardcoded 🤖 to per-agent emoji: accept `agentEmoji?: string` prop, use it if provided, fall back to 🤖 — finding #12 high
- **Why**: Two high findings.
- **Risk**: Low — Requires `--workspace-accent-light` token (Phase 6).

#### 5.9 Enable .docx/.pdf downloads (File: `apps/frontend/src/components/tool/SessionSummary.tsx`)
- **Action**: In `ArtifactDownloadMenu`, remove `disabled` from docx and pdf menu items. Change `handleDownload` to call `api.downloadArtifact(artifactId, format)` and trigger client-side download:
  ```typescript
  // For docx/pdf — backend returns Blob
  const response = await fetch(`/api/artifacts/${artifactId}/download?format=${format}`);
  const blob = await response.blob();
  // download blob...
  ```
- **Why**: #6 high finding — .docx/.pdf downloads disabled in UI.
- **Risk**: Medium — Backend must provide docx/pdf conversion endpoints.

#### 5.10 Use ToolDefinition-based props for SetupPanel/FeedbackPanel/ReadinessSnapshot (Files: `apps/frontend/src/components/tool/SetupPanel.tsx`, `FeedbackPanel.tsx`, `ReadinessSnapshot.tsx`)
- **Action**:
  1. **SetupPanel**: Replace `{ toolDef: TextInput[], fileDef: FileInput[], assetDef: AssetInput[] }` flat props with `{ tool: ToolDefinition }` single prop
  2. **FeedbackPanel**: Already being fixed in 5.1
  3. **ReadinessSnapshot**: Replace `{ inputs: Record<string,string>, toolDef, fileDef, assetDef, files, selectedAssets, workspaceAssets }` with `{ tool: ToolDefinition, inputs: ToolPageContext['inputs'] }`
- **Why**: #10 high finding — flat props instead of domain types.
- **Risk**: Medium — Requires updating all call sites in ToolPageLayout (Phase 2 already handles this).

#### 5.11 Remove duplicated `tool-inputs.ts` type system (File: `apps/frontend/src/tool-inputs.ts` — deprecated; `apps/frontend/src/components/tool/SetupPanel.tsx` imports to update)
- **Action**:
  1. Import `TextInput`, `FileInput`, `AssetInput`, `ToolDefinition` from `@flow-app/domain` (already exported from `packages/contracts`)
  2. Replace all local imports of `tool-inputs.ts` types with domain imports
  3. Keep `tool-inputs.ts` for now (contains `getToolInputs`/`getToolFiles` runtime functions used by SetupPanel), but mark as deprecated
  4. Long-term: move runtime tool registry data to a shared JSON or domain module
- **Why**: #11 high finding — separate type system duplicates domain types.
- **Risk**: Medium — Must verify domain types are exported correctly from contracts package.

---

### Phase 6: Theme Token Completion

**Scope**: Complete design tokens per [[Design Tokens]] spec. Mostly additive — minimal risk to existing code.
**Dependencies**: None.
**Deliverable**: All missing design tokens defined and consumable.

#### 6.1 Define rarity.* tokens (File: `apps/frontend/src/theme/tokens.ts`)
- **Action**: Add to palette:
  ```typescript
  rarity: {
    common:    { border: '#9CA3AF', bg: '#F3F4F6',   text: '#374151' },
    rare:      { border: '#3B82F6', bg: '#EFF6FF',   text: '#1E40AF' },
    epic:      { border: '#7C3AED', bg: '#F5F3FF',   text: '#5B21B6' },
    legendary: { border: '#D97706', bg: '#FFFBEB',   text: '#92400E' },
  },
  ```
  Add dark mode overrides too (from spec).
- **Why**: #13 critical finding — rarity colors used inline, no design tokens.
- **Risk**: Low.

#### 6.2 Define `--workspace-accent-light` (File: `apps/frontend/src/theme/WorkspaceAccentProvider.tsx`)
- **Action**: In `setAccent()`, add:
  ```typescript
  document.documentElement.style.setProperty('--workspace-accent-light', hexToRgba(color, 0.12));
  ```
  Add a `hexToRgba(hex: string, alpha: number): string` utility function.
- **Why**: #2 high finding — `--workspace-accent-light` not defined anywhere. Needed for ChatMessageBubble, focus rings, active states.
- **Risk**: Low.

#### 6.3 Define `--shadow-accent` token (File: `apps/frontend/src/theme/tokens.ts`)
- **Action**: Add to shadows (or as a CSS variable at root):
  ```css
  --shadow-accent: 0 0 0 3px var(--workspace-accent-light);
  ```
  Can also define it in the MUI theme's custom shadows or inject via CSS.
- **Why**: #3 high finding — AgentCard hover relies on `--shadow-accent`.
- **Risk**: Low.

#### 6.4 Define gradients.* tokens (File: `apps/frontend/src/theme/tokens.ts`)
- **Action**: Add `gradients` object:
  ```typescript
  const gradients = {
    brand:      'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
    completion: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
    hero:       'linear-gradient(135deg, #1E40AF 0%, #6D28D9 100%)',
  };
  ```
- **Why**: #4 high finding — gradient tokens not defined, used inline.
- **Risk**: Low.

#### 6.5 Add readiness fill animation (File: `apps/frontend/src/components/tool/ReadinessSnapshot.tsx`)
- **Action**: Add a CSS transition to the readiness checkmark icons:
  ```css
  .readiness-icon {
    transition: color 400ms ease, transform 400ms ease;
  }
  .readiness-icon.ok {
    color: var(--success-main);
  }
  ```
  When status changes from ✗ to ✓, animate with green fade and slight scale.
- **Why**: #14 critical finding — icons render instantly, no green-fill transition.
- **Risk**: Low.

#### 6.6 Add sidebar XP bar ARIA (File: `apps/frontend/src/components/gamification/GamificationZone.tsx`, handled fully in Phase 8)
- **Note**: This is handled in Phase 8 (Accessibility Sweep). Listed here for completeness but implemented in Phase 8.

---

### Phase 7: Routes & Navigation

**Scope**: Add missing routes and navigation items.
**Dependencies**: None.
**Deliverable**: `/templates` and `/audit` routes exist, ⚡ Tools nav item visible.

#### 7.1 Add `/templates` route placeholder (File: `apps/frontend/src/App.tsx`)
- **Action**: Add lazy-loaded route:
  ```tsx
  const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
  // Inside <Route element={<AppShell />}>:
  <Route path="/templates" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton variant="dashboard" />}><TemplatesPage /></Suspense></ErrorBoundary>} />
  ```
- **Why**: #1 missing component — route not in App.tsx.
- **Risk**: Low — Create `TemplatesPage` as a placeholder with "Coming Soon" content.

#### 7.2 Add `/audit` route placeholder (File: `apps/frontend/src/App.tsx`)
- **Action**: Same pattern as 7.1 with `AuditPage`.
- **Why**: #2 missing component.
- **Risk**: Low.

#### 7.3 Add ⚡ Tools nav item to AppShell sidebar (File: `apps/frontend/src/layout/AppShell.tsx`)
- **Action**: Add to `navItems`:
  ```typescript
  { label: 'Tools', icon: <BoltIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/tools` : '/dashboard' },
  ```
  Import `BoltIcon` from MUI icons.
- **Why**: #15 critical finding — ⚡ Tools nav item missing from AppShell sidebar.
- **Risk**: Low — May need a Tools listing page route if `/workspaces/:id/tools` doesn't exist yet.

#### 7.4 Create placeholder pages (NEW Files: `apps/frontend/src/pages/TemplatesPage.tsx`, `apps/frontend/src/pages/AuditPage.tsx`)
- **Action**: Create minimal pages with `<EmptyState>` or "Coming Soon" content. These are placeholders until full implementations.
- **Why**: Routes need components to render.
- **Risk**: Low.

---

### Phase 8: Accessibility Sweep

**Scope**: Add missing ARIA attributes across 7 components per the drift report's Accessibility Drift section.
**Dependencies**: None (independent of all other phases).
**Deliverable**: All 8 accessibility requirements met.

#### 8.1 Sidebar XP bar — `role="progressbar"` (File: `apps/frontend/src/components/gamification/GamificationZone.tsx`)
- **Action**: On the XP `LinearProgress` component, add:
  ```typescript
  role="progressbar"
  aria-valuenow={profile.xpTotal}
  aria-valuemin={0}
  aria-valuemax={profile.nextLevelXP}
  aria-label={`XP: ${profile.xpTotal} of ${profile.nextLevelXP}`}
  ```
- **Why**: #1 accessibility finding.
- **Risk**: Low.

#### 8.2 AgentCard `aria-label` (File: `apps/frontend/src/components/agent-chat/AgentCard.tsx`)
- **Action**: On `CardActionArea`, add:
  ```typescript
  aria-label={`${name}, ${role}. ${description}`}
  ```
  Add `description` prop to AgentCardProps.
- **Why**: #2 accessibility finding.
- **Risk**: Low.

#### 8.3 Send button `aria-label` (File: `apps/frontend/src/components/agent-chat/ChatInput.tsx`)
- **Action**: On the send IconButton, add `aria-label="Invia messaggio"`.
- **Why**: #3 accessibility finding.
- **Risk**: Low.

#### 8.4 Context drawer `aria-labelledby` (File: `apps/frontend/src/components/agent-chat/AgentContextDrawer.tsx`)
- **Action**: On the Drawer, add `aria-labelledby="context-drawer-title"`. On the `<Typography variant="h6">Context</Typography>`, add `id="context-drawer-title"`.
- **Why**: #4 accessibility finding.
- **Risk**: Low.

#### 8.5 Badge rarity text labels (File: profile badge display component — identify in ProfilePage or GamificationZone)
- **Action**: For each badge displayed, add a text label for screen readers:
  ```typescript
  <span className="sr-only">{badge.rarity} badge: {badge.name}</span>
  ```
  with visually-hidden CSS class.
- **Why**: #5 accessibility finding.
- **Risk**: Low.

#### 8.6 Streak wrapper `aria-label` (File: `apps/frontend/src/components/gamification/StreakModeToggle.tsx` or GamificationZone.tsx)
- **Action**: On the streak chip/display, add `aria-label={`Streak: ${currentStreak} giorni`}`.
- **Why**: #6 accessibility finding.
- **Risk**: Low.

#### 8.7 Sidebar gamification zone full descriptive aria-label (File: `apps/frontend/src/components/gamification/GamificationZone.tsx`)
- **Action**: Replace `aria-label="View player profile"` with:
  ```typescript
  aria-label={`Player profile: Level ${profile.level} ${profile.levelLabel}, ${profile.xpTotal} XP, ${profile.currentStreak}-day streak, ${profile.badges.length} badges`}
  ```
- **Why**: #7 accessibility finding.
- **Risk**: Low.

#### 8.8 All emoji `aria-hidden="true"` (Multiple files)
- **Action**: Verify every emoji rendered in UI has `aria-hidden="true"`. Known emojis: 🤖 in ChatMessageBubble (line 47 already has it), 🏅 in GamificationZone (5.4), 🔥 in GamificationZone. Add `aria-hidden` where missing.
- **Why**: #8 accessibility finding — prevents screen readers from reading emoji descriptions.
- **Risk**: Low.

---

## Testing Strategy

### Unit Tests
- **Phase 1**: XState machine unit tests — verify all state transitions, guard logic (`canSubmit` with valid/invalid inputs), actor invocations (mock `fetch`), `always` transition fires when `canSubmit` is true.
- **Phase 4**: `useLiveSession` hook tests — mock SSE events, verify state merge logic, test cleanup.
- **Phase 5**: `LoadingSkeleton` variant rendering tests, `FeedbackPanel` artifact preview rendering.

### Integration Tests
- **Phase 2**: `ToolPageLayout` integration — mount with mock machine, verify panels render based on machine state, verify `send()` calls propagate correctly.
- **Phase 3**: Contract type validation — verify `SessionListItemDTO` is backward-compatible with existing API responses.
- **Phase 4**: `SessionList` integration — mock API responses, verify tabs render, card variants dispatch correctly.

### E2E Tests
- **Phase 2–5 combined**: Full tool page flow: load tool → configure inputs → submit → watch progress (SSE) → view completed artifact → retry.
- **Phase 4**: Session list flow: start a session → SSE updates card → session completes → card moves to completed tab.

### Accessibility Testing
- **Phase 8**: axe-core automated audit on all modified components. Manual screen reader testing (VoiceOver) on GamificationZone, ChatInput, AgentCard.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Backend DTOs not aligned** — Phase 3 extends `SessionListItemDTO` and SSE events, but backend may not emit the new fields | High | Coordinate with backend team. Add fields as optional (`?`) first; frontend handles missing data gracefully. Phase 3 can merge independently — new fields are additive. |
| **XState machine rewrite breaks tool page** — Phase 1 replaces the entire machine; Phase 2 rewires ToolPageLayout | High | Deploy Phase 1 + 2 together in a feature branch. Add comprehensive unit tests for the machine before integration. Keep old machine file as `tool-page-machine.legacy.ts` for reference. |
| **SSE contract changes** — Adding artifact content to SSE events increases payload size | Medium | Artifact content may be large. Consider adding a `contentPreview` (first 500 chars) field instead of full content for SSE efficiency. Full content fetched on demand. |
| **`useLiveSession` performance** — subscribing to SSE per card for multiple running sessions | Medium | Cap SSE subscriptions at N concurrent (e.g., 5). Use shared SSE connection manager if backend supports multiplexing. |
| **ToolDefinition import from domain** — Phase 5.11 imports domain types into frontend | Medium | Verify `@flow-app/domain` exports are tree-shakeable (no Node.js dependencies leaking into browser bundle). |
| **Backend endpoints missing** — `GET /api/workspaces/:id/activity`, `POST /api/workspaces/:id/challenges/vote`, docx/pdf download | Medium | Add client methods; wrap in try/catch with graceful fallback. Frontend can merge before backend endpoints are ready if endpoints return 501. |

---

## Success Criteria

### Phase 1
- [ ] `toolPageMachine` has all 8 states: `draftEmpty`, `configuring`, `ready`, `submitting`, `running`, `completed`, `failed`, `cancelled`
- [ ] Context includes: `tool`, `workspaceId`, `inputs` (4 sub-fields), `session`, `artifacts`, `progress`, `error`
- [ ] All 11 events defined with correct payloads
- [ ] Two actors (`submitSession`, `subscribeToSSE`) working
- [ ] Two guards (`canSubmit`, `isStillDraft`) passing tests
- [ ] `configuring → ready` transition fires automatically when `canSubmit` passes
- [ ] `RETRY` from completed/failed/cancelled goes to `ready` or `submitting` (not `configuring`)
- [ ] All 8 assign actions implemented
- [ ] Unit tests: 80%+ coverage on machine transitions

### Phase 2
- [ ] `ToolPageLayout` has zero `useState` for phase overrides
- [ ] `deriveUIState()` correctly maps 8 machine states to 6 UI states
- [ ] `LOAD` event sent on mount
- [ ] `SUBMIT`, `CANCEL`, `RETRY`, `RESET` events sent from correct panels
- [ ] `FeedbackPanel` receives `artifacts` from machine context
- [ ] `SessionSummary` receives `artifacts` from machine context
- [ ] No more `useSession()` hook call — SSE handled by machine actor

### Phase 3
- [ ] `SessionListItemDTO` has all 16 fields (10 new, all optional `?`)
- [ ] SSE `step_completed` includes `artifact: ArtifactDTO`
- [ ] SSE `session_completed` includes `finalArtifact: ArtifactDTO`
- [ ] `api.getWorkspaceActivity()` exists in client
- [ ] `api.voteChallenge()` exists in client
- [ ] All contract changes backward-compatible

### Phase 4
- [ ] `SessionList` renders 3 tabs: In Progress, Completed, Failed
- [ ] In Progress tab shows badge count of queued + running sessions
- [ ] `QueuedCard` renders with opacity 0.7, queue position, Cancel button
- [ ] `RunningCard` renders with border-left accent, progress bar, step label, artifact preview, View + Cancel
- [ ] `CompletedCard` renders with artifact preview, View + Download + Promote
- [ ] `FailedCard` renders with border-left error, error message, failed step, Retry
- [ ] `useLiveSession` hook catches up from API then subscribes to SSE
- [ ] 30s poll fallback works when SSE is unavailable

### Phase 5
- [ ] `FeedbackPanel` shows artifact content previews (150 chars) during generation
- [ ] `PromoteButton` uses `variant="contained"` with inline confirmation (no modal)
- [ ] `LoadingSkeleton` supports all 8 `variant` values
- [ ] `GamificationZone` shows 🏅 icon instead of "n badges" text
- [ ] `AgentCard` has hover lift and accent glow
- [ ] `AgentContextDrawer` filters context per-agent when `agent` prop provided
- [ ] `StreakModeToggle` persists to backend on toggle
- [ ] `ChatMessageBubble` uses `--workspace-accent-light` for user bubbles
- [ ] `ChatMessageBubble` uses per-agent emoji from AgentDefinition
- [ ] `.docx` and `.pdf` downloads functional
- [ ] `SetupPanel`/`ReadinessSnapshot` accept `ToolDefinition`-based props
- [ ] No component imports from `tool-inputs.ts` type system (runtime fns allowed)

### Phase 6
- [ ] `rarity.*` tokens defined in light + dark modes
- [ ] `--workspace-accent-light` CSS variable set by WorkspaceAccentProvider
- [ ] `--shadow-accent` token defined
- [ ] `gradients.*` tokens defined
- [ ] Readiness snapshot has animated green fill transition

### Phase 7
- [ ] `/templates` route exists and renders TemplatesPage
- [ ] `/audit` route exists and renders AuditPage
- [ ] ⚡ Tools nav item visible in AppShell sidebar

### Phase 8
- [ ] Sidebar XP bar has `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] AgentCard has descriptive `aria-label`
- [ ] Send button has `aria-label="Invia messaggio"`
- [ ] Context drawer has `aria-labelledby`
- [ ] Badge rarity text labels present
- [ ] Streak wrapper has `aria-label`
- [ ] Sidebar gamification zone has full descriptive `aria-label`
- [ ] All emoji have `aria-hidden="true"`
- [ ] axe-core audit passes (zero violations)

---

## Sources

- [[frontend-drift-report-2026-08-07]] — source audit report (27 findings)
- [[ToolPage Machine (XState v5)]] — canonical XState spec
- [[Session List - Live Status]] — 4-state card system + useLiveSession spec
- [[Design Tokens]] — theme tokens spec
- [[Gamification UX]] — gamification UI requirements
- [[ReadinessSnapshot UI]] — readiness component spec
- [[Agent Chat UX]] — chat component requirements
- [[Frontend Architecture]] — overall frontend architecture