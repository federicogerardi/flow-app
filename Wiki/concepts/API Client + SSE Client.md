---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 0
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

```typescript
// apps/frontend/src/api/sse-client.ts

import type { SSEEvent } from '@flow-app/contracts';

class SSEClient {
  private source: EventSource | null = null;

  connect(
    sessionId: string,
    handlers: {
      onStarted?:    (data: SSEEvent & { event: 'session_started' }) => void;
      onStep?:       (data: SSEEvent & { event: 'step_completed' }) => void;
      onCompleted?:  (data: SSEEvent & { event: 'session_completed' }) => void;
      onFailed?:     (data: SSEEvent & { event: 'session_failed' }) => void;
      onError?:      (error: Event) => void;
    }
  ): void {
    this.disconnect();

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
    });

    source.addEventListener('session_failed', (e: MessageEvent) => {
      handlers.onFailed?.(JSON.parse(e.data));
      source.close();
    });

    source.onerror = (e) => {
      handlers.onError?.(e);
      source.close();
    };

    this.source = source;
  }

  disconnect(): void {
    this.source?.close();
    this.source = null;
  }
}

export const sseClient = new SSEClient();
```

## React Hooks

```typescript
// apps/frontend/src/api/hooks.ts

import { useState, useEffect, useCallback } from 'react';
import { api, sseClient } from './client';

// Hook for a single session with SSE progress
function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDetailDTO | null>(null);
  const [progress, setProgress] = useState<StepProgress | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Initial load
    api.getSession(sessionId).then(setSession);

    // SSE for real-time updates
    sseClient.connect(sessionId, {
      onStep: (data) => setProgress(data.data.progress),
      onCompleted: () => api.getSession(sessionId).then(setSession),
      onFailed: () => api.getSession(sessionId).then(setSession),
    });

    return () => sseClient.disconnect();
  }, [sessionId]);

  return { session, progress };
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

## Sources

- [[API Routes]] — all endpoint definitions
- [[Contracts Package]] — shared type definitions
- [[ToolPage Machine (XState v5)]] — SSE consumption in state machine
- [[Database Schema]] — resource shapes match table schemas