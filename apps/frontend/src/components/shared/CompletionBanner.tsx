import { Box, Typography, Stack, keyframes } from '@mui/material';
import { copy } from '@flow-app/copy';
import { formatElapsedSeconds } from '../../shared/session-utils';

const celebrate = keyframes`
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
`;

interface CompletionBannerProps {
  durationSeconds: number;
  stepCount: number;
  creditCost: number;
  xpEarned?: number;
}

export function CompletionBanner({ durationSeconds, stepCount, creditCost, xpEarned }: CompletionBannerProps) {
  return (
    <Box
      role="alert"
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #047857 0%, #0E7490 100%)',
        color: 'white',
        animation: `${celebrate} 500ms ease-out`,
        mb: 3,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5" component="span" aria-hidden="true">✅</Typography>
        <Stack>
          <Typography variant="h6" fontWeight={700}>
            {copy.t('toolPage.progress.completedIn', { duration: formatElapsedSeconds(durationSeconds) })}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {copy.t('toolPage.progress.stepCountSummary', { count: String(stepCount) })} · {copy.t('toolPage.progress.creditCostSummary', { count: String(creditCost) })}
            {xpEarned && xpEarned > 0 ? ` · ${copy.t('shared.session.xpEarned', { xp: String(xpEarned) })}` : ''}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}