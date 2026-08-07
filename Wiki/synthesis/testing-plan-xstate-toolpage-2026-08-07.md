---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/testing
  - wiki/frontend
  - wiki/plan
date_updated: 2026-08-08
source_count: 5
confidence: high
---

# Testing Plan — XState Machine & ToolPageLayout

> Unit and integration tests for the rewritten `toolPageMachine` and `ToolPageLayout` from [[frontend-drift-remediation-plan-2026-08-07]].
> Covers state transitions, guard logic, actor invocations, and UI state derivation.

## Overview

The frontend drift remediation rewrote the XState machine (8 states, 2 actors, 2 guards) and the ToolPageLayout (zero local overrides, `deriveUIState()`). These are the most critical components in the tool page flow — a bug here breaks every tool.

## Test Infrastructure

- **Framework**: Vitest (already in project)
- **XState testing**: `@xstate/react` test utilities + `createActor` for machine-level tests
- **React testing**: `@testing-library/react` for component integration
- **Mocking**: `vi.mock()` for API client and SSE client
- **Location**: `apps/frontend/src/machines/__tests__/` and `apps/frontend/src/components/layout/__tests__/`

---

## Unit Tests — `toolPageMachine`

### File: `apps/frontend/src/machines/__tests__/tool-page-machine.test.ts`

#### 1. Initial state

```typescript
test('starts in draftEmpty with null tool and empty inputs', () => {
  const actor = createActor(toolPageMachine);
  actor.start();
  expect(actor.getSnapshot().value).toBe('draftEmpty');
  expect(actor.getSnapshot().context.tool).toBeNull();
  expect(actor.getSnapshot().context.inputs.text).toEqual({});
  expect(actor.getSnapshot().context.session).toBeNull();
  expect(actor.getSnapshot().context.artifacts).toEqual([]);
});
```

#### 2. LOAD transitions draftEmpty → configuring

```typescript
test('LOAD transitions to configuring and sets tool + workspaceId', () => {
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  expect(actor.getSnapshot().value).toBe('configuring');
  expect(actor.getSnapshot().context.tool).toBe(mockToolDef);
  expect(actor.getSnapshot().context.workspaceId).toBe('ws-1');
});
```

#### 3. CONFIGURE updates inputs in configuring state

```typescript
test('CONFIGURE merges text inputs', () => {
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  expect(actor.getSnapshot().context.inputs.text.topic).toBe('AI');
  // Second CONFIGURE merges, not replaces
  actor.send({ type: 'CONFIGURE', inputs: { text: { language: 'en' } } });
  expect(actor.getSnapshot().context.inputs.text).toEqual({ topic: 'AI', language: 'en' });
});
```

#### 4. canSubmit guard — transitions to ready when all required inputs filled

```typescript
test('transitions to ready when canSubmit passes', () => {
  const toolWithRequired: ToolDefinition = {
    ...mockToolDef,
    textInputs: [{ key: 'topic', label: 'Topic', required: true }],
  };
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: toolWithRequired, workspaceId: 'ws-1' });
  expect(actor.getSnapshot().value).toBe('configuring');
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  // should auto-transition via always
  expect(actor.getSnapshot().value).toBe('ready');
});
```

#### 5. canSubmit guard — stays in configuring when required inputs missing

```typescript
test('stays in configuring when required text input empty', () => {
  const toolWithRequired: ToolDefinition = {
    ...mockToolDef,
    textInputs: [{ key: 'topic', label: 'Topic', required: true }],
  };
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: toolWithRequired, workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: '' } } });
  expect(actor.getSnapshot().value).toBe('configuring');
});
```

#### 6. canSubmit guard — checks required files

```typescript
test('canSubmit requires files when tool has required file inputs', () => {
  const toolWithFile: ToolDefinition = {
    ...mockToolDef,
    fileInputs: [{ key: 'brief', label: 'Brief', accept: ['.txt'], required: true }],
  };
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: toolWithFile, workspaceId: 'ws-1' });
  // No file provided — should not transition to ready
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  expect(actor.getSnapshot().value).toBe('configuring');
  // Provide file
  actor.send({ type: 'CONFIGURE', inputs: { files: { brief: new File([''], 'brief.txt') } } });
  expect(actor.getSnapshot().value).toBe('ready');
});
```

#### 7. canSubmit guard — checks required assets

