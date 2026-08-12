import { Box, Card, CardContent, Typography, Button, LinearProgress, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { copy } from '@flow-app/copy';
import type { SessionListItemDTO } from '@flow-app/contracts';
import { formatToolLabel, formatElapsedSeconds } from '../../shared/session-utils';

interface RunningCardProps {
  session: SessionListItemDTO;
  onViewProgress?: () => void;
  onCancel?: () => void;
}

export function RunningCard({ session, onViewProgress, onCancel }: RunningCardProps) {
  const toolLabel = formatToolLabel(session.toolKey);
  const completedSteps = session.currentStepIndex ?? 0;
  const progressValue = completedSteps > 0 && session.stepCount > 0
    ? (completedSteps / session.stepCount) * 100
    : 0;

  return (
    <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'primary.main' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Chip label={copy.t('shared.sessionStatus.running')} size="small" color="primary" variant="outlined" />
        </Box>

        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'action.hover' }}
          aria-label={copy.t('shared.aria.runningProgress', { current: String(completedSteps), total: String(session.stepCount) })}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <CheckCircleIcon color="success" fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            {copy.t('toolPage.progress.stepLabel', {
              current: String(completedSteps),
              total: String(session.stepCount),
            })}
            {session.currentStepLabel ? ` · ${session.currentStepLabel}` : ''}
          </Typography>
          {session.elapsedSeconds !== undefined && (
            <Typography variant="caption" color="text.secondary" role="timer" aria-label={copy.t('toolPage.progress.elapsedTime', { mins: String(Math.floor(session.elapsedSeconds / 60)), secs: String(session.elapsedSeconds % 60) })}>
              · {formatElapsedSeconds(session.elapsedSeconds)}
            </Typography>
          )}
        </Box>

        {session.lastArtifactPreview && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}>
            {session.lastArtifactPreview}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onViewProgress && (
            <Button size="small" variant="text" onClick={onViewProgress} aria-label={copy.t('shared.actions.viewSession')}>
              {copy.t('shared.actions.viewSession')}
            </Button>
          )}
          {onCancel && (
            <Button size="small" color="error" variant="text" onClick={onCancel} aria-label={copy.t('shared.actions.cancel')}>
              {copy.t('shared.actions.cancel')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
