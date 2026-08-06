import { Box, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { TextInput, FileInput, AssetInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';

interface WorkspaceAsset {
  id: string;
  assetType: string;
  content: string;
}

interface ReadinessSnapshotProps {
  inputs: Record<string, string>;
  toolDef: TextInput[];
  /** File acquisition readiness */
  fileDef?: FileInput[];
  files?: Record<string, File>;
  /** Asset acquisition readiness */
  assetDef?: AssetInput[];
  selectedAssets?: string[];
  workspaceAssets?: WorkspaceAsset[];
}

export function ReadinessSnapshot({
  inputs,
  toolDef,
  fileDef,
  files = {},
  assetDef,
  selectedAssets = [],
  workspaceAssets = [],
}: ReadinessSnapshotProps) {
  const textReady = toolDef.every((f) => !f.required || inputs[f.key]?.trim());
  const filesReady = !fileDef || fileDef.every((f) => !f.required || !!files[f.key]);
  const assetsReady = !assetDef || assetDef.every((def) => {
    if (!def.required) return true;
    const matching = workspaceAssets.filter((a) => a.assetType === def.assetType);
    const selected = selectedAssets.filter((id) => matching.some((a) => a.id === id));
    return selected.length > 0;
  });
  const hasAnyRequired = toolDef.some((f) => f.required)
    || (fileDef?.some((f) => f.required) ?? false)
    || (assetDef?.some((f) => f.required) ?? false);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {copy.t('toolPage.readiness.title')}
      </Typography>
      <Stack spacing={0.5}>
        {/* Text readiness */}
        {toolDef
          .filter((f) => f.required)
          .map((field) => {
            const hasValue = inputs[field.key]?.trim();
            return (
              <Box key={`text:${field.key}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasValue ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={hasValue ? 'text.primary' : 'error.main'}
                >
                  {field.label}
                </Typography>
              </Box>
            );
          })}

        {/* File readiness */}
        {fileDef
          ?.filter((f) => f.required)
          .map((field) => {
            const hasFile = !!files[field.key];
            return (
              <Box key={`file:${field.key}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasFile ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={hasFile ? 'text.primary' : 'error.main'}
                >
                  {field.label}
                </Typography>
              </Box>
            );
          })}

        {/* Asset readiness */}
        {assetDef
          ?.filter((def) => def.required)
          .map((def) => {
            const matching = workspaceAssets.filter((a) => a.assetType === def.assetType);
            const selected = selectedAssets.filter((id) => matching.some((a) => a.id === id));
            const hasAssets = selected.length > 0;
            const label = `${def.assetType}${matching.length > 1 ? ` (${selected.length}/${matching.length})` : ''}`;
            return (
              <Box key={`asset:${def.assetType}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasAssets ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={hasAssets ? 'text.primary' : 'error.main'}
                >
                  {label}
                </Typography>
              </Box>
            );
          })}
      </Stack>
      {textReady && filesReady && assetsReady && hasAnyRequired && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 500 }}>
          {copy.t('toolPage.readiness.allReady')}
        </Typography>
      )}
    </Box>
  );
}
