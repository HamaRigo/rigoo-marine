import { useEffect, useRef, useState } from 'react';
import { Box, Container, Paper, Typography, Button, CircularProgress, Stack } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../services/api';

export default function VerifyEmail() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'verifying' : 'missing');
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    authApi
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
      <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
        <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center', borderRadius: { xs: 2, sm: 3 } }}>
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
