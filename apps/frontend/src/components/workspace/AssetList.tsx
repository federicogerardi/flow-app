import { Box, Typography, Card, CardContent, IconButton, Tooltip, CardActionArea } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';

const ASSET_TYPE_LABELS: Record<string, string> = {
  'brief': 'Brief',
  'brand-voice': 'Brand Voice',
  'persona': 'Buyer Persona',
  'angle': 'Marketing Angle',
  'ad-copy': 'Ad Copy',
};

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {assets.map((a) => (
        <Card key={a.id} variant="outlined">
          <CardActionArea onClick={() => navigate(`/workspaces/${workspaceId}/assets/${a.id}`)}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {ASSET_TYPE_LABELS[a.assetType] ?? a.assetType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.source} · {new Date(a.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Tooltip title="Delete asset">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                  aria-label="Delete asset"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
