---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/audit
  - wiki/frontend
date_updated: 2026-08-07
source_count: 16
confidence: high
---

# Frontend Drift Report — Codebase vs Wiki UX Specs

> Full audit comparing `/apps/frontend/src/` against all UX wiki specifications.
> Files examined: **91** across components, pages, theme, machines, API, hooks, layout, gamification, shared.
> Contract types compared: `packages/contracts/src/generation/**`, `packages/domain/src/generation/tools/tool-definition.ts`.


## 1. Quantitative Summary

### Critical Drifts (15 findings)
1. **ToolPage XState machine is skeletal** — 6 of 8 spec states implemented; no actors (`submitSession`, `subscribeToSSE`), no guards (`canSubmit`, `isStillDraft`), no `always` transition from `configuring` to `ready`
2. **ToolPageLayout bypasses XState** — uses local `phaseOverride` + `localSessionId` + `localError` state to drive UI; machine stays in `configuring` forever
3. **No `STEP_COMPLETED` event handling** in the XState machine
4. **`LoadingSkeleton` has ZERO variants** — spec requires 8 variants (`dashboard`, `card-grid`, `list`, `tool-page`, `session-detail`, `team-hub`, `conversation`, `profile`)
5. **`SessionListItemDTO` missing 10 of 16 spec fields** — no `currentStepIndex`, `currentStepLabel`, `queuePosition`, `lastArtifactPreview`, `elapsedSeconds`, `durationSeconds`, `errorMessage`, `failedAtStep`, `isPromotable`
6. **SSE `step_completed` carries no artifact content** — contract has `stepNumber` + `stepLabel` + `progress` but no `artifact` object; frontend cannot show artifact previews during generation
7. **`SessionList` is a flat list** — no 4-state card system (QueuedCard / RunningCard / CompletedCard / FailedCard); no inline progress bars, no cancel/promote actions
8. **Promote uses Modal dialog** — spec requires inline confirmation (no modal)
9. **`GET /api/workspaces/:id/activity` missing** — no activity pulse data in API client
10. **`POST /api/workspaces/:id/challenges/vote` missing** — no challenge voting endpoint
11. **`StreakModeToggle` has no backend persistence** — local useState only; spec requires `player_profiles.streak_mode` column
12. **`AgentContextDrawer` missing `agent` prop** — shows generic workspace context, not per-agent filtering
13. **No rarity design tokens** — spec requires `rarity.*` tokens (common / rare / epic / legendary) with border/bg/text; colors used inline
14. **Readiness fill has no animation** — icons render instantly; no green-fill transition
15. **No sidebar-collapsed mode nav items** in AppShell desktop

### High Drifts (12 findings)
1. **`FeedbackPanel` missing `artifacts` prop** — shows generic step dots only; cannot display step content previews
2. **Initial state `configuring`** — spec is `draftEmpty`
3. **No `RETRY` event** in XState machine — replaced by `RESET → configuring`
4. **Chat user bubble uses `primary.main`** — spec requires `--workspace-accent-light`
5. **`GamificationZone`** shows text "n badges" instead of 🏅 icon + count; missing weekly rank
6. **Download .docx/.pdf disabled** — spec requires functional downloads
7. **`AgentCard`** no hover lift (`translateY(-3px)`), no accent glow (`--shadow-accent`)
8. **`PromoteButton` uses `variant="outlined"`** — spec requires `variant="contained"`
9. **SessionList uses SWR only** — no SSE subscribe, no 30s poll fallback
10. **SetupPanel/FeedbackPanel/ReadinessSnapshot** use flat props (`TextInput[]` + `Record<string,string>`) instead of domain `ToolDefinition`-based props
11. **Frontend uses separate `tool-inputs.ts` type system** — duplicates `TextInput`/`FileInput`/`AssetInput` from domain, never imports domain `ToolDefinition`
12. **ChatMessageBubble agent avatar is always 🤖** — not per-agent emoji from `AgentDefinition`

