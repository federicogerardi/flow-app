import { Box, Typography, LinearProgress, Chip, Stack, Tooltip } from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api, type PlayerProfileDTO } from '../../api/client';

function LevelBadge({ profile }: { profile: PlayerProfileDTO }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 1.5 }}>
      <Typography variant="h5" fontWeight={700} color="primary.main">
        Lv.{profile.level}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {profile.levelLabel}
      </Typography>
    </Box>
  );
}

function XPBar({ profile }: { profile: PlayerProfileDTO }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          XP
        </Typography>
        <Typography variant="caption" fontWeight={600}>
          {profile.xpTotal} / {profile.nextLevelXP}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(profile.levelProgress, 100)}
        color={profile.levelProgress >= 80 ? 'success' : 'primary'}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
      />
    </Box>
  );
}

function StreakBadge({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }) {
  return (
    <Tooltip title={`Longest streak: ${longestStreak} days`}>
      <Chip
        icon={<WhatshotIcon sx={{ fontSize: 16 }} />}
        label={`${currentStreak}`}
        size="small"
        color={currentStreak >= 7 ? 'warning' : 'default'}
        variant="outlined"
        sx={{ height: 24, fontWeight: 600 }}
      />
    </Tooltip>
  );
}

function BadgeList({ badges }: { badges: PlayerProfileDTO['badges'] }) {
  if (badges.length === 0) return null;
  const latest = badges.slice(-3).reverse();
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        Recent Badges
      </Typography>
      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
        {latest.map((b) => (
          <Tooltip key={b.badgeKey} title={b.badgeKey.replace(/-/g, ' ')}>
            <Chip
              icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
              label={b.badgeKey.split('-').pop()}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 22 }}
            />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );
}

export function GamificationZone() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useSWR<PlayerProfileDTO>('player-profile', () =>
    api.getPlayerProfile(),
  );

  if (isLoading) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!profile) return null;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 1,
        mx: 1,
        bgcolor: 'action.hover',
        cursor: 'pointer',
        transition: 'bgcolor 150ms ease',
        '&:hover': { bgcolor: 'action.selected' },
      }}
      onClick={() => navigate('/profile')}
      role="button"
      tabIndex={0}
      aria-label="View player profile"
      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/profile'); }}
    >
      <LevelBadge profile={profile} />
      <XPBar profile={profile} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StreakBadge currentStreak={profile.currentStreak} longestStreak={profile.longestStreak} />
        <Typography variant="caption" color="text.secondary">
          {profile.badges.length} badges
        </Typography>
      </Box>
      <BadgeList badges={profile.badges} />
    </Box>
  );
}
