import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { authApi } from '../../services/api';

export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(t('forgotPassword.rateLimit'));
      } else {
        setError(err.response?.data?.error || err.message || t('forgotPassword.errorFallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: 6 }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>{t('forgotPassword.successTitle')}</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              <Trans i18nKey="forgotPassword.successBody" t={t} values={{ email }} components={{ strong: <strong /> }} />
            </Typography>
            <Button component={Link} to="/login" variant="contained" fullWidth>
              {t('forgotPassword.successBack')}
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('forgotPassword.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('forgotPassword.subtitle')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('forgotPassword.email')}
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !email}
              sx={{ mt: 3 }}
            >
              {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </Button>
          </form>

          <Typography align="center" sx={{ mt: 3 }}>
            {t('forgotPassword.rememberPassword')}{' '}
            <MuiLink component={Link} to="/login" underline="hover">
              {t('forgotPassword.loginCta')}
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
