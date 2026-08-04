import { Box, Typography, LinearProgress, Stack, Button, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';

const COVERABLE_TYPES = ['brief', 'brand-voice', 'persona', 'angle', 'ad-copy'] as const;

const ASSET_LABELS: Record<string, string> = {
  'brief': 'Brief',
  'brand-voice': 'Brand Voice',
  'persona': 'Persona',
  'angle': 'Angle',
  'ad-copy': 'Ad Copy',
};

/** Map asset types to their corresponding tool keys */
const ASSET_TOOL_MAP: Record<string, string> = {
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
  const presentTypes = new Set(assets.map((a) => a.assetType));

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        Asset Coverage
      </Typography>
      <Stack spacing={1}>
        {COVERABLE_TYPES.map((type) => {
          const present = presentTypes.has(type);
          return (
            <Stack key={type} direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="caption" sx={{ width: 100, flexShrink: 0, fontSize: '0.7rem' }}>
                {ASSET_LABELS[type]}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={present ? 100 : 0}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                }}
              />
              <Tooltip title={present ? 'Available' : 'Missing — click to create'}>
                <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                  {present ? (
                    <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                  ) : (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ minWidth: 'auto', p: 0, fontSize: '0.65rem', textTransform: 'none' }}
                      onClick={() => navigate(`/workspaces/${workspaceId}/tools/${ASSET_TOOL_MAP[type]}`)}
                    >
                      +
                    </Button>
                  )}
                </Box>
              </Tooltip>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
