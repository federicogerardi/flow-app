---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/roadmap
  - wiki/frontend
date_updated: 2026-08-02
source_count: 9
parent: synthesis/implementation-roadmap-2026-08-01
---

# Frontend MVP — Implementation Plan (Phase 7)

> Detailed execution plan for Phase 7 of [[synthesis/implementation-roadmap-2026-08-01]].

## Actual Delivery (2026-08-02)

Phase 7 was implemented on `dev` branch with scope significantly reduced from plan. Key gaps:

| Plan item | Planned | Delivered | Notes |
|-----------|---------|-----------|-------|
| WorkspaceDashboard component | ✅ | ❌ | DashboardPage is a page, not workspace-centric |
| ToolPageLayout | ✅ | ❌ | ToolPage is a basic form, no SetupPanel |
| WorkspaceCard | ✅ | ❌ | No workspace switcher |
| AssetList | ✅ | ❌ | Asset management not built |
| SetupPanel | ✅ | ❌ | Hardcoded "topic" + "language" fields |
| SessionSummary | ✅ | 🟡 | Inline rendering in SessionPage, no separate component |
| ConversationPage | ✅ | 🟡 | Page exists but not componentized (no ChatMessageBubble, ChatInput) |
| TeamHub | — | ❌ | Agent selection not built |
| XState integration | Deferred | Deferred | useState/useReducer used |

**Root cause**: the 7-step implementation order was followed but stopped at step 4 (add 2 backend endpoints + fix hooks). Steps 5-7 (Dashboard + Workspace components, Tool Page SetupPanel, Session Summary + Agent Chat componentization) were partially completed with monolithic page components instead of layered abstractions. The remaining ~20 components represent 80% of the frontend work still pending.

## Current State

`apps/frontend/` has 6 source files, all sketch/stub level:

| File | Status |
|------|--------|
| `main.tsx` | Bare entry — no router, no theme, no providers |
| `App.tsx` | `<h1>Flow App</h1>` placeholder |
| `api/client.ts` | 4 methods: `startSession`, `getSession`, `listSessions`, `cancelSession` |
| `api/sse-client.ts` | Functional SSE client with multi-connection Map |
| `api/hooks.ts` | `useSession()` + `useWorkspaces()` — **bug**: `useWorkspaces` calls `api.listSessions()` |

**Installed**: React 19, MUI v6.4, Emotion, SWR 2.3 (unused), Vite 6 (+ proxy to `:3000`).
**Missing**: xstate, @xstate/react, react-router-dom, react-markdown, remark-gfm.

## Design Authority

The wiki prescribes a comprehensive frontend architecture across 9 pages:

| Page | Content |
|------|---------|
| [[Frontend Architecture]] | Tech stack, workspace-centric routing, 10 routes, 37 components |
| [[Tool UX Architecture]] | Generic `SetupPanel` from `ToolDefinition.acquisition`, XState `toolPageMachine` |
| [[ToolPage Machine (XState v5)]] | 8-state machine: draftEmpty → configuring → ready → submitting → running → completed/failed/cancelled |
| [[Session List - Live Status]] | SSE-powered live status badges, 30s poll fallback |
| [[ReadinessSnapshot UI]] | Pre-flight validation display before queue submission |
| [[API Client + SSE Client]] | HTTP client patterns, SSE event handling, multi-session management |
| [[UX Wireframes]] | 11 templates: Dashboard, Tool Page, Chat, Profile, etc. |
| [[UI Component Map]] | 37 components across 4 layers: Layout, Tool, Agent Chat, Gamification |
| [[Agent Chat UX]] | Chat interface, Team Hub sidebar, workspace context injection |

## Backend Gaps (Blocker)

