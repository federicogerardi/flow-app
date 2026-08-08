import { Box, Card, CardContent, Chip, Typography, Button, Alert } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../api/hooks';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { FeedbackPanel } from '../components/tool/FeedbackPanel';
import { SessionSummary } from '../components/tool/SessionSummary';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { copy } from '@flow-app/copy';
import { statusColorMap } from '../shared/statusColors';

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function SessionPage() {
  const { sessionId, workspaceId } = useParams<{ sessionId: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { session, progress, loading, error } = useSession(sessionId ?? null);
  const { setBreadcrumbs } = useBreadcrumbs();
  const [cancelling, setCancelling] = useState(false);

  // Format tool name for display
  const toolName = (session?.toolKey ?? '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

  // Compute duration
  const startedAt = session?.startedAt ?? null;
  const completedAt = session?.completedAt ?? null;
  const durationMs = startedAt && completedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : null;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!session) return <LoadingSkeleton />;

  const isRunning = session.status === 'running';
  const isCompleted = session.status === 'completed';
  const isFailed = session.status === 'failed';
  const isInterrupted = session.status === 'queued' || session.status === 'draft' || session.status === 'ready';

  const xpEarned = (session as unknown as Record<string, unknown>).xpEarned as number | undefined;

  return (
    <Box>
      <PageHeader
        title={toolName}
        meta={isCompleted ? (
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

      {/* Interrupted session note */}
      {isInterrupted && (
        <Alert severity="info" sx={{ mb: 2 }} aria-describedby="interrupted-session-msg">
          <span id="interrupted-session-msg">
          {copy.t('shared.session.interruptedMessage')}
          </span>
          <Button
            variant="text"
            size="small"
            onClick={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)}
            sx={{ textTransform: 'none', fontWeight: 600, verticalAlign: 'baseline' }}
          >
            {toolName} tool
          </Button>.
        </Alert>
      )}

      {/* Metadata card — only for running/failed (completed merges into PageHeader) */}
      {!isCompleted && (
        <Card sx={{ mb: 1.5 }} aria-label={copy.t('shared.aria.sessionDetail', { tool: toolName })}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isRunning ? 2 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3">{copy.t('shared.label.status')}</Typography>
                <Chip
                  label={copy.t(`shared.sessionStatus.${session.status}` as any)}
                  color={statusColorMap[session.status] ?? 'default'}
                  aria-label={copy.t(`shared.sessionStatus.${session.status}` as any)}
                />
              </Box>

              {/* Cancel button for running sessions */}
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

            {/* Metadata row — only for running */}
            {isRunning && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{copy.t('shared.label.steps')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {session.stepCount}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{copy.t('shared.label.created')}</Typography>
                  <Typography variant="body2">
                    {new Date(session.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}

            {isRunning && (
              <Box sx={{ mt: 2 }}>
                <FeedbackPanel progress={progress} status={session.status} />
              </Box>
            )}

            {isFailed && (
              <Box sx={{ mt: 2 }}>
                <ErrorState message={copy.t('errors.generation.failed')} onRetry={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)} />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {isCompleted && session.artifacts && (
        <SessionSummary
          artifacts={session.artifacts}
          workspaceId={workspaceId}
          produces={session.produces}
          stepCount={session.stepCount}
        />
      )}
    </Box>
  );
}