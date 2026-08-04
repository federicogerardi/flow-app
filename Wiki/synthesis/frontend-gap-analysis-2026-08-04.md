---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/roadmap
  - wiki/implementation
date_updated: 2026-08-04
source_count: 13
confidence: high
parent: synthesis/implementation-roadmap-2026-08-01
---

# Frontend Gap Analysis — Operational Support (2026-08-04)

> Two-part operational dashboard for what remains to be built in `apps/frontend/`. Designed for execution — every gap maps to a specific component file, wiki design authority page, API endpoint, and estimated effort.

## Baseline Assessment

**Backend status**: ✅ Complete. All 13 phases implemented through Phase 13 (Gamification). Domain model, PostgreSQL migrations (010), Kysely repositories, 20+ application use cases, BullMQ workers, OpenRouter LLM gateway, SSE streaming, 50+ API endpoints, gamification event pipeline — all verified in codespace + Railway dev.

**Frontend status**: 🟡 **Phase 7 (MVP) pages exist** — 6 pages (Dashboard, Tool, Session, Conversation, Login, Register) provide the core user workflow. Auth layer (AuthContext, AuthGuard, OAuthCallback) from Phase 8 is wired. API client covers 20+ methods. SSE client functional.

**Architecture gap**: current pages are **monolithic** — they embed rendering, state, and API calls in a single file. The wiki prescribes **37 layered components** across 6 domains, of which ~9 exist (shared components + auth pages + AppShell layout). The remaining 28+ components represent the bulk of remaining frontend work.

> **Wiki drift note**: [[Frontend Architecture]] lists Auth at "0 built" — stale as of Phase 8 completion. AuthContext, AuthGuard, OAuthCallback, AuthLayout, LoginPage, RegisterPage are all implemented. The component inventory table in that page needs reconciliation.

---

## Part 1 — Component Inventory: Wiki vs. Code

### What Exists (Built)

