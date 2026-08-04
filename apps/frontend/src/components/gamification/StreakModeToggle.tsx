import { ToggleButton, ToggleButtonGroup, Typography, Box } from '@mui/material';
import { useState } from 'react';

type StreakMode = 'daily' | 'business';

export function StreakModeToggle() {
  const [mode, setMode] = useState<StreakMode>('daily');

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Streak mode
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && setMode(v as StreakMode)}
        size="small"
        fullWidth
      >
        <ToggleButton value="daily" sx={{ py: 0.25, textTransform: 'none', fontSize: '0.75rem' }}>
          Daily
        </ToggleButton>
        <ToggleButton value="business" sx={{ py: 0.25, textTransform: 'none', fontSize: '0.75rem' }}>
          Business days
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
