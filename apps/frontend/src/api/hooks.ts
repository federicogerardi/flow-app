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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    api.getSession(sessionId).then(setSession).finally(() => setLoading(false));

    const unsubscribe = sseClient.connect(sessionId, {
      onStep: (data) => setProgress(data.progress as StepProgress),
      onCompleted: () => api.getSession(sessionId).then(setSession),
      onFailed: () => api.getSession(sessionId).then(setSession),
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, progress, loading };
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