### Missing Components (2)
1. `/templates` route placeholder — not in App.tsx
2. `/audit` route placeholder — not in App.tsx (both display as `[soon]` chips in sidebar but have no route)

### Missing Spec Nav Items (1)
- ⚡ Tools nav item missing from AppShell sidebar (has: Home, Sessions, Assets, Team — no Tools)

---

## 2. Component Existence Matrix (37 expected → 37 found)

All 37 components from the UI spec exist in some form. The drift is in their signatures, behaviors, and integrations — not in file existence.

| # | Component | Path | Drift Severity |
|---|-----------|------|---------------|
| 1 | SetupPanel | `components/tool/SetupPanel.tsx` | 🟡 Flat props vs ToolDefinition |
| 2 | FeedbackPanel | `components/tool/FeedbackPanel.tsx` | 🔴 Missing artifacts prop |
| 3 | ReadinessSnapshot | `components/tool/ReadinessSnapshot.tsx` | 🟡 |
| 4 | SessionSummary | `components/tool/SessionSummary.tsx` | 🟡 docx/pdf disabled |
| 5 | KnowledgePanel | `components/tool/KnowledgePanel.tsx` | ✅ |
| 6 | ToolCard | `components/tool/ToolCard.tsx` | ✅ |
| 7 | CompletionBanner | `components/shared/CompletionBanner.tsx` | ✅ |
| 8 | PromoteButton | `components/shared/PromoteButton.tsx` | 🟡 outlined vs contained |
| 9 | PromoteDialog | `components/shared/PromoteDialog.tsx` | 🔴 Modal vs inline |
| 10 | AssetPicker | `components/shared/AssetPicker.tsx` | ✅ |
| 11 | QuickGenerateBar | `components/shared/QuickGenerateBar.tsx` | ✅ |
| 12 | ConfirmDialog | `components/shared/ConfirmDialog.tsx` | ✅ |
| 13 | AppShell | `layout/AppShell.tsx` | 🟡 Missing Tools nav |
| 14 | ToolPageLayout | `components/layout/ToolPageLayout.tsx` | 🔴 Bypasses XState |
| 15 | AgentCard | `components/agent-chat/AgentCard.tsx` | 🟡 No hover effects |
| 16 | TeamHub | `components/agent-chat/TeamHub.tsx` | 🟡 Inlines sub-components |
| 17 | ChatMessageBubble | `components/agent-chat/ChatMessageBubble.tsx` | 🟡 Flat props, generic avatar |
| 18 | ChatInput | `components/agent-chat/ChatInput.tsx` | 🟡 No placeholder prop |
| 19 | AgentContextDrawer | `components/agent-chat/AgentContextDrawer.tsx` | 🔴 Missing agent prop |
| 20 | WorkspaceCard | `components/workspace/WorkspaceCard.tsx` | ✅ |
| 21 | SessionList | `components/workspace/SessionList.tsx` | 🔴 Flat, no 4-state system |
| 22 | AssetList | `components/workspace/AssetList.tsx` | ✅ |
| 23 | AssetCoverageBar | `components/workspace/AssetCoverageBar.tsx` | ✅ |
| 24 | GamificationZone | `components/gamification/GamificationZone.tsx` | 🟡 Missing badge icon, rank |
| 25 | ToastSystem | `components/gamification/ToastSystem.tsx` | 🟡 Not full 3-tier system |
| 26 | ActivityPulse | `components/gamification/ActivityPulse.tsx` | ✅ |
| 27 | BadgeProgressRing | `components/gamification/BadgeProgressRing.tsx` | ✅ |
| 28 | ChallengeVoting | `components/gamification/ChallengeVoting.tsx` | 🔴 No voting, display only |
| 29 | SeasonCountdown | `components/gamification/SeasonCountdown.tsx` | ✅ |
| 30 | StreakModeToggle | `components/gamification/StreakModeToggle.tsx` | 🔴 No persistence |
| 31 | ErrorState | `components/ErrorState.tsx` | ✅ |
| 32 | EmptyState | `components/EmptyState.tsx` | ✅ |
| 33 | LoadingSkeleton | `components/LoadingSkeleton.tsx` | 🔴 Zero variants |
| 34 | PageHeader | `components/PageHeader.tsx` | ✅ |
| 35 | ErrorBoundary | `components/ErrorBoundary.tsx` | ✅ |
| 36 | QuotaCounter | `components/usage/QuotaCounter.tsx` | ✅ |
| 37 | AssetPicker | `components/shared/AssetPicker.tsx` | ✅ |

