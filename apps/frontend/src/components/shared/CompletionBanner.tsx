import { Box, Typography, Stack, keyframes } from '@mui/material';

const celebrate = keyframes`
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
`;

interface CompletionBannerProps {
  durationSeconds: number;
  stepCount: number;
  creditCost: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

export function CompletionBanner({ durationSeconds, stepCount, creditCost }: CompletionBannerProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
        color: 'white',
        animation: `${celebrate} 500ms ease-out`,
        mb: 3,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5" component="span">✅</Typography>
        <Stack>
          <Typography variant="h6" fontWeight={700}>
            Completed in {formatDuration(durationSeconds)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {stepCount} step{stepCount !== 1 ? 's' : ''} · {creditCost} credit{creditCost !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