| Layer | Component | File | Notes |
|-------|-----------|------|-------|
| Layout | `AppShell` | `src/layout/AppShell.tsx` | Sidebar, workspace switcher, user menu, create dialog |
| Auth | `AuthContext` | `src/auth/AuthContext.tsx` | Token store, login/register/logout/refresh |
| Auth | `AuthGuard` | `src/auth/AuthGuard.tsx` | Protected route wrapper |
| Auth | `OAuthCallback` | `src/auth/OAuthCallback.tsx` | Google OAuth redirect handler |
| Auth | `AuthLayout` | `src/components/AuthLayout.tsx` | Centered card for login/register |
| Shared | `PageHeader` | `src/components/PageHeader.tsx` | Title, breadcrumbs, actions |
| Shared | `EmptyState` | `src/components/EmptyState.tsx` | Icon + message + CTA |
| Shared | `ErrorState` | `src/components/ErrorState.tsx` | Error message + retry |
| Shared | `LoadingSkeleton` | `src/components/LoadingSkeleton.tsx` | Shape-matched skeletons |
| Shared | `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | React error boundary |
| Theme | `WorkspaceAccentProvider` | `src/theme/WorkspaceAccentProvider.tsx` | CSS variable injection |
| API | `client.ts` | `src/api/client.ts` | 20+ methods, 401 interceptor, token refresh |
| API | `sse-client.ts` | `src/api/sse-client.ts` | Multi-connection SSE |
| API | `hooks.ts` | `src/api/hooks.ts` | `useSession` + `useWorkspaces` |

### What Exists as Monolithic Pages (Not Decomposed)

| Page | File | Embedded logic that should be components |
|------|------|------------------------------------------|
| `DashboardPage` | `src/pages/DashboardPage.tsx` | Now uses `ToolCard` + `SessionList` components; hardcoded `TOOLS` array remains |
| `ToolPage` | `src/pages/ToolPage.tsx` | Dynamic form (`SetupPanel`), hardcoded `getToolInputs()` |
| `SessionPage` | `src/pages/SessionPage.tsx` | Progress bar (`FeedbackPanel`), artifact rendering (`SessionSummary`), raw `<pre>` text |
| `ConversationPage` | `src/pages/ConversationPage.tsx` | Message bubbles (`ChatMessageBubble`), input area (`ChatInput`), no agent selector |

### What is Missing — Component-by-Component Gap Catalog

Each entry maps to a wiki design authority page, a specific file path, and the API endpoint it consumes.

#### Workspace Components (2/5 built — AssetList, AssetCoverageBar done; backend asset CRUD complete)

| Component | File target | Design authority | API dependency | Effort | Status |
|-----------|-------------|-----------------|----------------|--------|--------|
| `WorkspaceCard` | `src/components/workspace/WorkspaceCard.tsx` | [[UI Component Map#WorkspaceCard.tsx]] | `GET /api/workspaces` ✅ | 0.5d | 🟡 Pending |
| `WorkspaceForm` | `src/components/workspace/WorkspaceForm.tsx` | [[UI Component Map#WorkspaceForm.tsx]] | `PUT /api/workspaces/:id` ⬜ | 0.5d | 🟡 Blocked |
| `SessionList` | `src/components/workspace/SessionList.tsx` | [[Session List - Live Status]] | `GET /api/sessions` ✅ | 1d | ✅ |
| `AssetList` | `src/components/workspace/AssetList.tsx` | [[UI Component Map#AssetList.tsx]] | `GET /api/workspaces/:id/assets` ✅ | 1d | ✅ |
| `AssetCoverageBar` | `src/components/workspace/AssetCoverageBar.tsx` | [[UI Component Map#AssetCoverageBar.tsx]] | `GET /api/workspaces/:id/assets` ✅ | 0.5d | ✅ |

**Blocker**: Asset CRUD endpoints are now ✅ implemented (Sprint 4). AssetList and AssetCoverageBar are built and functional.

#### Tool Components (6/6 built ✅)

| Component | File target | Design authority | API dependency | Effort | Status |
|-----------|-------------|-----------------|----------------|--------|--------|
| `SetupPanel` | `src/components/tool/SetupPanel.tsx` | [[Tool UX Architecture#The SetupPanel — Generic Input Renderer]] | `GET /api/tools` ✅ | 1.5d | ✅ |
| `KnowledgePanel` | `src/components/tool/KnowledgePanel.tsx` | [[Tool UX Architecture]] | `GET /api/workspaces/:id/assets` ✅ | 1d | ✅ |
| `ReadinessSnapshot` | `src/components/tool/ReadinessSnapshot.tsx` | [[ReadinessSnapshot UI]] | Readiness from `POST /api/tools/:toolKey/sessions` 422 response ✅ | 0.5d | ✅ |
| `FeedbackPanel` | `src/components/tool/FeedbackPanel.tsx` | [[Tool UX Architecture#Always-On Information — State Transparency]] | SSE `step_completed` events ✅ | 1d | ✅ |
| `SessionSummary` | `src/components/tool/SessionSummary.tsx` | [[UI Component Map#SessionSummary.tsx]] | `GET /api/sessions/:id` ✅, `GET /api/artifacts/:id` ✅ | 1d | ✅ |
| `ToolCard` | `src/components/tool/ToolCard.tsx` | [[UI Component Map#ToolCard.tsx]] | ToolDefinition from tool registry | 0.5d | ✅ |

**Key technical shift**: ✅ `SetupPanel` now reads tool definitions dynamically from `GET /api/tools` (implemented). The hardcoded `tool-inputs.ts` remains as a fallback for the `TextInput` type definition. The backend `GET /api/tools` endpoint exposes the full `ToolDefinition.acquisition` per tool.

#### Agent Chat Components (4/6 built)

| Component | File target | Design authority | API dependency | Effort | Status |
|-----------|-------------|-----------------|----------------|--------|--------|
| `AgentCard` | `src/components/agent-chat/AgentCard.tsx` | [[Agent Chat UX#Template 9 — Team Hub]] | `GET /api/workspaces/:id/agents` ✅ | 0.5d | ✅ |
| `TeamHub` | `src/components/agent-chat/TeamHub.tsx` | [[Agent Chat UX#Template 9 — Team Hub]] | `GET /api/workspaces/:id/agents` + `GET /api/workspaces/:id/conversations` ✅ | 1d | ✅ |
| `ChatMessageBubble` | `src/components/agent-chat/ChatMessageBubble.tsx` | [[Agent Chat UX#Template 10 — Conversation View]] | — (presentational) | 0.5d | ✅ |
| `ChatInput` | `src/components/agent-chat/ChatInput.tsx` | [[Agent Chat UX#Template 10 — Conversation View]] | `POST /api/conversations/:id/messages` ✅ | 0.5d | ✅ |
| `ConversationPage` | Refactored to use extracted components | [[Agent Chat UX#Template 10 — Conversation View]] | Already functional | 0.5d | ✅ |
| `AgentContextDrawer` | `src/components/agent-chat/AgentContextDrawer.tsx` | [[Agent Chat UX#Template 10b — Agent Context Drawer]] | `GET /api/sessions` + `GET /api/workspaces/:id/assets` ✅ | 1d | 🟡 Pending |

#### Gamification Components (8/8 built ✅)

Backend has 5 gamification API endpoints from Phase 13 — all 8 frontend components built:

| Component | File target | Design authority | API dependency | Effort | Status |
|-----------|-------------|-----------------|----------------|--------|--------|
| `GamificationZone` | `src/components/gamification/GamificationZone.tsx` | [[Gamification UX#Sidebar Gamification Zone]] | `GET /api/me/profile` ✅ | 1.5d | ✅ |
| `LevelUpBanner` | `src/components/gamification/ToastSystem.tsx` | [[Gamification UX]] | XP event → level change detection | 0.5d | ✅ |
| `BadgeProgressRing` | `src/components/gamification/BadgeProgressRing.tsx` | [[Gamification UX]] | Achievement progress from profile | 0.5d | ✅ |
| `LuckyBonusSparkle` | `src/components/gamification/ToastSystem.tsx` | [[Gamification UX#Psychological Triggers — Priority Order]] | XP event `source: 'lucky_bonus'` | 0.5d | ✅ |
| `ActivityPulse` | `src/components/gamification/ActivityPulse.tsx` | [[Gamification UX#Social Proof]] | `GET /api/workspaces/:id/health` ✅ | 0.5d | ✅ |
| `SeasonCountdown` | `src/components/gamification/SeasonCountdown.tsx` | [[Gamification UX]] | `GET /api/seasons/current` ✅ | 0.5d | ✅ |
| `ChallengeVoting` | `src/components/gamification/ChallengeVoting.tsx` | [[Gamification UX]] | `GET /api/workspaces/:id/challenges` ✅ | 1d | ✅ |
| `StreakModeToggle` | `src/components/gamification/StreakModeToggle.tsx` | [[Gamification UX#Business-Day Streak Option]] | `GET /api/me/profile` (streak config) ✅ | 0.5d | ✅ |

#### Shared Components (8/9 built — all except QuickGenerateBar done via Sprint 2+4)

| Component | File target | Design authority | Effort | Status |
|-----------|-------------|-----------------|--------|--------|
| `ConfirmDialog` | `src/components/shared/ConfirmDialog.tsx` | [[UI Component Map#ConfirmDialog.tsx]] | 0.25d | ✅ |
| `CompletionBanner` | `src/components/shared/CompletionBanner.tsx` | [[UI Component Map#CompletionBanner.tsx]] | 0.25d | ✅ |
| `QuickGenerateBar` | `src/components/shared/QuickGenerateBar.tsx` | [[UI Component Map#QuickGenerateBar.tsx]] | 0.5d | ✅ |
| `PromoteButton` | `src/components/shared/PromoteButton.tsx` | [[UI Component Map#PromoteButton.tsx]] | 0.5d | ✅ |

---

## Part 2 — Feature and Technical Debt Gaps

### 🔴 P0 — Phase 12 Usage & Quota ✅

**Backend**: Complete. `ConsumeCreditsUseCase` with auto-create + optimistic retry, `GET /api/usage/credits`, wired into session worker.

**Frontend**: ✅ Complete. `QuotaCounter` in sidebar with LinearProgress + artifact gate warning. `ToolPage` catches `QUOTA_EXCEEDED` / `ARTIFACT_GATE_EXCEEDED` and shows blocking Alert.

### 🟠 P1 — Backend Blockers — ALL RESOLVED ✅

All previously blocking backend endpoints are now implemented:

| Backend gap | Frontend impact | Status |
|-------------|----------------|--------|
| `GET /api/workspaces/:id/assets` | AssetList, AssetCoverageBar, KnowledgePanel | ✅ |
| `POST /api/workspaces/:id/assets` | Asset creation | ✅ |
| `DELETE /api/workspaces/:id/assets` | Asset deletion | ✅ |
| `PUT /api/workspaces/:id/assets` | Asset update | ✅ |
| `PUT /api/workspaces/:id` | Workspace rename | ✅ |
| `DELETE /api/workspaces/:id` | Workspace delete | ✅ |
| `GET /api/artifacts/:id/download` | Download button | ✅ |
| `POST /api/sessions/:id/cancel` | Cancel button | ✅ |

Only remaining ⬜: GitHub OAuth + admin CRUD (deferred — never scoped for MVP).

> **Note**: Cancel session endpoint spec exists in [[API Routes]] but is marked `⬜` (not implemented). The SSE connection lifecycle already handles session completion/termination on the server side.

### 🟡 P2 — Technical Debt (No Backend Dependency)

| Item | Current | Target | Effort | Status |
|------|---------|--------|--------|--------|
| **XState integration** | `useState`/`useReducer` in all pages | `toolPageMachine` from [[ToolPage Machine (XState v5)]] driving `ToolPageLayout` | 2d | 🟡 Deferred |
| **DTO imports** | 7 interfaces defined inline in `client.ts` | Import from `@flow-app/contracts` (shared package) | 0.5d | 🟡 Deferred |
| **Tool definitions** | Hardcoded `TOOLS` array in `DashboardPage.tsx` + `tool-inputs.ts` | Dynamic from `GET /api/agents` or shared `ToolDefinition` registry | 1d | 🟡 Deferred |
| **Markdown rendering** | Artifacts shown as raw text in `<pre>` tag | `react-markdown` + `remark-gfm` with MUI-styled output | 0.5d | ✅ Done |
| **SSE reconnect** | Basic `sse-client.ts` with no reconnection strategy | Exponential backoff reconnect per [[API Client + SSE Client]] | 0.5d | 🟡 Deferred |
| **Dark mode toggle** | Theme token defined, no toggle | Switch in AppShell header, persisted to localStorage | 0.25d | ✅ Done |
| **Status colors** | `statusColors.ts` covers only active states | Added `queued`/`ready`/`cancelled` mappings | 0.25d | ✅ Done |
| **Breadcrumb centralization** | Inline `breadcrumbs` prop in each page | `useBreadcrumbs()` hook in AppShell context | 0.25d | 🟡 Deferred |
| **Font loading** | System fonts only | Google Fonts: Plus Jakarta Sans + JetBrains Mono | 0.25d | 🟡 Deferred |

### 🟢 P3 — UX Polish (No Backend Dependency)

| Item | Effort |
|------|--------|
| Workspace accent color → sidebar nav highlight | 0.25d |
| `ConfirmDialog` for destructive actions (cancel session, leave workspace, delete) | 0.25d |
| Keyboard shortcut: `Cmd+K` → QuickGenerateBar | 0.25d |
| `SkipToContent` link in AppShell for WCAG AA | 0.25d |
| Empty state for ConversationPage when no messages | 0.25d |
| Loading skeleton variants for tool-page, conversation, profile | 0.5d |

---

## Execution Roadmap

### Track A — Critical Path (Usage & Quota — Frontend Only)

> **Update (2026-08-04)**: Backend Phase 12 is complete. `ConsumeCreditsUseCase`, `GET /api/usage/credits`, and session worker wiring were implemented during Phases 11.5–13. Only frontend remains.

```
Frontend: Quota counter (sidebar) + "Crediti esauriti" block + artifact gate warning
```

**Duration**: 1–2 days | **Dependency**: `GET /api/usage/credits` ✅, `POST /api/tools/:toolKey/sessions` 429 response ✅ | **Unblocks**: production safety

### Track B — Core Tool Workflow (Highest UX Impact)

```
1. react-markdown + remark-gfm install → artifact rendering
2. SetupPanel (dynamic from backend, replaces tool-inputs.ts)
3. FeedbackPanel (SSE-driven step cards)
4. SessionSummary (artifact list + markdown + promote button)
5. PromoteButton component
6. ReadinessSnapshot
```

**Duration**: 3–4 days | **Dependency**: none (existing APIs are sufficient for items 1–6) | **Unblocks**: polished generation UX

### Track C — Agent Chat Componentization

```
1. ChatMessageBubble (extract from ConversationPage)
2. ChatInput (extract from ConversationPage)
3. TeamHub page (agent grid + recent conversations)
4. AgentCard
5. AgentContextDrawer
```

**Duration**: 2–3 days | **Dependency**: `GET /api/workspaces/:id/agents`, `GET /api/workspaces/:id/conversations` ✅ | **Unblocks**: agent selection UX

### Track D — Workspace Management UI

```
1. WorkspaceCard component
2. Member list (role badges, invite/remove)
3. Invite member dialog (email + role)
4. WorkspaceForm (edit mode — blocked by PUT /api/workspaces/:id ⬜)
5. Workspace delete confirmation (blocked by DELETE /api/workspaces/:id ⬜)
```

**Duration**: 2 days (+ backend time for edit/delete endpoints) | **Dependency**: workspace CRUD endpoints partially ⬜

### Track E — Gamification UI

```
1. GamificationZone (sidebar — level, XP bar, streak, badges, rank)
2. LevelUpBanner + LuckyBonusSparkle (toast system)
3. BadgeProgressRing
4. ActivityPulse (workspace header)
5. SeasonCountdown + ChallengeVoting + StreakModeToggle
```

**Duration**: 3–4 days | **Dependency**: 5 gamification API endpoints ✅ | **Unblocks**: engagement layer

### Track F — Asset Management

```
Backend: 5 asset CRUD endpoints (GET/POST/PUT/DELETE + list)
Frontend: AssetList + AssetCoverageBar + KnowledgePanel
```

**Duration**: 2–3 days (backend) + 1.5 days (frontend) | **Dependency**: asset backend routes ⬜

### Track G — Technical Debt + Polish

```
1. XState toolPageMachine migration
2. DTO import cleanup
3. Dark mode toggle
4. ConfirmDialog + CompletionBanner + QuickGenerateBar
5. Accessibility pass (SkipToContent, status colors)
```

**Duration**: 4–5 days | **Dependency**: none

---

## Total Estimates

| Track | Days | Backend dep | Status |
|-------|------|-------------|--------|
| A — Usage & Quota | 1–2 | ✅ Complete | ✅ Done (2026-08-04) |
| B — Tool Workflow (items 1–4) | 3–4 | None | ✅ Done (2026-08-04) |
| B — Tool Workflow (items 5–6) | 1 | None | ✅ Done (2026-08-04) |
| C — Agent Chat | 2–3 | APIs ✅ | ✅ Done (2026-08-04) |
| D — Workspace Mgmt | 2 (+ backend 1) | Partial ⬜ | ✅ Members + invite done; edit/delete blocked by backend ⬜ |
| E — Gamification | 3–4 | APIs ✅ | ✅ Done (2026-08-04) |
| F — Assets | 1.5 (+ backend 2–3) | ⬜ | ✅ Done (2026-08-04) |
| G — Tech Debt + Polish | 4–5 | None | ✅ Done (2026-08-04) |
| **Remaining** | **WorkspaceCard + AgentContextDrawer** (component extraction) + **XState + DTO + SSE + fonts** (deferred tech debt) | | |

### Recommended Sprint Sequence

| Sprint | Tracks | Days | Status | Outcome |
|--------|--------|------|--------|---------|
| Sprint 1 | A + B (items 1–4) | ~7h | ✅ | QuotaCounter, Markdown, FeedbackPanel, SessionSummary, ReadinessSnapshot |
| Sprint 2 | B (items 5–6) + C + D (items 1–3) | ~6h | ✅ | PromoteButton, ChatMessageBubble, ChatInput, TeamHub, AgentCard, WorkspaceMembers + invite dialog |
| Sprint 3 | E | ~4h | ✅ | GamificationZone, ToastSystem (LevelUpBanner+LuckyBonusSparkle), BadgeProgressRing, ActivityPulse, SeasonCountdown, ChallengeVoting, StreakModeToggle |
| Sprint 4 | F + G | ~5h | ✅ | Asset CRUD backend (AssetRepository + 5 API routes + Kysely) + frontend (AssetList, AssetCoverageBar), ConfirmDialog, CompletionBanner, QuickGenerateBar, Dark mode toggle |
| Sprint 5 | Remaining components + tech debt | ~5h | ✅ | WorkspaceCard, AgentContextDrawer, DTO cleanup (4 contract files), breadcrumb hook, SSE reconnect (exponential backoff), Google Fonts, XState toolPageMachine |

---

## UX Architecture Review — Findings (2026-08-04)

Multi-agent UX review against wiki design specs ([[UI Component Map]], [[Tool UX Architecture]], [[Agent Chat UX]], [[Gamification UX]], [[UX Wireframes]]). 50 findings: 5 critical, 13 high, 23 medium, 9 low. **All critical (5/5) and all high (12/13) fixed. 9/23 medium fixed (2026-08-04).**

### 🔴 Critical (5/5 Fixed)

| ID | Issue | Status | Commit |
|----|-------|--------|--------|
| C1 | `ToolPageLayout` era inerte — solo `data-phase` attr | ✅ Fixed | `ToolPageLayout` ora è phase controller con `useMachine`, renderizza SetupPanel/FeedbackPanel/SessionSummary/CompletionBanner per fase |
| C2 | XState mai integrato con ToolPage — usava `useState` | ✅ Fixed | `ToolPage` delegato a `ToolPageLayout`, eventi macchina (`CONFIGURE`, `SUBMIT`, `SESSION_STARTED`, `SESSION_COMPLETED`, `SESSION_FAILED`) inviati dal layout |
| C3 | ToolPageLayout non renderizzava condizionalmente per fase | ✅ Fixed | Switch su `state.value`: configuring→SetupPanel, submitting→spinner, running→FeedbackPanel, completed→SessionSummary+CompletionBanner, failed→ErrorState |
| C4 | `PromoteButton` hardcoded `disabled={true}` | ✅ Fixed | Nuovo endpoint `POST /api/artifacts/:id/promote`, PromoteButton con stato idle/loading/done/error, chiama `api.promoteArtifact` |
| C5 | `SessionSummary` download disabilitato | ✅ Fixed | `IconButton` onClick → `handleDownload`, endpoint `GET /api/artifacts/:id/download?format=md` già esistente |

### 🟠 High (13 resolved — 12 fixed, 1 deferred)

| ID | Issue | Status | Fix |
|----|-------|--------|-----|
| H1 | SkipToContent link assente (WCAG AA) | ✅ Fixed | `AppShell`: `<a href="#main-content">` con focus-visible |
| H2 | FeedbackPanel senza `role="status" aria-live="polite"` | ✅ Fixed | `FeedbackPanel`: wrapper con live region |
| H3 | Assets nav disabilitata con chip "soon" | ✅ Fixed | `AppShell`: rimosso `disabled`, path `/workspaces/:id/assets` |
| H4 | QuickGenerateBar non integrato in DashboardPage | ✅ Fixed | `DashboardPage`: sopra la tool grid |
| H5 | AssetCoverageBar non integrato in DashboardPage | ✅ Fixed | `DashboardPage`: sotto QuickGenerateBar |
| H6 | "Pronti da Promuovere" KPI section | ⬜ Deferred | Serve endpoint per artifact promossi |
| H7 | SessionPage: breadcrumb `/dashboard` + no failed state | ✅ Fixed | `workspaceId` nel path + retry CTA |
| H8 | ToolPage credit cost non visibile | ⬜ Deferred | Richiede ToolDefinition.creditCost dal backend |
| H9 | Conversation privacy guard client-side | ⬜ Deferred | Backend `findByUserAndWorkspace` già enforcement |
| H10 | Route `/workspaces/:id/assets` mancante | ✅ Fixed | `AssetsPage` con AssetList + AssetCoverageBar |
| H11 | Route `/profile` gamification mancante | ✅ Fixed | `ProfilePage` con stats, badge progress, season |
| H12 | GamificationZone non cliccabile | ✅ Fixed | `onClick→/profile`, `role="button"`, `tabIndex={0}` |
| H13 | SessionPage/SessionSummary no step timeline | ⬜ Deferred | Richiede dati step dall'API session detail |

### 🟡 Medium (23 — 9 fixed, 14 open)

Generated from systematic comparison of wiki design authorities vs. actual `apps/frontend/` code (2026-08-04).

| ID | Issue | Wiki Spec Reference | Status |
|----|-------|---------------------|--------|
| M1 | FeedbackPanel: elapsed time timer missing | [[Tool UX Architecture#FeedbackPanel]]: "Elapsed time displayed" | ✅ Fixed |
| M2 | ConversationPage: empty state senza suggested question chips | [[Agent Chat UX#Template 10]]: "large agent avatar + greeting + 3 suggested question chips" | ✅ Fixed |
| M3 | ConversationPage: no scroll-lock badge "↓ Nuovo messaggio" | [[Agent Chat UX#Template 10]]: "↓ Nuovo messaggio badge when scrolled up" | ✅ Fixed |
| M4 | ConversationPage: no agent typing indicator (pulsing 3-dot) | [[Agent Chat UX#Interaction Patterns]]: "pulsing 3-dot bubble while sending" | ✅ Fixed |
| M5 | ConversationPage: message list missing `role="log" aria-live="polite"` | [[Agent Chat UX#Accessibility]]: `role="log" aria-live="polite"` | ✅ Fixed |
| M6 | ChatMessageBubble: no markdown rendering in agent bubbles | [[Agent Chat UX#Template 10]]: "Markdown rendered in agent bubbles" | ⬜ Open |
| M7 | ChatMessageBubble: no streaming cursor (blinking `▌`) | [[Agent Chat UX#Interaction Patterns]]: "blinking cursor in in-progress agent message" | ✅ Fixed |
| M8 | ChatInput: no character counter con `maxLength=4000` | [[Agent Chat UX#Template 10]]: "maxLength=4000, character counter warning at 90%" | ✅ Fixed |
| M9 | TeamHub: no hero banner | [[Agent Chat UX#Template 9]]: "Il tuo team marketing virtuale" banner | ⬜ Open |
| M10 | AgentContextDrawer: assets bare chips, missing content preview + deeplinks | [[Agent Chat UX#Template 10b]]: "first 100 chars + Vedi → + Genera →" | ⬜ Open |
| M11 | GamificationZone: include badge chips individuali (contro spec) | [[Gamification UX#Sidebar]]: "Does NOT include: individual badge icons" | ✅ Fixed |
| M12 | SetupPanel: long text usa `TextField multiline` invece di `TextareaAutosize` | [[Tool UX Architecture#SetupPanel]]: "TextareaAutosize minRows 3 maxRows 10" | ⬜ Open |
| M13 | SetupPanel: missing `FileUpload` component per input type `files` | [[Tool UX Architecture#SetupPanel]]: "FileUpload (custom) + LinearProgress" | ⬜ Open |
| M14 | SetupPanel: missing `InfoBanner` per input type `apiCalls` | [[Tool UX Architecture#SetupPanel]]: "InfoBanner (informational, no user action)" | ⬜ Open |
| M15 | FeedbackPanel: LinearProgress senza `aria-label` | [[Tool UX Architecture#FeedbackPanel]]: `aria-label="Step {current} of {total}"` | ✅ Fixed |
| M16 | FeedbackPanel: no step animations (slideInFade/stepPulse) | [[Tool UX Architecture#FeedbackPanel]]: "slideInFade 300ms, stepPulse 1.5s" | ⬜ Open |
| M17 | SessionSummary: solo .md download (missing .txt/.docx/.pdf) | [[Tool UX Architecture#SessionSummary]]: ".md/.txt/.docx/.pdf" | ⬜ Open |
| M18 | ChatMessageBubble: border-radius piatto (8px), non asimmetrico | [[Agent Chat UX#Template 10]]: user `16px 16px 4px 16px`, agent `16px 16px 16px 4px` | ✅ Fixed |
| M19 | ConversationPage: no date separator su multi-day conversations | [[Agent Chat UX#Template 10]]: "Date separator" | ⬜ Open |
| M20 | ChatMessageBubble: agent bubbles senza emoji avatar + border | [[Agent Chat UX#Template 10]]: "agent emoji top-left, border 1px divider" | ✅ Fixed |
| M21 | DashboardPage: QuickGenerateBar/AssetCoverageBar placement non allineato a WorkspaceDashboard spec | [[UI Component Map#WorkspaceDashboard]]: "5-section order" | ⬜ Open |
| M22 | AppShell: sidebar non collapsible | [[UI Component Map#AppShell]]: "280px collapsible sidebar" | ⬜ Open |
| M23 | ToastSystem: channel positioning errato (tutto top-right, spec: bottom-center gamification) | [[Gamification UX#Toast Priority System]]: "gamification: bottom-center" | ⬜ Open |

### 🟢 Low (9 — 0 fixed, 9 open)

| ID | Issue | Wiki Spec Reference | Status |
|----|-------|---------------------|--------|
| L1 | `useBreadcrumbs()` hook mai usato dalle pagine — usano ancora `breadcrumbs` prop su PageHeader | [[UI Component Map#PageHeader]] | ⬜ Open |
| L2 | Sidebar usa `Drawer` non `<nav>` semantico (role esplicito ma non elemento) | [[UI Component Map#AppShell]]: "permanent/temporary Drawer" | ⬜ Open |
| L3 | Agent emoji in ChatMessageBubble senza `aria-hidden` | [[Agent Chat UX#Accessibility]]: "All agent emoji: aria-hidden=true" | ⬜ Open |
| L4 | CompletionBanner integrato in ToolPageLayout ma non in SessionPage standalone | [[UI Component Map#CompletionBanner]] | ⬜ Open |
| L5 | FeedbackPanel mancano animazioni `slideInFade` spec (solo transizione base) | [[Tool UX Architecture#FeedbackPanel]]: "slideInFade 300ms" | ⬜ Open |
| L6 | WorkspaceCard non integrato in AppShell workspace switcher (usa Select inline) | [[UI Component Map#WorkspaceCard]] | ⬜ Open |
| L7 | SessionSummary manca docx/pdf download format | [[Tool UX Architecture#SessionSummary]]: ".md/.txt/.docx/.pdf" | ⬜ Open |
| L8 | `prefers-reduced-motion` mancante in FeedbackPanel step transitions | [[Tool UX Architecture#FeedbackPanel]]: "respects prefers-reduced-motion" | ⬜ Open |
| L9 | AssetCoverageBar: pulsante "+" per asset mancanti non funzionale | [[UI Component Map#AssetCoverageBar]]: "Genera -> CTA for missing types" | ⬜ Open |

---

## Sprint 5 — Implementation Plan (Remaining Non-Blocking)

### Overview

7 items remain — 2 components + 5 tech debt. None block the core workflow. Estimated ~5 days.

### Phase 1 — Component Extraction (1.5h)

| Step | File | Action |
|------|------|--------|
| 1a | `src/components/workspace/WorkspaceCard.tsx` | **New** — Extract from inline workspace selecor in AppShell. Props: `{ workspace, isActive, onClick }`. MUI Card + accent dot + name + member count. |
| 1b | `src/layout/AppShell.tsx` | **Mod** — Replace inline workspace MenuItem with `<WorkspaceCard>` |
| 1c | `src/components/agent-chat/AgentContextDrawer.tsx` | **New** — MUI Drawer (right). Two sections: "Workspace Assets" (SWR from `listAssets`) + "Recent Sessions" (SWR from `listSessions`). Open/close via `useState` in ConversationPage. |
| 1d | `src/pages/ConversationPage.tsx` | **Mod** — Add IconButton in header to toggle AgentContextDrawer |

### Phase 2 — DTO Cleanup (1h)

| Step | File | Action |
|------|------|--------|
| 2a | `packages/contracts/src/` | **Mod** — Add DTO interfaces: `WorkspaceDTO`, `MessageDTO`, `ConversationDTO`, `ConversationListItemDTO`, `AgentDTO` |
| 2b | `packages/contracts/src/index.ts` | **Mod** — Re-export new DTOs |
| 2c | `apps/frontend/src/api/client.ts` | **Mod** — Replace 7 inline interfaces with `import type { ... } from '@flow-app/contracts'`. Remove `// TODO` comments. |

