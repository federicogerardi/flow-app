import { Box, Typography, LinearProgress, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { copy } from '@flow-app/copy';

interface StepProgressData {
  current: number;
  total: number;
}

interface FeedbackPanelProps {
  progress: StepProgressData | null;
  status: string;
}

function StepIndicator({ index, isCompleted, isActive }: { index: number; isCompleted: boolean; isActive: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 1,
        transition: 'all 200ms ease',
        bgcolor: isActive ? 'action.selected' : 'transparent',
        opacity: isCompleted || isActive ? 1 : 0.4,
      }}
    >
      {isCompleted ? (
        <CheckCircleIcon color="success" fontSize="small" />
      ) : isActive ? (
        <Box sx={{ position: 'relative', width: 20, height: 20 }}>
          <LinearProgress
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              '& .MuiLinearProgress-bar': { borderRadius: '50%' },
            }}
          />
        </Box>
      ) : (
        <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
      )}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          fontWeight={isActive ? 600 : 400}
          color={isCompleted ? 'success.main' : isActive ? 'text.primary' : 'text.disabled'}
        >
          {copy.t('toolPage.progress.stepLabel', { current: String(index + 1), total: String(index + 1) })}
        </Typography>
      </Box>
    </Box>
  );
}

export function FeedbackPanel({ progress, status }: FeedbackPanelProps) {
  if (status === 'completed' || status === 'failed') {
    return null; // SessionSummary handles final state
  }

  if (!progress) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <LinearProgress sx={{ width: '60%', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {copy.t('toolPage.progress.starting')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box role="status" aria-live="polite">
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {copy.t('toolPage.progress.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress.current}/{progress.total}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(progress.current / progress.total) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
          }}
        />
      </Box>

      <Stack spacing={0.5}>
        {Array.from({ length: progress.total }, (_, i) => (
          <StepIndicator
            key={i}
            index={i}
            isCompleted={i < progress.current}
            isActive={i === progress.current}
          />
        ))}
      </Stack>
    </Box>
  );
}
