import {
  Box, Card, CardContent, Typography, Stack, Chip, IconButton, Tooltip, Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Stagger } from '../common/Motion';
import { maintenanceApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';
import AttachmentThumbs from './AttachmentThumbs';

const formatDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

export default function ServiceHistoryTimeline({ vesselId, records }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => maintenanceApi.deleteHistory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
      toast.success(t('history.delete'));
    },
    onError: (err) => {
      const code = err.response?.data?.errorCode;
      toast.error(code ? t(`errors.${code}`, { defaultValue: t('errors.SERVICE_HISTORY_NOT_FOUND') })
                       : t('errors.SERVICE_HISTORY_NOT_FOUND'));
    },
  });

  if (!records || records.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <HistoryRoundedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.5, mb: 1.5 }} />
          <Typography variant="h6" gutterBottom>{t('history.empty')}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stagger variant="fade" step={70} timeout={420} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {records.map((r) => (
        <Card key={r.id}>
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
              <Box sx={{ minWidth: 110 }}>
                <Typography variant="caption" color="text.secondary">{t('history.columns.date')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatDate(r.performedOn)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ flexGrow: 1 }}>
                <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={t(`types.${r.serviceType}`, { defaultValue: r.serviceType })}
                    color={r.serviceType === 'OIL_CHANGE' ? 'primary' : 'default'}
                  />
                  {r.engineHoursAtService != null && (
                    <Typography variant="body2" color="text.secondary">
                      {r.engineHoursAtService} h
                    </Typography>
                  )}
                  {r.cost != null && (
                    <Typography variant="body2" color="text.secondary">
                      {r.currency} {Number(r.cost).toFixed(2)}
                    </Typography>
                  )}
                </Stack>
                {r.notes && (
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    {r.notes}
                  </Typography>
                )}
                {/* Attachments — dossier endpoint inlines these via batch
                    fetch (no N+1). Thumbs handle their own delete with
                    cache-invalidation. */}
                <AttachmentThumbs attachments={r.attachments} vesselId={vesselId} />
              </Box>
              <Tooltip title={t('history.delete')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (window.confirm(t('history.deleteConfirm'))) deleteMutation.mutate(r.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stagger>
  );
}
