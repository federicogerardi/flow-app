import { Box, Card, CardContent, Chip, Typography, Button, Alert } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../api/hooks';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { GenerationSlot } from '../components/tool/GenerationSlot';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { copy } from '@flow-app/copy';
import { statusColorMap } from '../shared/statusColors';
import { formatToolLabel } from '../shared/session-utils';

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function SessionPage() {
  const { sessionId, workspaceId } = useParams<{ sessionId: string; workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const isReplayed = searchParams.get('replayed') === 'true';
  const navigate = useNavigate();
  const { session, progress, stepArtifacts, loading, error } = useSession(sessionId ?? null);
  const { setBreadcrumbs } = useBreadcrumbs();
  const [cancelling, setCancelling] = useState(false);

  const toolName = session?.toolKey ? formatToolLabel(session.toolKey) : '';

  useEffect(() => {
      setBreadcrumbs([
        { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
        { label: copy.t('workspace.nav.sessions'), path: workspaceId ? `/workspaces/${workspaceId}/sessions` : '/dashboard' },
        { label: session ? copy.t('shared.label.sessionWithTool', { toolName: session.toolKey }) : copy.t('shared.label.session') },
      ]);
  }, [workspaceId, session, setBreadcrumbs]);

  const handleCancel = async () => {
    if (!sessionId) return;
    setCancelling(true);
    try {
      await api.cancelSession(sessionId);
    } catch {
      // error handled by global handler
    } finally {
      setCancelling(false);
    }
  };

  if (error) return <ErrorState message={error.message} />;
  if (loading) return <LoadingSkeleton variant="session-detail" />;
  if (!session) return <LoadingSkeleton variant="session-detail" />;

  const isRunning = session.status === 'running';
  const isTerminal = session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled';
  const durationMs = session.startedAt && session.completedAt
    ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
    : undefined;
  const xpEarned = (session as unknown as Record<string, unknown>).xpEarned as number | undefined;

  return (
    <Box>
      <PageHeader
        title={toolName}
        meta={session.status === 'completed' ? (
          <>
            <Chip icon={<CheckCircleIcon />} label={copy.t(`shared.sessionStatus.completed` as any)} color="success" size="small" />
            <Typography variant="caption" color="text.secondary">
              {durationMs ? `${copy.t('toolPage.progress.completedIn', { duration: formatDurationMs(durationMs) })} · ` : ''}
              {copy.t('toolPage.progress.stepCountSummary', { count: String(session.stepCount) })}
              {xpEarned && xpEarned > 0 ? ` · ${copy.t('shared.session.xpEarned', { xp: String(xpEarned) })}` : ''}
            </Typography>
          </>
        ) : undefined}
      />

      {isReplayed && (
        <Alert severity="info" sx={{ mb: 2 }} role="status" aria-live="polite">
          {copy.t('shared.session.replayedMessage')}
        </Alert>
      )}

      <Card sx={{ mb: 1.5 }}>
        <CardContent>
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

          <GenerationSlot
            status={session.status}
            progress={progress}
            stepArtifacts={stepArtifacts}
            startedAt={session.startedAt}
            artifacts={session.artifacts ?? []}
            workspaceId={workspaceId}
            produces={session.produces}
            totalSteps={session.stepCount}
            durationMs={durationMs ?? undefined}
            creditCost={(session as unknown as Record<string, unknown>).creditCost as number | undefined}
            xpEarned={xpEarned}
            onRetry={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)}
          />
        </CardContent>
      </Card>

      {isTerminal && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)}
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
