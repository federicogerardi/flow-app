import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import { copy } from '@flow-app/copy';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface QueuedCardProps {
  session: SessionListItemDTO;
  onCancel?: () => void;
}

export function QueuedCard({ session, onCancel }: QueuedCardProps) {
  const toolLabel = session.toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card variant="outlined" sx={{ opacity: 0.7 }}>
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip label={copy.t('shared.sessionStatus.queued')} size="small" color="default" variant="outlined" />
            <Typography variant="body2" color="text.secondary">
              {session.queuePosition !== undefined
                ? copy.t('shared.session.queuePosition', { position: String(session.queuePosition) })
                : copy.t('shared.status.loading')}
            </Typography>
          </Box>
        </Box>
        {onCancel && (
          <Button size="small" color="error" variant="text" onClick={onCancel} aria-label={copy.t('shared.actions.cancel')}>
            {copy.t('shared.actions.cancel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