```typescript
test('canSubmit requires assets when tool has required asset inputs', () => {
  const toolWithAsset: ToolDefinition = {
    ...mockToolDef,
    assetInputs: [{ assetType: 'brief', required: true, multiple: false }],
  };
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: toolWithAsset, workspaceId: 'ws-1' });
  expect(actor.getSnapshot().value).toBe('configuring');
  actor.send({ type: 'CONFIGURE', inputs: { selectedAssetsByType: { brief: ['asset-1'] }, selectedAssetIds: ['asset-1'] } });
  expect(actor.getSnapshot().value).toBe('ready');
});
```

#### 8. isStillDraft guard — RESET to draftEmpty when no inputs

```typescript
test('RESET returns to draftEmpty when inputs are empty', () => {
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  expect(actor.getSnapshot().value).toBe('configuring');
  actor.send({ type: 'RESET' });
  expect(actor.getSnapshot().value).toBe('draftEmpty');
});
```

#### 9. isStillDraft guard — RESET stays in configuring when inputs present

```typescript
test('RESET stays in configuring when inputs are not empty', () => {
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  actor.send({ type: 'RESET' });
  expect(actor.getSnapshot().value).toBe('configuring');
});
```

#### 10. SUBMIT transitions to submitting → running (mock actor)

```typescript
test('SUBMIT transitions through submitting to running on success', async () => {
  vi.mock('../../api/client', () => ({
    api: { startSession: vi.fn().mockResolvedValue({ session: mockSession, replayed: false }) },
  }));
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  actor.send({ type: 'SUBMIT' });
  expect(actor.getSnapshot().value).toBe('submitting');
  await waitFor(actor, (s) => s.value === 'running');
  expect(actor.getSnapshot().context.session).toEqual(mockSession);
});
```

#### 11. SUBMIT error transitions to ready (not failed)

```typescript
test('SUBMIT error returns to ready with error in context', async () => {
  vi.mock('../../api/client', () => ({
    api: { startSession: vi.fn().mockRejectedValue({ code: 'QUOTA_EXCEEDED', message: 'Quota exceeded' }) },
  }));
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef, workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  actor.send({ type: 'SUBMIT' });
  await waitFor(actor, (s) => s.value === 'ready');
  expect(actor.getSnapshot().context.error?.code).toBe('QUOTA_EXCEEDED');
});
```

#### 12. STEP_COMPLETED adds artifact and updates progress

```typescript
test('STEP_COMPLETED appends artifact to context', () => {
  // Machine must be in 'running' state with a session
  // Send STEP_COMPLETED event
  // Verify artifacts array has the new artifact
  // Verify progress is updated
});
```

#### 13. SESSION_COMPLETED transitions to completed

```typescript
test('SESSION_COMPLETED transitions to completed and appends final artifact', () => {
  // Machine in 'running' state
  // Send SESSION_COMPLETED with finalArtifact
  // Verify state is 'completed'
  // Verify final artifact is in artifacts array
});
```

#### 14. SESSION_FAILED transitions to failed

```typescript
test('SESSION_FAILED transitions to failed with error', () => {
  // Machine in 'running' state
  // Send SESSION_FAILED with error
  // Verify state is 'failed'
  // Verify error in context
});
```

#### 15. RETRY from completed → ready (resets session/artifacts)

```typescript
test('RETRY from completed goes to ready with reset context', () => {
  // Machine in 'completed' state
  // Send RETRY
  // Verify state is 'ready'
  // Verify session, artifacts, progress, error are null/empty
});
```

#### 16. RETRY from failed → submitting (resets and re-submits)

```typescript
test('RETRY from failed goes to submitting', () => {
  // Machine in 'failed' state
  // Send RETRY
  // Verify state is 'submitting'
});
```

#### 17. RETRY from cancelled → submitting

```typescript
test('RETRY from cancelled goes to submitting', () => {
  // Machine in 'cancelled' state
  // Send RETRY
  // Verify state is 'submitting'
});
```

#### 18. RESET from completed → draftEmpty

```typescript
test('RESET from completed goes to draftEmpty', () => {
  // Machine in 'completed' state
  // Send RESET
  // Verify state is 'draftEmpty'
  // Verify tool is null, inputs empty
});
```

#### 19. CANCEL from running → cancelled

```typescript
test('CANCEL from running goes to cancelled', () => {
  // Machine in 'running' state
  // Send CANCEL
  // Verify state is 'cancelled'
});
```

