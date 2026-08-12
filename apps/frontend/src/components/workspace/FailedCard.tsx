import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { copy } from '@flow-app/copy';
import type { SessionListItemDTO } from '@flow-app/contracts';
import { formatToolLabel } from '../../shared/session-utils';

interface FailedCardProps {
  session: SessionListItemDTO;
  onRetry?: () => void;
}

export function FailedCard({ session, onRetry }: FailedCardProps) {
  const toolLabel = formatToolLabel(session.toolKey);

  return (
    <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'error.main' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Chip
            icon={<ErrorIcon />}
            label={copy.t('shared.sessionStatus.failed')}
            size="small"
            color="error"
            variant="outlined"
          />
        </Box>

        <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 0.5 }}>
          {session.errorMessage ?? copy.t('shared.status.error')}
          {session.failedAtStep !== undefined ? copy.t('shared.session.failedAtStep', { step: String(session.failedAtStep) }) : ''}
        </Typography>

        {onRetry && (
          <Button size="small" variant="text" onClick={onRetry} aria-label={copy.t('shared.actions.retry')}>
            {copy.t('shared.actions.retry')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
