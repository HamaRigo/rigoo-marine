/* eslint-disable react/prop-types */
import { useState, forwardRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Slide,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import PhoneField from '../common/PhoneField';
import { useFormValidation } from '../../hooks/useFormValidation';
import { required, email, nameMin, messageMin, optionalPhone } from '../../utils/validators';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const EMPTY_FORM = (defaultType) => ({ name: '', email: '', phone: '', message: '', inquiryType: defaultType });

export default function InquiryDialog({ open, onClose, listingId, defaultType = 'GENERAL' }) {
  const { t } = useTranslation('marketplace');
  const { t: tv } = useTranslation('validation');
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM(defaultType));

  const { touch, revalidate, validateAll, fieldError, reset } = useFormValidation({
    name:    [required, nameMin],
    email:   [required, email],
    phone:   [optionalPhone],
    message: [required, messageMin],
  });

  const update = (field) => (e) => {
    const value = e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    revalidate(field, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll(form)) return;
    setSubmitting(true);
    try {
      await marketplaceApi.createInquiry({ listingId: listingId ?? null, ...form });
      success(t('inquiry.success'));
      setForm(EMPTY_FORM(defaultType));
      reset();
      onClose();
    } catch (err) {
      error(err?.response?.data?.message || t('inquiry.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const types = listingId ? ['BUY', 'RENT', 'INSPECTION', 'GENERAL'] : ['GENERAL'];

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
      keepMounted
    >
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{t('inquiry.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label={t('inquiry.type')} value={form.inquiryType}
              onChange={update('inquiryType')} fullWidth required
            >
              {types.map((typ) => (
                <MenuItem key={typ} value={typ}>{t(`inquiry.types.${typ}`)}</MenuItem>
              ))}
            </TextField>

            <TextField
              label={t('inquiry.name')} value={form.name} onChange={update('name')}
              onBlur={(e) => touch('name', e.target.value)}
              fullWidth required inputProps={{ maxLength: 255 }}
              error={!!fieldError('name')}
              helperText={fieldError('name') ? tv(fieldError('name')) : undefined}
            />

            <TextField
              type="email" label={t('inquiry.email')} value={form.email} onChange={update('email')}
              onBlur={(e) => touch('email', e.target.value)}
              fullWidth required inputProps={{ maxLength: 255 }}
              error={!!fieldError('email')}
              helperText={fieldError('email') ? tv(fieldError('email')) : undefined}
            />

            <PhoneField
              label={t('inquiry.phone')} value={form.phone}
              onChange={update('phone')}
              onBlur={() => touch('phone', form.phone)}
              fullWidth
              error={!!fieldError('phone')}
              helperText={fieldError('phone') ? tv(fieldError('phone')) : undefined}
            />

            <TextField
              label={t('inquiry.message')} value={form.message} onChange={update('message')}
              onBlur={(e) => touch('message', e.target.value)}
              fullWidth required multiline minRows={4}
              inputProps={{ maxLength: 4000 }}
              error={!!fieldError('message')}
              helperText={
                fieldError('message')
                  ? tv(fieldError('message'))
                  : `${form.message.length}/4000`
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>{t('inquiry.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={submitting}>{t('inquiry.submit')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
