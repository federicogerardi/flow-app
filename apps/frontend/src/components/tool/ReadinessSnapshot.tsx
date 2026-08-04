import { Box, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { TextInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';

interface ReadinessSnapshotProps {
  inputs: Record<string, string>;
  toolDef: TextInput[];
}

export function ReadinessSnapshot({ inputs, toolDef }: ReadinessSnapshotProps) {
  const allReady = toolDef.every((f) => !f.required || inputs[f.key]?.trim());

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {copy.t('toolPage.readiness.title')}
      </Typography>
      <Stack spacing={0.5}>
        {toolDef
          .filter((f) => f.required)
          .map((field) => {
            const hasValue = inputs[field.key]?.trim();
            return (
              <Box key={field.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
      </Stack>
      {allReady && toolDef.some((f) => f.required) && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 500 }}>
          {copy.t('toolPage.readiness.allReady')}
        </Typography>
      )}
    </Box>
  );
}
