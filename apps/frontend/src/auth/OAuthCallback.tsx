import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { setAccessToken } from './AuthContext';

export function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    // Strip token from browser history immediately to prevent credential
    // leakage via proxy logs, back-button navigation, or referrer headers.
    window.history.replaceState({}, '', window.location.pathname);

    if (error) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (token) {
      // Store the access token in memory so the API client can use it.
      // The backend also set the refresh_token httpOnly cookie during the
      // OAuth callback. When AuthProvider mounts on the next page, it will
      // attempt silent refresh via the cookie and get fresh tokens + user.
      setAccessToken(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Completing sign in...
      </Typography>
    </Box>
  );
}