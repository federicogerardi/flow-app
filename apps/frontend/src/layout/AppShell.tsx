import { AppBar, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Button, IconButton, Avatar, Menu, MenuItem, useMediaQuery, Popover, Chip } from '@mui/material';
import type { Theme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Outlet, useNavigate, useParams } from 'react-router';
import useSWR, { mutate } from 'swr';
import { api } from '../api/client';
import { useWorkspaceAccent, useSetAccent } from '../theme/WorkspaceAccentProvider';
import { useThemeMode } from '../theme/ThemeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { QuotaCounter } from '../components/usage/QuotaCounter';
import { GamificationZone } from '../components/gamification/GamificationZone';
import { WorkspaceForm } from '../components/workspace/WorkspaceForm';
import { copy } from '@flow-app/copy';
import { useState, createContext, useContext } from 'react';
import { useAuth } from '../auth/AuthContext';
import { WorkspaceCard } from '../components/workspace/WorkspaceCard';

interface Crumb {
  label: string;
  path?: string;
}

interface BreadcrumbContextValue {
  crumbs: Crumb[];
  setBreadcrumbs: (crumbs: Crumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  crumbs: [],
  setBreadcrumbs: () => {},
});

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}

const DRAWER_WIDTH = 280;

function NavItem({ icon, label, path, disabled, collapsed }: { icon: React.ReactNode; label: string; path: string; disabled?: boolean; collapsed?: boolean }) {
  const navigate = useNavigate();
  return (
    <ListItemButton onClick={() => !disabled && navigate(path)} disabled={disabled} sx={{ borderRadius: 1, mx: 0.5, justifyContent: 'flex-start', px: 1.5 }}>
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        sx={{
          visibility: collapsed ? 'hidden' : 'visible',
          width: collapsed ? 0 : 'auto',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          m: 0,
        }}
      />
      {disabled && !collapsed && <Chip label={copy.t('shared.status.soon')} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
    </ListItemButton>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const { workspaceId: activeWorkspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspaces } = useSWR('workspaces', () => api.listWorkspaces());
  const accent = useWorkspaceAccent();
  const setAccent = useSetAccent();
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));

  const [createOpen, setCreateOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [wsSwitcherAnchor, setWsSwitcherAnchor] = useState<HTMLElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleWorkspaceChange = (newId: string) => {
    navigate(`/workspaces/${newId}`);
  };

  const currentWidth = sidebarCollapsed ? 60 : DRAWER_WIDTH;

  const handleCreate = async (data: { name: string; accentColor: string }) => {
    const ws = await api.createWorkspace(data.name, data.accentColor);
    await mutate('workspaces');
    setAccent(data.accentColor);
    setCreateOpen(false);
    navigate(`/workspaces/${ws.id}`);
  };

  const navItems = [
    { label: copy.t('workspace.nav.home'), icon: <DashboardIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : '/dashboard' },
    { label: copy.t('workspace.nav.sessions'), icon: <PlayCircleIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/sessions` : '/dashboard' },
    { label: copy.t('workspace.nav.assets'), icon: <InventoryIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/assets` : '/dashboard' },
    { label: copy.t('workspace.nav.team'), icon: <PeopleIcon />, path: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/team` : '/dashboard' },
  ];

  const secondaryItems = [
    { label: copy.t('workspace.nav.templates'), icon: <DescriptionIcon />, path: '/templates' },
    { label: copy.t('workspace.nav.audit'), icon: <HistoryIcon />, path: '/audit' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip to content — WCAG 2.1 AA */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: 9999,
          px: 2,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          textDecoration: 'none',
          fontWeight: 600,
          '&:focus': { left: 8 },
        }}
      >
        {copy.t('shared.wcag.skipToContent')}
      </Box>
      <AppBar position="fixed" role="banner" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? copy.t('shared.aria.closeMenu') : copy.t('shared.aria.openMenu')}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/dashboard')}>
            flow app
          </Typography>

          {/* Collapse sidebar toggle */}
          {isDesktop && (
            <IconButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? copy.t('shared.aria.expandSidebar') : copy.t('shared.aria.collapseSidebar')}
              size="small"
              sx={{ ml: 1 }}
            >
              {sidebarCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Dark Mode Toggle */}
          <IconButton
            onClick={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
            aria-label={copy.t('shared.aria.toggleTheme')}
            title={`${copy.t('shared.label.theme')}: ${mode}`}
            sx={{ mr: 0.5 }}
          >
            {mode === 'light' ? <LightModeIcon fontSize="small" /> : mode === 'dark' ? <DarkModeIcon fontSize="small" /> : <SettingsBrightnessIcon fontSize="small" />}
          </IconButton>

          {/* User Menu */}
          {user && (
            <>
              <IconButton
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                aria-label={copy.t('shared.aria.userMenu')}
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
                  {copy.t('shared.actions.logout')}
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
        aria-label={copy.t('shared.aria.mainNavigation')}
        sx={{
          width: currentWidth,
          flexShrink: 0,
          transition: 'width 200ms ease',
          [`& .MuiDrawer-paper`]: {
            width: currentWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: 'width 200ms ease',
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />

        {/* Primary Navigation — FIRST, anchored to top, never shifts */}
        <Box sx={{ pt: 1 }}>
          <List dense>
            {navItems.map((item) => (
              <NavItem key={item.label} {...item} collapsed={sidebarCollapsed} />
            ))}
          </List>

          <Divider sx={{ mx: 2, my: 1 }} />

          <List dense>
            {secondaryItems.map((item) => (
              <NavItem key={item.label} {...item} collapsed={sidebarCollapsed} />
            ))}
          </List>
        </Box>

        {/* Flexible spacer — pushes secondary content to bottom */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Secondary content — workspace context + gamification + CTA
            Hidden when collapsed: disappears below nav so icons never drift */}
        {!sidebarCollapsed && (
          <Box>
            <Divider sx={{ mx: 2 }} />

            {/* Credits quota */}
            <QuotaCounter />

            {/* Gamification */}
            <GamificationZone />

            <Divider sx={{ mx: 2 }} />

            {/* Workspace Switcher + Create — footer area with breathing room */}
            <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                onClick={(e) => setWsSwitcherAnchor(e.currentTarget)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'text.primary',
                  borderColor: 'divider',
                  px: 1.5,
                }}
              >
                {activeWorkspaceId && workspaces ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                    <Typography variant="body2" noWrap>
                      {workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? activeWorkspaceId}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" noWrap sx={{ opacity: 0.5 }}>
                    {copy.t('workspace.switcher.selectWorkspace')}
                  </Typography>
                )}
              </Button>
              <IconButton size="small" onClick={() => setCreateOpen(true)} aria-label={copy.t('workspace.list.createCta')} title={copy.t('workspace.list.createCta')}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Workspace Switcher Popover */}
            <Popover
              open={Boolean(wsSwitcherAnchor)}
              anchorEl={wsSwitcherAnchor}
              onClose={() => setWsSwitcherAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{ paper: { sx: { width: DRAWER_WIDTH - 32, p: 1 } } }}
            >
              {workspaces?.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  id={ws.id}
                  name={ws.name}
                  memberCount={1}
                  isActive={ws.id === activeWorkspaceId}
                  accentColor={accent}
                  onClick={() => {
                    setWsSwitcherAnchor(null);
                    handleWorkspaceChange(ws.id);
                  }}
                />
              ))}
            </Popover>
          </Box>
        )}
      </Drawer>

      <Box component="main" role="main" id="main-content" sx={{ flexGrow: 1, p: 3, mt: 8, transition: 'margin-left 200ms ease' }}>
        <BreadcrumbContext.Provider value={{ crumbs, setBreadcrumbs: setCrumbs }}>
          <Outlet />
        </BreadcrumbContext.Provider>
      </Box>

      {/* Create Workspace Dialog — via WorkspaceForm */}
      <WorkspaceForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />
    </Box>
  );
}