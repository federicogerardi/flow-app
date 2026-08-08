import { Box, Typography, keyframes } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { copy } from '@flow-app/copy';

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
      ? copy.t('gamification.activity.workingSingular', { name: activeUsers[0] })
      : copy.t('gamification.activity.workingPlural', { names: activeUsers.slice(0, 2).join(' e ') });

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
