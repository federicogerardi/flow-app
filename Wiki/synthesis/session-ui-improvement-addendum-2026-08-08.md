---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/ux
  - wiki/design-spec
date_updated: 2026-08-08
source_count: 5
confidence: high
resolution: all 7 remaining gaps resolved 2026-08-08. 32/32 findings now complete. See [[log#2026-08-08 fix Session UI — 7 remaining gaps resolved|log entry]]
---

# Session UI — Improvement Addendum (2026-08-08)

> **Context**: The original [[session-ui-improvement-spec-2026-08-08]] identified 32 findings. The implementation log ([[log#2026-08-08 fix Session UI 32 findings resolved across 11 files|log entry 2026-08-08]]) claimed "all 32 findings implemented 2026-08-08."  
> **Reality check**: File-system audit confirms **25/32 findings resolved**. **7 findings remain open** — one critical UX gap (`useLiveSession` not integrated), four a11y ARIA gaps, and two minor a11y refinements.

## Remaining Gaps (7 findings across 3 components)

### Gap A — SessionList: `useLiveSession` not integrated (CRITICAL)

| Aspect | Intended (spec) | Actual | Impact |
|--------|----------------|--------|--------|
| Running/queued card updates | `useLiveSession(sessionId)` wraps each card, subscribing to SSE for real-time step/progress/artifact updates | `useSWR` with 30s polling only (`refreshInterval: 30000`) | Running sessions show stale data for up to 30 seconds. Step progress, elapsed time, and artifact previews don't update until the next poll cycle. |
| Cross-tab resilience | API catch-up on mount + SSE subscription | SWR re-fetches on mount (works) but no SSE | After tab reopen, user gets latest data but no live updates thereafter |

**Root cause**: The `useLiveSession` hook is fully implemented in `apps/frontend/src/api/hooks.ts` (lines 53–127) with SSE subscription to `sseClient.connect()` for `onStep`/`onCompleted`/`onFailed` events. It is simply not called from `SessionList.tsx`.

**Fix**: Wrap running and queued cards with `useLiveSession`. The hook already supports the exact pattern from the wiki spec:
- API catch-up on mount (`api.getSession(sessionId)`)
- SSE subscription for live step updates
- `onCompleted`/`onFailed` → re-fetch from API
- Idempotent unsubscribe on unmount

```tsx
// In SessionList.tsx, for running/queued iterations:
function LiveRunningCard({ session }: { session: SessionListItemDTO }) {
  const { liveSession } = useLiveSession(session.id);
  const display = liveSession ?? session;
  return <RunningCard session={display} ... />;
}
```

The 30-second SWR poll remains as fallback (SSE unavailable or disconnected).

**Effort**: ~1h (2 new wrapper components + import wiring)

### Gap B — SessionPage: main Card missing `aria-label`

| Location | Current | Required | Copy Key |
|----------|---------|----------|----------|
| Line 91: `<Card sx={{ mb: 3 }}>` | No `aria-label` | `aria-label={copy.t('shared.aria.sessionDetail', { tool: toolName })}` | ✅ Already exists: `shared.aria.sessionDetail` = `'Dettaglio sessione: {tool}'` |

**Impact**: Screen readers navigating by landmark/region cannot identify this as the session detail card.

**Effort**: ~1 min

### Gap C — SessionPage: Status Chip missing `aria-label`

| Location | Current | Required |
|----------|---------|----------|
| Line 96-99: `<Chip label={copy.t('shared.sessionStatus.' + status)} ... />` | No `aria-label` | `aria-label={copy.t('shared.sessionStatus.' + status)}` |

**Impact**: Screen readers only hear the visible label when navigating by interactive element. An explicit `aria-label` ensures the chip is announced clearly even in forms/landmarks mode.

**Effort**: ~1 min

### Gap D — SessionPage: Interrupted Alert missing `aria-describedby`

| Location | Current | Required |
|----------|---------|----------|
| Line 78: `<Alert severity="info" sx={{ mb: 2 }}>` | No `aria-describedby` | `aria-describedby="interrupted-session-msg"` + `id="interrupted-session-msg"` on the text span |

**Impact**: The Alert is announced but its content isn't linked to the description. WCAG Technique [ARIA21](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21): alerts with complex content should use `aria-describedby` to ensure full announcement.

**Effort**: ~3 min

### Gap E — FeedbackPanel: StepIndicator missing `aria-label`

| Location | Current | Required |
|----------|---------|----------|
| Line 56-113: `StepIndicator` outer `<Box>` | No `aria-label` | `aria-label={isCompleted ? copy.t('toolPage.progress.stepCompleted', { ... }) : isActive ? copy.t('toolPage.progress.stepActive', { ... }) : copy.t('toolPage.progress.stepPending', { ... })}` |

**Impact**: Screen readers cannot distinguish between completed, in-progress, and pending steps when navigating the step list. The visual distinction (checkmark, spinner, greyed out) has no accessible equivalent.

**New copy keys needed** (3):
```typescript
// packages/copy/src/it/tool-page.ts — progress section
'toolPage.progress.stepCompleted': 'Step {current} di {total}: completato',
'toolPage.progress.stepActive':    'Step {current} di {total}: in corso',
'toolPage.progress.stepPending':   'Step {current} di {total}: in attesa',
```

**Effort**: ~10 min (3 new copy keys + 1 aria-label)

### Gap F — FeedbackPanel: ElapsedTimer missing `aria-label`

| Location | Current | Required |
|----------|---------|----------|
| Line 48: `<Typography role="timer">` | `role="timer"` ✅ but no `aria-label` | `aria-label={copy.t('toolPage.progress.elapsedTime', { mins, secs })}` |

**Impact**: `role="timer"` tells assistive tech this is a timer, but without `aria-label` it doesn't say *what* is being timed. A screen reader would announce "timer: 2:35" but not "tempo trascorso: 2:35".

**New copy key needed** (1):
```typescript
// packages/copy/src/it/tool-page.ts — progress section
'toolPage.progress.elapsedTime': 'Tempo trascorso: {mins}m {secs}s',
```

**Effort**: ~5 min (1 copy key + 1 aria-label)

### Gap G — RunningCard: LinearProgress missing explicit `aria-label`

| Location | Current | Required |
|----------|---------|----------|
| Line 35-39: `<LinearProgress variant="determinate" ... />` | MUI auto-sets `role="progressbar"` + `aria-valuenow/min/max` | Add `aria-label={copy.t('shared.aria.runningProgress', { current: ...currentStep, total: ...stepCount })}` |

**Impact**: MUI's `LinearProgress` component provides structural ARIA but no descriptive label. Screen readers get "progressbar: 50%" without context of *what* is progressing. The copy key already exists: `shared.aria.runningProgress` = `'Progresso: {current} di {total}'`.

**Effort**: ~1 min

---

## Prioritized Implementation Plan (Addendum)

| Priority | Gap | Impact | Effort |
|----------|-----|--------|--------|
| 🔴 P0 | A — SessionList: `useLiveSession` SSE | Real-time progress visibility — the single largest UX gap | ~1h |
| 🟡 P1 | B — SessionPage Card aria-label | Screen reader region identification | ~1 min |
| 🟡 P1 | E — StepIndicator aria-label | Screen reader step state identification | ~10 min |
| 🟢 P2 | C — Status Chip aria-label | Redundant with label, but explicit is better | ~1 min |
| 🟢 P2 | D — Alert aria-describedby | WCAG ARIA21 compliance | ~3 min |
| 🟢 P2 | F — ElapsedTimer aria-label | Timer context announcement | ~5 min |
| 🟢 P2 | G — RunningCard LinearProgress aria-label | Progress context announcement | ~1 min |

**Total addendum effort: ~1.3h** (vs original ~6.25h for the 25 resolved findings)

### Combined status after addendum

| Original Batch | Resolved | Remaining | After Addendum |
|---------------|----------|-----------|---------------|
| Batch 1 — Copy violations | 14/14 ✅ | 0 | 14/14 ✅ |
| Batch 2 — Accessibility | 5/12 | 7 (B–G) | 12/12 ✅ |
| Batch 3 — Spec drifts | 3/4 | 1 (A) | 4/4 ✅ |
| Batch 4 — Visual fix | 1/1 ✅ | 0 | 1/1 ✅ |

---

## Verification Checklist (Addendum)

After implementation, verify:

- [ ] `useLiveSession` wraps running and queued cards in `SessionList.tsx`
- [ ] Running card updates in real-time via SSE (not just 30s poll)
- [ ] SessionPage main `<Card>` has `aria-label={copy.t('shared.aria.sessionDetail', ...)}` 
- [ ] SessionPage Status `<Chip>` has `aria-label`
- [ ] SessionPage Alert has `aria-describedby` linked to content `id`
- [ ] FeedbackPanel `<StepIndicator>` has `aria-label` with completed/active/pending distinction
- [ ] FeedbackPanel `<ElapsedTimer>` has `aria-label` with mins/secs
- [ ] RunningCard `<LinearProgress>` has `aria-label`
- [ ] 4 new copy keys added to `tool-page.ts` (`stepCompleted`, `stepActive`, `stepPending`, `elapsedTime`)
- [ ] `tsc --noEmit` passes (frontend + copy)
- [ ] `vitest run` passes (151+ tests)

---

## Sources

- [[session-ui-improvement-spec-2026-08-08]] — Original 32-finding specification
- [[SessionPage]] — Session detail page specification
- [[Session List - Live Status]] — Live status tracking with `useLiveSession` spec
- [[UX Spec Summary-2026-08-07]] — UX architecture handoff (Section 9: Accessibility)
- [[log#2026-08-08 fix Session UI 32 findings resolved across 11 files|Log entry]] — Implementation log claiming 32/32 resolved
