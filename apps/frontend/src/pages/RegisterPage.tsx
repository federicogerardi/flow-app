import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { TextField, Button, Alert, Typography, Box } from '@mui/material';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';
import { copy } from '@flow-app/copy';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(copy.t('auth.register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.t('auth.register.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.t('auth.register.genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={copy.t('auth.register.title')}
      footer={
        <Typography variant="body2" color="text.secondary">
          {copy.t('auth.register.hasAccount')}{' '}
          <Link to="/login" style={{ color: 'inherit', fontWeight: 500 }}>
            {copy.t('auth.register.signIn')}
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        <TextField
          label={copy.t('auth.register.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          fullWidth
        />

        <TextField
          label={copy.t('auth.register.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          helperText={copy.t('auth.register.helperText')}
          fullWidth
        />

        <TextField
          label={copy.t('auth.register.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          fullWidth
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !email.trim() || !password || !confirmPassword}
          sx={{ py: 1.2, mt: 1 }}
        >
          {loading ? copy.t('auth.register.loading') : copy.t('auth.register.submit')}
        </Button>
      </Box>
    </AuthLayout>
  );
}