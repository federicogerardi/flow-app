import { Box, Typography, Button } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import useSWR, { mutate } from 'swr';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { copy } from '@flow-app/copy';
import { useNavigate } from 'react-router';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface ReadyToPromoteListProps {
  workspaceId: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
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

  const toolLabel = (toolKey: string) =>
    toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const getDuration = (s: SessionListItemDTO) =>
    (s as unknown as Record<string, unknown>).durationSeconds as number | undefined;

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        {copy.t('workspace.dashboard.readyToPromote')}
        <Typography
          component="span"
          variant="body2"
          sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }}
        >
          ({promotable.length})
        </Typography>
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {promotable.map((session, i) => (
          <Box
            key={session.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1,
              borderBottom: i < promotable.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/workspaces/${workspaceId}/sessions/${session.id}`)}
          >
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
              {toolLabel(session.toolKey)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(session.createdAt)}{getDuration(session) ? ` · ${formatDuration(getDuration(session))}` : ''}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PushPinIcon fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation();
                handlePromote(session);
              }}
              sx={{ flexShrink: 0 }}
            >
              {copy.t('assets.actions.promote')}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}