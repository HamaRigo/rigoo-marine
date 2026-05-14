import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, Alert,
} from '@mui/material';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { maintenanceApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

/**
 * Engine-hours card. Three states:
 *   - reading available → show current + "update" inline edit
 *   - reading missing   → show "no reading" CTA
 *   - vessel-service down → show degraded banner (the dossier still loads)
 */
export default function EngineHoursCard({ vesselId, currentEngineHours, engineHoursUpdatedAt, unavailable }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentEngineHours ?? '');

  const mutation = useMutation({
    mutationFn: (hours) => maintenanceApi.updateEngineHours(vesselId, hours, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
      setEditing(false);
      toast.success(t('engineHours.update'));
    },
    onError: (err) => {
      const code = err.response?.data?.errorCode;
      toast.error(code ? t(`errors.${code}`, { defaultValue: t('errors.VESSEL_LOOKUP_UNAVAILABLE') })
                       : t('errors.VESSEL_LOOKUP_UNAVAILABLE'));
    },
  });

  if (unavailable) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
            <SpeedRoundedIcon color="action" />
            <Typography variant="h6">{t('engineHours.title')}</Typography>
          </Stack>
          <Alert severity="warning">{t('engineHours.unavailable')}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
          <SpeedRoundedIcon color="primary" />
          <Typography variant="h6">{t('engineHours.title')}</Typography>
        </Stack>
        {currentEngineHours == null && !editing ? (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 1 }}>{t('engineHours.noReading')}</Typography>
            <Button variant="outlined" onClick={() => setEditing(true)}>{t('engineHours.update')}</Button>
          </Box>
        ) : editing ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              type="number"
              size="small"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputProps={{ min: 0, step: 0.1 }}
              label={t('engineHours.current')}
            />
            <Button
              variant="contained"
              disabled={mutation.isPending || value === ''}
              onClick={() => mutation.mutate(Number(value))}
            >{t('engineHours.save')}</Button>
            <Button onClick={() => { setEditing(false); setValue(currentEngineHours ?? ''); }}>{t('dialog.cancel')}</Button>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" gap={2}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {currentEngineHours}
                <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>h</Typography>
              </Typography>
              {engineHoursUpdatedAt && (
                <Typography variant="caption" color="text.secondary">
                  {t('engineHours.updated', { when: formatDate(engineHoursUpdatedAt) })}
                </Typography>
              )}
            </Box>
            <Button onClick={() => setEditing(true)}>{t('engineHours.update')}</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
