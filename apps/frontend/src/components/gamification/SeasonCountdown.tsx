import { Chip, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import useSWR from 'swr';
import { api, type SeasonDTO } from '../../api/client';

export function SeasonCountdown() {
  const { data: season } = useSWR<SeasonDTO>('current-season', () => api.getCurrentSeason());

  if (!season) return null;

  const endDate = new Date(season.endDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Tooltip title={`Season: ${season.label} (Q${season.quarter} ${season.year}) · Ends ${endDate.toLocaleDateString()}`}>
      <Chip
        icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
        label={`${daysLeft}d`}
        size="small"
        variant="outlined"
        color={daysLeft <= 7 ? 'warning' : 'default'}
        sx={{ height: 24, fontWeight: 600 }}
      />
    </Tooltip>
  );
}
