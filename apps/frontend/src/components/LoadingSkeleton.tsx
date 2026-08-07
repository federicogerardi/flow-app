import { Box, Skeleton, Stack } from '@mui/material';
import Grid from '@mui/material/Grid2';

export type SkeletonVariant = 'dashboard' | 'card-grid' | 'list' | 'tool-page' | 'session-detail' | 'team-hub' | 'conversation' | 'profile';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
}

function DashboardSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function CardGridSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={140} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="30%" height={40} />
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="rounded" width="100%" height={120} />
        <Skeleton variant="rounded" width="100%" height={120} />
      </Stack>
    </Box>
  );
}

function ToolPageSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Skeleton variant="text" width="50%" height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={120} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="40%" height={36} />
    </Box>
  );
}

function SessionDetailSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={200} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={200} />
    </Box>
  );
}

function TeamHubSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {[0, 1, 2].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={160} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function ConversationSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Stack spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
            <Skeleton variant="rounded" width="60%" height={60} sx={{ borderRadius: 2 }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function ProfileSkeleton() {
  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={64} height={64} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="30%" height={20} />
        </Box>
      </Box>
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={80} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

const VARIANT_MAP: Record<SkeletonVariant, () => React.ReactElement> = {
  dashboard: DashboardSkeleton,
  'card-grid': CardGridSkeleton,
  list: ListSkeleton,
  'tool-page': ToolPageSkeleton,
  'session-detail': SessionDetailSkeleton,
  'team-hub': TeamHubSkeleton,
  conversation: ConversationSkeleton,
  profile: ProfileSkeleton,
};

export function LoadingSkeleton({ variant = 'list' }: LoadingSkeletonProps) {
  const SkeletonComponent = VARIANT_MAP[variant] ?? ListSkeleton;
  return <SkeletonComponent />;
}
