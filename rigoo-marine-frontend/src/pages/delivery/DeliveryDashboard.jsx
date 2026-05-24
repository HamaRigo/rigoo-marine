import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, CircularProgress, Alert, Stack, Button, Skeleton,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import ErrorIcon         from '@mui/icons-material/Error';
import HistoryIcon       from '@mui/icons-material/History';
import { useTranslation } from 'react-i18next';
import { Reveal, Stagger } from '../../components/common/Motion';
import { deliveryApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
  CANCELLED:  'default',
};

const DONE_SET = new Set(['DELIVERED', 'FAILED', 'CANCELLED']);

function StatCard({ label, value, color, icon, onClick, loading }) {
  return (
    <Card
      variant="outlined"
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 200ms, transform 200ms',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ color: `${color}.main`, fontSize: 36, display: 'flex' }}>{icon}</Box>
        <Box>
          {loading
            ? <Skeleton width={40} height={40} />
            : <Typography variant="h4" fontWeight={700} color={`${color}.main`}>{value}</Typography>
          }
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation('delivery');

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: deliveryApi.getTaskStats,
    staleTime: 5 * 60_000,
    refetchInterval: 2 * 60_000,
  });

  const { data: todayTasks = [], isLoading: todayLoading, isError: todayError } = useQuery({
    queryKey: ['delivery-tasks-today'],
    queryFn: deliveryApi.getTodayTasks,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const loading = statsLoading || todayLoading;
  const error   = statsError || todayError;

  const active = useMemo(
    () => todayTasks.filter(tk => !DONE_SET.has(tk.status)),
    [todayTasks],
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{t('dashboard.loadError')}</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('dashboard.allTimeStats')}
        </Typography>
      </Reveal>

      <Stagger>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label={t('dashboard.totalDeliveries')}
              value={stats?.total ?? 0}
              color="primary"
              icon={<LocalShippingIcon fontSize="inherit" />}
              onClick={() => navigate('/delivery/tasks')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label={t('dashboard.completed')}
              value={stats?.delivered ?? 0}
              color="success"
              icon={<CheckCircleIcon fontSize="inherit" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label={t('dashboard.failed')}
              value={stats?.failed ?? 0}
              color="error"
              icon={<ErrorIcon fontSize="inherit" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label={t('dashboard.inTransit')}
              value={stats?.inTransit ?? 0}
              color="info"
              icon={<LocalShippingIcon fontSize="inherit" />}
              onClick={() => navigate('/delivery/tasks')}
            />
          </Grid>
        </Grid>
      </Stagger>

      <Reveal variant="slideUp">
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={600}>{t('dashboard.todayActive')}</Typography>
              <Button size="small" onClick={() => navigate('/delivery/tasks')}>{t('dashboard.viewAll')}</Button>
            </Stack>
            {active.length === 0 && (
              <Typography color="text.disabled" variant="body2">{t('dashboard.noActiveTasks')}</Typography>
            )}
            <List dense disablePadding>
              {active.slice(0, 8).map((task, i) => (
                <Box key={task.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    sx={{ py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate(`/delivery/tasks/${task.id}`)}
                  >
                    <ListItemText
                      primary={`Stop ${task.stopOrder ?? i + 1} — ${task.deliveryAddress}`}
                      secondary={task.clientPhone ?? ''}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={t(`status.${task.status}`)}
                        color={STATUS_COLORS[task.status] || 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </Box>
              ))}
            </List>
            {active.length === 0 && (stats?.pending ?? 0) === 0 && (
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/delivery/history')}
                >
                  {t('dashboard.viewHistory')}
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </Box>
  );
}
