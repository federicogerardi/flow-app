import { Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { copy } from '@flow-app/copy';

/**
 * Non-interactive indicator showing "Promosso ad asset" in green outlined style.
 * Uses pointer-events: none (not MUI disabled) to preserve the success color.
 * Shared across PromoteButton, CompletedCard, and ReadyToPromoteList.
 */
export function PromotedBadge() {
  return (
    <Button
      variant="outlined"
      size="small"
      color="success"
      startIcon={<CheckCircleIcon />}
      sx={{ pointerEvents: 'none' }}
    >
      {copy.t('notifications.asset.promoted')}
    </Button>
  );
}