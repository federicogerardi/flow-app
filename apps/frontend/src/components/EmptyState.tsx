import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ title, message, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
        {message}
      </Typography>
      {ctaLabel && onCta && (
        <Button variant="outlined" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </Box>
  );
}
