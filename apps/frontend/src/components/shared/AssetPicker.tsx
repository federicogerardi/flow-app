import { Box, Typography, FormControlLabel, Checkbox, Radio, RadioGroup, FormLabel, Stack, FormControl } from '@mui/material';
import type { AssetInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';

interface WorkspaceAsset {
  id: string;
  assetType: string;
  content: string;
}

interface AssetPickerProps {
  assetDef: AssetInput[];
  workspaceAssets: WorkspaceAsset[];
  selectedAssets: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

export function AssetPicker({
  assetDef,
  workspaceAssets,
  selectedAssets,
  onSelectionChange,
  disabled = false,
}: AssetPickerProps) {
  if (assetDef.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {assetDef.map((def) => {
        const matchingAssets = workspaceAssets.filter((a) => a.assetType === def.assetType);

        if (matchingAssets.length === 0) {
          return (
            <FormControl key={def.assetType} disabled={disabled}>
              <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>
                {def.assetType}
                {def.required && ' *'}
              </FormLabel>
              <Typography variant="body2" color="text.secondary">
                {copy.t('toolPage.assets.emptyState', { type: def.assetType })}
              </Typography>
            </FormControl>
          );
        }

        if (def.multiple) {
          return (
            <FormControl key={def.assetType} disabled={disabled}>
              <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>
                {def.assetType}
                {def.required && ' *'}
              </FormLabel>
              <Stack spacing={0.5}>
                {matchingAssets.map((asset) => {
                  const isSelected = selectedAssets.includes(asset.id);
                  return (
                    <FormControlLabel
                      key={asset.id}
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectionChange([...selectedAssets, asset.id]);
                            } else {
                              onSelectionChange(selectedAssets.filter((id) => id !== asset.id));
                            }
                          }}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {asset.content.slice(0, 80)}
                          {asset.content.length > 80 ? '...' : ''}
                        </Typography>
                      }
                    />
                  );
                })}
              </Stack>
            </FormControl>
          );
        }

        // Single select (radio)
        const selectedId = selectedAssets.find((id) =>
          matchingAssets.some((a) => a.id === id),
        );

        return (
          <FormControl key={def.assetType} disabled={disabled}>
            <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>
              {def.assetType}
              {def.required && ' *'}
            </FormLabel>
            <RadioGroup
              value={selectedId ?? ''}
              onChange={(e) => {
                const newId = e.target.value;
                // Remove any previously selected asset of this type, add new one
                const otherSelections = selectedAssets.filter(
                  (id) => !matchingAssets.some((a) => a.id === id),
                );
                if (newId) {
                  onSelectionChange([...otherSelections, newId]);
                } else {
                  onSelectionChange(otherSelections);
                }
              }}
            >
              {matchingAssets.map((asset) => (
                <FormControlLabel
                  key={asset.id}
                  value={asset.id}
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {asset.content.slice(0, 80)}
                      {asset.content.length > 80 ? '...' : ''}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        );
      })}
    </Box>
  );
}