---

## 3. State Machine Drift — Full Comparison

### States

| Spec State | Actual | Notes |
|-----------|--------|-------|
| `draftEmpty` | ❌ MISSING | Spec: initial state before tool loaded |
| `configuring` | ✅ Exists | Initial state in actual (should be draftEmpty) |
| `ready` | ❌ MISSING | Spec: automatic transition when canSubmit passes |
| `submitting` | ✅ Exists | |
| `running` | ✅ Exists | |
| `completed` | ✅ Exists | |
| `failed` | ✅ Exists | |
| `cancelled` | ✅ Exists | |

### Context

| Field | Spec | Actual |
|-------|------|--------|
| `tool` | `ToolDefinition \| null` | ❌ |
| `workspaceId` | `string` | ❌ |
| `inputs` | `{ text: Record<...>, files: Record<...>, selectedAssetIds: string[], selectedAssetsByType: Record<...> }` | `Record<string, string>` (flat text only) |
| `session` | `SessionDTO \| null` | ❌ (`sessionId: string \| null`) |
| `artifacts` | `ArtifactDTO[]` | ❌ |
| `progress` | `StepProgress \| null` | ❌ |
| `error` | `{ code: string; message: string } \| null` | `string \| null` + `errorCode: string \| null` |
| `phase` | `ToolPagePhase` | ✅ |

### Events

| Event | Spec | Actual |
|-------|------|--------|
| `LOAD` | `{ tool, workspaceId }` | ❌ |
| `CONFIGURE` | `{ inputs: Partial<Inputs> }` | `{ key, value }` (flat) |
| `SUBMIT` | `{}` | ✅ |
| `CANCEL` | `{}` | ✅ (only in running) |
| `SESSION_STARTED` | `{ session: SessionDTO }` | `{ sessionId: string }` |
| `STEP_COMPLETED` | `{ artifact: ArtifactDTO, progress: StepProgress }` | ❌ MISSING |
| `SESSION_COMPLETED` | `{ finalArtifact: ArtifactDTO }` | `{}` (no data) |
| `SESSION_FAILED` | `{ error: { code, message } }` | `{ error: string, code?: string }` |
| `RETRY` | `{}` | ❌ MISSING |
| `RESET` | `{}` | ✅ |

### Actors

| Actor | Spec | Actual |
|-------|------|--------|
| `submitSession` | `fromPromise` — POST `/api/tools/:toolKey/sessions` | ❌ MISSING |
| `subscribeToSSE` | `fromCallback` — EventSource for SSE stream | ❌ MISSING |

### Guards

| Guard | Spec | Actual |
|-------|------|--------|
| `canSubmit` | Validates required text/files/assets | ❌ MISSING (evaluated in ToolPageLayout) |
| `isStillDraft` | No inputs configured | ❌ MISSING |

---

## 4. Theme Drift

| Aspect | Status | Detail |
|--------|--------|--------|
| Light theme | ✅ | `tokens.ts` |
| Dark theme | ✅ | `tokens.ts` dark mode |
| System detection | ✅ | `useMediaQuery('prefers-color-scheme: dark')` |
| `--workspace-accent` | ✅ | `WorkspaceAccentProvider` |
| `--workspace-accent-light` | ❌ | Not defined anywhere |
| `rarity.*` tokens | ❌ | No design tokens file |
| shadow tokens | ❌ | `--shadow-accent` not defined |
| gradient tokens | ❌ | `gradients.brand` not defined; used inline |
| Typography | ✅ | "Plus Jakarta Sans" + Inter fallback |

