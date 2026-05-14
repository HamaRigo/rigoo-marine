import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Stack, Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { maintenanceApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';

const SERVICE_TYPES = [
  'OIL_CHANGE', 'ENGINE_SERVICE', 'HULL_CLEANING', 'ANTIFOULING',
  'PROPELLER_SERVICE', 'IMPELLER', 'FUEL_FILTER', 'ZINC_ANODES',
  'BATTERY', 'INSPECTION', 'OTHER',
];

/**
 * Add OR edit one schedule item. If `initial` is provided, the service-type
 * selector is locked (each vessel can have at most one schedule per type).
 */
export default function EditScheduleDialog({ open, onClose, vesselId, initial = null }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();
  const [form, setForm] = useState({
    serviceType: initial?.serviceType ?? 'OIL_CHANGE',
    intervalDays: initial?.intervalDays ?? '',
    intervalHours: initial?.intervalHours ?? '',
    nextDueDate: initial?.nextDueDate ?? '',
    nextDueHours: initial?.nextDueHours ?? '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      serviceType: initial?.serviceType ?? 'OIL_CHANGE',
      intervalDays: initial?.intervalDays ?? '',
      intervalHours: initial?.intervalHours ?? '',
      nextDueDate: initial?.nextDueDate ?? '',
      nextDueHours: initial?.nextDueHours ?? '',
    });
    setError(null);
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        intervalDays: form.intervalDays === '' ? undefined : Number(form.intervalDays),
        intervalHours: form.intervalHours === '' ? undefined : Number(form.intervalHours),
        nextDueDate: form.nextDueDate || undefined,
        nextDueHours: form.nextDueHours === '' ? undefined : Number(form.nextDueHours),
      };
      return maintenanceApi.upsertSchedule(vesselId, form.serviceType, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
      qc.invalidateQueries({ queryKey: ['maintenance', 'upcoming'] });
      toast.success(t('schedule.save'));
      onClose?.();
    },
    onError: (err) => {
      const code = err.response?.data?.errorCode;
      setError(code ? t(`errors.${code}`, { defaultValue: err.response?.data?.message }) : err.message);
    },
  });

  const bothEmpty = form.intervalDays === '' && form.intervalHours === '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? t('schedule.edit') : t('schedule.add')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <TextField
            select
            label={t('schedule.type')}
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
            disabled={!!initial}
          >
            {SERVICE_TYPES.map((s) => (
              <MenuItem key={s} value={s}>{t(`types.${s}`)}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label={t('schedule.intervalDays')}
              type="number"
              value={form.intervalDays}
              onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
              inputProps={{ min: 1 }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              label={t('schedule.intervalHours')}
              type="number"
              value={form.intervalHours}
              onChange={(e) => setForm({ ...form, intervalHours: e.target.value })}
              inputProps={{ min: 0.1, step: 0.1 }}
              sx={{ flexGrow: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label={t('schedule.nextDueDate')}
              type="date"
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              label={t('schedule.nextDueHours')}
              type="number"
              value={form.nextDueHours}
              onChange={(e) => setForm({ ...form, nextDueHours: e.target.value })}
              inputProps={{ min: 0, step: 0.1 }}
              sx={{ flexGrow: 1 }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dialog.cancel')}</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || bothEmpty}
          onClick={() => mutation.mutate()}
        >{t('schedule.save')}</Button>
      </DialogActions>
    </Dialog>
  );
}
