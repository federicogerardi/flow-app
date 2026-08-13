import { useState, useEffect } from 'react';
import { api } from './client.js';
import type { SessionDTO, WorkspaceDTO } from './client.js';
import type { SessionListItemDTO } from '@flow-app/contracts';
import { sseClient } from './sse-client.js';

export interface StepProgress {
  /** Count of completed steps (0 = none). The step at index === completedCount is "awaiting execution". */
  completedCount: number;
  total: number;
}

export interface StepArtifact {
  stepNumber: number;
  content: string;
}

export function useSession(sessionId: string | null, initialData?: SessionDTO) {
  const [session, setSession] = useState<SessionDTO | null>(initialData ?? null);
  const [progress, setProgress] = useState<StepProgress | null>(null);
  const [stepArtifacts, setStepArtifacts] = useState<StepArtifact[]>([]);
  const [loading, setLoading] = useState(initialData == null);
  const [error, setError] = useState<Error | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    setStepArtifacts([]);
    api.getSession(sessionId)
      .then((session) => {
        setSession(session);
        // Merge rather than replace: the SSE subscription may have already
        // advanced progress past this REST snapshot. Only apply the snapshot's
        // artifacts count if it is AHEAD of the current live progress, and
        // upsert artifacts by stepNumber so fresh SSE data is never clobbered.
        const remotefacts = session.artifacts;
        if (remotefacts?.length) {
          setProgress((prev) => {
            const incoming = remotefacts.length;
            if (!prev || incoming > prev.completedCount) {
              return { completedCount: incoming, total: session.stepCount };
            }
            return prev;
          });
          setStepArtifacts((prev) => {
            const next = [...prev];
            for (const a of remotefacts) {
              const idx = next.findIndex((x) => x.stepNumber === a.stepNumber);
              if (idx >= 0) next[idx] = { stepNumber: a.stepNumber, content: a.content };
              else next.push({ stepNumber: a.stepNumber, content: a.content });
            }
            return next;
          });
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));

    const unsubscribe = sseClient.connect(sessionId, {
      onStarted: (data) => {
        setReconnecting(false);
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
        setReconnecting(false);
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
      onCompleted: (data) => {
        setReconnecting(false);
        // Optimistically mark terminal from the SSE payload so a flaky
        // refetch cannot leave the UI stuck in "running".
        setSession((prev) =>
          prev ? { ...prev, status: 'completed', completedAt: data.completedAt as string } : prev,
        );
        api.getSession(sessionId).then(setSession).catch(() => {});
      },
      onFailed: () => {
        setReconnecting(false);
        setSession((prev) => (prev ? { ...prev, status: 'failed' } : prev));
        api.getSession(sessionId).then(setSession).catch(() => {});
      },
      onError: () => setReconnecting(true),
      onGiveUp: () => setReconnecting(false),
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, progress, stepArtifacts, loading, error, reconnecting };
}

/**
 * Hook for live session tracking with SSE + API catch-up.
 * Subscribes to SSE events for real-time updates, with API fallback for cross-tab resilience.
 */
export function useLiveSession(sessionId: string | null) {
  const [liveSession, setLiveSession] = useState<SessionListItemDTO | null>(null);
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
          currentStepIndex: session.currentStepIndex,
          completedAt: session.completedAt ?? undefined,
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
            currentStepIndex: progress.completedCount,
            currentStepLabel: data.stepLabel as string | undefined,
            lastArtifactPreview: (data.artifact as Record<string, unknown>)?.content
              ? String((data.artifact as Record<string, unknown>).content).slice(0, 150)
              : prev.lastArtifactPreview,
          };
        });
      },
      onCompleted: (data) => {
        setLiveSession((prev) => (prev ? { ...prev, status: 'completed', completedAt: data.completedAt as string } : prev));
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
        }).catch(() => {});
      },
      onFailed: () => {
        setLiveSession((prev) => (prev ? { ...prev, status: 'failed' } : prev));
        api.getSession(sessionId).then((session) => {
          setLiveSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: session.status,
              errorMessage: 'Session failed',
            };
          });
        }).catch(() => {});
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
