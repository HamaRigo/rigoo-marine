/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Controlled dialog. Parent owns `open` + `targetUser`; lifecycle/form state
 * lives here. On success the dialog closes, the parent's onSuccess fires, and
 * we invalidate the admin queries so neighbouring tables refresh.
 */
export default function ResetPasswordDialog({ open, targetUser, onClose, onSuccess }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reset state every time the dialog opens for a different target.
  useEffect(() => {
    if (open) {
      setNewPassword('');
      setReason('');
      setError('');
    }
  }, [open, targetUser?.id]);

  const mutation = useMutation({
    mutationFn: () => adminApi.resetUserPassword(targetUser.id, newPassword, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      onSuccess?.(targetUser);
      onClose();
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 404) setError(t('users.resetPassword.errors.userGone'));
      else if (status === 400) setError(t('users.resetPassword.errors.invalid'));
      else setError(t('users.resetPassword.errors.fallback'));
    },
  });

  const passwordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const canConfirm = !mutation.isPending && newPassword.length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!canConfirm) return;
    mutation.mutate();
  };

  if (!targetUser) return null;

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('users.resetPassword.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('users.resetPassword.subtitle')}
            </Typography>
          </Box>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2"><strong>{targetUser.name}</strong></Typography>
            <Typography variant="caption" color="text.secondary">{targetUser.email}</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            type="password"
            label={t('users.resetPassword.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="new-password"
            dir="ltr"
            error={passwordTooShort}
            helperText={
              passwordTooShort
                ? t('users.resetPassword.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
                : t('users.resetPassword.passwordHelper', { min: MIN_PASSWORD_LENGTH })
            }
            disabled={mutation.isPending}
          />
          <TextField
            fullWidth
            label={t('users.resetPassword.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
            helperText={t('users.resetPassword.reasonHelper')}
            disabled={mutation.isPending}
            inputProps={{ maxLength: 500 }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            {t('users.resetPassword.forcesSignOut')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {t('users.resetPassword.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!canConfirm}>
            {mutation.isPending
              ? <CircularProgress size={20} sx={{ mr: 1 }} />
              : null}
            {mutation.isPending
              ? t('users.resetPassword.submitting')
              : t('users.resetPassword.confirm')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
