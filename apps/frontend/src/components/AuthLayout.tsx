import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              mb: 0.5,
              fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
            }}
          >
            flow app
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 3 }}
          >
            {title}
          </Typography>

          {children}
        </CardContent>

        {footer && (
          <Box
            sx={{
              px: 4,
              pb: 3,
              textAlign: 'center',
            }}
          >
            {footer}
          </Box>
        )}
      </Card>
    </Box>
  );
}