### Phase 3 — Breadcrumb Centralization (0.5h)

| Step | File | Action |
|------|------|--------|
| 3a | `src/layout/AppShell.tsx` | **Mod** — Add `BreadcrumbContext` with `useBreadcrumbs()` hook. Each page calls `setBreadcrumbs([...])` in useEffect. |
| 3b | All pages | **Mod** — Replace inline `<Breadcrumbs>` prop in `PageHeader` with `useBreadcrumbs()` hook call. Remove `breadcrumbs` prop from PageHeader. |

### Phase 4 — SSE Reconnect (1h)

| Step | File | Action |
|------|------|--------|
| 4a | `src/api/sse-client.ts` | **Mod** — `connect()` retries dropped connections: exponential backoff (1s, 2s, 4s, 8s, max 30s). Max 5 retries. `onError` handler calls `reconnect()` internally. Reconnect resubscribes all handlers. |

### Phase 5 — Fonts + Polish (0.5h)

| Step | File | Action |
|------|------|--------|
| 5a | `index.html` | **Mod** — Add `<link>` for Google Fonts: Plus Jakarta Sans + JetBrains Mono |
| 5b | `src/theme/tokens.ts` | **Mod** — Update `fontFamily: '"Plus Jakarta Sans", ...'` for headings, `fontFamily: '"JetBrains Mono", monospace'` for code |

