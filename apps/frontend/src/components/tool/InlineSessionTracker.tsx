import { useSession } from '../../api/hooks';
import { SessionTracker } from './SessionTracker';
import type { SessionDTO } from '../../api/client';

interface InlineSessionTrackerProps {
  sessionId: string;
  initialSession: SessionDTO;
  workspaceId: string;
  produces?: string;
  onReset: () => void;
}

/**
 * Thin wrapper around SessionTracker for the tool-page inline flow.
 * Owns the `useSession` hook call (with `initialSession` seed to avoid a
 * post-submit loading flash); delegates all session-lifecycle rendering
 * to SessionTracker.
 */
export function InlineSessionTracker({
  sessionId,
  initialSession,
  workspaceId,
  produces,
  onReset,
}: InlineSessionTrackerProps) {
  const { session, progress, stepArtifacts, loading, error } = useSession(sessionId, initialSession);

  return (
    <SessionTracker
      session={session}
      progress={progress}
      stepArtifacts={stepArtifacts}
      loading={loading}
      error={error}
      workspaceId={workspaceId}
      produces={produces}
      onReset={onReset}
    />
  );
}