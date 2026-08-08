import { Button, Tooltip, Box, Typography } from '@mui/material';
import { useState } from 'react';
import PushPinIcon from '@mui/icons-material/PushPin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { copy } from '@flow-app/copy';
import { api } from '../../api/client';

interface PromoteButtonProps {
  artifactId: string;
  workspaceId: string;
  produces?: string;
  /** If already promoted, the Asset UUID. Causes the button to render in "done" state on mount. */
  promotedAssetId?: string | null;
  onPromoted?: (assetId: string, assetType: string, name: string | null) => void;
}

export function PromoteButton({ artifactId, workspaceId, produces, promotedAssetId, onPromoted }: PromoteButtonProps) {
  const [state, setState] = useState<'idle' | 'confirming' | 'promoting' | 'done'>(
    promotedAssetId ? 'done' : 'idle',
  );

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

  if (state === 'confirming') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {copy.t('notifications.asset.promoteConfirm')}
        </Typography>
        <Button
          size="small"
          variant="contained"
          onClick={async () => {
            setState('promoting');
            try {
              const result = await api.promoteArtifact(artifactId, workspaceId);
              setState('done');
              onPromoted?.(result.assetId, result.assetType, result.name);
            } catch {
              setState('idle');
            }
          }}
        >
          {copy.t('shared.actions.confirm')}
        </Button>
        <Button size="small" variant="text" onClick={() => setState('idle')}>
          {copy.t('shared.actions.cancel')}
        </Button>
      </Box>
    );
  }

  return (
    <Tooltip title={copy.t('shared.actions.promote')}>
      <Button
        variant="contained"
        size="small"
        startIcon={<PushPinIcon />}
        onClick={() => setState('confirming')}
      >
        {copy.t('shared.actions.promote')}
      </Button>
    </Tooltip>
  );
}
