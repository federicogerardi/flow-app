import { Box, Card, CardContent, Typography, Button, LinearProgress, Chip } from '@mui/material';
import { copy } from '@flow-app/copy';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface RunningCardProps {
  session: SessionListItemDTO;
  onViewProgress?: () => void;
  onCancel?: () => void;
}

function formatElapsed(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

export function RunningCard({ session, onViewProgress, onCancel }: RunningCardProps) {
  const toolLabel = session.toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const progressValue = session.currentStepIndex !== undefined && session.stepCount > 0
    ? ((session.currentStepIndex + 1) / session.stepCount) * 100
    : 0;

  return (
    <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'primary.main' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Chip label="Running" size="small" color="primary" variant="outlined" />
        </Box>

        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{ height: 6, borderRadius: 3, mb: 1, bgcolor: 'action.hover' }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Step {(session.currentStepIndex ?? 0) + 1}/{session.stepCount}
            {session.currentStepLabel ? ` · ${session.currentStepLabel}` : ''}
            {session.elapsedSeconds !== undefined ? ` · ${formatElapsed(session.elapsedSeconds)}` : ''}
          </Typography>
        </Box>

        {session.lastArtifactPreview && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}>
            {session.lastArtifactPreview}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onViewProgress && (
            <Button size="small" variant="text" onClick={onViewProgress}>
              View progress
            </Button>
          )}
          {onCancel && (
            <Button size="small" color="error" variant="text" onClick={onCancel}>
              {copy.t('shared.actions.cancel')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
