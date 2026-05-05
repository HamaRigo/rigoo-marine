import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../services/api';

export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(token ? '' : t('resetPassword.errors.missingToken'));
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError(t('resetPassword.errors.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.errors.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPasswordWithToken(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(t('resetPassword.errors.invalidToken'));
      } else {
        setError(err.response?.data?.error || err.message || t('resetPassword.errors.fallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
        <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
          <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center', borderRadius: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" gutterBottom>{t('resetPassword.successTitle')}</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>{t('resetPassword.successBody')}</Typography>
            <Button component={Link} to="/login" variant="contained" fullWidth>
              {t('resetPassword.loginCta')}
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
      <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
        <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: { xs: 2, sm: 3 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('resetPassword.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('resetPassword.subtitle')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('resetPassword.newPassword')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label={t('resetPassword.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !token || !newPassword || !confirmPassword}
              sx={{ mt: 3 }}
            >
              {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
