import { Box, Button, Card, List, ListItem, ListItemText, ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api } from '../../api/client';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { copy } from '@flow-app/copy';

interface ShareMembersDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function ShareMembersDialog({ open, onClose, workspaceId }: ShareMembersDialogProps) {
  const { data: members, isLoading } = useSWR(
    `members-${workspaceId}`,
    () => api.listWorkspaceMembers(workspaceId),
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('editor');
      await mutate(`members-${workspaceId}`);
    } catch {
      // error handled by global handler
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeMember(workspaceId, userId);
      await mutate(`members-${workspaceId}`);
    } catch {
      // error handled by global handler
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{copy.t('workspace.header.shareMembers')}</DialogTitle>
      <DialogContent>
        {/* Invite section */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            {copy.t('shared.actions.invite')}
          </Button>
        </Box>

        {/* Members list */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : !members || members.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {copy.t('workspace.sessions.emptyInProgress')}
          </Typography>
        ) : (
          <Card variant="outlined">
            <List disablePadding>
              {members.map((m, i) => (
                <ListItem key={m.userId} divider={i < members.length - 1}>
                  <ListItemText
                    primary={m.userId}
                    secondary={`${m.role} · ${m.status}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small" onClick={() => handleRemove(m.userId)} aria-label={copy.t('shared.aria.removeMember')}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Card>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{copy.t('shared.actions.close')}</Button>
      </DialogActions>

      {/* Invite sub-dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{copy.t('workspace.detail.inviteMember')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={copy.t('shared.form.email')}
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
            sx={{ mt: 1 }}
          />
          <TextField
            select
            fullWidth
            label={copy.t('shared.form.role')}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            sx={{ mt: 2 }}
          >
            <MenuItem value="editor">{copy.t('shared.roles.editor')}</MenuItem>
            <MenuItem value="viewer">{copy.t('shared.roles.viewer')}</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
            {inviting ? copy.t('shared.status.loading') : copy.t('shared.actions.invite')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}