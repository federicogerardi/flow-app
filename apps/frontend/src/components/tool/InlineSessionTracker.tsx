import { Box, Button } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../api/hooks';
import { api } from '../../api/client';
import { GenerationSlot } from './GenerationSlot';
import { copy } from '@flow-app/copy';
import type { SessionDTO } from '../../api/client';

interface InlineSessionTrackerProps {
  sessionId: string;
  initialSession: SessionDTO;
  workspaceId: string;
  produces?: string;
  toolKey: string;
  onReset: () => void;
}

export function InlineSessionTracker({
  sessionId,
  initialSession,
  workspaceId,
  produces,
  toolKey: _toolKey,
  onReset,
}: InlineSessionTrackerProps) {
  const navigate = useNavigate();
  const { session, progress, stepArtifacts } = useSession(sessionId, initialSession);
  const [cancelling, setCancelling] = useState(false);

  if (!session) return null;

  const isRunning = session.status === 'running';
  const isCompleted = session.status === 'completed';
  const isFailed = session.status === 'failed';
  const isTerminal = isCompleted || isFailed || session.status === 'cancelled';

  const durationMs = session.startedAt && session.completedAt
    ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
    : undefined;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelSession(sessionId);
    } catch {
      // error handled by global handler
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box>
      {isRunning && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={cancelling}
            aria-label={copy.t('toolPage.cta.cancel')}
          >
            {cancelling ? copy.t('shared.actions.cancelling') : copy.t('shared.actions.cancel')}
          </Button>
        </Box>
      )}

      <GenerationSlot
        status={session.status}
        progress={progress}
        stepArtifacts={stepArtifacts}
        startedAt={session.startedAt}
        artifacts={session.artifacts ?? []}
        workspaceId={workspaceId}
        produces={produces}
        totalSteps={session.stepCount}
        durationMs={durationMs ?? undefined}
        creditCost={(session as unknown as Record<string, unknown>).creditCost as number | undefined}
        xpEarned={(session as unknown as Record<string, unknown>).xpEarned as number | undefined}
        onRetry={onReset}
      />

      {isTerminal && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={onReset}
          >
            {copy.t('shared.session.newGeneration')}
          </Button>
          <Button variant="outlined" size="medium" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
            {copy.t('workspace.nav.backToWorkspace')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
