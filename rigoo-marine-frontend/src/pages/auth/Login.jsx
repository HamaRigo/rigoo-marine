import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Link as MuiLink, Alert } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { defaultPathForRole } from '../../utils/routes';

export default function Login() {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(formData.identifier.trim(), formData.password);
      const target = location.state?.from?.pathname || defaultPathForRole(userData?.role);
      navigate(target, { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError(t('login.tooManyAttempts'));
      } else {
        setError(err.response?.data?.error || err.message || t('login.errorFallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('login.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('login.subtitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('login.identifier')}
              helperText={t('login.identifierHelper')}
              name="identifier"
              type="text"
              inputMode="text"
              value={formData.identifier}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="username"
              dir="ltr"
            />
            <TextField
              fullWidth
              label={t('login.password')}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <MuiLink component={Link} to="/forgot-password" underline="hover">
                {t('login.forgotPassword')}
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <Typography align="center" sx={{ mt: 3 }}>
            {t('login.noAccount')}{' '}
            <MuiLink component={Link} to="/register" underline="hover">
              {t('login.registerCta')}
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
