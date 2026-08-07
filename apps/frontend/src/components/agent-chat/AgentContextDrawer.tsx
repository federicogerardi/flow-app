import { Drawer, Box, Typography, IconButton, List, ListItem, ListItemText, Chip, Link } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api, type AgentDTO } from '../../api/client';
import { statusColorMap } from '../../shared/statusColors';

const EXPECTED_ASSET_TYPES = ['brief', 'brand-voice', 'persona', 'angle', 'ad-copy'] as const;

const ASSET_LABELS: Record<string, string> = {
  'brief': 'Brief',
  'brand-voice': 'Brand Voice',
  'persona': 'Persona',
  'angle': 'Angle',
  'ad-copy': 'Ad Copy',
};

const ASSET_TOOL_MAP: Record<string, string> = {
  'brief': 'brief',
  'brand-voice': 'brand-voice',
  'persona': 'buyer-persona',
  'angle': 'marketing-angle',
  'ad-copy': 'ad-copy',
};

interface AgentContextDrawerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  /** When provided, filters context to this agent's relevant assets */
  agent?: AgentDTO | null;
}

export function AgentContextDrawer({ open, onClose, workspaceId, agent }: AgentContextDrawerProps) {
  const navigate = useNavigate();

  const { data: assetsData } = useSWR(
    open ? `assets-${workspaceId}-ctx` : null,
    () => api.listAssets(workspaceId),
  );
  const { data: sessionsData } = useSWR(
    open ? `sessions-${workspaceId}-ctx` : null,
    () => api.listSessions({ workspaceId, limit: 5 }),
  );

  const assets = assetsData?.assets ?? [];
  const presentTypes = new Set(assets.map((a) => a.assetType));
  const sessions = sessionsData?.data ?? [];

  // Filter asset types when agent is provided
  const filteredAssetTypes = agent
    ? EXPECTED_ASSET_TYPES.filter((_type) => {
        // Show assets relevant to the agent's tools
        // For now, show all — can be refined with agent.capabilities mapping
        return true;
      })
    : [...EXPECTED_ASSET_TYPES];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} aria-labelledby="context-drawer-title">
      <Box sx={{ width: 320, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600} id="context-drawer-title">
            {agent ? `${agent.name} Context` : 'Context'}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close context drawer">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Assets (M10) — per-type with preview/deeplink */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InventoryIcon fontSize="small" color="action" aria-hidden="true" />
            <Typography variant="subtitle2" fontWeight={600}>Workspace Assets</Typography>
          </Box>
          <List dense disablePadding>
            {filteredAssetTypes.map((type) => {
              const present = presentTypes.has(type);
              return (
                <ListItem key={type} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {present ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 14 }} aria-hidden="true" />
                        ) : (
                          <AddCircleOutlineIcon color="disabled" sx={{ fontSize: 14 }} aria-hidden="true" />
                        )}
                        <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                          {ASSET_LABELS[type]}
                        </Typography>
                      </Box>
                    }
                    primaryTypographyProps={{ variant: 'body2', fontSize: '0.8rem' }}
                  />
                  {present ? (
                    <Link
                      component="button"
                      variant="caption"
                      onClick={() => {
                        onClose();
                        navigate(`/workspaces/${workspaceId}/assets`);
                      }}
                      underline="hover"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      View →
                    </Link>
                  ) : (
                    <Chip
                      label="Generate →"
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        onClose();
                        navigate(`/workspaces/${workspaceId}/tools/${ASSET_TOOL_MAP[type]}`);
                      }}
                      sx={{ height: 22, fontSize: '0.65rem', cursor: 'pointer' }}
                    />
                  )}
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Recent Sessions */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HistoryIcon fontSize="small" color="action" aria-hidden="true" />
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
