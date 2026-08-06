import { Button, Tooltip } from '@mui/material';
import { useState } from 'react';
import PushPinIcon from '@mui/icons-material/PushPin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../../api/client';
import { copy } from '@flow-app/copy';

interface PromoteButtonProps {
  artifactId: string;
  workspaceId: string;
  produces?: string;
  /** If already promoted, the Asset UUID. Causes the button to render in "done" state on mount. */
  promotedAssetId?: string | null;
  onPromoted?: (assetId: string, assetType: string) => void;
}

export function PromoteButton({ artifactId, workspaceId, produces, promotedAssetId, onPromoted }: PromoteButtonProps) {
  // If already promoted, start in "done" state (persistent across page refreshes)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    promotedAssetId ? 'done' : 'idle',
  );

  // Only show for tools that produce a promotable asset
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

  const handlePromote = async () => {
    setState('loading');
    try {
      const result = await api.promoteArtifact(artifactId, workspaceId);
      setState('done');
      onPromoted?.(result.assetId, result.assetType);
    } catch {
      setState('error');
    }
  };

  return (
    <Tooltip title={copy.t('shared.actions.promote')}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PushPinIcon />}
        onClick={handlePromote}
        disabled={state === 'loading'}
        color={state === 'error' ? 'error' : 'primary'}
      >
        {state === 'loading' ? '...' : state === 'error' ? copy.t('shared.actions.retry') : copy.t('shared.actions.promote')}
      </Button>
    </Tooltip>
  );
}