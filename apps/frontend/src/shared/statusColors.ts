import type { ChipProps } from '@mui/material';

export const statusColorMap: Record<string, ChipProps['color']> = {
  draft: 'default',
  ready: 'info',
  queued: 'warning',
  running: 'primary',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
} as const;
