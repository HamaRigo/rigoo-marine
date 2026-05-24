import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, Divider, IconButton, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, LinearProgress,
} from '@mui/material';
import PhoneIcon     from '@mui/icons-material/Phone';
import { useTranslation } from 'react-i18next';
import { Stagger } from '../../components/common/Motion';
import { deliveryApi } from '../../services/api';
import { NavigateIconMenu } from '../../components/delivery/NavigateMenu';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
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


export default function DeliveryTasks() {
  const navigate = useNavigate();
  const { t } = useTranslation('delivery');
  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [busyId, setBusyId]           = useState(null);
  const [failedDialog, setFailedDialog] = useState(null); // { taskId }
  const [failedReason, setFailedReason] = useState('');

  useEffect(() => {
    deliveryApi.getTodayTasks()
      .then(setTasks)
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const updateStatus = async (taskId, status, reason) => {
    setBusyId(taskId);
    try {
      const updated = await deliveryApi.updateStatus(taskId, status, reason);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch {
      setError('Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAction = (task, tr) => {
    if (tr.confirm) {
      setFailedReason('');
      setFailedDialog({ taskId: task.id });
    } else {
      updateStatus(task.id, tr.next);
    }
  };

  const handleFailConfirm = () => {
    const { taskId } = failedDialog;
    setFailedDialog(null);
    updateStatus(taskId, 'FAILED', failedReason);
    setFailedReason('');
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  );
  if (error) return <Alert severity="error">{error}</Alert>;
  if (tasks.length === 0) return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>{t('tasks.title')}</Typography>
      <Typography color="text.disabled">{t('tasks.noTasks')}</Typography>
    </Box>
  );

  const active    = tasks.filter(t => !['DELIVERED', 'FAILED'].includes(t.status)).length;
  const completed = tasks.length - active;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{t('tasks.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {active} active · {completed} completed
      </Typography>

      <Stagger>
        <Stack spacing={2}>
          {tasks.map((task) => {
            const done        = ['DELIVERED', 'FAILED'].includes(task.status);
            const transitions = TRANSITIONS[task.status] ?? [];
            const isBusy      = busyId === task.id;

            return (
              <Card
                key={task.id}
                variant="outlined"
                sx={{
                  opacity: done ? 0.75 : 1,
                  borderColor: STATUS_BORDER[task.status] ?? 'divider',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
              >
                {isBusy && <LinearProgress sx={{ borderRadius: '4px 4px 0 0' }} />}

                <CardContent sx={{ pb: '12px !important' }}>
                  {/* ── Header ── */}
                  <Stack direction="row" alignItems="flex-start" gap={1}>
                    {/* Stop badge */}
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

                      {/* Addresses */}
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
                          <Typography variant="caption" color="text.secondary">
                            {task.notes}
                          </Typography>
                        )}
                        {task.failedReason && (
                          <Typography variant="caption" color="error.main">
                            ✗ {task.failedReason}
                          </Typography>
                        )}
                      </Stack>
                    </Box>

                    {/* Quick-action icons */}
                    <Stack direction="row" gap={0.25} flexShrink={0}>
                      {task.clientPhone && (
                        <Tooltip title={t('tasks.call')}>
                          <IconButton size="small" component="a" href={`tel:${task.clientPhone}`}>
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <NavigateIconMenu
                        lat={task.deliveryLat}
                        lng={task.deliveryLng}
                        address={task.deliveryAddress}
                      />
                    </Stack>
                  </Stack>

                  {/* ── Actions ── */}
                  <Divider sx={{ mt: 1.5, mb: 1 }} />
                  <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                    {transitions.map(tr => (
                      <Button
                        key={tr.next}
                        variant={tr.color === 'error' ? 'outlined' : 'contained'}
                        color={tr.color}
                        size="small"
                        disabled={isBusy}
                        onClick={() => handleAction(task, tr)}
                      >
                        {t(`detail.${tr.labelKey}`)}
                      </Button>
                    ))}
                    <Button
                      size="small"
                      variant="text"
                      color="inherit"
                      onClick={() => navigate(`/delivery/tasks/${task.id}`)}
                      sx={{ ml: transitions.length ? 'auto' : 0, color: 'text.secondary' }}
                    >
                      {t('tasks.viewDetails')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Stagger>

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
