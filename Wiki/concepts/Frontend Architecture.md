---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/architecture
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Frontend Architecture

> Unification, reusability, minimal surface area — workspace-centric UI  
> `apps/frontend/src/`

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **MUI v6** component library | Context7-verified, dark/light native, a11y built-in, already in the tech stack |
| 2 | **17 total components** | Zero tool-specific components. Generic SetupPanel adapts to any ToolDefinition |
| 3 | **Workspace-centric layout** | The user lands on the workspace. Tools, sessions, assets → everything inside the workspace |

---

## Component Inventory

```
apps/frontend/src/components/
│
├── layout/                        # 3 components
│   ├── AppShell.tsx               # Root layout: sidebar + header + content
│   ├── WorkspaceDashboard.tsx     # Dashboard view (default)
│   └── ToolPageLayout.tsx         # Tool page shell: setup | progress | result
│
├── workspace/                     # 4 components
│   ├── WorkspaceCard.tsx          # Card in dashboard grid
│   ├── WorkspaceForm.tsx          # Create/edit dialog
│   ├── SessionList.tsx            # Live session tracking (queued/running/completed/failed)
│   └── AssetList.tsx              # Knowledge Panel asset grid
│
├── tool/                          # 5 components
│   ├── SetupPanel.tsx             # Generic input panel — adapts to ToolDefinition
│   ├── KnowledgePanel.tsx         # Asset selection sidebar
│   ├── ReadinessSnapshot.tsx      # Pre-flight readiness display
│   ├── FeedbackPanel.tsx          # Step progress cards (SSE-driven)
│   └── SessionSummary.tsx         # Final result + download + promote
│
└── shared/                        # 5 components
    ├── PageHeader.tsx             # Title + breadcrumb + actions
    ├── EmptyState.tsx             # Icon + message + CTA
    ├── ErrorState.tsx             # Error message + retry
    ├── LoadingSkeleton.tsx        # Skeleton placeholder
    └── ConfirmDialog.tsx          # Delete confirmation
```

**17 components. Zero tool-specific.** Every tool from [[Tool as Static Configuration|ToolDefinition]] is rendered by the same `SetupPanel`.

---

## Layout Architecture

```
AppShell
┌──────────────────────────────────────────────────────────┐
│ Sidebar (280px)              │ Content Area (flex)        │
│                               │                            │
│ ┌─────────────────────────┐   │ ┌────────────────────────┐ │
│ │ Workspace Selector       │   │ │ PageHeader              │ │
│ │ [Workspace ▼]            │   │ │ Breadcrumb > Title      │ │
│ └─────────────────────────┘   │ │ [Actions]               │ │
│                               │ └────────────────────────┘ │
│ ┌─────────────────────────┐   │                            │
│ │ Tools                     │   │ ┌────────────────────────┐ │
│ │ ○ Blog Post               │   │ │                        │ │
│ │ ○ Landing Funnel          │   │ │    Content Area        │ │
│ │ ○ Video Script            │   │ │                        │ │
│ │ ○ ...                     │   │ │  Dashboard or ToolPage │ │
│ └─────────────────────────┘   │ │                        │ │
│                               │ └────────────────────────┘ │
│ ┌─────────────────────────┐   │                            │
│ │ Workspace Info            │   │                            │
│ │ Credits: 245/250          │   │                            │
│ │ Reset: 01/08/2026         │   │                            │
│ └─────────────────────────┘   │                            │
│                               │                            │
│ User Menu (bottom)            │                            │
└──────────────────────────────────────────────────────────┘
```

### Routing

| Route | View | Component |
|-------|------|-----------|
| `/` | Redirect to first workspace or empty state | — |
| `/workspaces/:id` | Workspace dashboard | `WorkspaceDashboard` |
| `/workspaces/:id/tools/:toolKey` | Tool page | `ToolPageLayout` |
| `/workspaces/:id/sessions/:sessionId` | Session detail | `SessionSummary` (full page) |
| `/admin/*` | Admin pages | Admin shell |

---

## Workspace Dashboard

Default view when the user enters a workspace.

