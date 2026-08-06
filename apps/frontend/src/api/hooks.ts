import { useState, useEffect } from 'react';
import { api } from './client.js';
import type { SessionDTO, WorkspaceDTO } from './client.js';
import { sseClient } from './sse-client.js';

interface StepProgress {
  current: number;
  total: number;
}

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [progress, setProgress] = useState<StepProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    api.getSession(sessionId)
      .then(setSession)
      .catch(setError)
      .finally(() => setLoading(false));

    const unsubscribe = sseClient.connect(sessionId, {
      onStep: (data) => setProgress(data.progress as StepProgress),
      onCompleted: () => api.getSession(sessionId).then(setSession),
      onFailed: () => api.getSession(sessionId).then(setSession),
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, progress, loading, error };
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listWorkspaces()
      .then((data) => setWorkspaces(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return { workspaces, loading };
}
