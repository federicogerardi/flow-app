import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button,
} from '@mui/material';
import { copy } from '@flow-app/copy';
import { api } from '../../api/client';

interface RenameAssetDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  assetId: string;
  currentName: string | null;
  assetType: string;
  onRenamed: (newName: string) => void;
}

export function RenameAssetDialog({
  open, onClose, workspaceId, assetId, currentName, assetType: _assetType, onRenamed,
}: RenameAssetDialogProps) {
  const [name, setName] = useState(currentName ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setName(currentName ?? '');
  }, [open, currentName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      await api.updateAsset(workspaceId, assetId, { name: trimmed });
      onRenamed(trimmed);
      onClose();
    } catch {
      // handled by global error handler
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{copy.t('workspace.assets.renameTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={copy.t('workspace.assets.renameLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          disabled={loading}
          inputProps={{ maxLength: 80 }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {copy.t('shared.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || loading}
        >
          {loading ? copy.t('shared.status.loading') : copy.t('shared.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}