```
WorkspaceDashboard
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Q3 Campaign" + [New Generation ▼]           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─ Asset Overview ──────────────────────────────────────┐│
│ │ Brand Voice ✓  Buyer Persona ✓  Brief ✗  Angle ✗     ││
│ │ [Manage Assets]                                       ││
│ └───────────────────────────────────────────────────────┘│
│                                                           │
│ ┌─ Recent Sessions ────────────────────────────────────┐ │
│ │ Blog Post          completed   30/07  [View]          │ │
│ │ Landing Funnel     completed   29/07  [View]          │ │
│ │ Video Script       failed      28/07  [Retry]         │ │
│ │ [View all sessions]                                   │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─ Quick Actions ──────────────────────────────────────┐ │
│ │ [Blog Post] [Landing Funnel] [Brand Voice] [More...] │ │
│ └───────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Mapping from user stories**: US-W02 (central dashboard), US-W03 (session history), US-W04 (active workspace), US-W06 (credits).

---

## Tool Page

Three-phase flow driven by the [[ToolPage Machine (XState v5)|ToolPage machine]]:

```
PHASE 1: SETUP                          PHASE 2: PROGRESS              PHASE 3: RESULT
┌────────────────┬──────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│ SetupPanel     │ KnowledgePanel│      │ FeedbackPanel       │      │ SessionSummary      │
│                │              │      │                     │      │                     │
│ Topic: [____]  │ Asset:       │      │ Step 1/3 ✓ Analysis  │      │ # Blog Post Title   │
│                │ ✅ Brand Voice│      │ Step 2/3 ◐ Outline  │      │                     │
│ File: [Upload] │ ○ Persona    │      │ Step 3/3 ○ Article  │      │ Content preview...  │
│                │              │      │                     │      │                     │
│ [Generate]     │              │      │ [Cancel]            │      │ [Download] [Promote]│
└────────────────┴──────────────┘      └─────────────────────┘      └─────────────────────┘
```

**Mapping from user stories**: US-T04 (step-by-step progress), US-AS04 (Knowledge Panel), US-QF01 (unified feedback panel).

---

## Design Tokens

Defined at MUI theme level. No hardcoded values in components.

```typescript
// apps/frontend/src/theme/tokens.ts

import { createTheme } from '@mui/material/styles';

const tokens = {
  palette: {
    primary:   { main: '#2563EB' },   // Blue — primary actions
    secondary: { main: '#7C3AED' },   // Purple — assets, promotion
    success:   { main: '#059669' },   // Green — completed
    warning:   { main: '#D97706' },   // Amber — attention
    error:     { main: '#DC2626' },   // Red — error
    grey:      {
      50:  '#F9FAFB',   // Surface background
      100: '#F3F4F6',   // Card background
      200: '#E5E7EB',   // Border
      900: '#111827',   // Text primary
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },     // Page titles
    h6: { fontWeight: 600 },     // Card titles
    body1: { fontSize: '1rem' }, // Body text
  },
  spacing: 8,                      // 8px grid
  shape: { borderRadius: 8 },       // Cards, buttons
};

const theme = createTheme({
  palette: {
    mode: 'light',                  // default — system override in AppShell
    ...tokens.palette,
  },
  typography: tokens.typography,
  spacing: tokens.spacing,
  shape: tokens.shape,
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
      },
    },
  },
});

export { theme, tokens };
```

---

## State Patterns

### Loading → Empty → Error → Data

Every view follows the same 4-state pattern:

```tsx
function WorkspaceDashboard() {
  const { workspaces, loading, error } = useWorkspaces();

  if (loading) return <LoadingSkeleton variant="dashboard" />;
  if (error)   return <ErrorState message={error.message} onRetry={refetch} />;
  if (workspaces.length === 0) return <EmptyState
    icon={<FolderOpen />}
    title="No workspaces"
    description="Create a workspace to start generating content."
    action={{ label: "Create workspace", onClick: openCreate }}
  />;

  return <WorkspaceGrid workspaces={workspaces} />;
}
```

**Rule**: every component that shows data has 4 states. `EmptyState`, `ErrorState`, `LoadingSkeleton` are the only 3 shared components that handle all cases.

---

## Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-----------|----------------|
| **Keyboard navigation** | MUI handles focus trap in dialogs, tab order in forms |
| **Focus visible** | MUI `focusVisible` style on all interactive elements |
| **Screen reader** | `aria-label` on icons, `aria-live="polite"` on FeedbackPanel |
| **Color not only** | Errors show icon + text, never just red color |
| **Skip link** | `SkipToContent` in AppShell to skip the sidebar |
| **Semantic HTML** | `<nav>` sidebar, `<main>` content, `<section>` dashboard panels |

**Mapping from user stories**: US-QF05 (keyboard and screen reader accessibility).

---

## Key Properties

| Property | Meaning |
|-----------|-------------|
| **16 components** | The entire app. No tool-specific components |
| **Generic SetupPanel** | Reads `ToolDefinition.acquisition` and renders form fields dynamically |
| **Workspace-centric** | Every route has `workspaceId`. Tools, sessions, assets are scoped to the workspace |
| **4 standard states** | Loading → Empty → Error → Data. 3 shared components handle them |
| **Design tokens** | Centralized in `theme.ts`. Zero hardcoded values |
| **Centralized copy** | `@flow-app/copy` for all text. Zero inline strings |

---

## Sources

- [[sources/USER-STORIES]] — 74 user stories, workspace + tool + asset epics
- [[ToolPage Machine (XState v5)]] — Tool page state machine
- [[Tool as Static Configuration]] — ToolDefinition drives SetupPanel generation
- [[Centralized Copy Modules]] — Text modules consumed by components
- [[ReadinessSnapshot UI]] — Readiness display component
- [[Tool UX Architecture]] — Generic SetupPanel, always-on information, 4-phase lifecycle
- [[Session List - Live Status]] — Cross-tab SSE, live session cards