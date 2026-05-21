import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, Divider, IconButton, Tooltip,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import MapIcon from '@mui/icons-material/Map';
import { useTranslation } from 'react-i18next';
import { Stagger } from '../../components/common/Motion';
import { deliveryApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
};

function mapsUrl(lat, lng, address) {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function DeliveryTasks() {
  const navigate = useNavigate();
  const { t } = useTranslation('delivery');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    deliveryApi.getTodayTasks()
      .then(setTasks)
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (tasks.length === 0) return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>{t('tasks.title')}</Typography>
      <Typography color="text.disabled">{t('tasks.noTasks')}</Typography>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>{t('tasks.title')}</Typography>
      <Stagger>
        <Stack spacing={2}>
          {tasks.map((task) => {
            const done = ['DELIVERED', 'FAILED'].includes(task.status);
            return (
              <Card
                key={task.id}
                variant="outlined"
                sx={{
                  opacity: done ? 0.6 : 1,
                  cursor: 'pointer',
                  transition: 'box-shadow 200ms, transform 200ms',
                  '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
                }}
                onClick={() => navigate(`/delivery/tasks/${task.id}`)}
              >
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                        <Typography variant="body1" fontWeight={700}>
                          {t('tasks.stop')} {task.stopOrder ?? '—'}
                        </Typography>
                        <Chip
                          label={t(`status.${task.status}`)}
                          color={STATUS_COLORS[task.status] || 'default'}
                          size="small"
                        />
                      </Stack>

                      {task.pickupLabel && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('tasks.pickup')}: {task.pickupLabel}
                        </Typography>
                      )}
                      <Typography variant="body2" noWrap sx={{ mt: 0.25 }}>
                        {t('tasks.dropoff')}: {task.deliveryAddress}
                      </Typography>

                      {task.invoiceAmount && (
                        <Typography variant="caption" color="text.secondary">
                          {task.invoiceAmount} {task.currency}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" gap={0.5} onClick={e => e.stopPropagation()}>
                      {task.clientPhone && (
                        <Tooltip title={t('tasks.call')}>
                          <IconButton
                            size="small"
                            component="a"
                            href={`tel:${task.clientPhone}`}
                          >
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('tasks.openMaps')}>
                        <IconButton
                          size="small"
                          component="a"
                          href={mapsUrl(task.deliveryLat, task.deliveryLng, task.deliveryAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {task.notes && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">{task.notes}</Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Stagger>
    </Box>
  );
}
