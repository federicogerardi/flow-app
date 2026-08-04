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
| `DashboardPage` | `src/pages/DashboardPage.tsx` | Tool grid (`ToolCard`), session list (`SessionList`), hardcoded `TOOLS` array |
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
| `SessionList` | `src/components/workspace/SessionList.tsx` | [[Session List - Live Status]] | `GET /api/sessions` ✅ | 1d | 🟡 Pending |
| `AssetList` | `src/components/workspace/AssetList.tsx` | [[UI Component Map#AssetList.tsx]] | `GET /api/workspaces/:id/assets` ✅ | 1d | ✅ |
| `AssetCoverageBar` | `src/components/workspace/AssetCoverageBar.tsx` | [[UI Component Map#AssetCoverageBar.tsx]] | `GET /api/workspaces/:id/assets` ✅ | 0.5d | ✅ |

**Blocker**: Asset CRUD endpoints are now ✅ implemented (Sprint 4). AssetList and AssetCoverageBar are built and functional.

#### Tool Components (3/6 built — FeedbackPanel, ReadinessSnapshot, SessionSummary done)

| Component | File target | Design authority | API dependency | Effort | Status |
|-----------|-------------|-----------------|----------------|--------|--------|
| `SetupPanel` | `src/components/tool/SetupPanel.tsx` | [[Tool UX Architecture#The SetupPanel — Generic Input Renderer]] | ToolDefinition from `GET /api/agents` ✅ | 1.5d | 🟡 Pending |
| `KnowledgePanel` | `src/components/tool/KnowledgePanel.tsx` | [[Tool UX Architecture]] | `GET /api/workspaces/:id/assets` ✅ | 1d | 🟡 Pending |
| `ReadinessSnapshot` | `src/components/tool/ReadinessSnapshot.tsx` | [[ReadinessSnapshot UI]] | Readiness from `POST /api/tools/:toolKey/sessions` 422 response ✅ | 0.5d | ✅ |
| `FeedbackPanel` | `src/components/tool/FeedbackPanel.tsx` | [[Tool UX Architecture#Always-On Information — State Transparency]] | SSE `step_completed` events ✅ | 1d | ✅ |
| `SessionSummary` | `src/components/tool/SessionSummary.tsx` | [[UI Component Map#SessionSummary.tsx]] | `GET /api/sessions/:id` ✅, `GET /api/artifacts/:id` ✅ | 1d | ✅ |
| `ToolCard` | `src/components/tool/ToolCard.tsx` | [[UI Component Map#ToolCard.tsx]] | ToolDefinition from tool registry | 0.5d | 🟡 Pending |

**Key technical shift**: `SetupPanel` must read `ToolDefinition.acquisition` dynamically from the backend, replacing the current hardcoded `tool-inputs.ts` (11 static tool definitions). This requires either a tool registry API or a shared `ToolDefinition` import from `packages/domain`.

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

### 🔴 P0 — Phase 12 Usage & Quota (Backend ✅, Frontend 🟡)

**Backend**: Complete (2026-08-04). See [[implementation-roadmap-2026-08-01#Phase 12 — Usage & Quota Wiring|Phase 12 roadmap]] for details. `ConsumeCreditsUseCase` with auto-create + optimistic retry, `GET /api/usage/credits` returning full quota state, wired into session worker via `SessionCompleted` event.

**Frontend remaining**:

| Gap | Layer | Description |
|-----|-------|-------------|
| Quota counter in sidebar | Frontend | `Credits: 245/250` with `PlanType` indicator, per [[Frontend Architecture]] sidebar spec |
| "Crediti esauriti" block | Frontend | Must intercept `429 QUOTA_EXCEEDED` from `POST /api/tools/:toolKey/sessions` and show hard stop message |
| Artifact gate warning | Frontend | 1000/month limit — user needs awareness before hitting it |

**Estimated effort**: 1–2 days (3 React components + sidebar integration)

### 🟠 P1 — Blocked Frontend by Missing Backend APIs

| Backend gap | Frontend impact | API Routes status |
|-------------|----------------|-------------------|
| `GET /api/workspaces/:id/assets` | ✅ AssetList, AssetCoverageBar unblocked | ✅ Implemented (Sprint 4) |
| `POST /api/workspaces/:id/assets` | ✅ Asset creation unblocked | ✅ Implemented (Sprint 4) |
| `DELETE /api/workspaces/:id/assets` | ✅ Asset deletion unblocked | ✅ Implemented (Sprint 4) |
| `PUT /api/workspaces/:id/assets` | ✅ Asset update unblocked | ✅ Implemented (Sprint 4) |
| `PUT /api/workspaces/:id` | Blocks `WorkspaceForm` edit mode | ⬜ Planned, not built |
| `DELETE /api/workspaces/:id` | Blocks workspace delete UI | ⬜ Planned, not built |
| `GET /api/artifacts/:id/download` | Blocks download button | ⬜ Planned, not built |
| `POST /api/sessions/:id/cancel` | Blocks cancel button | ⬜ Planned, not built |

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
| **Remaining** | **Workspace edit/delete** (backend) + **XState migration** (deferred) | | |

### Recommended Sprint Sequence

| Sprint | Tracks | Days | Status | Outcome |
|--------|--------|------|--------|---------|
| Sprint 1 | A + B (items 1–4) | ~7h | ✅ | QuotaCounter, Markdown, FeedbackPanel, SessionSummary, ReadinessSnapshot |
| Sprint 2 | B (items 5–6) + C + D (items 1–3) | ~6h | ✅ | PromoteButton, ChatMessageBubble, ChatInput, TeamHub, AgentCard, WorkspaceMembers + invite dialog |
| Sprint 3 | E | ~4h | ✅ | GamificationZone, ToastSystem (LevelUpBanner+LuckyBonusSparkle), BadgeProgressRing, ActivityPulse, SeasonCountdown, ChallengeVoting, StreakModeToggle |
| Sprint 4 | F + G | ~5h | ✅ | Asset CRUD backend (AssetRepository + 5 API routes + Kysely) + frontend (AssetList, AssetCoverageBar), ConfirmDialog, CompletionBanner, QuickGenerateBar, Dark mode toggle |

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
