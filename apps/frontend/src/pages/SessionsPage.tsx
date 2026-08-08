import { Box } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { SessionList } from '../components/workspace/SessionList';
import { copy } from '@flow-app/copy';

export default function SessionsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
      { label: copy.t('workspace.sessions.pageTitle') },
    ]);
  }, [workspaceId, setBreadcrumbs]);

  return (
    <Box>
      <PageHeader
        title={copy.t('workspace.sessions.pageTitle')}
        subtitle={copy.t('workspace.sessions.pageSubtitle')}
      />
      <SessionList
        workspaceId={workspaceId!}
        emptyCtaLabel={copy.t('workspace.dashboard.ctaStartTool')}
        onEmptyCta={() => navigate(`/workspaces/${workspaceId}`)}
      />
    </Box>
  );
}