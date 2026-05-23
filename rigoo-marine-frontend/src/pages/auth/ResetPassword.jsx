import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../services/api';
import { useFormValidation } from '../../hooks/useFormValidation';
import { required, passwordMin, passwordMatch } from '../../utils/validators';
import { getApiError } from '../../utils/apiError';

export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const { t: tv } = useTranslation('validation');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState(token ? '' : t('resetPassword.errors.missingToken'));
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { touch, revalidate, validateAll, fieldError } = useFormValidation({
    password:        [required, passwordMin],
    confirmPassword: [required, passwordMatch('password')],
  });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    const updated = { ...passwords, [field]: value };
    setPasswords(updated);
    revalidate(field, value, updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(passwords)) return;
    setLoading(true);
    try {
      await authApi.resetPasswordWithToken(token, passwords.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(t('resetPassword.errors.invalidToken'));
      } else {
        setError(getApiError(err));
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

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label={t('resetPassword.newPassword')}
              type="password"
              value={passwords.password}
              onChange={handleChange('password')}
              onBlur={(e) => touch('password', e.target.value, passwords)}
              margin="normal"
              required
              autoComplete="new-password"
              inputProps={{ maxLength: 128 }}
              error={!!fieldError('password')}
              helperText={fieldError('password') ? tv(fieldError('password')) : undefined}
            />
            <TextField
              fullWidth
              label={t('resetPassword.confirmPassword')}
              type="password"
              value={passwords.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={(e) => touch('confirmPassword', e.target.value, passwords)}
              margin="normal"
              required
              autoComplete="new-password"
              inputProps={{ maxLength: 128 }}
              error={!!fieldError('confirmPassword')}
              helperText={fieldError('confirmPassword') ? tv(fieldError('confirmPassword')) : undefined}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !token}
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
