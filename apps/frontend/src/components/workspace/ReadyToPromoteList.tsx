import { Box, Typography } from '@mui/material';
import useSWR from 'swr';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { copy } from '@flow-app/copy';
import { useNavigate } from 'react-router';
import { usePromoteAction } from '../../hooks/usePromoteAction';
import { PromotedBadge } from '../shared/PromotedBadge';
import { PromoteActionButton } from '../shared/PromoteActionButton';
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

  const { isAlreadyPromoted, openPromoteDialog, promoteDialog } = usePromoteAction({
    workspaceId,
    mutateKeys: [`sessions-${workspaceId}-completed`, `sessions-${workspaceId}`],
  });

  const { data: sessions, isLoading } = useSWR(
    `sessions-${workspaceId}-completed`,
    () => api.listSessions({ workspaceId, status: 'completed', limit: 10 }),
  );

  const allSessions = sessions?.data ?? [];

  const promotable = allSessions.filter(
    (s: SessionListItemDTO) => s.isPromotable && !isAlreadyPromoted(s),
  );

  const anyVisible = allSessions.some(
    (s) => s.isPromotable || isAlreadyPromoted(s),
  );

  if (isLoading) return <LoadingSkeleton variant="list" />;
  if (!anyVisible) return null;

  const toolLabel = (toolKey: string) =>
    toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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
        {allSessions
          .filter((s: SessionListItemDTO) => s.isPromotable || isAlreadyPromoted(s))
          .map((session, i, arr) => {
            const alreadyPromoted = isAlreadyPromoted(session);

            return (
              <Box
                key={session.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1,
                  borderBottom: i < arr.length - 1 ? '1px solid' : 'none',
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
                  {formatDate(session.createdAt)}
                  {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ''}
                </Typography>
                {alreadyPromoted ? (
                  <Box sx={{ flexShrink: 0 }}>
                    <PromotedBadge />
                  </Box>
                ) : (
                  <Box sx={{ flexShrink: 0 }}>
                    <PromoteActionButton
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPromoteDialog(session);
                      }}
                    />
                  </Box>
                )}
              </Box>
            );
        })}
      </Box>

      {promoteDialog}
    </Box>
  );
}