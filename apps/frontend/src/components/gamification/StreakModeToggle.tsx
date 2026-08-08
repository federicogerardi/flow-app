import { ToggleButton, ToggleButtonGroup, Typography, Box, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { copy } from '@flow-app/copy';

type StreakMode = 'daily' | 'business';

export function StreakModeToggle() {
  const [mode, setMode] = useState<StreakMode>('daily');
  const [loading, setLoading] = useState(true);
  const [persisting, setPersisting] = useState(false);

  useEffect(() => {
    api.getPlayerProfile()
      .then((profile) => {
        const savedMode = (profile as unknown as Record<string, unknown>).streakMode as StreakMode | undefined;
        if (savedMode === 'daily' || savedMode === 'business') {
          setMode(savedMode);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (_: React.MouseEvent<HTMLElement>, v: StreakMode | null) => {
    if (!v || v === mode) return;
    setMode(v);
    setPersisting(true);
    try {
      await api.request('PUT', '/api/me/profile', { streakMode: v });
    } catch {
      setMode(mode);
    } finally {
      setPersisting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={16} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        {copy.t('gamification.streakMode.label')}
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleChange}
        size="small"
        fullWidth
        disabled={persisting}
      >
        <ToggleButton value="daily" sx={{ py: 0.25, textTransform: 'none', fontSize: '0.75rem' }}>
          {copy.t('gamification.streakMode.daily')}
        </ToggleButton>
        <ToggleButton value="business" sx={{ py: 0.25, textTransform: 'none', fontSize: '0.75rem' }}>
          {copy.t('gamification.streakMode.business')}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}