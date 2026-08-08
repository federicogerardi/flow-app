import { Box, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { ASSET_TYPE_LABELS } from '../../constants/assets';

const COVERABLE_TYPES = ['brief', 'brand-voice', 'persona', 'angle', 'ad-copy'] as const;

export const ASSET_TOOL_MAP: Record<string, string> = {
  'brief': 'brief',
  'brand-voice': 'brand-voice',
  'persona': 'buyer-persona',
  'angle': 'marketing-angle',
  'ad-copy': 'ad-copy',
};

interface AssetCoverageBarProps {
  workspaceId: string;
}

export function AssetCoverageBar({ workspaceId }: AssetCoverageBarProps) {
  const navigate = useNavigate();
  const { data } = useSWR(
    `assets-${workspaceId}-coverage`,
    () => api.listAssets(workspaceId),
  );

  const assets = data?.assets ?? [];
  const coveredCount = COVERABLE_TYPES.filter((type) =>
    assets.some((a) => a.assetType === type),
  ).length;
  const total = COVERABLE_TYPES.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>Assets</Typography>
        <Chip
          label={`${coveredCount}/${total}`}
          size="small"
          color={coveredCount === total ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {COVERABLE_TYPES.map((type) => {
          const present = assets.some((a) => a.assetType === type);
          return present ? (
            <Chip
              key={type}
              icon={<CheckCircleIcon fontSize="small" />}
              label={ASSET_TYPE_LABELS[type]}
              size="small"
              color="success"
              variant="filled"
              onClick={() => navigate(`/workspaces/${workspaceId}/assets`)}
            />
          ) : (
            <Chip
              key={type}
              icon={<AddIcon fontSize="small" />}
              label={ASSET_TYPE_LABELS[type]}
              size="small"
              variant="outlined"
              onClick={() => navigate(`/workspaces/${workspaceId}/tools/${ASSET_TOOL_MAP[type]}`)}
              sx={{ cursor: 'pointer' }}
            />
          );
        })}
      </Box>
    </Box>
  );
}