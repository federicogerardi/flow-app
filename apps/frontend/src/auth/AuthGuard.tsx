import { Navigate, Outlet } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './AuthContext';

function FullPageSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export function AuthGuard() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}