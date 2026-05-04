/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Slide,
} from '@mui/material';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function InquiryDialog({ open, onClose, listingId, defaultType = 'GENERAL' }) {
  const { t } = useTranslation('marketplace');
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    inquiryType: defaultType,
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await marketplaceApi.createInquiry({
        listingId: listingId ?? null,
        ...form,
      });
      success(t('inquiry.success'));
      setForm({ name: '', email: '', phone: '', message: '', inquiryType: defaultType });
      onClose();
    } catch (err) {
      error(err?.response?.data?.message || t('inquiry.error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Available inquiry types: when on a listing, BUY/RENT/INSPECTION/GENERAL;
  // when off a listing (listingId null), only GENERAL.
  const types = listingId
    ? ['BUY', 'RENT', 'INSPECTION', 'GENERAL']
    : ['GENERAL'];

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
      keepMounted
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('inquiry.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label={t('inquiry.type')}
              value={form.inquiryType}
              onChange={update('inquiryType')}
              fullWidth
              required
            >
              {types.map((typ) => (
                <MenuItem key={typ} value={typ}>{t(`inquiry.types.${typ}`)}</MenuItem>
              ))}
            </TextField>
            <TextField label={t('inquiry.name')} value={form.name} onChange={update('name')} fullWidth required inputProps={{ maxLength: 255 }} />
            <TextField type="email" label={t('inquiry.email')} value={form.email} onChange={update('email')} fullWidth required inputProps={{ maxLength: 255 }} />
            <TextField label={t('inquiry.phone')} value={form.phone} onChange={update('phone')} fullWidth inputProps={{ maxLength: 50 }} />
            <TextField
              label={t('inquiry.message')}
              value={form.message}
              onChange={update('message')}
              fullWidth
              multiline
              minRows={4}
              inputProps={{ maxLength: 4000 }}
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
