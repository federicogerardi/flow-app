import { Box, Typography } from '@mui/material';
import useSWR, { mutate } from 'swr';
import { api } from '../../api/client';
import { CompletedCard } from './CompletedCard';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { copy } from '@flow-app/copy';
import { useNavigate } from 'react-router';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface ReadyToPromoteListProps {
  workspaceId: string;
}

export function ReadyToPromoteList({ workspaceId }: ReadyToPromoteListProps) {
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useSWR(
    `sessions-${workspaceId}-completed`,
    () => api.listSessions({ workspaceId, status: 'completed', limit: 10 }),
  );

  const allSessions = sessions?.data ?? [];
  const promotable = allSessions.filter((s: SessionListItemDTO) => s.isPromotable);

  const handlePromote = async (session: SessionListItemDTO) => {
    const artifactId = (session as unknown as Record<string, unknown>).lastArtifactId as string | undefined;
    if (!artifactId) return;
    try {
      await api.promoteArtifact(artifactId, workspaceId);
      await mutate(`sessions-${workspaceId}-completed`);
      await mutate(`sessions-${workspaceId}`);
    } catch {
      // handled by global error handler
    }
  };

  if (isLoading) return <LoadingSkeleton variant="list" />;
  if (promotable.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        {copy.t('workspace.dashboard.readyToPromote')}
        <Typography
          component="span"
          variant="body2"
          sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }}
        >
          ({promotable.length})
        </Typography>
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {promotable.map((session: SessionListItemDTO) => (
          <CompletedCard
            key={session.id}
            session={session}
            onView={() => navigate(`/workspaces/${workspaceId}/sessions/${session.id}`)}
            onDownload={() => {
              const artifactId = (session as unknown as Record<string, unknown>).lastArtifactId as string | undefined;
              if (artifactId) {
                api.downloadArtifact(artifactId, 'md');
              }
            }}
            onPromote={() => handlePromote(session)}
          />
        ))}
      </Box>
    </Box>
  );
}