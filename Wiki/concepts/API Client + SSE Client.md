---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/infrastructure
date_updated: 2026-08-13
source_count: 5
confidence: high
---

# API Client + SSE Client

> Frontend HTTP and SSE client  
> `apps/frontend/src/api/`

## HTTP Client

A thin wrapper around `fetch` with auth headers, error handling, and typed responses from `@flow-app/contracts`.

```typescript
// apps/frontend/src/api/client.ts

import type { ApiError } from '@flow-app/contracts';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl; // same-origin in Railway (proxy server.mjs)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.getAuthHeaders()),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // cookies for JWT httpOnly
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(
        error.error?.code ?? 'UNKNOWN',
        error.error?.message ?? 'Request failed',
        response.status,
        error.error?.details,
      );
    }

    if (response.status === 204) {
      return undefined as T; // No Content
    }

    return response.json();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = getAccessToken(); // from memory or localStorage
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Generation
  async startSession(toolKey: string, body: StartSessionRequest): Promise<StartSessionResponse> {
    return this.request('POST', `/api/tools/${toolKey}/sessions`, body);
  }

  async getSession(sessionId: string): Promise<SessionDetailDTO> {
    return this.request('GET', `/api/sessions/${sessionId}`);
  }

  async listSessions(params?: { workspaceId?: string; status?: string; limit?: number }): Promise<PaginatedResponse<SessionListItemDTO>> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request('GET', `/api/sessions?${query}`);
  }

  async cancelSession(sessionId: string): Promise<void> {
    return this.request('POST', `/api/sessions/${sessionId}/cancel`);
  }

  // Artifacts
  async getArtifact(artifactId: string): Promise<ArtifactDTO> {
    return this.request('GET', `/api/artifacts/${artifactId}`);
  }

  async downloadArtifact(artifactId: string, format: 'md' | 'txt' | 'docx' | 'pdf' = 'md'): Promise<Blob> {
    const response = await fetch(`/api/artifacts/${artifactId}/download?format=${format}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new ApiClientError('DOWNLOAD_FAILED', 'Download failed', response.status);
    return response.blob();
  }

  // Workspaces
  async listWorkspaces(): Promise<PaginatedResponse<WorkspaceListItemDTO>> {
    return this.request('GET', '/api/workspaces');
  }

  async createWorkspace(name: string): Promise<WorkspaceListItemDTO> {
    return this.request('POST', '/api/workspaces', { name });
  }

  async getWorkspace(id: string): Promise<WorkspaceDTO> {
    return this.request('GET', `/api/workspaces/${id}`);
  }

  // Assets
  async listAssets(workspaceId: string): Promise<PaginatedResponse<AssetListItemDTO>> {
    return this.request('GET', `/api/workspaces/${workspaceId}/assets`);
  }

  async createAsset(workspaceId: string, data: FormData): Promise<AssetListItemDTO> {
    const response = await fetch(`/api/workspaces/${workspaceId}/assets`, {
      method: 'POST',
      body: data,
      credentials: 'include',
    });
    if (!response.ok) throw new ApiClientError('ASSET_CREATE_FAILED', 'Failed to create asset', response.status);
    return response.json();
  }

  async deleteAsset(workspaceId: string, assetId: string): Promise<void> {
    return this.request('DELETE', `/api/workspaces/${workspaceId}/assets/${assetId}`);
  }
}

class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const api = new ApiClient();
```

## SSE Client

Wraps `EventSource` with typed events from `@flow-app/contracts`.

**Scalability contract**: the client must support multiple concurrent live sessions in the same tab. A singleton `EventSource` is not sufficient.

```typescript
// apps/frontend/src/api/sse-client.ts

import type { SSEEvent } from '@flow-app/contracts';

class SSEClient {
  private sources = new Map<string, EventSource>();

  connect(
    sessionId: string,
    handlers: {
      onStarted?:    (data: SSEEvent & { event: 'session_started' }) => void;
      onStep?:       (data: SSEEvent & { event: 'step_completed' }) => void;
      onCompleted?:  (data: SSEEvent & { event: 'session_completed' }) => void;
      onFailed?:     (data: SSEEvent & { event: 'session_failed' }) => void;
      onError?:      (error: Event) => void;
    },
  ): () => void {
    this.disconnect(sessionId);

    const source = new EventSource(`/api/sessions/${sessionId}/events`, {
      withCredentials: true,
    });

    source.addEventListener('session_started', (e: MessageEvent) => {
      handlers.onStarted?.(JSON.parse(e.data));
    });

    source.addEventListener('step_completed', (e: MessageEvent) => {
      handlers.onStep?.(JSON.parse(e.data));
    });

    source.addEventListener('session_completed', (e: MessageEvent) => {
      handlers.onCompleted?.(JSON.parse(e.data));
      source.close();
      this.sources.delete(sessionId);
    });

    source.addEventListener('session_failed', (e: MessageEvent) => {
      handlers.onFailed?.(JSON.parse(e.data));
      source.close();
      this.sources.delete(sessionId);
    });

    source.onerror = (e) => {
      handlers.onError?.(e);
      source.close();
      this.sources.delete(sessionId);
    };

    this.sources.set(sessionId, source);
    return () => this.disconnect(sessionId);
  }

