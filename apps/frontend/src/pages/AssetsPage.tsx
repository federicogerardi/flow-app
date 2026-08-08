import { Box } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { AssetList } from '../components/workspace/AssetList';
import { AssetCoverageBar } from '../components/workspace/AssetCoverageBar';
import { copy } from '@flow-app/copy';
import { useEffect } from 'react';

export default function AssetsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
      { label: copy.t('workspace.nav.assets') },
    ]);
  }, [workspaceId, setBreadcrumbs]);

  return (
    <Box>
      <PageHeader
        title={copy.t('assets.pageTitle')}
        subtitle={copy.t('assets.pageSubtitle')}
      />
      <Box sx={{ mb: 4 }}>
        <AssetCoverageBar workspaceId={workspaceId!} />
      </Box>
      <AssetList
        workspaceId={workspaceId!}
        emptyCtaLabel={copy.t('workspace.dashboard.ctaStartTool')}
        onEmptyCta={() => navigate(`/workspaces/${workspaceId}`)}
      />
    </Box>
  );
}