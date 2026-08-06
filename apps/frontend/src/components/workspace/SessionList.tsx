import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';
import { statusColorMap } from '../../shared/statusColors';
import { copy } from '@flow-app/copy';

interface SessionListProps {
  workspaceId: string;
}

export function SessionList({ workspaceId }: SessionListProps) {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSWR(
    `sessions-${workspaceId}`,
    () => api.listSessions({ workspaceId }),
  );

  if (isLoading) return <LoadingSkeleton />;
  if (!sessions || sessions.data.length === 0) {
    return <EmptyState title={copy.t('workspace.detail.noSessions')} message={copy.t('workspace.dashboard.noSessions')} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sessions.data.map((s) => (
        <Card key={s.id} variant="outlined">
          <CardActionArea onClick={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {s.toolKey}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(s.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={s.status}
              color={statusColorMap[s.status] ?? 'default'}
              size="small"
            />
          </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
