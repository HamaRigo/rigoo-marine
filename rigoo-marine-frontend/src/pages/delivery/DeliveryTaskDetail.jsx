import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack,
  TextField, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../../components/common/Motion';
import { deliveryApi } from '../../services/api';
import { NavigateButton } from '../../components/delivery/NavigateMenu';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
};


export default function DeliveryTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('delivery');
  const fileRef = useRef();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [failedReason, setFailedReason] = useState('');

  useEffect(() => {
    deliveryApi.getTaskById(id)
      .then(setTask)
      .catch(() => setError('Failed to load task.'))
      .finally(() => setLoading(false));
  }, [id]);

  const doStatus = async (status, extra = {}) => {
    setActionLoading(true);
    try {
      const updated = await deliveryApi.updateStatus(id, status, extra.failedReason);
      setTask(updated);
    } catch {
      setError('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(true);
    try {
      const updated = await deliveryApi.uploadProof(id, file);
      setTask(updated);
    } catch {
      setError('Failed to upload proof photo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailConfirm = () => {
    setFailedDialogOpen(false);
    doStatus('FAILED', { failedReason });
    setFailedReason('');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" action={<Button onClick={() => navigate(-1)}>Back</Button>}>{error}</Alert>;
  if (!task)   return null;

  const status = task.status;
  const done = ['DELIVERED', 'FAILED'].includes(status);

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>
          {t('detail.title', { id: task.id })}
        </Typography>
        <Chip
          label={t(`status.${status}`)}
          color={STATUS_COLORS[status] || 'default'}
          sx={{ ml: 1 }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
        {/* Pickup */}
        {task.pickupAddress && (
          <Reveal variant="slideUp">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('detail.pickupSection')}
                </Typography>
                <Typography variant="body1" fontWeight={500}>{task.pickupLabel || task.pickupAddress}</Typography>
                {task.pickupLabel && (
                  <Typography variant="body2" color="text.secondary">{task.pickupAddress}</Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  <NavigateButton
                    lat={task.pickupLat}
                    lng={task.pickupLng}
                    address={task.pickupAddress}
                  />
                </Box>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Drop-off */}
        <Reveal variant="slideUp">
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('detail.dropoffSection')}
              </Typography>
              <Typography variant="body1" fontWeight={500}>{task.deliveryAddress}</Typography>
              <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap" alignItems="center">
                <NavigateButton
                  lat={task.deliveryLat}
                  lng={task.deliveryLng}
                  address={task.deliveryAddress}
                />
                {task.clientPhone && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PhoneIcon />}
                    component="a"
                    href={`tel:${task.clientPhone}`}
                  >
                    {task.clientPhone}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Reveal>

        {/* Billing */}
        {task.invoiceAmount && (
          <Reveal variant="slideUp">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('detail.billingSection')}
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {task.invoiceAmount} {task.currency}
                </Typography>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Notes */}
        {task.notes && (
          <Reveal variant="fade">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('tasks.notes')}
                </Typography>
                <Typography variant="body2">{task.notes}</Typography>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Actions */}
        {!done && (
          <Reveal variant="slideUp">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('detail.actionsSection')}
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {status === 'ASSIGNED' && (
                    <Button
                      variant="contained"
                      disabled={actionLoading}
                      onClick={() => doStatus('PICKED_UP')}
                    >
                      {t('detail.markPickedUp')}
                    </Button>
                  )}
                  {status === 'PICKED_UP' && (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={actionLoading}
                      onClick={() => doStatus('IN_TRANSIT')}
                    >
                      {t('detail.startDelivery')}
                    </Button>
                  )}
                  {status === 'IN_TRANSIT' && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={actionLoading}
                        onClick={() => doStatus('DELIVERED')}
                      >
                        {t('detail.markDelivered')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={actionLoading}
                        onClick={() => setFailedDialogOpen(true)}
                      >
                        {t('detail.reportFailed')}
                      </Button>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Proof photo upload */}
        {(status === 'DELIVERED' || status === 'IN_TRANSIT') && (
          <Reveal variant="fade">
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('detail.uploadProof')}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CameraAltIcon />}
                    disabled={actionLoading}
                    onClick={() => fileRef.current?.click()}
                  >
                    Upload
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleProofUpload}
                  />
                </Stack>
                {task.proofPhotoPath && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                    Photo uploaded
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Failed reason display */}
        {status === 'FAILED' && task.failedReason && (
          <Reveal variant="fade">
            <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  {t('detail.failedReason')}
                </Typography>
                <Typography variant="body2">{task.failedReason}</Typography>
              </CardContent>
            </Card>
          </Reveal>
        )}
      </Stack>

      {/* Failed dialog */}
      <Dialog open={failedDialogOpen} onClose={() => setFailedDialogOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setFailedDialogOpen(false)}>{t('detail.cancel')}</Button>
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
