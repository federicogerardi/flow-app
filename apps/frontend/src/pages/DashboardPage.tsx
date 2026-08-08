import { Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import useSWR, { mutate } from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { WorkspaceDashboard } from '../components/workspace/WorkspaceDashboard';
import { WorkspaceForm } from '../components/workspace/WorkspaceForm';
import { ShareMembersDialog } from '../components/workspace/ShareMembersDialog';
import { copy } from '@flow-app/copy';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspaces, isLoading, error } = useSWR('workspaces', () => api.listWorkspaces());

  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async (data: { name: string; accentColor: string }) => {
    if (!workspaceId) return;
    await api.updateWorkspace(workspaceId, data);
    await mutate('workspaces');
    setRenameOpen(false);
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
        actions={[
          { icon: <PeopleIcon fontSize="small" />, label: copy.t('workspace.header.shareMembersTooltip'), onClick: () => setMembersOpen(true) },
          { icon: <EditIcon fontSize="small" />, label: copy.t('workspace.header.edit'), onClick: () => setRenameOpen(true) },
          { icon: <DeleteIcon fontSize="small" />, label: copy.t('workspace.header.delete'), onClick: () => setDeleteOpen(true), color: 'error' },
        ]}
      />

      {/* Rename Dialog — via WorkspaceForm in edit mode */}
      <WorkspaceForm
        open={renameOpen}
        workspace={currentWorkspace}
        onClose={() => setRenameOpen(false)}
        onSave={handleRename}
      />

      {/* Share & Members Dialog */}
      <ShareMembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        workspaceId={workspaceId!}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{copy.t('workspace.detail.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {copy.t('shared.label.deleteWorkspaceWarning', { name: currentWorkspace.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? copy.t('shared.status.loading') : copy.t('shared.actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <WorkspaceDashboard workspaceId={workspaceId!} />
    </Box>
  );
}