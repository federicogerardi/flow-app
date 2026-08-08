import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api, type PlayerProfileDTO } from '../../api/client';
import { copy } from '@flow-app/copy';

export function GamificationZone() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useSWR<PlayerProfileDTO>('player-profile', () =>
    api.getPlayerProfile(),
  );

  if (isLoading) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!profile) return null;

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        cursor: 'pointer',
        transition: 'bgcolor 150ms ease',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => navigate('/profile')}
      role="button"
      tabIndex={0}
      aria-label={`Player profile: Level ${profile.level} ${profile.levelLabel}, ${profile.xpTotal} XP, ${profile.currentStreak}-day streak, ${profile.badges.length} badges`}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/profile'); }}
    >
      {/* Stat chips row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Chip
          label={`Lv.${profile.level}`}
          size="small"
          color="primary"
          variant="filled"
          sx={{ height: 22, fontWeight: 600, fontSize: '0.7rem' }}
        />
        <Chip
          icon={<WhatshotIcon sx={{ fontSize: 14 }} />}
          label={`${profile.currentStreak}`}
          size="small"
          color={profile.currentStreak >= 7 ? 'warning' : 'default'}
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
          aria-label={copy.t('gamification.zone.streakAriaLabel', { count: String(profile.currentStreak) })}
        />
        <Chip
          icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
          label={`${profile.badges.length}`}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
      </Box>

      {/* Ultra-compact XP bar — 3px */}
      <LinearProgress
        variant="determinate"
        value={Math.min(profile.levelProgress, 100)}
        color={profile.levelProgress >= 80 ? 'success' : 'primary'}
        sx={{ height: 3, borderRadius: 1, mb: 0.25, bgcolor: 'action.hover' }}
        role="progressbar"
        aria-valuenow={profile.xpTotal}
        aria-valuemin={0}
        aria-valuemax={profile.nextLevelXP}
        aria-label={`XP: ${profile.xpTotal} of ${profile.nextLevelXP}`}
      />

      {/* XP caption */}
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
        {profile.xpTotal} / {profile.nextLevelXP} XP
      </Typography>
    </Box>
  );
}