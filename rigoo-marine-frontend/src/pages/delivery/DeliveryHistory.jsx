/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, Button, Divider,
} from '@mui/material';
import ArchiveIcon       from '@mui/icons-material/Archive';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
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

const localDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// Outside component — pure function, no closure dependencies
const groupByDate = (list) => {
  const map = {};
  for (const tk of list) {
    (map[tk.scheduledDate] ??= []).push(tk);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
};

function TaskRow({ task, onNavigate, t }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.5}
      sx={{
        py: 1, px: 0.5, cursor: 'pointer', borderRadius: 1,
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => onNavigate(`/delivery/tasks/${task.id}`)}
    >
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        bgcolor: task.status === 'DELIVERED' ? 'success.main' : task.status === 'FAILED' ? 'error.main' : 'grey.400',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>
        {task.status === 'DELIVERED' ? '✓' : task.status === 'FAILED' ? '✗' : task.stopOrder ?? '?'}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} noWrap>
          {t('tasks.stop')} {task.stopOrder ?? '—'} — {task.deliveryAddress}
        </Typography>
        {task.failedReason && (
          <Typography variant="caption" color="error.main" noWrap>{task.failedReason}</Typography>
        )}
      </Box>
      <Chip label={t(`status.${task.status}`)} color={STATUS_COLORS[task.status] || 'default'} size="small" />
    </Stack>
  );
}

function DateGroup({ date, tasks, t, onNavigate }) {
  const delivered = useMemo(() => tasks.filter(tk => tk.status === 'DELIVERED').length, [tasks]);
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
          {formatDate(date)}
          <Chip
            label={`${delivered}/${tasks.length}`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ ml: 1, height: 20, fontSize: 11 }}
          />
        </Typography>
        <Stack divider={<Divider />}>
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onNavigate={onNavigate} t={t} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DeliveryHistory() {
  const navigate = useNavigate();
  const { t }    = useTranslation('delivery');
  const [showArchive, setShowArchive] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: deliveryApi.getDeliverySettings,
    staleTime: 10 * 60_000,
  });

  const historyDays = settings?.historyDays ?? 7;

  // exclude today and yesterday — those live in My Deliveries
  const toDate   = localDateStr(-2);
  const fromDate = localDateStr(-historyDays);
  const archiveFrom = localDateStr(-365);
  const archiveTo   = localDateStr(-(historyDays + 1));

  const { data: tasks = [], isLoading: histLoading, isError } = useQuery({
    queryKey: ['delivery-history', fromDate, toDate],
    queryFn: () => deliveryApi.getTasksInRange(fromDate, toDate),
    enabled: !settingsLoading,
    staleTime: 5 * 60_000,
  });

  const { data: archiveTasks = [], isLoading: archiveLoading } = useQuery({
    queryKey: ['delivery-archive', archiveFrom, archiveTo],
    queryFn: () => deliveryApi.getTasksInRange(archiveFrom, archiveTo),
    enabled: showArchive,
    staleTime: 10 * 60_000,
  });

  const groups        = useMemo(() => groupByDate(tasks),        [tasks]);
  const archiveGroups = useMemo(() => groupByDate(archiveTasks), [archiveTasks]);

  const periodLabel = historyDays === 7
    ? t('history.lastWeek')
    : `${t('history.last')} ${historyDays} ${t('history.days')}`;

  if (settingsLoading || histLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (isError) return <Alert severity="error">{t('dashboard.loadError')}</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{t('history.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{periodLabel}</Typography>
      </Reveal>

      {groups.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
          {t('history.noHistory')}
        </Typography>
      )}

      <Stagger>
        {groups.map(([date, dateTasks]) => (
          <DateGroup key={date} date={date} tasks={dateTasks} t={t} onNavigate={navigate} />
        ))}
      </Stagger>

      {/* Archive section */}
      {!showArchive && (
        <Reveal variant="fade">
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={archiveLoading ? <CircularProgress size={16} /> : <ArchiveIcon />}
              disabled={archiveLoading}
              onClick={() => setShowArchive(true)}
            >
              {t('history.loadArchive')}
            </Button>
          </Box>
        </Reveal>
      )}

      {showArchive && (
        <>
          <Reveal variant="fade">
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 4, mb: 2 }}>
              <ArchiveIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                {t('history.archive')}
              </Typography>
            </Stack>
          </Reveal>

          {archiveLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!archiveLoading && archiveGroups.length === 0 && (
            <Typography variant="body2" color="text.disabled">{t('history.noArchive')}</Typography>
          )}

          <Stagger>
            {archiveGroups.map(([date, dateTasks]) => (
              <DateGroup key={date} date={date} tasks={dateTasks} t={t} onNavigate={navigate} />
            ))}
          </Stagger>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              size="small"
              color="inherit"
              startIcon={<ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />}
              onClick={() => setShowArchive(false)}
            >
              {t('history.hideArchive')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
