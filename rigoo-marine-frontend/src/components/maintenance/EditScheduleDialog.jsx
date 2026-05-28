/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Stack, Alert, Box, Typography, Chip,
} from '@mui/material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { maintenanceApi, publicApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';

const SERVICE_TYPES = [
  'OIL_CHANGE', 'ENGINE_SERVICE', 'HULL_CLEANING', 'ANTIFOULING',
  'PROPELLER_SERVICE', 'IMPELLER', 'FUEL_FILTER', 'ZINC_ANODES',
  'BATTERY', 'INSPECTION', 'OTHER',
];

/**
 * Suggested defaults per ServiceType. Marine industry rule-of-thumb numbers
 * (most marina contracts list these intervals as the warranty floor); the
 * defaults autofill ONLY when the field is empty and ONLY on type change,
 * so a returning user's prior numbers are never overwritten.
 */
const DEFAULT_INTERVALS = {
  OIL_CHANGE:        { days: 180, hours: 100 },
  ENGINE_SERVICE:    { days: 365, hours: 250 },
  HULL_CLEANING:     { days: 120 },
  ANTIFOULING:       { days: 365 },
  PROPELLER_SERVICE: { days: 365 },
  IMPELLER:          { days: 365, hours: 200 },
  FUEL_FILTER:       { days: 365, hours: 250 },
  ZINC_ANODES:       { days: 180 },
  BATTERY:           { days: 730 },
  INSPECTION:        { days: 365 },
  OTHER:             {},
};

/**
 * Try to match a catalog row to a {@link ServiceType} value via the same
 * keyword logic the backend's ServiceTypeClassifier uses. Lets us show
 * the real catalog name + price next to the enum option without the
 * frontend needing the full classifier — covers ~90% of the seed catalog
 * out of the box.
 */
function catalogFor(catalog, serviceType) {
  if (!Array.isArray(catalog) || !serviceType) return null;
  const keywords = {
    OIL_CHANGE: 'oil change',
    HULL_CLEANING: 'hull',
    ANTIFOULING: 'bottom paint',
    PROPELLER_SERVICE: 'propeller',
    ENGINE_SERVICE: 'engine',
  };
  const kw = keywords[serviceType];
  if (!kw) return null;
  return catalog.find((s) => s.name?.toLowerCase().includes(kw)) || null;
}

/**
 * Add OR edit one schedule item. If `initial` is provided, the service-type
 * selector is locked (each vessel can have at most one schedule per type).
 */
export default function EditScheduleDialog({ open, onClose, vesselId, initial = null }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();

  // Fetch the public service catalog once per dialog open. 10-minute cache —
  // admins edit the catalog rarely; stale prices are an acceptable trade for
  // a snappier dialog. Disabled when the dialog isn't open so we don't pay
  // the network cost on every page load.
  const { data: catalogPage } = useQuery({
    queryKey: ['publicServices', 'all'],
    queryFn: () => publicApi.getServices(),
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });
  const catalog = catalogPage?.content || catalogPage || [];
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

  // Suggested-default autofill on service-type change. Only fills empty
  // fields — a user who already typed a number is never overwritten.
  const onServiceTypeChange = (next) => {
    setForm((prev) => {
      const def = DEFAULT_INTERVALS[next] || {};
      return {
        ...prev,
        serviceType: next,
        intervalDays:  prev.intervalDays  === '' && def.days  != null ? def.days  : prev.intervalDays,
        intervalHours: prev.intervalHours === '' && def.hours != null ? def.hours : prev.intervalHours,
      };
    });
  };

  const catalogHit = catalogFor(catalog, form.serviceType);

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
            onChange={(e) => onServiceTypeChange(e.target.value)}
            disabled={!!initial}
          >
            {SERVICE_TYPES.map((s) => (
              <MenuItem key={s} value={s}>{t(`types.${s}`)}</MenuItem>
            ))}
          </TextField>

          {/* Catalog hint — shows the real Rigoo Marine service catalog name +
              QAR price when we can match the selected enum to a catalog row.
              No-op when no match (OTHER, IMPELLER, BATTERY, etc.) — keeps the
              dialog clean instead of showing a "no match" sentinel. */}
          {catalogHit && (
            <Box sx={{
              p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {catalogHit.name}
                </Typography>
                {catalogHit.description && (
                  <Typography variant="caption" color="text.secondary">
                    {catalogHit.description}
                  </Typography>
                )}
              </Box>
              {catalogHit.price != null && (
                <Chip
                  size="small"
                  label={`${Number(catalogHit.price).toFixed(2)} QAR`}
                  color="primary"
                />
              )}
            </Box>
          )}
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
