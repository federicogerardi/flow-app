import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography,
} from '@mui/material';
import { copy } from '@flow-app/copy';
import { api } from '../../api/client';
import { ASSET_TYPE_LABELS, ASSET_NAME_PLACEHOLDERS } from '../../constants/assets';

interface PromoteDialogProps {
  open: boolean;
  onClose: () => void;
  artifactId: string;
  workspaceId: string;
  /** The asset type this promotion will produce (e.g., "persona", "brief") */
  assetType: string;
  onPromoted: (assetId: string, assetType: string, name: string | null) => void;
}

type State = 'idle' | 'loading' | 'error';

export function PromoteDialog({
  open, onClose, artifactId, workspaceId, assetType, onPromoted,
}: PromoteDialogProps) {
  const [name, setName] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const typeLabel = ASSET_TYPE_LABELS[assetType] ?? assetType;
  const placeholder = ASSET_NAME_PLACEHOLDERS[assetType] ?? '';

  const handleClose = () => {
    if (state === 'loading') return;
    setName('');
    setState('idle');
    setErrorMsg('');
    onClose();
  };

  const handlePromote = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const result = await api.promoteArtifact(artifactId, workspaceId, name || undefined);
      const finalName = name.trim() || null;
      onPromoted(result.assetId, result.assetType, finalName);
      handleClose();
    } catch {
      setState('error');
      setErrorMsg(copy.t('shared.status.error'));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {copy.t('toolPage.promote.title', { type: typeLabel })}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={copy.t('toolPage.promote.nameFieldLabel')}
          placeholder={copy.t('toolPage.promote.namePlaceholder', { placeholder })}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePromote(); }}
          disabled={state === 'loading'}
          inputProps={{ maxLength: 80 }}
          sx={{ mt: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {copy.t('toolPage.promote.nameHelperText')}
        </Typography>
        {state === 'error' && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }} role="alert">
            {errorMsg}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={state === 'loading'}>
          {copy.t('shared.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handlePromote}
          disabled={state === 'loading'}
        >
          {state === 'loading'
            ? copy.t('toolPage.promote.saving')
            : copy.t('toolPage.promote.confirmCta')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}