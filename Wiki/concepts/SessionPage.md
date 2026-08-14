---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/generation
date_updated: 2026-08-15
source_count: 5
confidence: high
---

# SessionPage

> Full-page session detail component — **standalone deep-link route** (thin wrapper around `SessionTracker`)  
> `apps/frontend/src/pages/SessionPage.tsx`

## Route

```
/workspaces/:workspaceId/sessions/:sessionId
```

Mounted in `App.tsx` with `<ErrorBoundary>` wrapper. Route parameters: `workspaceId`, `sessionId`.

**2026-08-13 (inline generation)**: `SessionTracker` is now the **single canonical component** for session lifecycle rendering, consumed by both the tool page (inline, via `InlineSessionTracker`) and `SessionPage` (standalone deep-link route). `SessionPage` is a thin ~64-line wrapper: it handles page chrome (`PageHeader`, loading/error guards, replay banner from `?replayed=true` search param) and delegates all session rendering to `SessionTracker`. The tool page no longer redirects here after submission — it renders the session inline.

**2026-08-08 (replay detection)**: When the redirect includes `?replayed=true` (idempotency hit — same inputs as a previous generation), a banner alerts the user that this is a previously completed result and suggests modifying inputs for a fresh generation.

**2026-08-11 (G2)**: SessionPage now extracts `stepArtifacts` from `useSession` and passes mapped artifact content to `FeedbackPanel` for live output previews during generation (see [[log#2026-08-11 fix G1-G4 generation SSE & DTO remediation|log]]).

## Component Structure

`SessionPage` is a thin page-chrome wrapper:
```
SessionPage (~64 lines)
├── PageHeader: "Session: {toolName}"
├── LoadingSkeleton / ErrorState (guard)
└── SessionTracker (shared component — owns all session lifecycle rendering)
    ├── Replay banner (Alert — now in SessionTracker)
    ├── Reconnecting banner (Alert — transient SSE loss)
    ├── Status header: chip + metadata + cancel button
    ├── GenerationSlot: FeedbackPanel → CompletionBanner | SessionSummary | ErrorState
    └── Terminal CTA row: "Nuova generazione" + "Back to workspace"
```

> **Pre-2026-08-13**: SessionPage had its own inline `GenerationSlot` + cancel/terminal rendering (~140 lines). Post-unification, these are owned by `SessionTracker` (shared with the tool page's inline flow).

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

> **2026-08-13**: The behaviors below (duration, cancel, artifacts, terminal CTAs) are now implemented by `SessionTracker` — a shared component consumed by both `SessionPage` (this route) and the tool page's inline flow (`InlineSessionTracker`). `SessionPage` delegates all session lifecycle rendering to `SessionTracker` and only owns page-level chrome (header, breadcrumbs, loading/error guards).

### Duration Calculation (in SessionTracker)

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
| `useSession(sessionId)` | Fetches session + subscribes to SSE + returns `stepArtifacts`, `reconnecting` |
| `useBreadcrumbs()` | Sets page breadcrumbs |
| `SessionTracker` | Shared component — canonical owner of all session lifecycle rendering (shared with tool page inline flow) |
| `LoadingSkeleton` | Loading state |
| `ErrorState` | Error state with retry |
| `useSearchParams()` | Reads `?replayed=true` from URL |

## Sources

- [[API Client + SSE Client]] — `useSession` hook with loading/error/reconnecting states
- [[Frontend Architecture]] — Route table entry
- [[UI Component Map]] — Shared components (LoadingSkeleton, ErrorState, SessionTracker)
- [[Session Machine (XState v5)]] — SSE events consumed by useSession
- [[Session]] — Session aggregate root with lifecycle states
- [[Tool UX Architecture]] — Inline generation flow; SessionPage as deep-link route
- [[synthesis/fe-generation-unification-plan-2026-08-13]] — ✅ 2026-08-13: SessionPage simplified to thin wrapper delegating to SessionTracker
- [[synthesis/generation-sse-wiring-remediation-2026-08-12]] — 2026-08-12 unified remediation: H1 startedAt timer, H2 REST seed, M1 shared utility