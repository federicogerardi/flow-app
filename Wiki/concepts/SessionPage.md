---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/generation
date_updated: 2026-08-08
source_count: 5
confidence: high
---

# SessionPage

> Full-page session detail component — **canonical post-submit destination**  
> `apps/frontend/src/pages/SessionPage.tsx`

## Route

```
/workspaces/:workspaceId/sessions/:sessionId
```

Mounted in `App.tsx` with `<ErrorBoundary>` wrapper. Route parameters: `workspaceId`, `sessionId`.

**2026-08-08**: SessionPage is now the **single canonical destination** for session progress and results. `ToolPageLayout` redirects here after successful submission (`submitted` state). This eliminates duplicated SSE connections and FeedbackPanel/SessionSummary renders in the tool page.

**2026-08-08 (replay detection)**: When the redirect includes `?replayed=true` (idempotency hit — same inputs as a previous generation), a banner alerts the user that this is a previously completed result and suggests modifying inputs for a fresh generation.

## Component Structure

```
SessionPage
├── PageHeader: "Session: {toolName}"
├── Alert (replayed: "Questa generazione è stata già completata...")
├── Alert (queued/draft/ready: friendly "in elaborazione" message)
├── Card: Status + Metadata
│   ├── Status chip (color-coded via statusColorMap)
│   ├── Cancel button (running only)
│   ├── Steps count
│   ├── Duration (startedAt → completedAt)
│   ├── Created date
│   ├── FeedbackPanel (running: progress bar + step label)
│   └── ErrorState (failed: error message + retry CTA)
├── SessionSummary (completed: artifact list + download/promote)
└── CTA buttons
    ├── [Nuova generazione] — navigates to tool setup page
    └── [Back to workspace]
```

## State Guards (render order)

The component executes three sequential guards before rendering the main content:

```typescript
if (loading) return <LoadingSkeleton />;        // Guard 1: data not yet fetched
if (error) return <ErrorState message={error.message} />;  // Guard 2: fetch failed
if (!session) return <LoadingSkeleton />;       // Guard 3: session is null (defensive)
```

> **Bug fixed (2026-08-06)**: `loading` was initialized to `false` in `useSession`, causing the component to render with `session = null` before the API call completed. The `startedAt`/`completedAt` access on lines 57-58 used a type cast `(session as unknown as ...)` without null protection, causing `TypeError: can't access property "startedAt", session is null`. This crashed the component before `useEffect` could run, preventing `api.getSession()` from ever being called.
>
> **Fix**: initialized `loading` to `true` in `useSession`, and replaced the unsafe type cast with optional chaining: `session?.startedAt ?? null`.

## Key Behaviors

### Duration Calculation

```typescript
const startedAt = session?.startedAt ?? null;
const completedAt = session?.completedAt ?? null;
const durationMs = startedAt && completedAt
  ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
  : null;
```

Displayed only when `durationMs > 0`.

### Replay Detection

> **Added 2026-08-08**: When `ToolPageLayout` redirects with `?replayed=true` (idempotency hit — user submitted the same inputs as a previous generation), an informational banner is shown:
> `shared.session.replayedMessage`: "Questa generazione è stata già completata in precedenza con gli stessi input. Per avviare una nuova generazione, modifica gli input o usa 'Nuova generazione'."

The `useSearchParams()` hook reads the query param and shows the banner at the top of the page (below PageHeader, above the queued/pending alert).

### Cancel

Only visible when `status === 'running'`. Calls `api.cancelSession(sessionId)`. Button disabled while cancelling (local `cancelling` state).

### Pending State (queued / draft / ready)

> **Changed 2026-08-08**: previously treated as "interrupted" with a warning alert. Now shows a friendly informational message (`shared.session.queuedMessage`: "Generazione in elaborazione. Segui l'avanzamento in questa pagina.") since this is the **normal** state after the redirect from `ToolPageLayout`.

### Breadcrumbs

Set via `useBreadcrumbs()` in an effect:
- Home → `/workspaces/{workspaceId}`
- Sessions → `/workspaces/{workspaceId}/sessions`
- Session: `{toolKey}` (or "Session" if null)

### Artifacts

On `completed` status, renders:
1. `CompletionBanner` — summary with duration, step count, credit cost
2. `SessionSummary` — scrollable artifact list with ReactMarkdown rendering and download/promote actions

### "Nuova generazione" CTA

> **Added 2026-08-08**: a "Nuova generazione" (`AddIcon` + `Button variant="contained"`) button appears for `completed`, `failed`, and `queued` states. It navigates back to the tool setup page (`/workspaces/:workspaceId/tools/:toolKey`) so users can launch another generation without navigating through the sidebar.

```typescript
{(isCompleted || isFailed || isQueued) && (
  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
    <Button variant="contained" startIcon={<AddIcon />}
      onClick={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)}>
      {copy.t('shared.session.newGeneration')}
    </Button>
    <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
      {copy.t('workspace.nav.backToWorkspace')}
    </Button>
  </Box>
)}
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `useSession(sessionId)` | Fetches session + subscribes to SSE |
| `useBreadcrumbs()` | Sets page breadcrumbs |
| `api.cancelSession()` | Cancels running session |
| `FeedbackPanel` | Progress bar + step label for running sessions |
| `SessionSummary` | Artifact list rendering |
| `CompletionBanner` | Success summary banner |
| `LoadingSkeleton` | Loading state |
| `ErrorState` | Error state with retry |
| `statusColorMap` | Shared MUI color mapping per status |
| `copy.t('shared.session.queuedMessage')` | Friendly pending message |
| `copy.t('shared.session.newGeneration')` | "Nuova generazione" CTA label |

## Sources

- [[API Client + SSE Client]] — `useSession` hook with loading/error states
- [[Frontend Architecture]] — Route table entry
- [[UI Component Map]] — Shared components (LoadingSkeleton, ErrorState, CompletionBanner)
- [[Session Machine (XState v5)]] — SSE events consumed by useSession
- [[Session]] — Session aggregate root with lifecycle states
- [[Tool UX Architecture]] — 2026-08-08 simplification: redirect from ToolPage to SessionPage