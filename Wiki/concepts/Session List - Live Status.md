---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Session List — Live Status

> Cross-tab resilient session tracking: queued, running, completed, failed  
> `apps/frontend/src/components/workspace/SessionList.tsx`

## Principle

Sessions are not tied to a tab. The user can start 3 generations, close the browser, reopen and see the exact state of each one. The `SessionList` is the central point of visibility for everything happening in the workspace.

```
                     ┌─────────────────────────┐
  POST /sessions ───▶│      SessionList        │
                     │                         │
  Tab closed ───────▶│  ◐ Blog Post · Step 2/3 │ ← SSE reconnect
                     │  ⌛ Landing · Queued     │ ← SSE connect
  Tab reopened ─────▶│  ✅ Video · Completed    │
                     └─────────────────────────┘
```

---

## API

### `GET /api/sessions?workspaceId=X&status=Y`

Existing endpoint in [[API Routes]]. `SessionList` calls it with different filters per tab.

```typescript
// Called on mount and every 30s (poll fallback when SSE disconnects)
const { data: queued }    = api.listSessions({ workspaceId, status: 'queued' });
const { data: running }   = api.listSessions({ workspaceId, status: 'running' });
const { data: completed } = api.listSessions({ workspaceId, status: 'completed', limit: 20 });
const { data: failed }    = api.listSessions({ workspaceId, status: 'failed', limit: 20 });
```

### Backend: add `queued` status

```sql
-- Migration: extend session_status enum
ALTER TYPE session_status ADD VALUE 'queued';
```

A `Session` is `queued` when:
- `StartSessionUseCase` created the Session and enqueued it in BullMQ
- The worker has not picked it up yet

Transition: `queued → running` (when the worker starts processing).

---

## Component

```tsx
// apps/frontend/src/components/workspace/SessionList.tsx

import { useState, useEffect, useCallback } from 'react';
import { Tabs, Tab, Stack, Badge } from '@mui/material';
import { api } from '../../api/client';

type TabKey = 'inProgress' | 'completed' | 'failed';

function SessionList({ workspaceId }: { workspaceId: string }) {
  const [tab, setTab] = useState<TabKey>('inProgress');
  const [sessions, setSessions] = useState<Record<TabKey, SessionListItemDTO[]>>({
    inProgress: [], completed: [], failed: [],
  });

  // Initial load + periodic refresh
  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30_000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  async function loadSessions() {
    const [queued, running, completed, failed] = await Promise.all([
      api.listSessions({ workspaceId, status: 'queued' }),
      api.listSessions({ workspaceId, status: 'running' }),
      api.listSessions({ workspaceId, status: 'completed', limit: 20 }),
      api.listSessions({ workspaceId, status: 'failed', limit: 20 }),
    ]);

    setSessions({
      inProgress: [...queued.data, ...running.data],
      completed:  completed.data,
      failed:     failed.data,
    });
  }

  const inProgressCount = sessions.inProgress.length;

  return (
    <Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab
          label={
            <Badge badgeContent={inProgressCount} color="primary" invisible={inProgressCount === 0}>
              In progress
            </Badge>
          }
          value="inProgress"
        />
        <Tab label={`Completed (${sessions.completed.length})`} value="completed" />
        <Tab label={`Failed (${sessions.failed.length})`} value="failed" />
      </Tabs>

      <Stack spacing={1} mt={2}>
        {sessions[tab].map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
        {sessions[tab].length === 0 && (
          <EmptyState message={emptyMessages[tab]} />
        )}
      </Stack>
    </Stack>
  );
}
```

---

## SessionCard — Live States

```tsx
function SessionCard({ session }: { session: SessionListItemDTO }) {
  // SSE subscription for running/queued sessions
  const { liveSession } = useLiveSession(
    session.status === 'running' || session.status === 'queued'
      ? session.id
      : null
  );

  const display = liveSession ?? session;

  switch (display.status) {
    case 'queued':
      return <QueuedCard session={display} />;
    case 'running':
      return <RunningCard session={display} />;
    case 'completed':
      return <CompletedCard session={display} />;
    case 'failed':
      return <FailedCard session={display} />;
    default:
      return null;
  }
}
```

