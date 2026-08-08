import { Box, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api, type ToolListItemDTO } from '../../api/client';

interface AssetCoverageBarProps {
  workspaceId: string;
}

export function AssetCoverageBar({ workspaceId }: AssetCoverageBarProps) {
  const navigate = useNavigate();

  const { data: toolsData } = useSWR('tools-list', () => api.listTools());
  const { data: assetsData } = useSWR(
    `assets-${workspaceId}-coverage`,
    () => api.listAssets(workspaceId),
  );

  const assetTools = (toolsData?.tools ?? []).filter(
    (t) => t.outputCategory === 'asset' && t.produces,
  ) as (ToolListItemDTO & { produces: string })[];
  const assets = assetsData?.assets ?? [];
  const coveredCount = assetTools.filter((t) =>
    assets.some((a) => a.assetType === t.produces),
  ).length;
  const total = assetTools.length;

  if (assetTools.length === 0) return null;

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
        {assetTools.map((tool) => {
          const present = assets.some((a) => a.assetType === tool.produces);
          return present ? (
            <Chip
              key={tool.toolKey}
              icon={<CheckCircleIcon fontSize="small" />}
              label={tool.name}
              size="small"
              color="success"
              variant="filled"
              onClick={() => navigate(`/workspaces/${workspaceId}/tools/${tool.toolKey}`)}
            />
          ) : (
            <Chip
              key={tool.toolKey}
              icon={<AddIcon fontSize="small" />}
              label={tool.name}
              size="small"
              variant="outlined"
              onClick={() => navigate(`/workspaces/${workspaceId}/tools/${tool.toolKey}`)}
              sx={{ cursor: 'pointer' }}
            />
          );
        })}
      </Box>
    </Box>
  );
}