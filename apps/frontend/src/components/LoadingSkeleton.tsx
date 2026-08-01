import { Box, Skeleton, Stack } from '@mui/material';

export function LoadingSkeleton() {
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
