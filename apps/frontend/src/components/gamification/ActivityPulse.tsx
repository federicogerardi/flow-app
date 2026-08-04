import { Box, Typography, keyframes } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

interface ActivityPulseProps {
  activeUsers: string[];
}

export function ActivityPulse({ activeUsers }: ActivityPulseProps) {
  if (activeUsers.length === 0) return null;

  const text =
    activeUsers.length === 1
      ? `${activeUsers[0]} is working`
      : `${activeUsers.slice(0, 2).join(' and ')} are working`;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <CircleIcon
        sx={{
          fontSize: 8,
          color: 'success.main',
          animation: `${pulse} 2s ease-in-out infinite`,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}
