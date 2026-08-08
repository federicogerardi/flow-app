import { Box, Typography, keyframes } from '@mui/material';
import { copy } from '@flow-app/copy';

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export function LevelUpBanner({ level, label }: { level: number; label: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        color: 'white',
        animation: `${slideIn} 400ms ease-out`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Typography variant="h4" component="span">🎉</Typography>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          {copy.t('gamification.toasts.levelUp', { level: String(level), label })}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {copy.t('gamification.toasts.levelUpSubtitle')}
        </Typography>
      </Box>
    </Box>
  );
}
