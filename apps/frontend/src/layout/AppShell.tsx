import { AppBar, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Button, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { Outlet, useNavigate, useParams } from 'react-router';
import useSWR, { mutate } from 'swr';
import { api } from '../api/client';
import { useWorkspaceAccent } from '../theme/WorkspaceAccentProvider';
import { copy } from '@flow-app/copy';
import { useState } from 'react';

const DRAWER_WIDTH = 280;

function NavItem({ icon, label, path, disabled }: { icon: React.ReactNode; label: string; path: string; disabled?: boolean }) {
  const navigate = useNavigate();
  return (
    <ListItemButton onClick={() => !disabled && navigate(path)} disabled={disabled} sx={{ borderRadius: 1, mx: 0.5 }}>
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText primary={label} />
      {disabled && <Chip label="soon" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
    </ListItemButton>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const { workspaceId: activeWorkspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspaces } = useSWR('workspaces', () => api.listWorkspaces());
  const accent = useWorkspaceAccent();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleWorkspaceChange = (newId: string) => {
    navigate(`/workspaces/${newId}`);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await api.createWorkspace(newName.trim());
      await mutate('workspaces');
      setCreateOpen(false);
      setNewName('');
      navigate(`/workspaces/${ws.id}`);
    } catch {
      // error handled by global error handler
    } finally {
      setCreating(false);
    }
  };

  const navItems = [
    { label: copy.t('workspace.nav.home'), icon: <DashboardIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : '/dashboard' },
    { label: copy.t('workspace.nav.tools'), icon: <BuildIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/tools/blog-post` : '/dashboard' },
    { label: copy.t('workspace.nav.sessions'), icon: <PlayCircleIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : '/dashboard' },
    { label: copy.t('workspace.nav.assets'), icon: <InventoryIcon />, path: '#', disabled: true },
    { label: copy.t('workspace.nav.team'), icon: <PeopleIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/conversations` : '/dashboard' },
  ];

  const secondaryItems = [
    { label: copy.t('workspace.nav.templates'), icon: <DescriptionIcon />, path: '#', disabled: true },
    { label: copy.t('workspace.nav.audit'), icon: <HistoryIcon />, path: '#', disabled: true },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/dashboard')}>
            flow app
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar />

        {/* Workspace Switcher + Create */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Select
            fullWidth
            size="small"
            value={activeWorkspaceId ?? ''}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) return <em style={{ opacity: 0.5 }}>{copy.t('workspace.switcher.selectWorkspace')}</em>;
              const ws = workspaces?.find((w: any) => w.id === selected);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                  <Typography variant="body2" noWrap>{ws?.name ?? selected}</Typography>
                </Box>
              );
            }}
          >
            {workspaces?.map((ws: any) => (
              <MenuItem key={ws.id} value={ws.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                  {ws.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
          <IconButton size="small" onClick={() => setCreateOpen(true)} title={copy.t('workspace.list.createCta')}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mx: 2 }} />

        {/* Primary Navigation */}
        <Box sx={{ overflow: 'auto', flexGrow: 1, pt: 1 }}>
          <List dense>
            {navItems.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}
          </List>

          <Divider sx={{ mx: 2, my: 1 }} />

          <List dense>
            {secondaryItems.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}
          </List>
        </Box>

        {/* Quick Generate CTA */}
        <Box sx={{ px: 2, py: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            disabled={!activeWorkspaceId}
            onClick={() => activeWorkspaceId && navigate(`/workspaces/${activeWorkspaceId}/tools/blog-post`)}
            sx={{
              bgcolor: accent,
              '&:hover': { bgcolor: 'primary.dark' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {copy.t('workspace.nav.newGeneration')}
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{copy.t('workspace.list.createCta')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={copy.t('workspace.list.createLabel')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{copy.t('shared.actions.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim() || creating}>
            {creating ? copy.t('shared.status.loading') : copy.t('shared.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
