import { Button, Tooltip } from '@mui/material';
import { useState } from 'react';
import PushPinIcon from '@mui/icons-material/PushPin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../../api/client';
import { copy } from '@flow-app/copy';

interface PromoteButtonProps {
  artifactId: string;
  assetType?: string;
  workspaceId: string;
  onPromoted?: () => void;
}

export function PromoteButton({ artifactId, assetType = 'ad-copy', workspaceId, onPromoted }: PromoteButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  if (state === 'done') {
    return (
      <Button
        variant="outlined"
        size="small"
        color="success"
        startIcon={<CheckCircleIcon />}
        disabled
      >
        Promoted
      </Button>
    );
  }

  const handlePromote = async () => {
    setState('loading');
    try {
      await api.promoteArtifact(artifactId, assetType, workspaceId);
      setState('done');
      onPromoted?.();
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
        {state === 'loading' ? '...' : state === 'error' ? 'Retry' : copy.t('shared.actions.promote')}
      </Button>
    </Tooltip>
  );
}
