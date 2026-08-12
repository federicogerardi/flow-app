import { useState, useEffect } from 'react';
import { api } from './client.js';
import type { SessionDTO, WorkspaceDTO } from './client.js';
import type { SessionListItemDTO } from '@flow-app/contracts';
import { sseClient } from './sse-client.js';

interface StepProgress {
  current: number;
  total: number;
  label?: string;
}

interface StepArtifact {
  stepNumber: number;
  content: string;
}

export type LiveSession = SessionListItemDTO & {
  currentStepIndex?: number;
  currentStepLabel?: string;
  elapsedSeconds?: number;
  lastArtifactPreview?: string;
  errorMessage?: string;
};

export function useSession(sessionId: string | null) {
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
    api.getSession(sessionId)
      .then((session) => {
        setSession(session);
        if (session.artifacts?.length) {
          setStepArtifacts(
            session.artifacts.map((a) => ({
              stepNumber: a.stepNumber,
              content: a.content,
            })),
          );
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));

    const unsubscribe = sseClient.connect(sessionId, {
      onStarted: (data) => {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'running',
            startedAt: data.startedAt as string,
          };
        });
      },
      onStep: (data) => {
        setProgress(data.progress as StepProgress);
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

/**
 * Hook for live session tracking with SSE + API catch-up.
 * Subscribes to SSE events for real-time updates, with API fallback for cross-tab resilience.
 */
export function useLiveSession(sessionId: string | null) {
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  // API catch-up on mount
  useEffect(() => {
    if (!sessionId) {
      setLiveSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getSession(sessionId)
      .then((session) => {
        setLiveSession({
          id: session.id,
          toolKey: session.toolKey,
          workspaceId: session.workspaceId,
          status: session.status,
          stepCount: session.stepCount,
          createdAt: session.createdAt,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // SSE subscription for live updates
    const unsubscribe = sseClient.connect(sessionId, {
      onStarted: () => {
        setLiveSession((prev) => {
          if (!prev) return prev;
          return { ...prev, status: 'running' };
        });
      },
      onStep: (data) => {
        const progress = data.progress as StepProgress;
        setLiveSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            currentStepIndex: progress.current,
            currentStepLabel: data.stepLabel as string | undefined,
            lastArtifactPreview: (data.artifact as Record<string, unknown>)?.content
              ? String((data.artifact as Record<string, unknown>).content).slice(0, 150)
              : prev.lastArtifactPreview,
          };
        });
      },
      onCompleted: () => {
        // Fetch final state from API
        api.getSession(sessionId).then((session) => {
          setLiveSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: session.status,
              completedAt: session.completedAt ?? undefined,
            };
          });
        });
      },
      onFailed: () => {
        api.getSession(sessionId).then((session) => {
          setLiveSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: session.status,
              errorMessage: 'Session failed',
            };
          });
        });
      },
    });

    return unsubscribe;
  }, [sessionId]);

  return { liveSession, loading };
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