---

## 5. Route Table

| Route | Spec | Actual | Match |
|-------|------|--------|-------|
| `/` | — | Redirect to first workspace | Extra |
| `/login` | Not in UX spec | LoginPage | Extra (auth infra) |
| `/register` | Not in UX spec | RegisterPage | Extra (auth infra) |
| `/auth/callback` | Not in UX spec | OAuthCallback | Extra (auth infra) |
| `/dashboard` | Not in UX spec | WorkspaceRedirect | Extra |
| `/workspaces/:id` | ✅ Dashboard | `/workspaces/:workspaceId` → DashboardPage | ✅ |
| `/workspaces/:id/tools/:toolKey` | ✅ Tool Page | `/workspaces/:workspaceId/tools/:toolKey` → ToolPage | ✅ |
| `/workspaces/:id/sessions` | ✅ SessionList | `/workspaces/:workspaceId/sessions` → SessionsPage | ✅ |
| `/workspaces/:id/sessions/:sessionId` | ✅ Session Detail | `/workspaces/:workspaceId/sessions/:sessionId` → SessionPage | ✅ |
| `/workspaces/:id/assets` | ✅ Assets | `/workspaces/:workspaceId/assets` → AssetsPage | ✅ |
| `/workspaces/:id/assets/:assetId` | ✅ Asset Detail | `/workspaces/:workspaceId/assets/:assetId` → AssetDetailPage | ✅ |
| `/workspaces/:id/team` | ✅ Team Hub | `/workspaces/:workspaceId/team` → TeamHub | ✅ |
| `/workspaces/:id/conversations/:conversationId` | ✅ Chat | `/workspaces/:workspaceId/conversations/:conversationId` → ConversationPage | ✅ |
| `/profile` | ✅ Player Profile | `/profile` → ProfilePage | ✅ |
| `/templates` | ✅ [soon] | ❌ MISSING | ❌ |
| `/audit` | ✅ [soon] | ❌ MISSING | ❌ |

---

## 6. Component Signature Comparison (Key Drifts)

### FeedbackPanel

| Prop | Spec | Actual |
|------|------|--------|
| `artifacts` | `ArtifactDTO[]` — per-step artifact content for display | ❌ Not accepted |
| `progress` | `StepProgress \| null` — current/total | `StepProgressData \| null` |
| `onCancel` | `() => void` — cancel callback | ❌ Not accepted |
| `status` | Not in spec | `string` — "running"/"completed"/"failed" |

Actual output: generic numbered steps (Step 1/3, Step 2/3) with completed/active/pending dots. **Cannot show artifact content** because `artifacts` is not passed.

### SessionList — 4-state card system

| Card | Spec Behavior | Actual |
|------|-------------|--------|
| QueuedCard | `opacity: 0.7`, queue position, Cancel only | ❌ Not implemented |
| RunningCard | `borderLeft: 3px solid primary`, LinearProgress, step label, artifact preview (150 chars), View + Cancel | ❌ Not implemented |
| CompletedCard | Artifact preview (150 chars), View + Download + Promote | ❌ Not implemented |
| FailedCard | `borderLeft: 3px solid error`, error message, failed step, Retry | ❌ Not implemented |

Actual: single flat card with tool name, step count, date, status chip. No visual differentiation.

### GamificationZone

