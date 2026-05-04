import { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography, Button, CircularProgress, Stack } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../services/api';

export default function VerifyEmail() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'verifying' : 'missing');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => { if (!cancelled) setState('success'); })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          {state === 'verifying' && (
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography>{t('verifyEmail.verifying')}</Typography>
            </Stack>
          )}
          {state === 'success' && (
            <>
              <Typography variant="h5" gutterBottom>{t('verifyEmail.successTitle')}</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>{t('verifyEmail.successBody')}</Typography>
              <Button component={Link} to="/login" variant="contained" fullWidth>
                {t('verifyEmail.loginCta')}
              </Button>
            </>
          )}
          {state === 'error' && (
            <>
              <Typography variant="h5" gutterBottom>{t('verifyEmail.errorTitle')}</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>{t('verifyEmail.errorBody')}</Typography>
              <Button component={Link} to="/login" variant="contained" fullWidth>
                {t('verifyEmail.loginCta')}
              </Button>
            </>
          )}
          {state === 'missing' && (
            <>
              <Typography variant="h5" gutterBottom>{t('verifyEmail.errorTitle')}</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>{t('verifyEmail.missingToken')}</Typography>
              <Button component={Link} to="/" variant="contained" fullWidth>
                {t('verifyEmail.homeCta')}
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