#### 20. SUBMIT from ready → submitting

```typescript
test('SUBMIT from ready goes to submitting', () => {
  // Machine in 'ready' state (configuring with all required filled)
  // Send SUBMIT
  // Verify state is 'submitting'
});
```

---

## Unit Tests — `deriveUIState`

### File: `apps/frontend/src/machines/__tests__/derive-ui-state.test.ts`

```typescript
test.each([
  ['draftEmpty', 'loading'],
  ['configuring', 'setup'],
  ['ready', 'setup'],
  ['submitting', 'submitting'],
  ['running', 'progress'],
  ['completed', 'completed'],
  ['failed', 'failed'],
  ['cancelled', 'cancelled'],
])('maps %s to %s', (machineState, expectedUIState) => {
  expect(deriveUIState({ value: machineState })).toBe(expectedUIState);
});
```

---

## Integration Tests — `ToolPageLayout`

### File: `apps/frontend/src/components/layout/__tests__/ToolPageLayout.test.tsx`

#### 1. Renders loading state on mount

```typescript
test('shows loading skeleton while tool definition loads', () => {
  render(<ToolPageLayout workspaceId="ws-1" toolKey="blog-post" />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

#### 2. Renders setup panel after LOAD

```typescript
test('renders setup panel after tool definition loads', async () => {
  vi.mock('../../../api/client', () => ({
    api: { listAssets: vi.fn().mockResolvedValue({ assets: [] }) },
  }));
  vi.mock('../../tool/SetupPanel', () => ({
    SetupPanel: () => <div>Setup Panel</div>,
    fetchToolDefinitions: vi.fn().mockResolvedValue({
      textInputs: [{ key: 'topic', label: 'Topic', required: true }],
      fileInputs: [],
      assetInputs: [],
      creditCost: 1,
      stepCount: 1,
    }),
  }));
  render(<ToolPageLayout workspaceId="ws-1" toolKey="blog-post" />);
  await waitFor(() => expect(screen.getByText('Setup Panel')).toBeInTheDocument());
});
```

#### 3. Submit button disabled when required inputs missing

```typescript
test('submit button disabled when required text input empty', async () => {
  // Render with tool that has required text input
  // Verify button is disabled
});
```

#### 4. Submit button enabled when all required inputs filled

```typescript
test('submit button enabled when all required inputs filled', async () => {
  // Fill required inputs via CONFIGURE events
  // Verify button becomes enabled
});
```

#### 5. Submitting state shows progress indicator

```typescript
test('shows linear progress during submission', async () => {
  // Trigger SUBMIT
  // Verify LinearProgress is visible
});
```

#### 6. Completed state shows SessionSummary

```typescript
test('shows session summary after completion', async () => {
  // Machine in completed state with artifacts
  // Verify SessionSummary renders
});
```

#### 7. Failed state shows error with retry

```typescript
test('shows error state with retry button on failure', async () => {
  // Machine in failed state
  // Verify ErrorState renders with retry callback
});
```

#### 8. RETRY resets and returns to setup

```typescript
test('retry button resets machine to ready state', async () => {
  // Machine in completed state
  // Click retry button
  // Verify machine transitions to ready
});
```

---

## Component Tests — Session Cards

### File: `apps/frontend/src/components/workspace/__tests__/SessionCards.test.tsx`

#### QueuedCard
- Renders queue position
- Shows cancel button
- Has opacity 0.7

#### RunningCard
- Renders progress bar with correct value
- Shows step label with elapsed time
- Shows artifact preview
- Has left border accent

#### CompletedCard
- Shows completed status chip
- Shows artifact preview
- Shows promote button when `isPromotable`

#### FailedCard
- Shows error message
- Shows failed step number
- Has left border error color
- Shows retry button

---

## Implementation Status

> **Implemented 2026-08-08**. All unit and component tests implemented. E2E tests (Playwright) implemented separately — see [[e2e-test-plan-tool-page-2026-08-07]].

| Phase | Tests | File | Status |
|-------|-------|------|--------|
| toolPageMachine | 34 | `apps/frontend/src/machines/__tests__/tool-page-machine.test.ts` | ✅ 34/34 pass |
| deriveUIState | 10 | `apps/frontend/src/machines/__tests__/derive-ui-state.test.ts` | ✅ 10/10 pass |
| ToolPageLayout | 7 | `apps/frontend/src/components/layout/__tests__/ToolPageLayout.test.tsx` | ✅ 7/7 pass |
| QueuedCard | 7 | `apps/frontend/src/components/workspace/__tests__/QueuedCard.test.tsx` | ✅ 7/7 pass |
| RunningCard + CompletedCard + FailedCard | 21 | `apps/frontend/src/components/workspace/__tests__/SessionCards.test.tsx` | ✅ 21/21 pass |
| E2E Playwright | 8 | `apps/frontend/e2e/tool-page.spec.ts` + `session-list.spec.ts` | ✅ Scaffolded (needs staging env) |

### Test Implementation Details

#### Machine tests (34 tests)
- **Initial state**: 1 test — all context fields null/empty
- **LOAD transition**: 2 tests — sets tool+workspaceId, resets inputs
- **CONFIGURE**: 3 tests — merges text, files, assets incrementally
- **canSubmit guard**: 6 tests — blocks empty text/file/asset, allows filled, null tool
- **isStillDraft guard**: 3 tests — RESET returns to draftEmpty when empty, stays when filled
- **SUBMIT happy path**: 1 test — transitions submitting→running (mock startSession)
- **SUBMIT error**: 2 tests — QUOTA_EXCEEDED, default SUBMIT_FAILED
- **SUBMIT replayed**: 3 tests — replayed completed→completed, failed→failed, cancelled→failed
- **Running state events**: 5 tests — STEP_COMPLETED accumulation, SESSION_COMPLETED appends final, SESSION_FAILED, CANCEL
- **Terminal transitions**: 7 tests — RETRY from completed/failed/cancelled, RESET from all 3, SUBMIT from ready

Key test infrastructure:
- `MockEventSource` class polyfills `EventSource` in jsdom (the `subscribeToSSE` actor in `running` state)
- `api.startSession` mocked with `vi.mock` to return `{session, replayed}` payloads
- `waitFor` from XState v5 for async transitions (submitting→running, submitting→completed)
- Default mock: `mockResolvedValue({session: runningSession, replayed: false})` — prevents guard crashes from `event.output.replayed` on undefined

#### Component test details

**QueuedCard** (7 tests): tool label, queued chip, queue position label, "Waiting..." fallback, cancel button, button click handler, opacity style.

**RunningCard** (7 tests): tool label, running chip, progress bar, step label with elapsed time formatting (e.g. `2m 5s`), artifact preview, View/Cancel buttons with click handlers, border left accent.

**CompletedCard** (7 tests): tool label, completed chip, step count + duration, artifact preview, View/Download/Promote buttons, promote hidden when `isPromotable=false`, click handlers.

**FailedCard** (7 tests): tool label, failed chip, error message + step, default error fallback, border left error, retry button, retry click handler.

All component tests use Italian button labels (`Annulla`, `Riprova`, `Promuovi ad asset`) matching the actual `@flow-app/copy` locale.

#### E2E test files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Config with auth-setup → tool-page / session-list projects, Desktop Chrome, sequential execution |
| `e2e/auth.setup.ts` | Token injection (E2E_AUTH_TOKEN) or OAuth login, saves `e2e/.auth/user.json` |
| `e2e/tool-page.spec.ts` | 8 scenarios: happy path, disabled submit, file upload, asset selection, error+retry, SSE resilience, accessibility, gamification semantics |
| `e2e/session-list.spec.ts` | 4 scenarios: tabbed interface, completed card preview, running card progress bar, failed card retry |

E2E tests are resilient: each scenario uses `test.skip()` or graceful fallbacks when prerequisites are not met (no test workspace seeded, no sessions of a given status, etc.), ensuring the suite does not fail on a fresh staging environment.

## Coverage Targets

| Component | Target | Notes |
|-----------|--------|-------|
| `toolPageMachine` | 90%+ | All states, transitions, guards, actions |
| `deriveUIState` | 100% | Pure function, 8 cases |
| `ToolPageLayout` | 80%+ | Key flows: load, configure, submit, complete, fail |
| Session cards | 80%+ | Render + interaction |

## Sources

- [[frontend-drift-remediation-plan-2026-08-07]] — Phase 1 & 2 implementation
- [[ToolPage Machine (XState v5)]] — canonical machine spec
- [[Frontend Architecture]] — testing patterns
- [[code-review-2026-08-02]] — testing gaps from code review
- [[e2e-test-plan-tool-page-2026-08-07]] — E2E test plan
