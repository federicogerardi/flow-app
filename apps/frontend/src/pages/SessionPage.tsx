import { Box, Card, CardContent, Chip, Typography, Button, Alert } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useParams, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../api/hooks';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { FeedbackPanel } from '../components/tool/FeedbackPanel';
import { SessionSummary } from '../components/tool/SessionSummary';
import { CompletionBanner } from '../components/shared/CompletionBanner';
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
        { label: 'Sessions', path: workspaceId ? `/workspaces/${workspaceId}/sessions` : '/dashboard' },
        { label: session ? `Session: ${session.toolKey}` : 'Session' },
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

  return (
    <Box>
      <PageHeader title={`Session: ${toolName}`} />

      {/* Interrupted session note */}
      {isInterrupted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This session was interrupted. You can retry by starting a new generation from the{' '}
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h3">Status</Typography>
              <Chip label={session.status} color={statusColorMap[session.status] ?? 'default'} />
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
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
          </Box>

          {/* Metadata row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Steps:</Typography>
              <Typography variant="body2" fontWeight={600}>
                {session.stepCount}
              </Typography>
            </Box>

            {durationMs !== null && durationMs > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 14 }} color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatDurationMs(durationMs)}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Created:</Typography>
              <Typography variant="body2">
                {new Date(session.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {isRunning && (
            <FeedbackPanel progress={progress} status={session.status} />
          )}

          {isFailed && (
            <Box sx={{ mt: 2 }}>
              <ErrorState message={copy.t('errors.generation.failed')} onRetry={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)} />
            </Box>
          )}
        </CardContent>
      </Card>

      {isCompleted && session.artifacts && (
        <>
          <CompletionBanner
            durationSeconds={durationMs ? Math.round(durationMs / 1000) : 0}
            stepCount={session.stepCount}
            creditCost={1}
          />
          <SessionSummary
            artifacts={session.artifacts}
            workspaceId={workspaceId}
            produces={session.produces}
            stepCount={session.stepCount}
          />
        </>
      )}
    </Box>
  );
}