| Element | Spec | Actual |
|---------|------|--------|
| Level + bar | `L4 Specialist ████████░░` | `Lv.{level}` + XP bar |
| Streak | `🔥 12` (emoji + count) | `🔥 {count}` via Chip | 
| Badge count | `🏅 6` (emoji + count) | Text "6 badges" |
| Weekly rank | `#3 weekly ████████░░░` | ❌ Not shown |
| Click target | Entire zone → `/profile` | ✅ `role="button" tabIndex={0}` |
| aria-label | Full description string | Generic "View player profile" |

---

## 7. DTO / Type Drift

### SessionListItemDTO — Contract vs Spec

| Field | Spec Requirement | In Contract (`contracts/src/generation/session.dto.ts`) |
|-------|-----------------|-------------------------------------------------------|
| `id` | ✅ | ✅ |
| `toolKey` | ✅ | ✅ |
| `workspaceId` | ✅ | ✅ |
| `status` | ✅ (queued/draft/ready/running/completed/failed/cancelled) | ✅ |
| `stepCount` | ✅ | ✅ |
| `currentStepIndex` | ✅ (running) | ❌ (only in `SessionDetailDTO`) |
| `currentStepLabel` | ✅ (running) | ❌ |
| `queuePosition` | ✅ (queued) | ❌ |
| `lastArtifactId` | ✅ | ❌ |
| `lastArtifactPreview` | ✅ (first 150 chars) | ❌ |
| `elapsedSeconds` | ✅ (running) | ❌ |
| `durationSeconds` | ✅ (completed) | ❌ |
| `errorMessage` | ✅ (failed) | ❌ |
| `failedAtStep` | ✅ (failed) | ❌ |
| `isPromotable` | ✅ (tool.produces !== undefined) | ❌ |
| `createdAt` | ✅ | ✅ |
| `completedAt` | ✅ | ❌ (in `SessionDetailDTO`) |

### SSE Events — Contract vs Spec

| Event | Expected Data | Contract Data | Gap |
|-------|--------------|---------------|-----|
| `session_started` | `{ session: SessionDTO }` | `{ sessionId, status: 'running', startedAt }` | No full session object |
| `step_completed` | `{ artifact: ArtifactDTO, progress }` | `{ sessionId, stepNumber, stepLabel, progress }` | 🔴 No artifact content at all |
| `session_completed` | `{ finalArtifact: ArtifactDTO }` | `{ sessionId, status, finalArtifactId, completedAt }` | 🔴 Only artifact ID, no content |
| `session_failed` | `{ error: { code, message } }` | `{ sessionId, status, failedAtStep, error: { code, message } }` | ✅ Close match |

---

## 8. Accessibility Drift

| Requirement | Status | Detail |
|-------------|--------|--------|
| Skip link | ✅ | `Skip to content` link in AppShell |
| FeedbackPanel `role="status" aria-live="polite"` | ✅ | |
| Chat message list `role="log"` | ✅ | |
| Gamification zone `role="button"` | ✅ | |
| Suggested questions `role="list"/"listitem"` | ✅ | |
| `prefers-reduced-motion` checks | ✅ | Multiple components |
| Agent avatar `aria-hidden="true"` | ✅ | |
| Sidebar XP bar ARIA | ❌ | No `role="progressbar"` or `aria-valuenow` |
| AgentCard `aria-label` | ❌ | Missing |
| Send button `aria-label` | ❌ | Missing |
| Context drawer `aria-labelledby` | ❌ | Missing |
| Badge rarity text labels | ❌ | No text labels on profile badges |
| Streak `aria-label` on wrapper | ❌ | No custom aria-label |

---

## Sources

- [[UX Wireframes]]
- [[Tool UX Architecture]]
- [[Agent Chat UX]]
- [[ToolPage Machine (XState v5)]]
- [[ReadinessSnapshot UI]]
- [[Session List - Live Status]]
- [[SessionPage]]
- [[Gamification UX]]
- [[Design Tokens]]
- [[UI Component Map]]
- [[Frontend Architecture]]

## Related

- [[frontend-drift-remediation-plan-2026-08-07]] — 8-phase remediation plan for all 27 findings in this report