The frontend needs these endpoints that don't exist yet:

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/sessions?workspaceId=&status=` | Session listing with filters | 🔴 Blocker |
| `GET /api/artifacts/:id` | Fetch artifact content | 🔴 Blocker |
| `POST /api/workspaces` | Create workspace | 🟡 After MVP |
| `DELETE /api/workspaces/:id` | Delete workspace | 🟢 Low |

**Decision**: add `GET /api/sessions` and `GET /api/artifacts/:id` as part of Phase 7. Defer workspace create/delete.

## MVP Scope

### What we build (13 core components from the 37 prescribed)

| Component | Layer | Purpose |
|-----------|-------|---------|
| `AppShell` | Layout | Sidebar + header + content area |
| `PageHeader` | Shared | Title + breadcrumb + actions toolbar |
| `EmptyState` | Shared | Illustration + message + CTA for empty lists |
| `ErrorState` | Shared | Error message + retry button |
| `LoadingSkeleton` | Shared | Skeleton placeholder during fetch |
| `WorkspaceDashboard` | Workspace | Workspace cards grid + session list |
| `WorkspaceCard` | Workspace | Workspace name, member count, quick action |
| `SessionList` | Workspace | SSE-powered session status table |
| `ToolCard` | Tool | Tool icon, name, description, start button |
| `ToolPageLayout` | Tool | Tool page shell with step navigation |
| `SetupPanel` | Tool | Dynamic form from `ToolDefinition.acquisition` |
| `SessionSummary` | Tool | Results display + artifact list |
| `ConversationPage` | Agent Chat | Chat message list + input + persona selector |

### What we defer (post-MVP)

- **Gamification** (8 components) — Phase 11
- `KnowledgePanel`, `FeedbackPanel`, `AssetCoverageBar` — need assets, no asset CRUD yet
- `ReadinessSnapshot` — useful but not blocking the core flow
- `CompletionBanner`, `QuickGenerateBar`, `PromoteButton` — UX-v1 polish
- `AgentContextDrawer`, `TeamHub` — agent chat enhancements
- Google Fonts (Plus Jakarta Sans, JetBrains Mono) — while MUI defaults work fine

### Technology decisions

| Decision | Choice | Rationale | Context7 verified |
|----------|--------|-----------|-------------------|
| Routing | `react-router-dom` v7 (canonical import: `"react-router"`) | Already prescribed by wiki, simple SPA routes | ✅ BrowserRouter + Routes + Outlet pattern |
| State (server) | `swr` (already installed) | Lightweight, cache-aware, fits REST API | ✅ |
| State (client) | `useState` + `useReducer` | XState `toolPageMachine` deferred — adds complexity without unblocking MVP flow | — |
| UI | MUI v6.5 (already installed) | Design system already chosen | ✅ Grid2 + size prop, createTheme + ThemeProvider |
| Markdown | `react-markdown` + `remark-gfm` | Artifacts are Markdown, need rendering | — |

#### Context7 findings (2026-08-01)

**React Router v7.18.2**:
- Canonical import is `"react-router"` not `"react-router-dom"` (v7 re-exports everything)
- `BrowserRouter` wraps `<Routes>`, layout via nested `<Route element={<Layout />}>`
- `useNavigate`, `useParams`, `useSearchParams` all from `"react-router"`
- `useTransitions` prop on `BrowserRouter` enables React 19 `startTransition` for navigations

**MUI v6.5.0**:
- Grid v2 is stabilized — use `Grid` from `@mui/material/Grid2` (not default Grid)
- Responsive `size` prop: `size={{ xs: 12, sm: 6, md: 4 }}` replaces old `xs={12} sm={6}`
- Theme: `createTheme` + `ThemeProvider` + `CssBaseline` pattern confirmed
- `@mui/icons-material@6.x` required (v9 needs MUI v9 peer dependency)

## Route Structure (5 routes)

```
/dashboard                        → WorkspaceDashboard (list workspaces)
/workspaces/:id                    → ToolPageLayout (tool picker + session list)
/workspaces/:id/tools/:toolKey     → ToolPageLayout > SetupPanel
/workspaces/:id/sessions/:id       → SessionSummary (results + artifacts)
/workspaces/:id/conversations/:id  → ConversationPage (agent chat)
```

## Implementation Order (7 steps)

### Step 1 — Foundation (deps + theme + routing)
- Install `react-router-dom`, `react-markdown`, `remark-gfm`
- Create MUI theme (`src/theme/index.ts`) — light/dark from [[Design Tokens]]
- Create `ThemeProvider` wrapper
- Create `AppShell` layout (MUI AppBar + Drawer + main content)
- Wire react-router with 5 routes
- Fix `App.tsx` to render `<ThemeProvider><Router><AppShell/></Router></ThemeProvider>`

### Step 2 — Shared components
- `PageHeader` — title, optional breadcrumb, optional action buttons
- `EmptyState` — illustration placeholder (emoji), message, CTA
- `ErrorState` — error message, stack in details, retry button
- `LoadingSkeleton` — MUI Skeleton variants for list/card/page

### Step 3 — API client expansion + hook fixes
- Add to `api/client.ts`: `listSessions`, `getArtifact`, `listWorkspaces`, `listConversations`, `sendMessage`
- Fix `useWorkspaces()` hook — change `api.listSessions()` → `api.listWorkspaces()`
- Create `useLiveSession(sessionId)` hook — SWR + SSE subscription

### Step 4 — Backend gap: session listing + artifact endpoint
- Add `GET /api/sessions?workspaceId=&status=` to `apps/backend/src/api/generation.ts`
- Add `GET /api/artifacts/:id` to `apps/backend/src/api/generation.ts`
- Wire in `app.ts`

### Step 5 — Dashboard + Workspace pages
- `WorkspaceDashboard` — SWR fetch workspaces → `WorkspaceCard` grid → session list below
- `WorkspaceCard` — name, member count, "Open" link
- `ToolCard` — from `GET /api/workspaces/:id/agents` pattern (list available tools)
- `SessionList` — table with status badges, SSE live updates

### Step 6 — Tool Page + Setup
- `ToolPageLayout` — route `/workspaces/:id/tools/:toolKey`
- `SetupPanel` — reads `ToolDefinition.acquisition` from backend, renders dynamic form
- POST `/api/tools/:toolKey/sessions` on submit → navigate to session page
- Poll `/api/sessions/:id` for progress (or SSE connect)

### Step 7 — Session Summary + Agent Chat
- `SessionSummary` — fetch artifact list, render Markdown
- `ConversationPage` — `/workspaces/:id/conversations/:id`
- Chat message list + input + persona selector
- POST `/api/conversations/:id/messages` with SWR revalidation

## Exit Criteria

- [ ] `npm run build --workspace=apps/frontend`: 0 errors
- [ ] `npm run dev` shows the dashboard with workspace cards
- [ ] Can select a tool, fill in the form, and start a generation session
- [ ] Session progress is visible (polling minimum, SSE stretch)
- [ ] Generated artifacts render as Markdown
- [ ] Agent chat sends messages and displays replies

## Risk Register

| Risk | Mitigation |
|------|-----------|
| XState complexity | Deferred — plain useState for MVP, XState in v1.1 |
| Backend gaps block frontend | Add 2 minimal endpoints as part of Phase 7 |
| MUI v6 API changes | Locked to `^6.4.0`, no major upgrade expected |
| 13 components is too many for one phase | Strict MVP: 8 minimum for the workflow to function |

## Sources

- [[Frontend Architecture]] — component inventory, routing, tech stack
- [[Tool UX Architecture]] — SetupPanel, XState machine, SSE integration
- [[ToolPage Machine (XState v5)]] — full state machine specification
- [[Session List - Live Status]] — SSE badges, polling strategy
- [[API Client + SSE Client]] — client patterns, hooks design
- [[UX Wireframes]] — 11 templates including Dashboard, Tool Page, Chat
- [[UI Component Map]] — 37 components cataloged
- [[Agent Chat UX]] — chat interface, sidebar, context injection
- [[implementation-roadmap-2026-08-01]] — parent roadmap, Phase 7 scope
