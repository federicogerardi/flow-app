# FE Generation Perimeter — Unification & De-Drift ✅ Implemented

> **Status: Implemented 2026-08-13**. All 5 phases deployed. Frontend: 21 test files, 159 tests, 0 failures. Backend: 19 test files, 145 tests, 0 failures. `tsc --noEmit` clean on both codebases. See [[log#2026-08-13 impl|log]] for detailed implementation record.

## Overview
Comprehensive remediation of the FE artifact-generation perimeter based on a 4-agent audit (developer/UX-architect/UI-designer/simplifier, 2026-08-13). The audit found **~40 findings** across 6 themes. This plan consolidates them into a 5-phase roadmap focusing on: unifying two diverging surfaces into one canonical component, fixing 3 critical bugs, closing 6 type gaps, eliminating 12+ duplicated code blocks, and resolving 4 accessibility violations.

## Goals
1. **Single canonical surface**: `SessionTracker` component consumed by both `InlineSessionTracker` (tool page) and `SessionPage`
2. **Zero hardcoded status checks**: one `TERMINAL_STATUSES` + helpers, imported everywhere
3. **One `progress.current` semantics**: `completedCount` (count of completed steps), no ambiguity
4. **Zero `as any` / `as unknown as` casts** in the perimeter
5. **Zero dead code**: `fadeSlideDown`, `fetchToolInputs`, `toolKey` prop, `LiveSession` type, `StepProgress` replica
6. **Single `formatDuration`**: one canonical formatter, all surfaces import it

---

## Phase 1: Critical Bug Fixes + Shared Foundation
*Independently mergeable. Unblocks everything else. ~+60/-40 lines, 7 files.*

### Step 1.1 — Fix RESET dead-end: perpetual spinner after "Nuova generazione"
- **Files**: `machines/tool-page-machine.ts:223`, `components/layout/ToolPageLayout.tsx:25`
- **Problem**: `RESET` from `submitted` targets `draftEmpty` → `deriveUIState('draftEmpty')` = `'loading'` → infinite spinner. The form never reappears.
- **Action**: Change `RESET: { target: 'draftEmpty' }` → `RESET: { target: 'configuring' }`. Update `deriveUIState` so `draftEmpty` + `tool != null` = `'setup'` (not `'loading'`).
- **Dependencies**: None
- **Risk**: Low — 2 lines, no contract changes, test update required

### Step 1.2 — Extract `deriveUIState` to real module (remove test copy)
- **Files**: `machines/derive-ui-state.ts` (NEW), `components/layout/ToolPageLayout.tsx:21-31` (remove inline), `machines/__tests__/derive-ui-state.test.ts` (import instead of copy)
- **Problem**: The test replicates the function verbatim — assertions pass against a copy, not the real function. Known drift risk.
- **Action**: Move `deriveUIState` + `UIState` type to `machines/derive-ui-state.ts`. Import in `ToolPageLayout.tsx`. Update test to import from module.
- **Dependencies**: Step 1.1 (same function being modified)
- **Risk**: Low — pure extraction, zero behavioral change

### Step 1.3 — Extract terminal-status predicates to `shared/session-utils.ts`
- **Files**: `shared/session-utils.ts` (extend), `pages/SessionPage.tsx:62`, `components/tool/InlineSessionTracker.tsx:38`, `components/tool/GenerationSlot.tsx:31`
- **Problem**: Three independent encodings of `'completed'|'failed'|'cancelled'`. Adding a new terminal status requires 3 changes.
- **Action**: Export from `session-utils.ts`: `TERMINAL_STATUSES: ReadonlySet<SessionStatusDTO>`, `isTerminalStatus(status): boolean`, `isRunningStatus(status): boolean`, `isCompletedStatus(status): boolean`. Import in all 3 files, delete local encodings.
- **Dependencies**: None
- **Risk**: Low — pure extraction, no behavioral change

### Step 1.4 — Stop `ElapsedTimer` rAF loop on terminal state
- **Files**: `components/tool/GenerationSlot.tsx:44-71`, `components/tool/FeedbackPanel.tsx:23-45,118-119`
- **Problem**: `FeedbackPanel` is never unmounted — it's collapsed via `gridTemplateRows: 0fr`. The `ElapsedTimer` rAF loop (~60fps) continues forever after the session completes, wasting CPU/battery.
- **Action**: Pass `isTerminal` as a prop to `FeedbackPanel`. In `ElapsedTimer`, skip the rAF loop when `isTerminal`. Or, conditionally unmount `<FeedbackPanel>` instead of the CSS collapse (`{!isTerminal && <FeedbackPanel/>}`).
- **Dependencies**: Step 1.3 (`isTerminal` predicate)
- **Risk**: Medium — unmounting changes the CSS animation (the crossfade relies on the collapse); prefer the `isTerminal` prop approach to preserve animation

### Step 1.5 — Export canonical `StepProgress` type from `api/hooks.ts`
- **Files**: `api/hooks.ts:7-11` (export), `components/tool/GenerationSlot.tsx:10-14` (import), `components/tool/FeedbackPanel.tsx:9-12` (import)
- **Problem**: `StepProgress` / `StepProgressData` defined 3 times, already drifted (`label?` missing in one).
- **Action**: Export `StepProgress` from `hooks.ts`. Delete local definitions in `GenerationSlot.tsx` and `FeedbackPanel.tsx`; import from `hooks.ts`. Drop dead `label?` field (never read).
- **Dependencies**: None
- **Risk**: Low — pure re-export

### Step 1.6 — Delete dead code (Phase 1 batch)
- **Files**: `shared/animations.ts:18-21`, `components/tool/SetupPanel.tsx:210-217`, `components/tool/InlineSessionTracker.tsx:17,26`, `api/client.ts:16-18`, `api/hooks.ts:18-24`
- **Action**: Delete `fadeSlideDown` (zero importers), `fetchToolInputs` (zero callers, `@deprecated`), `toolKey` prop from `InlineSessionTracker` props/interface/call-sites, `ArtifactDTO.artifactId?` (dead phantom field), `LiveSession` type (fully redundant with `SessionListItemDTO` — re-declares optional fields that already exist on the contract type). Delete `gradients.completion` theme token from `theme/tokens.ts` (zero usage; banner has hardcoded gradient).
- **Verification**: `rg` confirms zero references for each symbol
- **Dependencies**: None
- **Risk**: Low — verified dead code, zero behavioral impact

### Phase 1 checkpoint
- `tsc --noEmit` clean, test suite passing
- Mergeable independently — no architectural restructuring

---

## Phase 2: Surface Unification — Single `SessionTracker` Component
*The core unification. ~+80/-140 lines net, 5 files.*

### Step 2.1 — Create shared `SessionTracker` component
- **File**: `components/tool/SessionTracker.tsx` (NEW, ~140 lines)
- **Action**: Extract from `InlineSessionTracker.tsx` the 4 duplicated blocks that also exist in `SessionPage.tsx`: (a) status/terminal/duration derivation, (b) cancel handler with `api.cancelSession`, (c) `GenerationSlot` props assembly, (d) terminal CTA row. Accept props: `sessionId`, `workspaceId`, `produces?`, `toolKey`, `initialSession?`, `replayed?`, `onReset`, `showCancel?`, `showStatusChip?`. Render `GenerationSlot` + cancel button + terminal CTAs.
- **Why**: Single owner for the 4 duplicated blocks. Any future change to cancel/terminal/props affects one file, not two.
- **Dependencies**: Steps 1.3 (terminal predicates), 1.5 (StepProgress type)
- **Risk**: Medium — new component, must be drop-in compatible with both surfaces

### Step 2.2 — Migrate `InlineSessionTracker` to use `SessionTracker`
- **File**: `components/tool/InlineSessionTracker.tsx` (simplify to ~30 lines)
- **Action**: Replace the inline `useSession` + 4 duplicated blocks with a single `<SessionTracker>` render. Keep the surface-specific logic: `onReset` → machine `RESET`. Delete `handleCancel`, `isRunning`/`isTerminal`/`durationMs` derivation, `GenerationSlot` props assembly, terminal CTA row.
- **Dependencies**: Step 2.1
- **Risk**: Low — `InlineSessionTracker` is the simpler surface, already a thin wrapper

### Step 2.3 — Migrate `SessionPage` to use `SessionTracker`
- **File**: `pages/SessionPage.tsx` (simplify to ~80 lines)
- **Action**: Replace the inline `useSession` + `GenerationSlot` + cancel/terminal blocks with `<SessionTracker>`. Keep page-level chrome: `PageHeader` with breadcrumbs + completion meta, `LoadingSkeleton`, `ErrorState`, replayed banner. The `SessionTracker` component renders the `GenerationSlot`, cancel, terminal CTAs. Surface differences via props (`showCancel`, `showStatusChip`, `onReset` = navigate back to tool page, `replayed` from search params).
- **Dependencies**: Step 2.1
- **Risk**: Medium — `SessionPage` has more chrome (PageHeader, loading/error guards, replayed banner). These stay in `SessionPage`; the `SessionTracker` only handles the session lifecycle.

### Step 2.4 — Fix asymmetries between surfaces
- **Files**: `components/tool/SessionTracker.tsx`, `pages/SessionPage.tsx`, `components/tool/InlineSessionTracker.tsx`
- **Action**: (a) Wire `replayed` prop through `InlineSessionTracker` → `SessionTracker` → render `shared.session.replayedMessage` Alert (currently missing in inline flow). (b) `InlineSessionTracker` must consume `loading`/`error` from `useSession` — currently destructures only `session, progress, stepArtifacts` (line 30), ignoring fetch failures. (c) Both surfaces must render the status chip (`<Chip label={status}>`) during running/queued state — currently only `SessionPage` has it. (d) `produces` source: use `session.produces` (from `SessionDTO`) everywhere, not `tool?.label`.
- **Dependencies**: Steps 2.2–2.3
- **Risk**: Low — wiring fixes, no new logic

### Phase 2 checkpoint
- `SessionTracker` component: single canonical surface for all session lifecycle rendering
- `SessionPage` and `InlineSessionTracker` are thin wrappers (page chrome vs tool-page context)
- All 4 asymmetry points resolved

---

## Phase 3: Progress Semantics + Type Coherence
*Backend + contracts + FE coordinated. ~+40/-60 lines, 6 files.*

### Step 3.1 — Rename `progress.current` → `progress.completedCount` (backend + FE)
- **Files**: Backend `session-worker.ts:198`, `api/hooks.ts:7-11`, `components/tool/FeedbackPanel.tsx:159-160,180,187`
- **Problem**: `current` is a COUNT of completed steps, consumed as a 0-based INDEX in `FeedbackPanel.isActive`. Three surfaces interpret it three different ways.
- **Action**: Rename to `completedCount` everywhere. `FeedbackPanel.isActive` → `i === completedCount` (still index-step-ahead, but now explicitly named as "the step after all completed ones"). `FeedbackPanel.isCompleted` → `i < completedCount`. `RunningCard.currentStepIndex` → `completedCount` (rename, no semantic change). Document in type: `/** Count of completed steps (0 = none). The step at index === completedCount is "awaiting execution". */`
- **Dependencies**: Step 1.5 (canonical StepProgress type)
- **Risk**: Medium — coordinated backend+FE rename. The backend SSE payload key changes from `current` to `completedCount`. Must verify no other SSE consumers.

### Step 3.2 — Add `creditCost` + `xpEarned` to backend response + contracts
- **Files**: Backend `api/generation.ts:346-369`, `packages/contracts/src/generation/session.dto.ts`, `apps/frontend/src/api/client.ts:11-14`
- **Problem**: `creditCost` and `xpEarned` are cast from `as unknown as Record<string, unknown>` because the backend never returns them. Every completed session shows "0 crediti" and no XP.
- **Action**: (a) Add `creditCost?: number` to `SessionDetailDTO` in contracts. (b) In backend `getSession`, resolve `creditCost` from tool definition and `xpEarned` from XP calculator. (c) Remove all 4 casts in `SessionPage.tsx` and `InlineSessionTracker.tsx`.
- **Dependencies**: Step 2.1 (removed casts are in the soon-to-be-extracted SessionTracker)
- **Risk**: Medium — backend change + contract change. Must verify `xpEarned` calculator is available in the `getSession` context.

### Step 3.3 — Fix `FETCH↔SSE reconciliation race** (upsert, not replace)
- **Files**: `api/hooks.ts:39-52`
- **Problem**: `api.getSession()` fires concurrently with SSE subscription. If SSE arrives first (progress=3) and the GET arrives later (artifacts=2), the GET **replaces** the array, regressing progress.
- **Action**: In the GET `.then()`, only `setProgress` if the incoming count is **greater** than the current state. For `stepArtifacts`, use the same upsert-by-`stepNumber` logic as `onStep` instead of a flat replace.
- **Dependencies**: None
- **Risk**: Low — guardian clause, no behavioral change in the happy path

### Step 3.4 — Remove all `as any` / `as unknown as` casts from the perimeter
- **Files**: `ToolPageLayout.tsx:189,315`, `GenerationSlot.tsx:62-66`
- **Action**: (a) `ToolPageLayout.tsx:189` — Type `InlineSessionTracker.initialSession` as `Pick<SessionDTO, 'id' | 'toolKey' | 'workspaceId'>` instead of fabricating a full invalid `SessionDTO`. (b) `ToolPageLayout.tsx:315` — Remove `as any` (the spread is already type-compatible). (c) `GenerationSlot.tsx:62-66` — Type `FeedbackPanel.artifacts` as `StepArtifactPreview[]` (from step 1.5), not `as ArtifactDTO[]`.
- **Dependencies**: Step 1.5 (StepArtifactPreview type)
- **Risk**: Low — honest types, no behavioral change

### Phase 3 checkpoint
- Zero `as any` / `as unknown as` casts in the perimeter
- `completedCount` is the single semantic across all 3 surfaces
- REST+SSE data streams reconciled without regression

---

## Phase 4: Duplication Cleanup
*Independently mergeable. ~+20/-80 lines, 6 files.*

### Step 4.1 — Consolidate 4 duration formatters into 2
- **Files**: `shared/session-utils.ts` (extend), `pages/SessionPage.tsx:18-24` (delete), `components/shared/CompletionBanner.tsx:17-22` (delete), `components/workspace/ReadyToPromoteList.tsx:24-28` (delete)
- **Action**: Keep `formatElapsedSeconds(seconds)` (canonical for seconds input). Add `formatDurationMs(ms)` wrapper that delegates to `formatElapsedSeconds`. Delete `CompletionBanner.formatDuration` (identical to `formatElapsedSeconds`, different name). `ReadyToPromoteList.formatDuration` is minutes-only — either accept the `Xm Ys` canonical or add `formatDurationMinutes(seconds)`. `ElapsedTimer`'s `mm:ss` live-tick format is genuinely different (per-second rendering) — keep separate.
- **Dependencies**: None
- **Risk**: Low — pure consolidation, test coverage for edge cases

### Step 4.2 — Remove `formatToolLabel` inline duplicates
- **Files**: `components/layout/ToolPageLayout.tsx:101`, `components/workspace/ReadyToPromoteList.tsx:56`
- **Action**: Import `formatToolLabel` from `shared/session-utils.ts` in both files (it's already there). Delete inline regex implementations.
- **Dependencies**: None
- **Risk**: Low

### Step 4.3 — Fix `configuring→RESET` unreachable from UI (delete or wire)
- **Files**: `machines/tool-page-machine.ts:75-80,154-157`, `machines/__tests__/tool-page-machine.test.ts`
- **Action**: The guard `isStillDraftGuard` and `configuring.on.RESET` transition are registered and tested but have no UI trigger (RESET is only sent from submitted/deep-link/stuck). Either (a) add a "Reset" control in `ToolPageLayout` during setup, or (b) delete the transition + guard + test. Based on product needs — if "clear form" is desired, wire it; otherwise, delete dead state-machine code.
- **Dependencies**: None
- **Risk**: Low — either adds a UI affordance or removes dead code

### Step 4.4 — Fix `PromoteDialog` error announcement
- **Files**: `components/shared/PromoteDialog.tsx:75-79`
- **Action**: Add `role="alert"` to the error `Typography` component when `state === 'error'`.
- **Dependencies**: None
- **Risk**: Low

### Phase 4 checkpoint
- 1 canonical duration formatter with 1 wrapper
- 0 inline regex implementations
- 0 unreachable machine transitions

---

## Phase 5: Accessibility & Polish
*Independently mergeable. ~+15/-10 lines, 4 files.*

### Step 5.1 — Fix `CompletionBanner` gradient contrast (AA fail 3.77:1)
- **Files**: `components/shared/CompletionBanner.tsx:32`, `theme/tokens.ts:54-58`
- **Problem**: White text on `#059669` (emerald endpoint) = 3.77:1, fails AA 4.5:1 for normal text (the title is `h6` at 14px, held to 4.5:1 standard).
- **Action**: Darken the emerald stop to at least `#047857` (`success.dark`, already in `tokens.ts`) so worst-case stop ≥4.5:1. Update `gradients.completion` token to match, then import the token in `CompletionBanner` instead of hardcoded values. Remove dead `gradients.completion` token if no longer needed.
- **Dependencies**: None
- **Risk**: Medium — visual change, must verify both endpoints pass AA

### Step 5.2 — Fix nested `aria-live` regions (keep one, strip two)
- **Files**: `components/tool/GenerationSlot.tsx:44-47`, `components/tool/FeedbackPanel.tsx:172,217`
- **Action**: Keep `role="status" aria-live="polite"` ONLY on the outermost `GenerationSlot` wrapper. Strip `role="status" aria-live="polite"` from `FeedbackPanel.tsx:172`. Strip `aria-live="polite"` from the live-preview box at `FeedbackPanel.tsx:217`.
- **Dependencies**: Step 1.4 (if FeedbackPanel is unmounted on terminal, this changes slightly)
- **Risk**: Low — reduces announcements, doesn't add new ones

### Step 5.3 — Fix missing `role="list"` parent + `prefers-reduced-motion` guard
- **Files**: `components/tool/FeedbackPanel.tsx:57,108,152`
- **Action**: (a) Add `role="list"` to the `<Stack>` container that holds `role="listitem"` elements. (b) Add `@media (prefers-reduced-motion: reduce) { animation: none }` to the caption `slideInFade` at line 108.
- **Dependencies**: None
- **Risk**: Low

### Step 5.4 — Fix `aria-live="polite"` redundancy on `CompletionBanner`
- **Files**: `components/shared/CompletionBanner.tsx:27-28`
- **Action**: `role="alert"` already implies `aria-live="assertive"` + `aria-atomic="true"`. Adding `aria-live="polite"` is contradictory. Keep only `role="alert"`.
- **Dependencies**: None
- **Risk**: Low

### Phase 5 checkpoint
- 0 accessibility violations in the perimeter
- All animations respect `prefers-reduced-motion`

---

## Testing Strategy

### Pre-refactor baseline
```bash
cd apps/frontend && npx vitest run 2>&1 | tail -5  # record pass/fail count
cd apps/backend && npx vitest run 2>&1 | tail -5
```

### Per-phase tests
| Phase | Tests to verify | Risk areas |
|-------|----------------|------------|
| 1 | `derive-ui-state.test.ts` (updated), `tool-page-machine.test.ts` (RESET target), `GenerationSlot.test.tsx` (terminal predicates), `FeedbackPanel.test.tsx` (StepProgress import) | Machine transitions, type imports |
| 2 | `SessionPage` tests (if any), `InlineSessionTracker` behavior via `ToolPageLayout.test.tsx`, new `SessionTracker.test.tsx` | Surface migration — both must render identically |
| 3 | Backend `session-worker.test.ts` (SSE payload rename), domain tests, E2E generation flow | Coordinated rename, type chain |
| 4 | `session-utils.test.ts` (duration formatters), machine tests (guard removal) | Edge cases in formatter consolidation |
| 5 | Visual regression (manual), a11y lint | Gradient verification with color-contrast-checker |

### New test file
- `components/tool/__tests__/SessionTracker.test.tsx` — verifies shared component renders consistently for both surfaces

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| `completedCount` rename breaks SSE consumers | Medium | Rename in backend first, grep ALL consumers, update contracts DTO |
| `SessionTracker` extraction introduces regression | Medium | Pre-refactor baseline, diff both surfaces' DOM snapshots before/after |
| `creditCost`/`xpEarned` backend change requires calculator availability | Medium | Verify `XPCalculator` + tool definition are accessible in `getSession` context |
| `fetchToolDefinitions` → api client migration breaks 401 refresh | Low | `api.listTools()` already exists; just switch the call |
| Gradient contrast change looks different | Low | Use token value from `tokens.ts`; verify both endpoints with `color-contrast-checker` |

---

## Success Criteria

- [ ] Phase 1: Critical bugs fixed, `deriveUIState` extracted, dead code deleted. Test suite passes.
- [ ] Phase 2: `SessionTracker` component exists. `InlineSessionTracker` and `SessionPage` both delegate to it. Replay banner + error/loading + status chip present in both surfaces.
- [ ] Phase 3: `completedCount` semantics consistent across all 3 rendering surfaces. Zero `as any`/`as unknown as` casts. REST↔SSE reconciliation produces no regression.
- [ ] Phase 4: 4 duration formatters → 2. `formatToolLabel` imported, not re-implemented. Dead machine transitions removed or wired.
- [ ] Phase 5: CompletionBanner gradient passes AA at both endpoints. Single aria-live region. All animations respect `prefers-reduced-motion`.
- [ ] Phase 5: `tsc --noEmit` clean across frontend + backend + contracts
- [ ] Phase 5: Test suite unchanged or improved (0 regressions)

---

## Net Delta

| Category | Files | Net lines |
|----------|-------|-----------|
| New files | 2 (`derive-ui-state.ts`, `SessionTracker.tsx`) | +180 |
| Modified | 16 (`tool-page-machine.ts`, `hooks.ts`, `ToolPageLayout.tsx`, `SessionPage.tsx`, `InlineSessionTracker.tsx`, `GenerationSlot.tsx`, `FeedbackPanel.tsx`, `session-utils.ts`, `client.ts`, `SetupPanel.tsx`, `animations.ts`, `CompletionBanner.tsx`, `tokens.ts`, `PromoteDialog.tsx`, `RunningCard.tsx`, backend `session-worker.ts` + `generation.ts`) | +60, -260 |
| Deleted | 0 (types/code removed, no files deleted) | - |
| **Net** | **18 files** | **~-20 lines** |

The plan is net-negative in lines: more code deleted (duplication removed) than added (shared module + component).