### Queued Card

```tsx
function QueuedCard({ session }: { session: SessionListItemDTO }) {
  return (
    <Card sx={{ opacity: 0.7 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack>
            <Typography variant="subtitle1">{toolLabel(session.toolKey)}</Typography>
            <Typography variant="body2" color="text.secondary">
              ⌛ Waiting — Queue position: {session.queuePosition ?? '...'}
            </Typography>
          </Stack>
          <Button size="small" color="error" onClick={() => cancelSession(session.id)}>
            Cancel
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Running Card

```tsx
function RunningCard({ session }: { session: LiveSession }) {
  const tool = toolRegistry[session.toolKey];
  const currentStep = session.currentStepIndex ?? 0;
  const totalSteps = tool?.steps.length ?? session.stepCount;
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <Card sx={{ borderLeft: '3px solid', borderColor: 'primary.main' }}>
      <CardContent>
        <Stack spacing={1}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">
              {toolLabel(session.toolKey)}
            </Typography>
            <Chip label="◐ Running" size="small" color="primary" variant="outlined" />
          </Stack>

          {/* Progress */}
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary">
            Step {currentStep}/{totalSteps}
            {session.currentStepLabel && ` · ${session.currentStepLabel}`}
            {session.elapsedSeconds && ` · ${formatElapsed(session.elapsedSeconds)}`}
          </Typography>

          {/* Last completed artifact preview */}
          {session.lastArtifactPreview && (
            <Typography variant="body2" sx={{
              maxHeight: 60, overflow: 'hidden',
              color: 'text.secondary', fontStyle: 'italic',
            }}>
              "{session.lastArtifactPreview.slice(0, 150)}..."
            </Typography>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => navigateToTool(session)}>
              View progress
            </Button>
            <Button size="small" color="error" onClick={() => cancelSession(session.id)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Completed Card

```tsx
function CompletedCard({ session }: { session: SessionListItemDTO }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{toolLabel(session.toolKey)}</Typography>
            <Typography variant="body2" color="text.secondary">
              ✅ Completed · {session.stepCount} steps
              {session.durationSeconds && ` · ${formatElapsed(session.durationSeconds)}`}
            </Typography>

            {/* Artifact preview */}
            {session.lastArtifactPreview && (
              <Typography variant="body2" sx={{
                mt: 1, maxHeight: 60, overflow: 'hidden',
                color: 'text.secondary', fontStyle: 'italic',
              }}>
                "{session.lastArtifactPreview.slice(0, 150)}..."
              </Typography>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {formatDate(session.completedAt)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} mt={1}>
          <Button size="small" variant="outlined" onClick={() => viewSession(session.id)}>
            View
          </Button>
          <Button size="small" variant="outlined" onClick={() => downloadArtifact(session.lastArtifactId!, 'docx')}>
            Download
          </Button>
          {session.isPromotable && (
            <Button size="small" variant="outlined" color="secondary" onClick={() => promoteToAsset(session)}>
              Promote to Asset
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Failed Card

```tsx
function FailedCard({ session }: { session: SessionListItemDTO }) {
  return (
    <Card sx={{ borderLeft: '3px solid', borderColor: 'error.main' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack>
            <Typography variant="subtitle1">{toolLabel(session.toolKey)}</Typography>
            <Typography variant="body2" color="error">
              ❌ {session.errorMessage ?? 'Generation failed'}
              {session.failedAtStep && ` · Step ${session.failedAtStep}`}
            </Typography>
          </Stack>
          <Button size="small" variant="outlined" color="error" onClick={() => retrySession(session)}>
            Retry
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

---

## Cross-Tab Resilience — `useLiveSession`

```typescript
// apps/frontend/src/api/hooks.ts

function useLiveSession(sessionId: string | null): { liveSession: LiveSession | null } {
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLiveSession(null);
      return;
    }

    // 1. Load current state from API (catch up after tab reopen)
    api.getSession(sessionId).then(setLiveSession);

    // 2. Subscribe to SSE for live updates
    sseClient.connect(sessionId, {
      onStep: (data) => {
        setLiveSession(prev => prev ? {
          ...prev,
          status: 'running',
          currentStepIndex: data.data.progress.current,
          currentStepLabel: data.data.stepLabel,
          lastArtifactPreview: data.data.artifactPreview,
        } : null);
      },
      onCompleted: () => {
        api.getSession(sessionId).then(session => {
          setLiveSession({ ...session, status: 'completed' });
        });
      },
      onFailed: (data) => {
        setLiveSession(prev => prev ? {
          ...prev,
          status: 'failed',
          errorMessage: data.data.error.message,
        } : null);
      },
    });

    return () => sseClient.disconnect();
  }, [sessionId]);

  return { liveSession };
}

type LiveSession = SessionListItemDTO & {
  currentStepIndex?: number;
  currentStepLabel?: string;
  elapsedSeconds?: number;
  lastArtifactPreview?: string;
  errorMessage?: string;
};
```

---

## Poll Fallback

If SSE is unavailable (network issue, browser doesn't support EventSource), `SessionList` polls every 30 seconds:

```typescript
// Already in the SessionList useEffect:
const interval = setInterval(loadSessions, 30_000);
```

This ensures that even without SSE, the user sees the updated state within 30 seconds.

---

## Backend Changes

### Add `queued` to `SessionStatus`

```typescript
// packages/domain/src/generation/value-objects/SessionStatus.ts

type SessionStatus = 'queued' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
```

Updated lifecycle: `queued → running → completed`. The `Session` is `queued` after `StartSessionUseCase` and before the BullMQ worker picks it up.

### Extend `SessionListItemDTO`

```typescript
// packages/contracts/src/generation/session.dto.ts

interface SessionListItemDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: 'queued' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
  stepCount: number;
  currentStepIndex?: number;        // only when running
  currentStepLabel?: string;        // only when running
  queuePosition?: number;           // only when queued
  lastArtifactId?: string;          // for download
  lastArtifactPreview?: string;     // first 150 chars
  elapsedSeconds?: number;          // running sessions
  durationSeconds?: number;         // completed sessions
  errorMessage?: string;            // failed sessions
  failedAtStep?: number;            // failed sessions
  isPromotable?: boolean;           // tool.produces !== undefined
  createdAt: string;
  completedAt?: string;
}
```

### Queue Position

```typescript
// apps/backend/src/routes/generation.ts

router.get('/api/sessions', async (req, res) => {
  const sessions = await sessionRepo.findByWorkspace(req.query.workspaceId, {
    status: req.query.status,
    limit: req.query.limit ?? 20,
  });

  // Enrich running/queued sessions with live data
  const enriched = await Promise.all(sessions.map(async (s) => {
    if (s.status === 'queued') {
      const position = await sessionQueue.getJob(s.id);
      return { ...toDTO(s), queuePosition: position ? await sessionQueue.getWaitingCount() : null };
    }
    return toDTO(s);
  }));

  res.json({ data: enriched, total: sessions.length });
});
```

---

## Updated Component Inventory

`SessionList` joins the workspace components (now 4, was 3):

```
workspace/
├── WorkspaceCard.tsx
├── WorkspaceForm.tsx
├── AssetList.tsx
└── SessionList.tsx        ← NEW
```

The `SessionList` replaces the static "Recent Sessions" section in the `WorkspaceDashboard`.

---

## Sources

- [[API Routes]] — `GET /api/sessions` endpoint
- [[Frontend Architecture]] — WorkspaceDashboard layout
- [[Session Machine (XState v5)]] — Session lifecycle
- [[ToolPage Machine (XState v5)]] — Tool page SSE integration
- [[sources/USER-STORIES]] — US-W03 (session history), US-GF01-04 (workflow)