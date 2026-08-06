import { Box } from '@mui/material';
import { useParams } from 'react-router';
import { useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { SessionList } from '../components/workspace/SessionList';
import { copy } from '@flow-app/copy';

export default function SessionsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
      { label: 'Sessions' },
    ]);
  }, [workspaceId, setBreadcrumbs]);

  return (
    <Box>
      <PageHeader title="Sessions" subtitle="All generation sessions in this workspace" />
      <SessionList workspaceId={workspaceId!} />
    </Box>
  );
}
