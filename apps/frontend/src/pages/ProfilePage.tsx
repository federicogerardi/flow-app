import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import Grid from '@mui/material/Grid2';
import useSWR from 'swr';
import { api, type PlayerProfileDTO } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { BadgeProgressRing } from '../components/gamification/BadgeProgressRing';
import { SeasonCountdown } from '../components/gamification/SeasonCountdown';
import { StreakModeToggle } from '../components/gamification/StreakModeToggle';
import { copy } from '@flow-app/copy';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function ProfilePage() {
  const { data: profile, isLoading } = useSWR<PlayerProfileDTO>('player-profile', () =>
    api.getPlayerProfile(),
  );

  if (isLoading) return <LoadingSkeleton />;
  if (!profile) return <LoadingSkeleton />;

  return (
    <Box>
      <PageHeader title={copy.t('profile.title')} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 2 }}>{copy.t('profile.stats.title')}</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{copy.t('profile.stats.level')}</Typography>
                  <Typography fontWeight={600}>{copy.t('profile.stats.levelFormat', { level: String(profile.level), label: profile.levelLabel })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{copy.t('profile.stats.totalXP')}</Typography>
                  <Typography fontWeight={600}>{profile.xpTotal}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{copy.t('profile.stats.nextLevel')}</Typography>
                  <Typography fontWeight={600}>{copy.t('profile.stats.xpFormat', { xp: String(profile.nextLevelXP) })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>{copy.t('profile.stats.streak')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatshotIcon color="warning" fontSize="small" />
                    <Typography fontWeight={600}>{copy.t('profile.stats.streakFormat', { count: String(profile.currentStreak) })}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{copy.t('profile.stats.longestStreak')}</Typography>
                  <Typography fontWeight={600}>{copy.t('profile.stats.streakFormat', { count: String(profile.longestStreak) })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{copy.t('profile.stats.badges')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEventsIcon color="primary" fontSize="small" />
                    <Typography fontWeight={600}>{profile.badges.length}</Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 2 }}>{copy.t('profile.badges.title')}</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <BadgeProgressRing progress={profile.badges.length * 10} label={copy.t('profile.badges.label')} />
                  <BadgeProgressRing progress={Math.min(profile.levelProgress, 100)} label={copy.t('profile.stats.nextLevel')} />
                  <BadgeProgressRing progress={Math.min(profile.currentStreak * 3, 100)} label={copy.t('profile.stats.streak')} />
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3">{copy.t('profile.season.title')}</Typography>
                  <SeasonCountdown />
                </Box>
                <StreakModeToggle />
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}