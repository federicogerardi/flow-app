import { Box, Typography, Button, Alert } from '@mui/material';
import { copy } from '@flow-app/copy';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = copy.t('shared.status.error'), message, onRetry }: ErrorStateProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
      <Alert severity="error" sx={{ mb: 2, maxWidth: 500 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2">{message}</Typography>
      </Alert>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {copy.t('shared.actions.retry')}
        </Button>
      )}
    </Box>
  );
}