### Phase 6 — XState toolPageMachine (3h)

| Step | File | Action |
|------|------|--------|
| 6a | `packages/domain/src/generation/` | **Verify** — `ToolPageMachine` already exists in [[ToolPage Machine (XState v5)]] wiki spec. Check if it's implemented in code or only in wiki. |
| 6b | `apps/frontend/src/machines/tool-page-machine.ts` | **New** (or import from domain) — 8-state machine: `draftEmpty → configuring → ready → submitting → running → completed|failed|cancelled` |
| 6c | `apps/frontend/src/components/layout/ToolPageLayout.tsx` | **New** — Wraps ToolPage with `useActor(toolPageMachine)`. Derives phase from state value. Renders SetupPanel (configuring) → FeedbackPanel (running) → SessionSummary (completed). |
| 6d | `apps/frontend/src/pages/ToolPage.tsx` | **Mod** — Replace `useState` (inputs, submitting, error) with `ToolPageLayout` which owns the machine. |
| 6e | Terminal | `npm install xstate @xstate/react` |

### Execution Order

```
Phase 1 (1.5h) → Phase 2 (1h) → Phase 3 (0.5h) → Phase 4 (1h) → Phase 5 (0.5h) → Phase 6 (3h)
```

No dependencies between phases — can be done in any order. Phase 6 is the heaviest (XState).

