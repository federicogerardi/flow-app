import type { ChipProps } from '@mui/material';

export const statusColorMap: Record<string, ChipProps['color']> = {
  draft: 'default',
  queued: 'warning',
  running: 'primary',
  completed: 'success',
  failed: 'error',
} as const;
