import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Stack, FormControlLabel, Checkbox, Alert,
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

const today = () => new Date().toISOString().slice(0, 10);

export default function AddServiceHistoryDialog({ open, onClose, vesselId, suggestedHours }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();
  const [form, setForm] = useState({
    serviceType: 'OIL_CHANGE',
    performedOn: today(),
    engineHoursAtService: suggestedHours ?? '',
    cost: '',
    currency: 'QAR',
    performedBy: '',
    notes: '',
  });
  const [force, setForce] = useState(false);
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      // Empty-string → undefined so backend bean-validation doesn't see "".
      ['engineHoursAtService', 'cost', 'performedBy', 'notes'].forEach((k) => {
        if (payload[k] === '') payload[k] = undefined;
      });
      if (payload.engineHoursAtService != null) payload.engineHoursAtService = Number(payload.engineHoursAtService);
      if (payload.cost != null) payload.cost = Number(payload.cost);
      return maintenanceApi.addHistory(vesselId, payload, force);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
      toast.success(t('dialog.save'));
      handleClose();
    },
    onError: (err) => {
      const code = err.response?.data?.errorCode;
      setError(code ? t(`errors.${code}`, { defaultValue: err.response?.data?.message }) : err.message);
    },
  });

  const handleClose = () => {
    setError(null);
    setForce(false);
    setForm({
      serviceType: 'OIL_CHANGE',
      performedOn: today(),
      engineHoursAtService: '',
      cost: '',
      currency: 'QAR',
      performedBy: '',
      notes: '',
    });
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dialog.title')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <TextField
            select
            label={t('dialog.type')}
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
          >
            {SERVICE_TYPES.map((s) => (
              <MenuItem key={s} value={s}>{t(`types.${s}`)}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('dialog.performedOn')}
            type="date"
            value={form.performedOn}
            onChange={(e) => setForm({ ...form, performedOn: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('dialog.engineHours')}
            type="number"
            value={form.engineHoursAtService}
            onChange={(e) => setForm({ ...form, engineHoursAtService: e.target.value })}
            inputProps={{ min: 0, step: 0.1 }}
          />
          <Stack direction="row" gap={1.5}>
            <TextField
              label={t('dialog.cost')}
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              label={t('dialog.currency')}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              inputProps={{ maxLength: 3 }}
              sx={{ width: 100 }}
            />
          </Stack>
          <TextField
            label={t('dialog.performedBy')}
            value={form.performedBy}
            onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
          />
          <TextField
            label={t('dialog.notes')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            minRows={2}
            inputProps={{ maxLength: 2000 }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={force} onChange={(e) => setForce(e.target.checked)} />}
            label="Force (override engine-hours sanity check)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('dialog.cancel')}</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.serviceType || !form.performedOn}
          variant="contained"
        >{t('dialog.save')}</Button>
      </DialogActions>
    </Dialog>
  );
}
