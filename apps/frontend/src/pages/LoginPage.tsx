import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { TextField, Button, Alert, Typography, Divider, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already authenticated — redirect to dashboard
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      footer={
        <Typography variant="body2" color="text.secondary">
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: 'inherit', fontWeight: 500 }}>
            Sign up
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          fullWidth
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          fullWidth
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !email.trim() || !password}
          sx={{ py: 1.2, mt: 1 }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <Divider sx={{ my: 1 }}>or</Divider>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          sx={{ py: 1.2 }}
        >
          Sign in with Google
        </Button>
      </Box>
    </AuthLayout>
  );
}