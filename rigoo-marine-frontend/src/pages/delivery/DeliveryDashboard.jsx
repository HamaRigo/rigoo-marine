import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, CircularProgress, Alert, Stack, Button,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
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
};

function StatCard({ label, value, color, icon, onClick }) {
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
          <Typography variant="h4" fontWeight={700} color={`${color}.main`}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DeliveryDashboard() {
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

  const pending   = tasks.filter(t => ['PENDING', 'ASSIGNED'].includes(t.status));
  const inTransit = tasks.filter(t => ['PICKED_UP', 'IN_TRANSIT'].includes(t.status));
  const completed = tasks.filter(t => t.status === 'DELIVERED');
  const failed    = tasks.filter(t => t.status === 'FAILED');
  const active    = tasks.filter(t => !['DELIVERED', 'FAILED'].includes(t.status));

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          {t('dashboard.title')}
        </Typography>
      </Reveal>

      <Stagger>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} >
            <StatCard
              label={t('dashboard.todayStops')}
              value={tasks.length}
              color="primary"
              icon={<LocalShippingIcon fontSize="inherit" />}
              onClick={() => navigate('/delivery/tasks')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} >
            <StatCard
              label={t('dashboard.inTransit')}
              value={inTransit.length}
              color="info"
              icon={<LocalShippingIcon fontSize="inherit" />}
              onClick={() => navigate('/delivery/tasks')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} >
            <StatCard
              label={t('dashboard.completed')}
              value={completed.length}
              color="success"
              icon={<CheckCircleIcon fontSize="inherit" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} >
            <StatCard
              label={t('dashboard.failed')}
              value={failed.length}
              color="error"
              icon={<ErrorIcon fontSize="inherit" />}
            />
          </Grid>
        </Grid>
      </Stagger>

      <Reveal variant="slideUp">
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={600}>Active Stops</Typography>
              <Button size="small" onClick={() => navigate('/delivery/tasks')}>View all</Button>
            </Stack>
            {active.length === 0 && (
              <Typography color="text.disabled" variant="body2">{t('dashboard.noTasks')}</Typography>
            )}
            <List dense disablePadding>
              {active.slice(0, 10).map((task, i) => (
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
          </CardContent>
        </Card>
      </Reveal>
    </Box>
  );
}
