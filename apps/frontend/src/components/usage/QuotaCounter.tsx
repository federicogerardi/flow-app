import { Box, LinearProgress, Typography, Tooltip, Chip, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import useSWR from 'swr';
import { api } from '../../api/client';
import { copy } from '@flow-app/copy';

interface QuotaResponse {
  credits: { used: number; limit: number; remaining: number; percent: number };
  artifacts: { used: number; limit: number; remaining: number };
  plan: string;
  period: string;
}

export function QuotaCounter() {
  const { data, isLoading } = useSWR<QuotaResponse>('usage-credits', () =>
    api.request<QuotaResponse>('GET', '/api/usage/credits'),
  );

  if (isLoading || !data) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const { credits, artifacts } = data;
  const artifactsLow = artifacts.remaining < artifacts.limit * 0.1;
  const creditsLow = credits.remaining <= 10;

  return (
    <Box sx={{ px: 2, py: 1 }}>
      {/* Credits */}
      <Tooltip
        title={`${credits.used}/${credits.limit} ${copy.t('usage.credits.label')} — ${data.period}`}
        placement="right"
      >
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {copy.t('usage.credits.label')}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              color={creditsLow ? 'error.main' : 'text.secondary'}
            >
              {credits.remaining}/{credits.limit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={credits.percent}
            color={creditsLow ? 'error' : 'primary'}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          />
        </Box>
      </Tooltip>

      {/* Artifact Gate */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {copy.t('usage.artifacts.label')}
        </Typography>
        {artifactsLow ? (
          <Chip
            icon={<WarningIcon />}
            label={`${artifacts.remaining}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' } }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {artifacts.remaining}
          </Typography>
        )}
      </Box>

      {/* Quota exceeded banner */}
      {credits.remaining <= 0 && (
        <Alert severity="error" sx={{ mt: 1, py: 0 }} icon={false}>
          <Typography variant="caption" fontWeight={600}>
            {copy.t('usage.quota.exhausted')}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
