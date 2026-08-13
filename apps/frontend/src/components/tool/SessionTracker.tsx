import { Box, Button, Chip, Typography, Alert } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { GenerationSlot } from './GenerationSlot';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { ErrorState } from '../ErrorState';
import { copy } from '@flow-app/copy';
import { statusColorMap } from '../../shared/statusColors';
import { isTerminalStatus, isRunningStatus } from '../../shared/session-utils';
import type { SessionDTO } from '../../api/client';
import type { StepProgress, StepArtifact } from '../../api/hooks';

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SessionTrackerProps {
  session: SessionDTO | null;
  progress: StepProgress | null;
  stepArtifacts: StepArtifact[];
  loading: boolean;
  error: Error | null;
  workspaceId: string;
  produces?: string;
  /** When true, shows the replay banner ("Questa generazione è stata già completata..."). */
  replayed?: boolean;
  /** Called when the user clicks "Nuova generazione" or the retry CTA in the error state. */
  onReset: () => void;
  /** Called when the user clicks "Back to workspace". Defaults to navigating to /workspaces/:id. */
  onBackToWorkspace?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Canonical session-lifecycle component.
 *
 * Owns the rendering that was previously duplicated across InlineSessionTracker
 * and SessionPage: loading/error guards, status chip, cancel button, GenerationSlot
 * props assembly, terminal CTA row, and replay banner.
 *
 * Both surfaces import this single component — changes to session rendering
 * affect one file, not two.
 */
export function SessionTracker({
  session,
  progress,
  stepArtifacts,
  loading,
  error,
  workspaceId,
  produces,
  replayed,
  onReset,
  onBackToWorkspace,
}: SessionTrackerProps) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  // ── Guards (order: error → loading → !session) ──────────────────────────
  if (error) return <ErrorState message={error.message} />;
  if (loading) return <LoadingSkeleton variant="session-detail" />;
  if (!session) return <LoadingSkeleton variant="session-detail" />;

  // ── Derived values ───────────────────────────────────────────────────────
  const isRunning = isRunningStatus(session.status);
  const isTerminal = isTerminalStatus(session.status);
  const durationMs = session.startedAt && session.completedAt
    ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
    : undefined;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelSession(session.id);
    } catch {
      // error handled by global handler
    } finally {
      setCancelling(false);
    }
  };

  const handleBack = onBackToWorkspace ?? (() => navigate(`/workspaces/${workspaceId}`));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Replay banner — appears in both the inline flow and the standalone SessionPage */}
      {replayed && (
        <Alert severity="info" sx={{ mb: 2 }} role="status" aria-live="polite">
          {copy.t('shared.session.replayedMessage')}
        </Alert>
      )}

      {/* Status header: chip + metadata + cancel (visible during running/queued) */}
      {!isTerminal && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={copy.t(`shared.sessionStatus.${session.status}` as any)}
              color={statusColorMap[session.status] ?? 'default'}
              size="small"
              aria-label={copy.t(`shared.sessionStatus.${session.status}` as any)}
            />
            <Typography variant="caption" color="text.secondary">
              {copy.t('shared.label.steps')} {session.stepCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {copy.t('shared.label.created')} {new Date(session.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {isRunning && (
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
          )}
        </Box>
      )}

      {/* Live progress + completed results — the canonical cross-surface slot */}
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
        xpEarned={session.xpEarned}
        onRetry={onReset}
      />

      {/* Terminal CTA row — "Nuova generazione" + "Back to workspace" */}
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
          <Button variant="outlined" size="medium" onClick={handleBack}>
            {copy.t('workspace.nav.backToWorkspace')}
          </Button>
        </Box>
      )}
    </Box>
  );
}