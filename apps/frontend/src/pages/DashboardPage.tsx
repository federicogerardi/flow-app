import { Box, Card, CardActionArea, CardContent, Chip, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
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
import { copy } from '@flow-app/copy';
import { statusColorMap } from '../shared/statusColors';

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
      />

      <Typography variant="h3" sx={{ mb: 2 }}>
        {copy.t('workspace.dashboard.tools')}
      </Typography>
      <Grid container spacing={2}>
        {TOOLS.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.key}>
            <Card>
              <CardActionArea
                onClick={() => navigate(`/workspaces/${workspaceId}/tools/${tool.key}`)}
                sx={{ p: 2 }}
              >
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {tool.icon} {tool.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.recentSessions')}
        </Typography>
        <RecentSessions workspaceId={workspaceId!} />
      </Box>

      <Box sx={{ mt: 4 }}>
        <WorkspaceMembers workspaceId={workspaceId!} />
      </Box>
    </Box>
  );
}

function RecentSessions({ workspaceId }: { workspaceId: string }) {
  const { data: sessions, isLoading } = useSWR(
    `sessions-${workspaceId}`,
    () => api.listSessions({ workspaceId }),
  );

  if (isLoading) return <LoadingSkeleton />;
  if (!sessions || sessions.data.length === 0) {
    return <EmptyState title={copy.t('workspace.detail.noSessions')} message={copy.t('workspace.dashboard.noSessions')} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sessions.data.map((s) => (
        <Card key={s.id} variant="outlined">
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {s.toolKey}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(s.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={s.status}
              color={statusColorMap[s.status] ?? 'default'}
              size="small"
            />
          </CardContent>
        </Card>
      ))}
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
