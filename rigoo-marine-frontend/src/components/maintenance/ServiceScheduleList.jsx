import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Button, IconButton, Tooltip,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SnoozeRoundedIcon from '@mui/icons-material/SnoozeRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Stagger } from '../common/Motion';
import UrgencyChip from './UrgencyChip';
import EditScheduleDialog from './EditScheduleDialog';
import { maintenanceApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

export default function ServiceScheduleList({ vesselId, schedule }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, initial: null });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
    qc.invalidateQueries({ queryKey: ['maintenance', 'upcoming'] });
  };

  const snooze = useMutation({
    mutationFn: (s) => maintenanceApi.snoozeSchedule(vesselId, s.serviceType, 7),
    onSuccess: () => { invalidate(); toast.success(t('schedule.snooze')); },
  });
  const pause = useMutation({
    mutationFn: (s) => maintenanceApi.pauseSchedule(vesselId, s.serviceType),
    onSuccess: () => { invalidate(); toast.success(t('schedule.pause')); },
  });
  const resume = useMutation({
    mutationFn: (s) => maintenanceApi.resumeSchedule(vesselId, s.serviceType),
    onSuccess: () => { invalidate(); toast.success(t('schedule.resume')); },
  });

  if (!schedule || schedule.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 5 }}>
          <CalendarTodayRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1.5 }} />
          <Typography variant="h6" gutterBottom>{t('schedule.empty')}</Typography>
          <Button variant="contained" onClick={() => setDialog({ open: true, initial: null })}>
            {t('schedule.add')}
          </Button>
        </CardContent>
        <EditScheduleDialog
          open={dialog.open}
          initial={dialog.initial}
          vesselId={vesselId}
          onClose={() => setDialog({ open: false, initial: null })}
        />
      </Card>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={1.5}>
        <Button variant="contained" onClick={() => setDialog({ open: true, initial: null })}>
          {t('schedule.add')}
        </Button>
      </Stack>
      <Stagger variant="fade" step={70} timeout={400} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {schedule.map((s) => {
          const paused = s.status === 'PAUSED';
          return (
            <Card key={`${s.serviceType}-${s.id}`}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {t(`types.${s.serviceType}`, { defaultValue: s.serviceType })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[
                        s.intervalDays ? `${s.intervalDays}d` : null,
                        s.intervalHours ? `${s.intervalHours}h` : null,
                      ].filter(Boolean).join(' / ')}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
                      <UrgencyChip urgency={paused ? null : s.urgency} />
                      <Typography variant="body2">
                        {t('schedule.nextDueDate')}: <strong>{formatDate(s.nextDueDate)}</strong>
                      </Typography>
                      {s.nextDueHours != null && (
                        <Typography variant="body2" color="text.secondary">
                          / {s.nextDueHours}h
                        </Typography>
                      )}
                      {paused && (
                        <Typography variant="caption" color="warning.main">{t('schedule.paused')}</Typography>
                      )}
                      {s.snoozedUntil && (
                        <Typography variant="caption" color="text.secondary">
                          {t('schedule.snoozedUntil', { date: formatDate(s.snoozedUntil) })}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  <Stack direction="row" gap={0.5}>
                    <Tooltip title={t('schedule.edit')}>
                      <IconButton size="small" onClick={() => setDialog({ open: true, initial: s })}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!paused && (
                      <Tooltip title={t('schedule.snooze')}>
                        <IconButton size="small" onClick={() => snooze.mutate(s)} disabled={snooze.isPending}>
                          <SnoozeRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {paused ? (
                      <Tooltip title={t('schedule.resume')}>
                        <IconButton size="small" onClick={() => resume.mutate(s)} disabled={resume.isPending}>
                          <PlayArrowRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title={t('schedule.pause')}>
                        <IconButton size="small" onClick={() => pause.mutate(s)} disabled={pause.isPending}>
                          <PauseRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stagger>
      <EditScheduleDialog
        open={dialog.open}
        initial={dialog.initial}
        vesselId={vesselId}
        onClose={() => setDialog({ open: false, initial: null })}
      />
    </Box>
  );
}