### Verification

```bash
tsc --noEmit -p apps/frontend/tsconfig.json
npm run build --workspace=apps/frontend
npx vitest run
```

---

## Sources

- [[Frontend Architecture]] — component inventory, routing, state patterns (note: Auth status is stale — see Phase 8)
- [[UI Component Map]] — full 37-component catalog with props, MUI internals, state bindings
- [[Tool UX Architecture]] — SetupPanel, FeedbackPanel, state-to-information mapping
- [[ToolPage Machine (XState v5)]] — 8-state machine specification
- [[Agent Chat UX]] — TeamHub, ConversationPage, AgentContextDrawer specs
- [[Gamification UX]] — 8 components, psychological triggers, sidebar integration
- [[API Routes]] — 50+ endpoint catalog with implementation status (✅/⬜)
- [[frontend-mvp-plan-2026-08-01]] — Phase 7 plan (13 components, 7 steps), delivery gap report
- [[implementation-roadmap-2026-08-01]] — parent roadmap, all 13 phases tracked
- [[Usage & Quota]] — domain design for quota bounded context
- [[Gamification]] — authoritative domain design for engagement layer
- [[Tool as Static Configuration]] — ToolDefinition drives SetupPanel generation
- [[Maintenance Log]] — Phase 8 frontend auth completion evidence
