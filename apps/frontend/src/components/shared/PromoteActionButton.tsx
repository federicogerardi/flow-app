import type { MouseEventHandler } from 'react';
import { Button } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { copy } from '@flow-app/copy';

interface PromoteActionButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Visual variant. Default 'contained' for primary surfaces;
   *  use 'outlined' for compact list rows. */
  variant?: 'contained' | 'outlined';
}

/**
 * Unified "Promote to asset" action button.
 * Shared across PromoteButton (SessionDetail), CompletedCard (SessionList),
 * and ReadyToPromoteList (WorkspaceDashboard).
 */
export function PromoteActionButton({ onClick, variant = 'contained' }: PromoteActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="small"
      startIcon={<PushPinIcon />}
      onClick={onClick}
    >
      {copy.t('shared.actions.promote')}
    </Button>
  );
}