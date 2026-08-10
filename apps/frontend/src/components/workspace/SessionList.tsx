import { Box, Tabs, Tab, Badge } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { useLiveSession } from '../../api/hooks';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';
import { QueuedCard } from './QueuedCard';
import { RunningCard } from './RunningCard';
import { CompletedCard } from './CompletedCard';
import { FailedCard } from './FailedCard';
import { copy } from '@flow-app/copy';
import { usePromoteAction } from '../../hooks/usePromoteAction';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface SessionListProps {
  workspaceId: string;
  /** Label for the CTA button shown when session list is empty */
  emptyCtaLabel?: string;
  /** Callback when the empty-state CTA is clicked */
  onEmptyCta?: () => void;
  /** Custom message for the global empty-state — overrides default when provided */
  emptyMessage?: string;
}

type TabValue = 'in-progress' | 'completed' | 'failed';

/**
 * Wraps a RunningCard with useLiveSession SSE subscription for real-time updates.
 * Falls back to the base session data when SSE is unavailable.
 */
function LiveRunningCard({ session, onViewProgress, onCancel }: {
  session: SessionListItemDTO;
  onViewProgress: () => void;
  onCancel: () => void;
}) {
  const { liveSession } = useLiveSession(session.id);
  const display = liveSession ?? session;
  return (
    <RunningCard
      session={display}
      onViewProgress={onViewProgress}
      onCancel={onCancel}
    />
  );
}

/**
 * Wraps a QueuedCard with useLiveSession SSE subscription for real-time status transitions.
 * Transitions to RunningCard automatically when the session starts.
 */
function LiveQueuedCard({ session, onCancel, onViewProgress }: {
  session: SessionListItemDTO;
  onCancel: () => void;
  onViewProgress: () => void;
}) {
  const { liveSession } = useLiveSession(session.id);
  const display = liveSession ?? session;

  // When SSE reports the session is now running, show a RunningCard instead
  if (display.status === 'running') {
    return (
      <RunningCard
        session={display}
        onViewProgress={onViewProgress}
        onCancel={onCancel}
      />
    );
  }

  return <QueuedCard session={display} onCancel={onCancel} />;
}

export function SessionList({ workspaceId, emptyCtaLabel, onEmptyCta, emptyMessage }: SessionListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('in-progress');

  const { isAlreadyPromoted, openPromoteDialog, promoteDialog } = usePromoteAction({
    workspaceId,
    mutateKeys: [`sessions-${workspaceId}`],
  });

  // 4 per-status API calls with per-status limits (wiki spec: Session List — Live Status)
  const fetcher = async () => {
    const [queued, running, completed, failed] = await Promise.all([
      api.listSessions({ workspaceId, status: 'queued' }),
      api.listSessions({ workspaceId, status: 'running' }),
      api.listSessions({ workspaceId, status: 'completed', limit: 20 }),
      api.listSessions({ workspaceId, status: 'failed', limit: 20 }),
    ]);

    return {
      queued: queued.data ?? [],
      running: running.data ?? [],
      completed: completed.data ?? [],
      failed: failed.data ?? [],
    };
  };

  const { data, isLoading, mutate } = useSWR(`sessions-${workspaceId}`, fetcher, {
    refreshInterval: 30000,
  });

  const queued = data?.queued ?? [];
  const running = data?.running ?? [];
  const completed = data?.completed ?? [];
  const failed = data?.failed ?? [];
  const inProgressCount = queued.length + running.length;

  const allCount = inProgressCount + completed.length + failed.length;

  if (isLoading) return <LoadingSkeleton variant="list" />;

  if (allCount === 0) {
    return (
      <EmptyState
        title={copy.t('workspace.detail.noSessions')}
        message={emptyMessage ?? copy.t('workspace.dashboard.noSessions')}
        ctaLabel={emptyCtaLabel}
        onCta={onEmptyCta}
      />
    );
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
            <Badge badgeContent={inProgressCount} color="primary" max={99} invisible={inProgressCount === 0}>
              <Box sx={{ px: 1 }}>{copy.t('workspace.sessions.tabs.inProgress')}</Box>
            </Badge>
          }
          value="in-progress"
        />
        <Tab
          label={
            <Badge badgeContent={completed.length} color="success" max={99} invisible={completed.length === 0}>
              <Box sx={{ px: 1 }}>{copy.t('workspace.sessions.tabs.completed')}</Box>
            </Badge>
          }
          value="completed"
        />
        <Tab
          label={
            <Badge badgeContent={failed.length} color="error" max={99} invisible={failed.length === 0}>
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
              <LiveQueuedCard
                key={s.id}
                session={s}
                onCancel={() => api.cancelSession(s.id).then(() => mutate())}
                onViewProgress={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}
              />
            ))}
            {running.map((s) => (
              <LiveRunningCard
                key={s.id}
                session={s}
                onViewProgress={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}
                onCancel={() => api.cancelSession(s.id).then(() => mutate())}
              />
            ))}
            {inProgressCount === 0 && (
              <EmptyState
                title={copy.t('workspace.sessions.emptyInProgress')}
                message=""
              />
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completed.map((s) => (
              <CompletedCard
                key={s.id}
                session={s}
                promoted={isAlreadyPromoted(s)}
                onView={() => navigate(`/workspaces/${workspaceId}/sessions/${s.id}`)}
                onDownload={() => {
                  if (s.lastArtifactId) {
                    api.downloadArtifact(s.lastArtifactId, 'md');
                  }
                }}
                onPromote={
                  s.isPromotable && !isAlreadyPromoted(s)
                    ? () => openPromoteDialog(s)
                    : undefined
                }
              />
            ))}
            {completed.length === 0 && (
              <EmptyState
                title={copy.t('workspace.sessions.emptyCompleted')}
                message=""
              />
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
              <EmptyState
                title={copy.t('workspace.sessions.emptyFailed')}
                message=""
              />
            )}
          </>
        )}
      </Box>

      {promoteDialog}
    </Box>
  );
}