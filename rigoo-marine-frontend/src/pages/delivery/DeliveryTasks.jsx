/* eslint-disable react/prop-types */
import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, Divider, IconButton, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, LinearProgress,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { useTranslation } from 'react-i18next';
import { Stagger, Reveal } from '../../components/common/Motion';
import { deliveryApi } from '../../services/api';
import { NavigateIconMenu } from '../../components/delivery/NavigateMenu';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
  CANCELLED:  'default',
};

const STATUS_BORDER = {
  DELIVERED: 'success.main',
  FAILED:    'error.main',
};

const TRANSITIONS = {
  ASSIGNED:   [{ next: 'PICKED_UP',  labelKey: 'markPickedUp',  color: 'primary' }],
  PICKED_UP:  [{ next: 'IN_TRANSIT', labelKey: 'startDelivery', color: 'primary' }],
  IN_TRANSIT: [
    { next: 'DELIVERED', labelKey: 'markDelivered', color: 'success' },
    { next: 'FAILED',    labelKey: 'reportFailed',  color: 'error', confirm: true },
  ],
};

const DONE_SET = new Set(['DELIVERED', 'FAILED', 'CANCELLED']);

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const YESTERDAY_STR = localDate(-1);

const TaskCard = memo(function TaskCard({ task, isToday, busyId, onAction, onNavigate }) {
  const { t } = useTranslation('delivery');
  const done        = DONE_SET.has(task.status);
  const transitions = isToday ? (TRANSITIONS[task.status] ?? []) : [];
  const isBusy      = busyId === task.id;

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: done ? 0.78 : 1,
        borderColor: STATUS_BORDER[task.status] ?? 'divider',
        transition: 'border-color .2s, box-shadow .2s',
      }}
    >
      {isBusy && <LinearProgress sx={{ borderRadius: '4px 4px 0 0' }} />}
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" alignItems="flex-start" gap={1}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0, mt: 0.25,
            bgcolor: done ? 'grey.400' : 'primary.main',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {done ? '✓' : (task.stopOrder ?? '?')}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body1" fontWeight={700}>
                {t('tasks.stop')} {task.stopOrder ?? '—'}
              </Typography>
              <Chip
                label={t(`status.${task.status}`)}
                color={STATUS_COLORS[task.status] || 'default'}
                size="small"
              />
            </Stack>

            <Stack spacing={0.25} sx={{ mt: 0.75 }}>
              {task.pickupAddress && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  ↑ {t('tasks.pickup')}: {task.pickupLabel || task.pickupAddress}
                </Typography>
              )}
              <Typography variant="body2" noWrap>
                ↓ {t('tasks.dropoff')}: {task.deliveryAddress}
              </Typography>
              {task.invoiceAmount && (
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  {task.invoiceAmount} {task.currency}
                </Typography>
              )}
              {task.notes && (
                <Typography variant="caption" color="text.secondary">{task.notes}</Typography>
              )}
              {task.failedReason && (
                <Typography variant="caption" color="error.main">✗ {task.failedReason}</Typography>
              )}
            </Stack>
          </Box>

          <Stack direction="row" gap={0.25} flexShrink={0}>
            {task.clientPhone && (
              <Tooltip title={t('tasks.call')}>
                <IconButton size="small" component="a" href={`tel:${task.clientPhone}`}>
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <NavigateIconMenu lat={task.deliveryLat} lng={task.deliveryLng} address={task.deliveryAddress} />
          </Stack>
        </Stack>

        <Divider sx={{ mt: 1.5, mb: 1 }} />
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          {transitions.map(tr => (
            <Button
              key={tr.next}
              variant={tr.color === 'error' ? 'outlined' : 'contained'}
              color={tr.color}
              size="small"
              disabled={isBusy}
              onClick={() => onAction(task, tr)}
            >
              {t(`detail.${tr.labelKey}`)}
            </Button>
          ))}
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => onNavigate(`/delivery/tasks/${task.id}`)}
            sx={{ ml: transitions.length ? 'auto' : 0, color: 'text.secondary' }}
          >
            {t('tasks.viewDetails')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
});

export default function DeliveryTasks() {
  const navigate = useNavigate();
  const { t }    = useTranslation('delivery');
  const qc       = useQueryClient();

  const [busyId,       setBusyId]       = useState(null);
  const [failedDialog, setFailedDialog] = useState(null);
  const [failedReason, setFailedReason] = useState('');

  const { data: todayTasks = [], isLoading: todayLoading, isError: todayError } = useQuery({
    queryKey: ['delivery-tasks-today'],
    queryFn: deliveryApi.getTodayTasks,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: yesterdayTasks = [], isLoading: yestLoading, isError: yestError } = useQuery({
    queryKey: ['delivery-tasks-yesterday', YESTERDAY_STR],
    queryFn: () => deliveryApi.getTasksInRange(YESTERDAY_STR, YESTERDAY_STR),
    staleTime: 5 * 60_000,
  });

  const loading = todayLoading || yestLoading;
  const error   = todayError || yestError;

  const todayActive = useMemo(
    () => todayTasks.filter(tk => !DONE_SET.has(tk.status)).length,
    [todayTasks],
  );
  const todayDone = todayTasks.length - todayActive;

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status, reason }) =>
      deliveryApi.updateStatus(taskId, status, reason),

    onMutate: async ({ taskId }) => {
      setBusyId(taskId);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['delivery-tasks-today'], (prev = []) =>
        prev.map(tk => tk.id === updated.id ? updated : tk),
      );
      qc.invalidateQueries({ queryKey: ['delivery-stats'] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['delivery-tasks-today'] });
    },
    onSettled: () => setBusyId(null),
  });

  const handleAction = (task, tr) => {
    if (tr.confirm) { setFailedReason(''); setFailedDialog({ taskId: task.id }); }
    else statusMutation.mutate({ taskId: task.id, status: tr.next });
  };

  const handleFailConfirm = () => {
    const { taskId } = failedDialog;
    setFailedDialog(null);
    statusMutation.mutate({ taskId, status: 'FAILED', reason: failedReason });
    setFailedReason('');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{t('dashboard.loadError')}</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{t('tasks.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {todayActive} {t('tasks.active')} · {todayDone} {t('tasks.done')}
        </Typography>
      </Reveal>

      {/* Today */}
      <Reveal variant="slideUp">
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1.5 }}>
          {t('tasks.today')}
        </Typography>
      </Reveal>

      {todayTasks.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
          {t('tasks.noTasks')}
        </Typography>
      )}

      <Stagger>
        <Stack spacing={2} sx={{ mb: 4 }}>
          {todayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isToday
              busyId={busyId}
              onAction={handleAction}
              onNavigate={navigate}
            />
          ))}
        </Stack>
      </Stagger>

      {/* Yesterday */}
      {yesterdayTasks.length > 0 && (
        <>
          <Reveal variant="slideUp">
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
              {t('tasks.yesterday')}
            </Typography>
          </Reveal>
          <Stagger>
            <Stack spacing={2}>
              {yesterdayTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isToday={false}
                  busyId={busyId}
                  onAction={handleAction}
                  onNavigate={navigate}
                />
              ))}
            </Stack>
          </Stagger>
        </>
      )}

      {/* Report Failed dialog */}
      <Dialog open={!!failedDialog} onClose={() => setFailedDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('detail.reportFailed')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={t('detail.failedReason')}
            placeholder={t('detail.failedReasonPlaceholder')}
            value={failedReason}
            onChange={e => setFailedReason(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFailedDialog(null)}>{t('detail.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!failedReason.trim()}
            onClick={handleFailConfirm}
          >
            {t('detail.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
