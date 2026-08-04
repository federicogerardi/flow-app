import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { useSession } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { FeedbackPanel } from '../components/tool/FeedbackPanel';
import { SessionSummary } from '../components/tool/SessionSummary';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { copy } from '@flow-app/copy';
import { statusColorMap } from '../shared/statusColors';

export default function SessionPage() {
  const { sessionId, workspaceId } = useParams<{ sessionId: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { session, progress, loading, error } = useSession(sessionId ?? null);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!session) return <LoadingSkeleton />;

  return (
    <Box>
      <PageHeader
        title={`Session: ${session.toolKey}`}
        breadcrumbs={[
          { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
          { label: 'Session' },
        ]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3">Status</Typography>
            <Chip label={session.status} color={statusColorMap[session.status] ?? 'default'} />
          </Box>

          {session.status === 'running' && (
            <FeedbackPanel progress={progress} status={session.status} />
          )}

          {session.status === 'failed' && (
            <Box sx={{ mt: 2 }}>
              <ErrorState message="Session failed" onRetry={() => navigate(`/workspaces/${workspaceId}/tools/${session.toolKey}`)} />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Created: {new Date(session.createdAt).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {session.status === 'completed' && session.artifacts && (
        <SessionSummary artifacts={session.artifacts} workspaceId={workspaceId} />
      )}
    </Box>
  );
}
