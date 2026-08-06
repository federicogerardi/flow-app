---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/generation
date_updated: 2026-08-06
source_count: 5
confidence: high
---

# SessionPage

> Full-page session detail component  
> `apps/frontend/src/pages/SessionPage.tsx`

## Route

```
/workspaces/:workspaceId/sessions/:sessionId
```

Mounted in `App.tsx` with `<ErrorBoundary>` wrapper. Route parameters: `workspaceId`, `sessionId`.

## Component Structure

```
SessionPage
├── PageHeader: "Session: {toolName}"
├── Alert (interrupted sessions: queued/draft/ready)
├── Card: Status + Metadata
│   ├── Status chip (color-coded via statusColorMap)
│   ├── Cancel button (running only)
│   ├── Steps count
│   ├── Duration (startedAt → completedAt)
│   ├── Created date
│   ├── FeedbackPanel (running: progress bar + step label)
│   └── ErrorState (failed: error message + retry CTA)
├── CompletionBanner (completed only)
└── SessionSummary (completed: artifact list + download)
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

### Cancel

Only visible when `status === 'running'`. Calls `api.cancelSession(sessionId)`. Button disabled while cancelling (local `cancelling` state).

### Interrupted State

Sessions in `queued`, `draft`, or `ready` status show an `Alert` with a link back to the tool page for retry.

### Breadcrumbs

Set via `useBreadcrumbs()` in an effect:
- Home → `/workspaces/{workspaceId}`
- Sessions → `/workspaces/{workspaceId}/sessions`
- Session: `{toolKey}` (or "Session" if null)

### Artifacts

On `completed` status, renders:
1. `CompletionBanner` — summary with duration, step count, credit cost
2. `SessionSummary` — scrollable artifact list with ReactMarkdown rendering and download/promote actions

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

## Sources

- [[API Client + SSE Client]] — `useSession` hook with loading/error states
- [[Frontend Architecture]] — Route table entry
- [[UI Component Map]] — Shared components (LoadingSkeleton, ErrorState, CompletionBanner)
- [[Session Machine (XState v5)]] — SSE events consumed by useSession
- [[Session]] — Session aggregate root with lifecycle states
