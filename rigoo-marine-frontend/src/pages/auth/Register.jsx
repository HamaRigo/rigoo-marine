import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Link as MuiLink, Alert, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { defaultPathForRole } from '../../utils/routes';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'CLIENT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateEmailOpen, setDuplicateEmailOpen] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');

  const userTypes = [
    { value: 'CLIENT', label: t('register.roles.client') },
    { value: 'TECHNICIAN', label: t('register.roles.technician') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('register.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('register.errors.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, userType, ...rest } = formData;
      const newUser = await register({ ...rest, role: userType });
      const target = location.state?.from?.pathname || defaultPathForRole(newUser?.role);
      navigate(target, { replace: true });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      if (err.response?.status === 400 && /already exists/i.test(backendMessage || '')) {
        setDuplicateEmailOpen(true);
      } else {
        setError(backendMessage || err.message || t('register.errors.fallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
      <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
        <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: { xs: 2, sm: 3 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('register.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('register.subtitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('register.fullName')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="name"
            />
            <TextField
              fullWidth
              label={t('register.phone')}
              helperText={t('register.phoneHelper')}
              name="phone"
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="tel"
              dir="ltr"
              placeholder="+97412345678"
            />
            <TextField
              fullWidth
              label={t('register.email')}
              helperText={t('register.emailHelper')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('register.accountType')}</InputLabel>
              <Select
                name="userType"
                value={formData.userType}
                label={t('register.accountType')}
                onChange={handleChange}
              >
                {userTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('register.password')}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label={t('register.confirmPassword')}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? t('register.submitting') : t('register.submit')}
            </Button>
          </form>

          <Typography align="center" sx={{ mt: 3 }}>
            {t('register.haveAccount')}{' '}
            <MuiLink component={Link} to="/login" underline="hover">
              {t('register.loginCta')}
            </MuiLink>
          </Typography>
        </Paper>
      </Container>

      <Dialog
        open={duplicateEmailOpen}
        onClose={() => setDuplicateEmailOpen(false)}
        aria-labelledby="duplicate-email-dialog-title"
      >
        <DialogTitle id="duplicate-email-dialog-title">{t('register.duplicateDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Trans
              i18nKey="register.duplicateDialog.message"
              t={t}
              values={{ email: formData.email }}
              components={{ strong: <strong /> }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateEmailOpen(false)}>{t('register.duplicateDialog.useOther')}</Button>
          <Button
            component={Link}
            to="/login"
            state={{ email: formData.email }}
            variant="contained"
            autoFocus
          >
            {t('register.duplicateDialog.goLogin')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
