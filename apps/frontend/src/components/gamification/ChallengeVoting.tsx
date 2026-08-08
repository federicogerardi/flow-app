import { Box, Typography, Card, CardContent, LinearProgress, Stack } from '@mui/material';
import useSWR from 'swr';
import { api, type ChallengeDTO } from '../../api/client';
import { copy } from '@flow-app/copy';

interface ChallengeVotingProps {
  workspaceId: string;
}

function ChallengeCard({ challenge }: { challenge: ChallengeDTO }) {
  const progress = challenge.target > 0 ? Math.round((challenge.progress / challenge.target) * 100) : 0;
  const isActive = challenge.status === 'active';

  return (
    <Card variant="outlined" sx={{ opacity: isActive ? 1 : 0.5 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {challenge.key.replace(/-/g, ' ')}
          </Typography>
          <Typography variant="caption" color={isActive ? 'primary.main' : 'text.disabled'}>
            {challenge.progress}/{challenge.target}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(progress, 100)}
          sx={{ height: 4, borderRadius: 2 }}
          color={progress >= 100 ? 'success' : 'primary'}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {isActive ? copy.t('gamification.challenges.activeLabel') : copy.t('gamification.challenges.completedLabel')} · {copy.t('gamification.challenges.weekOf', { date: new Date(challenge.weekStart).toLocaleDateString() })}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function ChallengeVoting({ workspaceId }: ChallengeVotingProps) {
  const { data } = useSWR(
    workspaceId ? `challenges-${workspaceId}` : null,
    () => api.getChallenges(workspaceId!),
  );

  const challenges = data?.challenges ?? [];
  if (challenges.length === 0) return null;

  const active = challenges.filter((c) => c.status === 'active');
  const completed = challenges.filter((c) => c.status === 'completed');

  return (
    <Box>
      {active.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {copy.t('gamification.challenges.activeChallenges')}
          </Typography>
          <Stack spacing={1}>
            {active.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </Stack>
        </>
      )}
      {completed.length > 0 && (
        <Box sx={{ mt: active.length > 0 ? 2 : 0 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            {copy.t('gamification.challenges.completedChallenges')}
          </Typography>
          <Stack spacing={0.5}>
            {completed.slice(0, 3).map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
