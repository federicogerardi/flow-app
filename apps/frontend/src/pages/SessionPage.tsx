import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from '@mui/material';
import { useParams } from 'react-router';
import { useSession } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, progress, loading } = useSession(sessionId ?? null);

  if (loading || !session) return <LoadingSkeleton />;

  const statusColor: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
    draft: 'default',
    queued: 'warning',
    running: 'primary',
    completed: 'success',
    failed: 'error',
  };

  return (
    <Box>
      <PageHeader
        title={`Session: ${session.toolKey}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Session' },
        ]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3">Status</Typography>
            <Chip label={session.status} color={statusColor[session.status] ?? 'default'} />
          </Box>

          {session.status === 'running' && progress && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Step {progress.current} of {progress.total}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(progress.current / progress.total) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Created: {new Date(session.createdAt).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {session.status === 'completed' && session.artifacts && (
        <Card>
          <CardContent>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Generated Content
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {session.artifacts.map((artifact: any, i: number) => (
              <Box key={artifact.artifactId ?? i} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Step {artifact.stepNumber}
                </Typography>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography
                    component="pre"
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', m: 0 }}
                  >
                    {artifact.content}
                  </Typography>
                </Card>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
