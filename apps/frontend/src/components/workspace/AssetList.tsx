import { Box, Typography, Card, CardContent, IconButton, Tooltip, CardActionArea } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';
import { RenameAssetDialog } from './RenameAssetDialog';
import { ASSET_TYPE_LABELS } from '../../constants/assets';
import { copy } from '@flow-app/copy';

interface AssetListProps {
  workspaceId: string;
  onDelete?: () => void;
}

export function AssetList({ workspaceId, onDelete }: AssetListProps) {
  const navigate = useNavigate();
  const { data, isLoading, mutate } = useSWR(
    `assets-${workspaceId}`,
    () => api.listAssets(workspaceId),
  );

  const [renameAsset, setRenameAsset] = useState<{
    id: string;
    name: string | null;
    assetType: string;
  } | null>(null);

  if (isLoading) return <LoadingSkeleton />;

  const assets = data?.assets ?? [];

  if (assets.length === 0) {
    return <EmptyState title="No assets" message="Upload or generate assets for your workspace." />;
  }

  const handleDelete = async (assetId: string) => {
    await api.deleteAsset(workspaceId, assetId);
    await mutate();
    onDelete?.();
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {assets.map((a) => {
          const typeLabel = ASSET_TYPE_LABELS[a.assetType] ?? a.assetType;
          const primaryText = a.name ?? typeLabel;
          const secondaryParts = [a.name ? typeLabel : '', a.source, new Date(a.createdAt).toLocaleDateString()].filter(Boolean);
          const secondaryText = secondaryParts.join(' · ');

          return (
            <Card key={a.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/workspaces/${workspaceId}/assets/${a.id}`)}>
                <CardContent sx={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 },
                }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body1" fontWeight={600} noWrap>
                      {primaryText}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {secondaryText}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ml: 1 }}>
                    <Tooltip title={copy.t('shared.actions.rename')}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameAsset({ id: a.id, name: a.name ?? null, assetType: a.assetType });
                        }}
                        aria-label={copy.t('shared.actions.rename')}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={copy.t('shared.actions.delete')}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                        aria-label={copy.t('shared.actions.delete')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {renameAsset && (
        <RenameAssetDialog
          open={!!renameAsset}
          onClose={() => setRenameAsset(null)}
          workspaceId={workspaceId}
          assetId={renameAsset.id}
          currentName={renameAsset.name}
          assetType={renameAsset.assetType}
          onRenamed={() => mutate()}
        />
      )}
    </>
  );
}