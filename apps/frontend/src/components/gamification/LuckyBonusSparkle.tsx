import { Box, Typography, keyframes } from '@mui/material';
import { copy } from '@flow-app/copy';

const sparkle = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

export function LuckyBonusSparkle({ amount }: { amount: number }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        color: 'white',
        animation: `${sparkle} 400ms ease-in-out 2`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Typography variant="h5" component="span">✨</Typography>
      <Box>
        <Typography variant="body2" fontWeight={700}>
          {copy.t('gamification.toasts.luckyBonus', { amount: String(amount) })}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {copy.t('gamification.toasts.luckyBonusSubtitle')}
        </Typography>
      </Box>
    </Box>
  );
}
