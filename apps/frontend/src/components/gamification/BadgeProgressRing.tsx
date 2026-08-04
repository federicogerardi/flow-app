import { Box, Typography, CircularProgress } from '@mui/material';

interface BadgeProgressRingProps {
  progress: number; // 0-100
  label: string;
  size?: number;
}

export function BadgeProgressRing({ progress, label, size = 48 }: BadgeProgressRingProps) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={size}
          sx={{ color: 'action.hover', position: 'absolute' }}
        />
        <CircularProgress
          variant="determinate"
          value={Math.min(progress, 100)}
          size={size}
          color={progress >= 100 ? 'success' : 'primary'}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" fontWeight={700} fontSize="0.65rem">
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem', textAlign: 'center' }}>
        {label}
      </Typography>
    </Box>
  );
}
