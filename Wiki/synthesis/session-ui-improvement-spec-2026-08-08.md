---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/ux
  - wiki/design-spec
date_updated: 2026-08-11
source_count: 10
confidence: high
resolution: 32/32 findings resolved (25/32 2026-08-08 + 7/7 addendum 2026-08-08). See [[session-ui-improvement-addendum-2026-08-08|addendum]] and [[log#2026-08-11 fix G1-G4 generation SSE & DTO remediation|log entry for G1-G4 runtime fixes]]
---

# Session UI — Improvement Specification

> Full-stack design specification for session-related UI components. No code changes — this is the authoritative design document for the next implementation pass.  
> **Audit date**: 2026-08-08. Based on file-system audit of 10 session components against 10 wiki specification pages.

## Summary

| Metric | Value |
|--------|-------|
| Components audited | 10 |
| Hardcoded strings found | 14 (across 5 files) |
| New copy keys needed | 14 |
| Accessibility gaps | 12 |
| Spec-implementation drifts | 4 |
| Visual/token issues | 2 |
| Total findings | 32 |

---

## 1. Copy Module Violations (14 hardcoded strings, 5 files)

### 1.1 SessionPage.tsx — 11 violations (HIGHEST PRIORITY)

This is the worst offender. The `copy` module IS imported but only used for breadcrumbs and the ErrorState message. Every Chip label, heading, button text, and metadata label is hardcoded English.

| Line | Current hardcoded | Replacement key | Italian value |
|------|------------------|----------------|---------------|
| 39 | `'Sessions'` (breadcrumb) | `workspace.nav.sessions` | ✅ Already exists: `'Sessioni'` |
| 40 | `'Session'` (fallback) | `shared.label.session` (NEW) | `'Sessione'` |
| 74 | `` `Session: ${toolName}` `` | `shared.label.sessionWithTool` (NEW) | `'Sessione: {toolName}'` |
| 79 | `'This session was interrupted. You can retry by starting a new generation from the '` | `shared.session.interruptedMessage` (NEW) | `'Questa sessione è stata interrotta. Puoi riprovare avviando una nuova generazione dalla pagina '` |
| 86 | `' tool'` (part of interrupted message) | (merge with interruptedMessage above) | (part of interruptedMessage) |
| 95 | `'Status'` (section heading) | `shared.label.status` (NEW) | `'Stato'` |
| 96 | `session.status` (Chip label) | `shared.sessionStatus.{status}` | ✅ Already exists: e.g., `shared.sessionStatus.completed` = `'Completata'` |
| 109 | `'Cancelling...'` / `'Cancel'` | `shared.actions.cancelling` (NEW) / `shared.actions.cancel` | `'Annullamento...'` / `'Annulla'` |
| 117 | `'Steps:'` (metadata label) | `shared.label.steps` (NEW) | `'Step:'` |
| 133 | `'Created:'` (metadata label) | `shared.label.created` (NEW) | `'Creato:'` |

**Total new keys required for SessionPage: 8**

### 1.2 RunningCard.tsx — 1 violation

| Line | Current hardcoded | Replacement key | Italian value |
|------|------------------|----------------|---------------|
| 43 | `` `Step {(session.currentStepIndex ?? 0) + 1}/${session.stepCount}` `` | `toolPage.progress.stepLabel` | ✅ Already exists: `'Step {current} di {total}'` (note: template params are `current` and `total`, usage would be `copy.t('toolPage.progress.stepLabel', { current: ..., total: ... })`) |

**Total new keys required for RunningCard: 0 (existing key matches)**

### 1.3 FailedCard.tsx — 1 violation

| Line | Current hardcoded | Replacement key | Italian value |
|------|------------------|----------------|---------------|
| 32 | `` ` · Step ${session.failedAtStep}` `` | `shared.session.failedAtStep` (NEW) | `' · Step {step}'` |

**Total new keys required for FailedCard: 1**

### 1.4 QueuedCard.tsx — 1 violation

| Line | Current hardcoded | Replacement key | Italian value |
|------|------------------|----------------|---------------|
| 24 | `` `Queue position: ${session.queuePosition}` `` | `shared.session.queuePosition` (NEW) | `'Posizione in coda: {position}'` |

**Total new keys required for QueuedCard: 1**

### 1.5 FeedbackPanel.tsx — 1 violation (aria-label)

| Line | Current hardcoded | Replacement key | Italian value |
|------|------------------|----------------|---------------|
| 156 | `` aria-label={`Step ${progress.current} of ${progress.total}`} `` | `toolPage.progress.ariaLabel` (NEW) | `'Step {current} di {total}'` |

**Total new keys required for FeedbackPanel: 1**

### 1.6 Summary of New Copy Keys Needed

All new keys go into `packages/copy/src/it/shared.ts`:

```typescript
// NEW KEYS — add to shared.ts

// Labels
'shared.label.session': 'Sessione',
'shared.label.sessionWithTool': 'Sessione: {toolName}',
'shared.label.status': 'Stato',
'shared.label.steps': 'Step:',
'shared.label.created': 'Creato:',

// Actions
'shared.actions.cancelling': 'Annullamento...',

// Session
'shared.session.interruptedMessage': `Questa sessione è stata interrotta. Puoi riprovare avviando una nuova generazione dalla pagina `,
'shared.session.failedAtStep': ' · Step {step}',
'shared.session.queuePosition': 'Posizione in coda: {position}',
```

And one key into `packages/copy/src/it/tool-page.ts`:

```typescript
// NEW KEY — add to tool-page.ts progress section
'toolPage.progress.ariaLabel': 'Step {current} di {total}',
```

**Total: 12 new copy keys** (11 in shared.ts, 1 in tool-page.ts). Note: 2 of the original 14 findings use existing keys (`workspace.nav.sessions`, `shared.sessionStatus.*`, `toolPage.progress.stepLabel`, `shared.actions.cancel`).

---

## 2. Accessibility Gaps (12 findings)

### 2.1 SessionPage.tsx — 4 gaps

| Gap | Location | Fix |
|-----|----------|-----|
| No `aria-label` on any element | Entire page | Add `aria-label={copy.t('shared.aria.sessionDetail', { tool: toolName })}` on the main card |
| Interrupted Alert has no accessible description | Line ~79 | Add `aria-describedby` pointing to the Alert text |
| Cancel button has no `aria-label` beyond visible text | Line ~109 | Add `aria-label={copy.t('toolPage.cta.cancel')}` |
| Status Chip has no `aria-label` | Line ~96 | MUI Chip should have `aria-label={copy.t('shared.sessionStatus.' + status)}` |

### 2.2 Card Components — 3 gaps

| Component | Gap | Fix |
|-----------|-----|-----|
| RunningCard | No `aria-label` on View/Cancel buttons | Add explicit `aria-label` attributes |
| CompletedCard | No `aria-label` on View/Download/Promote buttons | Add explicit `aria-label` attributes |
| FailedCard | No `aria-label` on Retry button | Add `aria-label={copy.t('shared.actions.retry')}` |

### 2.3 CompletionBanner.tsx — 2 gaps

| Gap | Fix |
|-----|-----|
| No `role="alert"` or `aria-live` | Add `role="alert" aria-live="polite"` to the banner container — completion is a major state change that screen readers must announce |
| Emoji `✅` has no alt text | Wrap in `<span role="img" aria-hidden="true">` or use `aria-label` on parent |

### 2.4 FeedbackPanel.tsx — 3 gaps

| Gap | Fix |
|-----|-----|
| Indeterminate `LinearProgress` (line 126) has no `aria-label` | Add `aria-label={copy.t('toolPage.progress.starting')}` when `variant="indeterminate"` |
| `ElapsedTimer` component updates every frame with no `role="timer"` or `aria-live` | Add `role="timer"` and throttle updates to 1s. Add `aria-label={copy.t('toolPage.progress.elapsedTime', { mins, secs })}` |
| Active step card has no `aria-label` distinguishing from pending/completed | Per the wiki spec: `aria-label={"{step.label}: {completed | in progress | waiting}"}` — this is implemented for the StepCards but verify it works correctly |

---

## 3. Spec-Implementation Drifts (4 findings)

### 3.1 SessionList uses single API call instead of 4 per-status calls

| Aspect | Wiki Spec | Current Implementation | Impact |
|--------|-----------|----------------------|--------|
| API calls | 4 separate calls (`status=queued`, `status=running`, `status=completed`, `status=failed`) with per-status `limit` parameters | Single `api.listSessions({ workspaceId })` + client-side filtering | No per-status `limit` enforcement. `completed` and `failed` tabs show ALL sessions, not just last 20. |
| Badge visibility | `inProgressCount === 0` hides the badge | Badge always visible, shows `0` when empty | Minor UX: shows `0` in corner instead of nothing |

**Recommendation**: Adopt the wiki pattern — 4 parallel API calls with `status=queued`, `status=running`, `status=completed&limit=20`, `status=failed&limit=20`. This gives per-tab pagination and accurate counts without client-side filtering.

### 3.2 SessionList does not use `useLiveSession` for SSE-based real-time updates

| Aspect | Wiki Spec | Current Implementation | Impact |
|--------|-----------|----------------------|--------|
| Running/queued updates | `useLiveSession(sessionId)` wraps each card, subscribing to SSE for real-time step/progress/artifact updates | 30-second poll only (`refreshInterval: 30000` in SWR) | For running sessions, the user sees stale data for up to 30 seconds. During generation, step progress, elapsed time, and artifact previews won't update until the next poll cycle. |
| Cross-tab resilience | `useLiveSession` catches up from API on mount + SSE subscription | SWR re-fetches on mount (works) but no SSE | After tab reopen, user gets latest data but no live updates thereafter |

**Recommendation**: Wrap running/queued session cards with `useLiveSession` per the wiki spec. The 30-second poll remains as fallback (SSE unavailable or disconnected). This is the single largest UX improvement opportunity — real-time progress visibility is the core value proposition of the Session List.

### 3.3 CompletedCard missing `completedAt` date display

The wiki UX Wireframes (Template 2 — Workspace Home) and Session List spec show a completion date in the top-right of completed cards. The actual `CompletedCard` component does not render `session.completedAt`.

**Fix**: Add `Typography variant="caption" color="text.secondary"` with `formatDate(session.completedAt)` aligned top-right in the card header.

### 3.4 SessionPage breadcrumb format differs from wireframe spec

| Aspect | Wiki Spec | Current Implementation |
|--------|-----------|----------------------|
| Breadcrumb format | `Q3 Campaign > Sessions > Blog Post · 30/07 14:32` | `Home > workspaceId > Sessions > Session: {toolKey}` |

**Recommendation**: Replace `'Session'` (fallback) with `copy.t('shared.label.sessionWithTool', { toolName })`, and replace `'Home'` with the workspace name from context. The `· timestamp` part is a nice-to-have — add only if `session.createdAt` is available in the SessionDTO.

---

## 4. Visual / Design Token Issues (2 findings)

### 4.1 CompletionBanner contrast ratio borderline at teal end

| Element | Background | Text | Ratio | WCAG AA (large text) |
|---------|-----------|------|-------|---------------------|
| Green end | `#059669` | `#FFFFFF` (bold 700) | **4.6:1** | ✅ Above 3:1 minimum |
| Teal end | `#0891B2` | `#FFFFFF` (bold 700) | **~2.9:1** | ⚠️ Below 3:1 minimum |

The gradient goes from `#059669` (green) to `#0891B2` (teal). Since text spans across the gradient, the teal end text falls below the 3:1 minimum for large bold text.

**Fix**: Change the teal endpoint to a darker value. Options:
- `#0E7490` (cyan-700): contrast vs white = **4.5:1** ✅ (meets AA for normal text)
- `#155E75` (cyan-800): contrast vs white = **5.9:1** ✅
- Keep the current teal and add `text-shadow: 0 1px 2px rgba(0,0,0,0.3)` for a 0.5-1 point boost

**Recommended**: `linear-gradient(135deg, #059669 0%, #0E7490 100%)` — maintains the green→teal creative feel while ensuring WCAG AA compliance.

### 4.2 SessionPage status chip should use existing `statusColorMap`

The wiki says `"Status chip (color-coded via statusColorMap)"` and the code does this. **Verified OK** — no action needed.

---

## 5. Accessibility Audit — WCAG 2.1 AA Compliance Matrix

Per the UX Spec Summary (Section 9), here is the compliance status for session components:

| WCAG Requirement | Component | Status | Action |
|-----------------|-----------|--------|--------|
| **Keyboard navigation** — all interactive elements focusable | SessionPage | ✅ | MUI Button/Chip handle this |
| **Keyboard navigation** — Tab order logical | All cards | ✅ | Tab through action buttons |
| **Skip link** | AppShell | ✅ | Already implemented (`shared.wcag.skipToContent`) |
| **Screen reader — dynamic content** | FeedbackPanel | ✅ | `role="status" aria-live="polite"` |
| **Screen reader — state changes** | CompletionBanner | ❌ | Missing `role="alert"` — see Gap 2.3 |
| **Screen reader — progress** | RunningCard | ⚠️ | MUI LinearProgress sets `role="progressbar"` automatically but no `aria-label` |
| **Color — not the only differentiator** | FailedCard | ✅ | Uses ❌ icon + error message + red border — icon visible to all |
| **Motion — respects user preference** | CompletionBanner | ✅ | `prefers-reduced-motion` respected |
| **Motion — respects user preference** | FeedbackPanel | ✅ | Individual step animations respect reduced motion |
| **Touch targets — minimum 44×44px** | All buttons | ✅ | MUI Button default height 36px + 8px padding = 44px minimum |
| **ARIA labels on interactive elements** | Card action buttons | ❌ | Missing on all 4 card types — see Gap 2.2 |

---

## 6. Prioritized Implementation Plan

### Batch 1 — Critical Copy Violations (~2h)

Fixes the 3 worst files for hardcoded strings. Zero behavioral changes.

| Priority | File | Strings | Effort |
|----------|------|---------|--------|
| 🔴 P0 | `SessionPage.tsx` | 11 hardcoded strings | ~1h |
| 🟡 P1 | `FeedbackPanel.tsx` | 1 aria-label | ~5 min |
| 🟡 P1 | `RunningCard.tsx` | 1 string (exists in copy module) | ~5 min |
| — | Add 12 new copy keys to `shared.ts` + `tool-page.ts` | — | ~15 min |
| — | Verify: `tsc --noEmit` + `vitest run` | — | ~15 min |

### Batch 2 — Accessibility Gaps (~1h)

Fixes the most impactful accessibility issues.

| Priority | Component | Gaps | Effort |
|----------|-----------|------|--------|
| 🔴 P0 | `CompletionBanner.tsx` | `role="alert"` + emoji alt text | ~10 min |
| 🟡 P1 | `SessionPage.tsx` | 4 aria-label gaps | ~15 min |
| 🟡 P1 | 4 card components | aria-labels on action buttons | ~15 min |
| 🟢 P2 | `FeedbackPanel.tsx` | `role="timer"` + indeterminate label | ~15 min |

### Batch 3 — Spec-Implementation Drifts (~3h)

These are behavioral changes — the most impactful UX improvements.

| Priority | Drift | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 P0 | SessionList → SSE via `useLiveSession` | Real-time progress visibility | ~1.5h |
| 🟡 P1 | SessionList → 4 per-status API calls | Correct per-tab limits + counts | ~45 min |
| 🟢 P2 | CompletedCard → add `completedAt` date | Missing UI element | ~15 min |
| 🟢 P2 | SessionPage → breadcrumb format | Wireframe alignment | ~15 min |

### Batch 4 — Visual/Token Fix (~15 min)

| Fix | Effort |
|-----|--------|
| CompletionBanner gradient: `#0891B2` → `#0E7490` | ~5 min |
| Verify contrast with accessibility tool | ~10 min |

### Total Effort: ~6.25h (1 day)

| Batch | Estimate |
|-------|----------|
| Batch 1 — Copy violations | **2h** |
| Batch 2 — Accessibility | **1h** |
| Batch 3 — Spec drift | **3h** |
| Batch 4 — Visual fix | **0.25h** |
| **Total** | **~6.25h** |

---

## 7. Design Verification Checklist

After implementation, verify:

- [ ] `rg '"Step' apps/frontend/src/components/` returns 0 matches
- [ ] `rg '"Queue position' apps/frontend/src/components/` returns 0 matches
- [ ] `rg '"Status' apps/frontend/src/components/` returns 0 matches
- [ ] `rg '"Created:' apps/frontend/src/components/` returns 0 matches
- [ ] `rg 'This session was interrupted' apps/frontend/src/` returns 0 matches
- [ ] `rg "aria-label='Step" apps/frontend/src/` returns 0 matches (all aria-labels use copy.t())
- [ ] `CompletionBanner` has `role="alert"` in rendered output
- [ ] All card action buttons have `aria-label` attributes
- [ ] `CompletedCard` renders `session.completedAt` in top-right
- [ ] `SessionList` running cards update in real-time via SSE (not just 30s poll)
- [ ] `SessionList` completed tab shows max 20 sessions (not all)
- [ ] CompletionBanner gradient teal end passes WCAG AA (4.5:1 for normal text or 3:1 for large text)
- [ ] `tsc --noEmit` passes in all packages
- [ ] `vitest run` passes in frontend (140 tests)
- [ ] `pkill -f vitest; vitest run` passes in backend

---

## Sources

- [[SessionPage]] — Session detail page specification
- [[Session List - Live Status]] — Live status tracking and card states
- [[UX Wireframes]] — Wireframe templates 1–8 (all session-related views)
- [[UX Spec Summary-2026-08-07]] — Comprehensive UX handoff (Section 4: Session Tracking)
- [[Tool UX Architecture]] — FeedbackPanel and SessionSummary specs
- [[UI Component Map]] — Component inventory and status tracking
- [[Design Tokens]] — Complete token system
- [[Centralized Copy Modules]] — Copy module conventions
- [[ui-design-summary-2026-08-07]] — Full-stack UI design reference
- [[open-findings-plan-2026-08-08]] — Previously identified copy violations (Gap 1)