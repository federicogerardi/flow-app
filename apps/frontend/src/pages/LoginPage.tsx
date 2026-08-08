import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { TextField, Button, Alert, Typography, Divider, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';
import { copy } from '@flow-app/copy';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.t('auth.login.genericError'));
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <AuthLayout
      title={copy.t('auth.login.title')}
      footer={
        <Typography variant="body2" color="text.secondary">
          {copy.t('auth.login.noAccount')}{' '}
          <Link to="/register" style={{ color: 'inherit', fontWeight: 500 }}>
            {copy.t('auth.login.signUp')}
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        <TextField
          label={copy.t('auth.login.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          fullWidth
        />

        <TextField
          label={copy.t('auth.login.password')}
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
          {loading ? copy.t('auth.login.loading') : copy.t('auth.login.submit')}
        </Button>

        <Divider sx={{ my: 1 }}>{copy.t('auth.login.divider')}</Divider>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          sx={{ py: 1.2 }}
        >
          {copy.t('auth.login.google')}
        </Button>
      </Box>
    </AuthLayout>
  );
}