import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, Button } from '@mui/material';
import { useState, useEffect } from 'react';
import type { WorkspaceDTO } from '@flow-app/contracts';
import { WORKSPACE_ACCENTS } from '../../theme/WorkspaceAccentProvider';
import { copy } from '@flow-app/copy';

interface WorkspaceFormProps {
  open: boolean;
  workspace?: WorkspaceDTO;
  onClose: () => void;
  onSave: (data: { name: string; accentColor: string }) => Promise<void>;
}

/** 10 named accent colors for dot labels (matches WORKSPACE_ACCENTS order) */
const ACCENT_NAMES: Record<string, string> = {
  '#2563eb': 'Blue',
  '#7c3aed': 'Violet',
  '#059669': 'Emerald',
  '#dc2626': 'Red',
  '#d97706': 'Amber',
  '#0891b2': 'Teal',
  '#ea580c': 'Orange',
  '#4f46e5': 'Indigo',
  '#db2777': 'Pink',
  '#65a30d': 'Lime',
};

export function WorkspaceForm({ open, workspace, onClose, onSave }: WorkspaceFormProps) {
  const isEdit = !!workspace;
  const [name, setName] = useState('');
  const [accentColor, setAccentColor] = useState<string>(WORKSPACE_ACCENTS[0]);
  const [saving, setSaving] = useState(false);

  // Reset form state when dialog opens or workspace changes
  useEffect(() => {
    if (open) {
      setName(workspace?.name ?? '');
      setAccentColor(workspace?.accentColor ?? WORKSPACE_ACCENTS[0]);
      setSaving(false);
    }
  }, [open, workspace]);

  const isValid = name.trim().length >= 2 && name.trim().length <= 50;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), accentColor });
      onClose();
    } catch {
      // error handled by global handler
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEdit ? copy.t('workspace.form.editTitle') : copy.t('workspace.form.createTitle')}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={copy.t('workspace.list.createLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          inputProps={{ minLength: 2, maxLength: 50 }}
          sx={{ mt: 1 }}
        />

        <Box sx={{ mt: 2 }}>
          <Box component="label" sx={{ display: 'block', fontSize: '0.75rem', mb: 0.5, color: 'text.secondary' }}>
            {copy.t('workspace.form.accentLabel')}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} role="radiogroup" aria-label={copy.t('workspace.form.accentLabel')}>
            {WORKSPACE_ACCENTS.map((color) => {
              const selected = accentColor === color;
              return (
                <Box
                  key={color}
                  component="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAccentColor(color)}
                  title={ACCENT_NAMES[color] ?? color}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: selected ? '2px solid' : '2px solid transparent',
                    borderColor: selected ? 'grey.900' : 'transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    '&:hover': { transform: 'scale(1.2)' },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                    p: 0,
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{copy.t('shared.actions.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid || saving}>
          {saving ? copy.t('shared.status.loading') : copy.t('shared.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}