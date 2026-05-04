import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';

export default function UnverifiedEmailBanner() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success(t('unverifiedBanner.sent'));
    } catch {
      toast.error(t('unverifiedBanner.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" onClick={handleResend} disabled={sending}>
          {sending ? t('unverifiedBanner.resending') : t('unverifiedBanner.resend')}
        </Button>
      }
    >
      {t('unverifiedBanner.message', { email: user.email })}
    </Alert>
  );
}
