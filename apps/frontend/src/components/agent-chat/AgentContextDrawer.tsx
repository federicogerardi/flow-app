import { Drawer, Box, Typography, IconButton, List, ListItem, ListItemText, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import HistoryIcon from '@mui/icons-material/History';
import useSWR from 'swr';
import { api } from '../../api/client';
import { statusColorMap } from '../../shared/statusColors';

interface AgentContextDrawerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function AgentContextDrawer({ open, onClose, workspaceId }: AgentContextDrawerProps) {
  const { data: assetsData } = useSWR(
    open ? `assets-${workspaceId}-ctx` : null,
    () => api.listAssets(workspaceId),
  );
  const { data: sessionsData } = useSWR(
    open ? `sessions-${workspaceId}-ctx` : null,
    () => api.listSessions({ workspaceId, limit: 5 }),
  );

  const assets = assetsData?.assets ?? [];
  const sessions = sessionsData?.data ?? [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Context</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        {/* Assets */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InventoryIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>Workspace Assets</Typography>
          </Box>
          {assets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No assets yet</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {assets.map((a) => (
                <Chip key={a.id} label={a.assetType} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </Box>

        {/* Recent Sessions */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HistoryIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>Recent Sessions</Typography>
          </Box>
          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No sessions yet</Typography>
          ) : (
            <List dense disablePadding>
              {sessions.map((s) => (
                <ListItem key={s.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemText
                    primary={s.toolKey}
                    secondary={new Date(s.createdAt).toLocaleDateString()}
                    primaryTypographyProps={{ variant: 'body2', fontSize: '0.8rem' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip
                    label={s.status}
                    color={statusColorMap[s.status] ?? 'default'}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
