import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { useSession } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { SessionTracker } from '../components/tool/SessionTracker';
import { copy } from '@flow-app/copy';
import { formatToolLabel, formatDurationMs, isCompletedStatus } from '../shared/session-utils';

export default function SessionPage() {
  const { sessionId, workspaceId } = useParams<{ sessionId: string; workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const isReplayed = searchParams.get('replayed') === 'true';
  const navigate = useNavigate();
  const { session, progress, stepArtifacts, loading, error } = useSession(sessionId ?? null);
  const { setBreadcrumbs } = useBreadcrumbs();

  const toolName = session?.toolKey ? formatToolLabel(session.toolKey) : '';

  // ── Page chrome: breadcrumbs ──────────────────────────────────────────────
  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
      { label: copy.t('workspace.nav.sessions'), path: workspaceId ? `/workspaces/${workspaceId}/sessions` : '/dashboard' },
      { label: session ? copy.t('shared.label.sessionWithTool', { toolName: session.toolKey }) : copy.t('shared.label.session') },
    ]);
  }, [workspaceId, session, setBreadcrumbs]);

  // ── Page chrome: completed metadata (for PageHeader) ──────────────────────
  const xpEarned = session?.xpEarned;
  const durationMs = session?.startedAt && session?.completedAt
    ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
    : undefined;

  const completedMeta = session && isCompletedStatus(session.status) ? (
    <>
      <Chip icon={<CheckCircleIcon />} label={copy.t('shared.sessionStatus.completed')} color="success" size="small" />
      <Typography variant="caption" color="text.secondary">
        {durationMs ? `${copy.t('toolPage.progress.completedIn', { duration: formatDurationMs(durationMs) })} · ` : ''}
        {copy.t('toolPage.progress.stepCountSummary', { count: String(session.stepCount) })}
        {xpEarned && xpEarned > 0 ? ` · ${copy.t('shared.session.xpEarned', { xp: String(xpEarned) })}` : ''}
      </Typography>
    </>
  ) : undefined;

  return (
    <Box>
      <PageHeader title={toolName} meta={completedMeta} />

      <Card sx={{ mb: 1.5 }}>
        <CardContent>
          <SessionTracker
            session={session}
            progress={progress}
            stepArtifacts={stepArtifacts}
            loading={loading}
            error={error}
            workspaceId={workspaceId ?? ''}
            produces={session?.produces}
            replayed={isReplayed}
            onReset={() => navigate(`/workspaces/${workspaceId}/tools/${session?.toolKey}`)}
          />
        </CardContent>
      </Card>
    </Box>
  );
}