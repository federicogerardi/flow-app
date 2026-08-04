import { Box } from '@mui/material';
import { useParams } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { AssetList } from '../components/workspace/AssetList';
import { AssetCoverageBar } from '../components/workspace/AssetCoverageBar';
import { copy } from '@flow-app/copy';

export default function AssetsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <Box>
      <PageHeader
        title="Assets"
        breadcrumbs={[
          { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
          { label: 'Assets' },
        ]}
      />
      <Box sx={{ mb: 4 }}>
        <AssetCoverageBar workspaceId={workspaceId!} />
      </Box>
      <AssetList workspaceId={workspaceId!} />
    </Box>
  );
}