  disconnect(sessionId?: string): void {
    if (sessionId) {
      const source = this.sources.get(sessionId);
      source?.close();
      this.sources.delete(sessionId);
      return;
    }

    for (const source of this.sources.values()) {
      source.close();
    }
    this.sources.clear();
  }
}

export const sseClient = new SSEClient();
```

## React Hooks

### `useSession` — SessionPage detail hook

Fetches session detail + subscribes to SSE for live progress. **2026-08-11 (G2 remediation)**: now extracts `artifact.content` from SSE `step_completed` events into a `stepArtifacts` array, enabling live output previews in `FeedbackPanel` during generation.

```typescript
// apps/frontend/src/api/hooks.ts

import { useState, useEffect, useCallback } from 'react';
import { api } from './client';
import { sseClient } from './sse-client';

interface StepArtifact {
  stepNumber: number;
  content: string;
}

// Hook for a single session with SSE progress + live artifact previews
function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [progress, setProgress] = useState<StepProgress | null>(null);
  const [stepArtifacts, setStepArtifacts] = useState<StepArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    setStepArtifacts([]);

    // Initial load (with error handling)
    api.getSession(sessionId)
      .then(setSession)
      .catch(setError)
      .finally(() => setLoading(false));

    // SSE for real-time updates
    const unsubscribe = sseClient.connect(sessionId, {
      onStep: (data) => {
        setProgress(data.progress as StepProgress);
        // Extract artifact content for live previews in FeedbackPanel (G2)
        const artifact = data.artifact as Record<string, unknown> | null;
        if (artifact?.stepNumber != null && artifact?.content) {
          setStepArtifacts((prev) => {
            const sn = artifact.stepNumber as number;
            const content = String(artifact.content);
            const existing = prev.findIndex((a) => a.stepNumber === sn);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { stepNumber: sn, content };
              return updated;
            }
            return [...prev, { stepNumber: sn, content }];
          });
        }
      },
      onCompleted: () => api.getSession(sessionId).then(setSession),
      onFailed: () => api.getSession(sessionId).then(setSession),
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, progress, stepArtifacts, loading, error };
}
```

### `useLiveSession` — SessionList card hook

Hook for live session tracking in the workspace session list. Subscribes to SSE for real-time step/progress/artifact updates, with API catch-up for cross-tab resilience.

```typescript
function useLiveSession(sessionId: string | null): { liveSession: LiveSession | null; loading: boolean } {
  // API catch-up on mount (cross-tab resilience)
  // SSE subscription: onStep → updates currentStepIndex, currentStepLabel, lastArtifactPreview
  //                  onCompleted/onFailed → re-fetch from API
}

// Hook for workspace listing
function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listWorkspaces()
      .then((res) => setWorkspaces(res.data))
      .finally(() => setLoading(false));
  }, []);

  const create = useCallback(async (name: string) => {
    const ws = await api.createWorkspace(name);
    setWorkspaces((prev) => [...prev, ws]);
  }, []);

  return { workspaces, loading, create };
}
```

## Resilience Hardening (2026-08-13)

Network instability between the browser and Railway exposed three failure modes that produced a spurious "Generazione fallita" (`errors.generation.failed`) despite the backend completing cleanly. All three are fixed:

1. **`SSEClient` reconnect + `onGiveUp`** — the client retries with exponential backoff (base 1s, cap 30s, max 5). A new `onGiveUp` callback fires when retries are exhausted instead of failing silently. `onError` is now wired in `useSession` to drive a `reconnecting` flag.
2. **Terminal payload fallback** — `useSession`/`useLiveSession` now set `status`/`completedAt`/`failed` **optimistically from the SSE event payload** (`session_completed` carries `status: 'completed'` + `completedAt`; `session_failed` carries `status: 'failed'` + `error`), then refetch with `.catch(() => {})`. A flaky refetch can no longer leave the UI stuck in `running` or drop into a transient error state.
3. **`reconnecting` UI** — `useSession` returns a `reconnecting` boolean (`true` on SSE `onerror`, cleared on any successful event, cleared on `onGiveUp`). `SessionTracker` renders a `role="status"` warning banner (`toolPage.progress.reconnecting`) when live.

Backend companion fix (cross-session event leak): `apps/backend/src/infrastructure/job-event-bridge.ts` `subscribe()` now checks `ch === channel` before dispatching — the old handler ignored the channel argument, so a `session_failed` from session A could reach session B's SSE stream. See [[log]].

## Sources

- [[API Routes]] — all endpoint definitions
- [[Contracts Package]] — shared type definitions
- [[ToolPage Machine (XState v5)]] — SSE consumption in state machine
- [[Database Schema]] — resource shapes match table schemas
- [[log]] — 2026-08-13 SSE resilience hardening entry
