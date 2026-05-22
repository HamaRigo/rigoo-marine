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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

const ALL_ROLES = ['CLIENT', 'TECHNICIAN', 'TEAM_LEAD', 'DELIVERY', 'ADMIN'];

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'CLIENT', company: '', preferredLanguage: 'en' };

export default function UserFormDialog({ open, user, onClose, onSuccess }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        user
          ? { name: user.name || '', email: user.email || '', phone: user.phone || '',
              password: '', role: user.role || 'CLIENT',
              company: user.company || '', preferredLanguage: user.preferredLanguage || 'en' }
          : EMPTY
      );
    }
  }, [open, user?.id]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        return adminApi.updateUser(user.id, payload);
      }
      return adminApi.createUser(form);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      onSuccess?.(saved);
      onClose();
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 409) setError(t('users.form.errors.conflict'));
      else if (status === 400) setError(t('users.form.errors.invalid'));
      else setError(t('users.form.errors.fallback'));
    },
  });

  const canSubmit =
    !mutation.isPending &&
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    (isEdit || form.password.length >= 6);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? t('users.form.titleEdit') : t('users.form.titleCreate')}
        </DialogTitle>

        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField fullWidth required margin="normal" label={t('users.columns.name')}
            value={form.name} onChange={set('name')} disabled={mutation.isPending} />

          <TextField fullWidth required margin="normal" label={t('users.columns.email')}
            type="email" value={form.email} onChange={set('email')} disabled={mutation.isPending} dir="ltr" />

          <TextField fullWidth required margin="normal" label={t('users.columns.phone')}
            value={form.phone} onChange={set('phone')} disabled={mutation.isPending} dir="ltr" />

          <TextField
            fullWidth margin="normal"
            label={isEdit ? t('users.form.passwordOptional') : t('users.form.password')}
            type="password" value={form.password} onChange={set('password')}
            disabled={mutation.isPending} dir="ltr"
            required={!isEdit}
            error={!isEdit && form.password.length > 0 && form.password.length < 6}
            helperText={isEdit ? t('users.form.passwordEditHelper') : t('users.form.passwordHelper')}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('users.columns.role')}</InputLabel>
            <Select value={form.role} onChange={set('role')} label={t('users.columns.role')} disabled={mutation.isPending}>
              {ALL_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField fullWidth margin="normal" label={t('users.form.company')}
            value={form.company} onChange={set('company')} disabled={mutation.isPending} />

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('users.form.language')}</InputLabel>
            <Select value={form.preferredLanguage} onChange={set('preferredLanguage')} label={t('users.form.language')} disabled={mutation.isPending}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ar">العربية</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>{t('users.form.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {mutation.isPending && <CircularProgress size={18} sx={{ mr: 1 }} />}
            {mutation.isPending
              ? t('users.form.submitting')
              : isEdit ? t('users.form.saveEdit') : t('users.form.saveCreate')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
