import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import Grid from '@mui/material/Grid2';
import useSWR from 'swr';
import { api, type PlayerProfileDTO } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { BadgeProgressRing } from '../components/gamification/BadgeProgressRing';
import { SeasonCountdown } from '../components/gamification/SeasonCountdown';
import { StreakModeToggle } from '../components/gamification/StreakModeToggle';
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
      <PageHeader title="Profile" />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 2 }}>Player Stats</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Level</Typography>
                  <Typography fontWeight={600}>Lv.{profile.level} — {profile.levelLabel}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Total XP</Typography>
                  <Typography fontWeight={600}>{profile.xpTotal}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Next Level</Typography>
                  <Typography fontWeight={600}>{profile.nextLevelXP} XP</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Streak</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatshotIcon color="warning" fontSize="small" />
                    <Typography fontWeight={600}>{profile.currentStreak} days</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Longest Streak</Typography>
                  <Typography fontWeight={600}>{profile.longestStreak} days</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Badges</Typography>
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
                <Typography variant="h3" sx={{ mb: 2 }}>Badge Progress</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <BadgeProgressRing progress={profile.badges.length * 10} label="Badges" />
                  <BadgeProgressRing progress={Math.min(profile.levelProgress, 100)} label="Next Level" />
                  <BadgeProgressRing progress={Math.min(profile.currentStreak * 3, 100)} label="Streak" />
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3">Season</Typography>
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
