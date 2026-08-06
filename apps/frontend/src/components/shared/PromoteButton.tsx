import { Button, Tooltip } from '@mui/material';
import { useState } from 'react';
import PushPinIcon from '@mui/icons-material/PushPin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { copy } from '@flow-app/copy';
import { PromoteDialog } from './PromoteDialog';

interface PromoteButtonProps {
  artifactId: string;
  workspaceId: string;
  produces?: string;
  /** If already promoted, the Asset UUID. Causes the button to render in "done" state on mount. */
  promotedAssetId?: string | null;
  onPromoted?: (assetId: string, assetType: string, name: string | null) => void;
}

export function PromoteButton({ artifactId, workspaceId, produces, promotedAssetId, onPromoted }: PromoteButtonProps) {
  const [state, setState] = useState<'idle' | 'done'>(
    promotedAssetId ? 'done' : 'idle',
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!produces) return null;

  if (state === 'done') {
    return (
      <Button
        variant="outlined"
        size="small"
        color="success"
        startIcon={<CheckCircleIcon />}
        disabled
      >
        {copy.t('notifications.asset.promoted')}
      </Button>
    );
  }

  return (
    <>
      <Tooltip title={copy.t('shared.actions.promote')}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PushPinIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {copy.t('shared.actions.promote')}
        </Button>
      </Tooltip>

      <PromoteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        artifactId={artifactId}
        workspaceId={workspaceId}
        assetType={produces}
        onPromoted={(assetId, assetType, name) => {
          setState('done');
          onPromoted?.(assetId, assetType, name);
        }}
      />
    </>
  );
}