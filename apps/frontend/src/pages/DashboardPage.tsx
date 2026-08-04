import { Box, Card, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, MenuItem, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import Grid from '@mui/material/Grid2';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import useSWR, { mutate } from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ToolCard } from '../components/tool/ToolCard';
import { SessionList } from '../components/workspace/SessionList';
import { QuickGenerateBar } from '../components/shared/QuickGenerateBar';
import { AssetCoverageBar } from '../components/workspace/AssetCoverageBar';
import { copy } from '@flow-app/copy';

const TOOLS = [
  { key: 'blog-post', name: 'Blog Post', description: 'SEO-optimized blog article', icon: '📝' },
  { key: 'landing-funnel', name: 'Landing Funnel', description: 'Landing page + opt-in + quiz + VSL', icon: '🎯' },
  { key: 'landing-page', name: 'Landing Page', description: 'Landing page + thank-you', icon: '📄' },
  { key: 'video-script-long-form', name: 'Video Script', description: 'Long-form video script', icon: '🎬' },
  { key: 'video-description', name: 'Video Description', description: 'YouTube video description', icon: '📺' },
  { key: 'ad-copy', name: 'Ad Copy', description: 'Ad copy for paid campaigns', icon: '📢' },
  { key: 'brief', name: 'Brief', description: 'Marketing brief', icon: '📋' },
  { key: 'brand-voice', name: 'Brand Voice', description: 'Brand voice guidelines', icon: '🗣️' },
  { key: 'buyer-persona', name: 'Buyer Persona', description: 'Target audience persona', icon: '👤' },
  { key: 'marketing-angle', name: 'Marketing Angle', description: 'Strategic marketing angle', icon: '💡' },
  { key: 'ai-overview-analysis', name: 'AI Overview Analysis', description: 'Google AI Overview presence analysis', icon: '🔍' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspaces, isLoading, error } = useSWR('workspaces', () => api.listWorkspaces());

  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);

  // Rename state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async () => {
    if (!renameValue.trim() || !workspaceId) return;
    setRenaming(true);
    try {
      await api.renameWorkspace(workspaceId, renameValue.trim());
      await mutate('workspaces');
      setRenameOpen(false);
      setRenameValue('');
    } catch {
      // handled by global error handler
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    setDeleting(true);
    try {
      await api.deleteWorkspace(workspaceId);
      navigate('/dashboard');
    } catch {
      // handled by global error handler
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!currentWorkspace) {
    return (
      <EmptyState
        title={copy.t('workspace.switcher.selectWorkspace')}
        message={copy.t('workspace.switcher.noWorkspaces')}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={currentWorkspace.name}
        subtitle={copy.t('workspace.dashboard.subtitle')}
        action={{ label: 'Modifica', onClick: () => setRenameOpen(true) }}
      />

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename Workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleRename} disabled={!renameValue.trim() || renaming}>
            {renaming ? copy.t('shared.status.loading') : copy.t('shared.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{copy.t('workspace.detail.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deleting "{currentWorkspace.name}" will remove all assets, sessions, and conversations. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? copy.t('shared.status.loading') : copy.t('shared.actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* WARNING: destructive, no undo */}
      <Button
        variant="outlined"
        color="error"
        size="small"
        startIcon={<DeleteIcon />}
        onClick={() => setDeleteOpen(true)}
      >
        Delete workspace
      </Button>

      {/* M21: Reorder per WorkspaceDashboard spec: QuickGenerate → Sessions → ReadyToPromote → Coverage → Tools */}
      <Box sx={{ mt: 3 }}>
        <QuickGenerateBar workspaceId={workspaceId!} />
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.recentSessions')}
        </Typography>
        <SessionList workspaceId={workspaceId!} />
      </Box>

      <Box sx={{ mb: 4, mt: 4 }}>
        <AssetCoverageBar workspaceId={workspaceId!} />
      </Box>

      <Typography variant="h3" sx={{ mb: 2 }}>
        {copy.t('workspace.dashboard.tools')}
      </Typography>
      <Grid container spacing={2}>
        {TOOLS.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.key}>
            <ToolCard
              toolKey={tool.key}
              name={tool.name}
              description={tool.description}
              icon={tool.icon}
              workspaceId={workspaceId!}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <WorkspaceMembers workspaceId={workspaceId!} />
      </Box>
    </Box>
  );
}

function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
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

  if (isLoading) return <LoadingSkeleton />;
  if (!members || members.length === 0) return null;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">
          {copy.t('workspace.detail.members', { count: String(members.length) })}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
        >
          Invite
        </Button>
      </Box>
      <Card>
        <List disablePadding>
          {members.map((m, i) => (
            <ListItem key={m.userId} divider={i < members.length - 1}>
              <ListItemText
                primary={m.userId}
                secondary={`${m.role} · ${m.status}`}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small" onClick={() => handleRemove(m.userId)} aria-label="Remove member">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Card>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
            sx={{ mt: 1 }}
          />
          <TextField
            select
            fullWidth
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            sx={{ mt: 2 }}
          >
            <MenuItem value="editor">Editor</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
            {inviting ? copy.t('shared.status.loading') : 'Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
