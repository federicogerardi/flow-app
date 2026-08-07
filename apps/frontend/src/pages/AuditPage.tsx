import { Box, Typography } from '@mui/material';

export default function AuditPage() {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>Audit Log</Typography>
      <Typography variant="body1" color="text.secondary">
        Audit log is coming soon.
      </Typography>
    </Box>
  );
}
