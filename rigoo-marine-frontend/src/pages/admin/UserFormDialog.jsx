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
import PhoneField from '../../components/common/PhoneField';
import { useFormValidation } from '../../hooks/useFormValidation';
import { required, email, nameMin, passwordMin, requiredPhone } from '../../utils/validators';
import { getApiError } from '../../utils/apiError';

const ALL_ROLES = ['CLIENT', 'TECHNICIAN', 'TEAM_LEAD', 'DELIVERY', 'ADMIN'];

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'CLIENT', company: '', preferredLanguage: 'en' };

export default function UserFormDialog({ open, user, onClose, onSuccess }) {
  const { t } = useTranslation('admin');
  const { t: tv } = useTranslation('validation');
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const { touch, revalidate, validateAll, fieldError, reset } = useFormValidation(
    isEdit
      ? { name: [required, nameMin], email: [required, email], phone: [requiredPhone] }
      : { name: [required, nameMin], email: [required, email], phone: [requiredPhone], password: [required, passwordMin] }
  );

  useEffect(() => {
    if (open) {
      setError('');
      reset();
      setForm(
        user
          ? { name: user.name || '', email: user.email || '', phone: user.phone || '',
              password: '', role: user.role || 'CLIENT',
              company: user.company || '', preferredLanguage: user.preferredLanguage || 'en' }
          : EMPTY
      );
    }
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    revalidate(field, value, { ...form, [field]: value });
  };

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
      setError(getApiError(err));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(form)) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>
          {isEdit ? t('users.form.titleEdit') : t('users.form.titleCreate')}
        </DialogTitle>

        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField fullWidth required margin="normal" label={t('users.columns.name')}
            value={form.name} onChange={set('name')} onBlur={(e) => touch('name', e.target.value)}
            disabled={mutation.isPending}
            error={!!fieldError('name')}
            helperText={fieldError('name') ? tv(fieldError('name')) : undefined}
            inputProps={{ maxLength: 100 }}
          />

          <TextField fullWidth required margin="normal" label={t('users.columns.email')}
            type="email" value={form.email} onChange={set('email')}
            onBlur={(e) => touch('email', e.target.value)}
            disabled={mutation.isPending} dir="ltr"
            error={!!fieldError('email')}
            helperText={fieldError('email') ? tv(fieldError('email')) : undefined}
            inputProps={{ maxLength: 255 }}
          />

          <Box sx={{ mt: 2, mb: 1 }}>
            <PhoneField fullWidth required label={t('users.columns.phone')}
              value={form.phone} onChange={set('phone')}
              onBlur={() => touch('phone', form.phone)}
              disabled={mutation.isPending}
              error={!!fieldError('phone')}
              helperText={fieldError('phone') ? tv(fieldError('phone')) : undefined}
            />
          </Box>

          <TextField
            fullWidth margin="normal"
            label={isEdit ? t('users.form.passwordOptional') : t('users.form.password')}
            type="password" value={form.password} onChange={set('password')}
            onBlur={(e) => touch('password', e.target.value)}
            disabled={mutation.isPending} dir="ltr"
            required={!isEdit}
            error={!isEdit && !!fieldError('password')}
            helperText={
              !isEdit && fieldError('password')
                ? tv(fieldError('password'))
                : isEdit ? t('users.form.passwordEditHelper') : t('users.form.passwordHelper')
            }
            inputProps={{ maxLength: 128 }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('users.columns.role')}</InputLabel>
            <Select value={form.role} onChange={set('role')} label={t('users.columns.role')} disabled={mutation.isPending}>
              {ALL_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField fullWidth margin="normal" label={t('users.form.company')}
            value={form.company} onChange={set('company')} disabled={mutation.isPending}
            inputProps={{ maxLength: 200 }}
          />

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
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
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
