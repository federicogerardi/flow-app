import { Box, Typography, Checkbox, FormControlLabel, Stack } from '@mui/material';
import useSWR from 'swr';
import { api } from '../../api/client';

const ASSET_LABELS: Record<string, string> = {
  'brief': 'Brief',
  'brand-voice': 'Brand Voice',
  'persona': 'Persona',
  'angle': 'Angle',
  'ad-copy': 'Ad Copy',
};

interface KnowledgePanelProps {
  workspaceId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function KnowledgePanel({ workspaceId, selectedIds, onChange }: KnowledgePanelProps) {
  const { data } = useSWR(
    `assets-${workspaceId}-kp`,
    () => api.listAssets(workspaceId),
  );

  const assets = data?.assets ?? [];
  if (assets.length === 0) return null;

  const handleToggle = (assetId: string, assetType: string, checked: boolean) => {
    if (checked) {
      const filtered = selectedIds.filter((id) => {
        const existing = assets.find((a) => a.id === id);
        return existing?.assetType !== assetType;
      });
      onChange([...filtered, assetId]);
    } else {
      onChange(selectedIds.filter((id) => id !== assetId));
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Workspace Assets
      </Typography>
      <Stack>
        {assets.map((a) => (
          <FormControlLabel
            key={a.id}
            control={
              <Checkbox
                size="small"
                checked={selectedIds.includes(a.id)}
                onChange={(_, checked) => handleToggle(a.id, a.assetType, checked)}
              />
            }
            label={
              <Typography variant="body2">
                {ASSET_LABELS[a.assetType] ?? a.assetType}
              </Typography>
            }
          />
        ))}
      </Stack>
    </Box>
  );
}
