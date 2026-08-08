import { Box, Typography, Card, Chip, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { ASSET_TYPE_LABELS } from '../constants/assets';
import { copy } from '@flow-app/copy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AssetDetailPage() {
  const { workspaceId, assetId } = useParams<{ workspaceId: string; assetId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  const { data: asset, isLoading, error } = useSWR(
    assetId ? `asset-${assetId}` : null,
    () => api.getAsset(workspaceId!, assetId!),
  );

  useEffect(() => {
    const label = asset
      ? (asset.name ?? ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType)
      : copy.t('assets.pageTitle');
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
      { label: copy.t('assets.pageTitle'), path: `/workspaces/${workspaceId}/assets` },
      { label },
    ]);
  }, [workspaceId, asset, setBreadcrumbs]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!asset) return <ErrorState message={copy.t('assets.notFound')} />;

  const typeLabel = ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType;
  const pageTitle = asset.name ?? typeLabel;
  const sourceLabelKey = `assets.source.${asset.source}` as const;

  return (
    <Box>
      <PageHeader title={pageTitle} />

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {asset.name && (
          <Chip label={typeLabel} size="small" variant="outlined" />
        )}
        <Chip label={copy.t(sourceLabelKey)} size="small" color="primary" variant="outlined" />
        <Typography variant="caption" color="text.secondary">
          {copy.t('shared.format.date')}: {new Date(asset.createdAt).toLocaleDateString()}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          size="small"
          endIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/workspaces/${workspaceId}/tools/${asset.assetType}`)}
        >
          {copy.t('shared.actions.viewAsset')}
        </Button>
      </Box>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Box
          sx={{
            '& h1,h2,h3,h4,h5,h6': { mt: 2, mb: 1, fontWeight: 600 },
            '& h1': { fontSize: '1.5rem' },
            '& h2': { fontSize: '1.25rem' },
            '& h3': { fontSize: '1.1rem' },
            '& p': { mb: 1.5, lineHeight: 1.7 },
            '& ul,ol': { pl: 3, mb: 1.5 },
            '& li': { mb: 0.25 },
            '& code': {
              bgcolor: 'grey.100',
              color: 'text.primary',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontSize: '0.85em',
              fontFamily: 'monospace',
            },
            '& pre': { bgcolor: 'grey.100', color: 'text.primary', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.85em' },
            '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
            '& th,td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left' },
            '& th': { bgcolor: 'action.hover', fontWeight: 600 },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 2,
              ml: 0,
              color: 'text.secondary',
              fontStyle: 'italic',
            },
            '& a': { color: 'primary.main' },
            '& img': { maxWidth: '100%' },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {asset.content ?? ''}
          </ReactMarkdown>
        </Box>
      </Card>
    </Box>
  );
}