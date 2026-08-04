import { AppBar, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Button, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Avatar, Menu, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import { Outlet, useNavigate, useParams } from 'react-router';
import useSWR, { mutate } from 'swr';
import { api } from '../api/client';
import { useWorkspaceAccent } from '../theme/WorkspaceAccentProvider';
import { copy } from '@flow-app/copy';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { QuotaCounter } from '../components/usage/QuotaCounter';

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
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { label: copy.t('workspace.nav.team'), icon: <PeopleIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/team` : '/dashboard' },
  ];

  const secondaryItems = [
    { label: copy.t('workspace.nav.templates'), icon: <DescriptionIcon />, path: '#', disabled: true },
    { label: copy.t('workspace.nav.audit'), icon: <HistoryIcon />, path: '#', disabled: true },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" role="banner" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/dashboard')}>
            flow app
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          {/* User Menu */}
          {user && (
            <>
              <IconButton
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                aria-label="User menu"
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: accent,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {user.email.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 200, mt: 1 } } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {user.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.role}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    logout().then(() => navigate('/login'));
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        role="navigation"
        aria-label="Main navigation"
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
            aria-label="Select workspace"
            inputProps={{ 'aria-label': 'Current workspace' }}
            renderValue={(selected) => {
              if (!selected) return <em style={{ opacity: 0.5 }}>{copy.t('workspace.switcher.selectWorkspace')}</em>;
              const ws = workspaces?.find((w) => w.id === selected);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                  <Typography variant="body2" noWrap>{ws?.name ?? selected}</Typography>
                </Box>
              );
            }}
          >
            {workspaces?.map((ws) => (
              <MenuItem key={ws.id} value={ws.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                  {ws.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
          <IconButton size="small" onClick={() => setCreateOpen(true)} aria-label={copy.t('workspace.list.createCta')} title={copy.t('workspace.list.createCta')}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mx: 2 }} />

        {/* Quota counter */}
        <QuotaCounter />

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

      <Box component="main" role="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
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
