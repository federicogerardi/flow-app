import { Box, Tabs, Tab, Badge, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';
import { QueuedCard } from './QueuedCard';
import { RunningCard } from './RunningCard';
import { CompletedCard } from './CompletedCard';
import { FailedCard } from './FailedCard';
import { copy } from '@flow-app/copy';

interface SessionListProps {
  workspaceId: string;
}

type TabValue = 'in-progress' | 'completed' | 'failed';

export function SessionList({ workspaceId }: SessionListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('in-progress');

  const { data: sessions, isLoading, mutate } = useSWR(
    `sessions-${workspaceId}`,
    () => api.listSessions({ workspaceId }),
    { refreshInterval: 30000 },
  );

  const allSessions = sessions?.data ?? [];
  const queued = allSessions.filter((s) => s.status === 'queued');
  const running = allSessions.filter((s) => s.status === 'running');
  const completed = allSessions.filter((s) => s.status === 'completed');
  const failed = allSessions.filter((s) => s.status === 'failed' || s.status === 'cancelled');

  const inProgressCount = queued.length + running.length;

  if (isLoading) return <LoadingSkeleton variant="list" />;

  if (allSessions.length === 0) {
    return <EmptyState title={copy.t('workspace.detail.noSessions')} message={copy.t('workspace.dashboard.noSessions')} />;
  }

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as TabValue)}
        sx={{ mb: 2 }}
      >
        <Tab
          label={
            <Badge badgeContent={inProgressCount} color="primary" max={99}>
              <Box sx={{ px: 1 }}>{copy.t('workspace.sessions.tabs.inProgress')}</Box>
            </Badge>
          }
          value="in-progress"
        />
        <Tab
          label={
            <Badge badgeContent={completed.length} color="success" max={99}>
              <Box sx={{ px: 1 }}>{copy.t('workspace.sessions.tabs.completed')}</Box>
            </Badge>
          }
          value="completed"
        />
        <Tab
          label={
            <Badge badgeContent={failed.length} color="error" max={99}>
              <Box sx={{ px: 1 }}>{copy.t('workspace.sessions.tabs.failed')}</Box>
            </Badge>
          }
          value="failed"
        />
      </Tabs>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {activeTab === 'in-progress' && (
          <>
            {queued.map((s) => (
              <QueuedCard
                key={s.id}
                session={s}
                onCancel={() => api.cancelSession(s.id).then(() => mutate())}
              />
            ))}
            {running.map((s) => (
              <RunningCard
                key={s.id}
                session={s}
                onViewProgress={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}
                onCancel={() => api.cancelSession(s.id).then(() => mutate())}
              />
            ))}
            {inProgressCount === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {copy.t('workspace.sessions.emptyInProgress')}
              </Typography>
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completed.map((s) => (
              <CompletedCard
                key={s.id}
                session={s}
                onView={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}
                onDownload={() => {
                  const artifactId = (s as unknown as Record<string, unknown>).lastArtifactId as string | undefined;
                  if (artifactId) {
                    api.downloadArtifact(artifactId, 'md');
                  }
                }}
              />
            ))}
            {completed.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {copy.t('workspace.sessions.emptyCompleted')}
              </Typography>
            )}
          </>
        )}

        {activeTab === 'failed' && (
          <>
            {failed.map((s) => (
              <FailedCard
                key={s.id}
                session={s}
                onRetry={() => navigate(`/workspaces/${workspaceId}/tools/${s.toolKey}`)}
              />
            ))}
            {failed.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {copy.t('workspace.sessions.emptyFailed')}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
