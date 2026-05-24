import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Card, CardContent, CardActionArea,
  Chip, Collapse, Divider, IconButton, Tooltip,
  CircularProgress, Alert, TextField, Button, LinearProgress,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import ArrowBackRoundedIcon   from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreRoundedIcon  from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon  from '@mui/icons-material/ExpandLessRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon       from '@mui/icons-material/ErrorRounded';
import HomeRoundedIcon        from '@mui/icons-material/HomeRounded';
import { deliveryApi, driverApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';

const STATUS_COLOR = {
  PENDING:    'default',
  ASSIGNED:   'info',
  PICKED_UP:  'primary',
  IN_TRANSIT: 'warning',
  DELIVERED:  'success',
  FAILED:     'error',
  CANCELLED:  'default',
};

const localDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

const PRESETS = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const TaskRow = memo(function TaskRow({ task }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 0.75, px: 1 }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        bgcolor: task.status === 'DELIVERED' ? 'success.main'
               : task.status === 'FAILED'    ? 'error.main' : 'grey.400',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800,
      }}>
        {task.status === 'DELIVERED' ? '✓' : task.status === 'FAILED' ? '✗' : task.stopOrder ?? '?'}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap fontWeight={500}>
          {formatDate(task.scheduledDate)} — {task.deliveryAddress}
        </Typography>
        {task.failedReason && (
          <Typography variant="caption" color="error.main" noWrap>{task.failedReason}</Typography>
        )}
      </Box>
      <Chip label={task.status} color={STATUS_COLOR[task.status] || 'default'} size="small" sx={{ fontSize: 10 }} />
    </Stack>
  );
});

const DriverGroup = memo(function DriverGroup({ driverId, driverName, tasks, backRoute }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { delivered, failed, total, pct } = useMemo(() => {
    const delivered = tasks.filter(t => t.status === 'DELIVERED').length;
    const failed    = tasks.filter(t => t.status === 'FAILED').length;
    const total     = tasks.length;
    return { delivered, failed, total, pct: total > 0 ? Math.round((delivered / total) * 100) : 0 };
  }, [tasks]);

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardActionArea onClick={() => setOpen(o => !o)} sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <LocalShippingRoundedIcon color="primary" fontSize="small" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={700} noWrap>{driverName}</Typography>
              <Chip label={`${total} tasks`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
              {failed > 0 && <Chip label={`${failed} failed`} size="small" color="error" sx={{ fontSize: 10 }} />}
            </Stack>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={pct === 100 ? 'success' : failed > 0 ? 'error' : 'primary'}
                sx={{ flex: 1, height: 5, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {delivered}/{total} delivered
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
            <Tooltip title="View live tracking">
              <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); navigate(`${backRoute}/${driverId}`); }}
              >
                <LocalShippingRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
          </Stack>
        </Stack>
      </CardActionArea>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
          <Stack divider={<Divider />}>
            {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
});

/**
 * Props:
 *   backPath   – e.g. '/admin/delivery' or '/team-lead/delivery'
 *   homePath   – e.g. '/admin' or '/team-lead'
 *   title      – page heading
 */
export default function AdminDeliveryHistory({ backPath, homePath, title = 'Driver Delivery History' }) {
  const navigate = useNavigate();

  const [preset,    setPreset]    = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const today = localDateStr(0);
  const from  = customFrom || localDateStr(-Number(preset));
  const to    = customTo   || today;

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['admin-delivery-history', from, to],
    queryFn: () => deliveryApi.adminGetDriverHistory(from, to),
    enabled: !!from && !!to,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: driverApi.getAll,
  });

  const driverById = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.id, d])),
    [drivers],
  );

  const { grouped, driverIds, totalTasks, totalDelivered, totalFailed } = useMemo(() => {
    const grouped = {};
    for (const t of tasks) {
      if (t.assignedTo == null) continue;
      (grouped[t.assignedTo] ??= []).push(t);
    }
    const driverIds = Object.keys(grouped).map(Number)
      .sort((a, b) => (driverById[a]?.name ?? '').localeCompare(driverById[b]?.name ?? ''));
    let totalDelivered = 0, totalFailed = 0;
    for (const t of tasks) {
      if (t.status === 'DELIVERED') totalDelivered++;
      else if (t.status === 'FAILED') totalFailed++;
    }
    return { grouped, driverIds, totalTasks: tasks.length, totalDelivered, totalFailed };
  }, [tasks, driverById]);

  return (
    <Box>
      {/* Header */}
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" gap={1} mb={2} flexWrap="wrap" useFlexGap>
          <Tooltip title="Back to tracking">
            <IconButton size="small" onClick={() => navigate(backPath)}>
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Home">
            <IconButton size="small" onClick={() => navigate(homePath)}>
              <HomeRoundedIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>
        </Stack>
      </Reveal>

      {/* Date range controls */}
      <Reveal variant="slideUp">
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={preset}
              onChange={(_, v) => { if (v) { setPreset(v); setCustomFrom(''); setCustomTo(''); } }}
            >
              {PRESETS.map(p => (
                <ToggleButton key={p.days} value={String(p.days)} sx={{ fontSize: 12, px: 1.5 }}>
                  {p.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Stack direction="row" gap={1} alignItems="center">
              <TextField
                type="date"
                size="small"
                label="From"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setPreset(''); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
              <TextField
                type="date"
                size="small"
                label="To"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setPreset(''); }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary">
              {formatDate(from)} → {formatDate(to)}
            </Typography>
          </Stack>
        </Card>
      </Reveal>

      {/* Summary chips */}
      {!isLoading && !isError && (
        <Reveal variant="fade">
          <Stack direction="row" gap={1.5} mb={2.5} flexWrap="wrap">
            <Chip icon={<LocalShippingRoundedIcon />} label={`${driverIds.length} drivers`} variant="outlined" />
            <Chip icon={<LocalShippingRoundedIcon />} label={`${totalTasks} tasks`} color="primary" variant="outlined" />
            <Chip icon={<CheckCircleRoundedIcon />}   label={`${totalDelivered} delivered`} color="success" variant="outlined" />
            {totalFailed > 0 && (
              <Chip icon={<ErrorRoundedIcon />} label={`${totalFailed} failed`} color="error" variant="outlined" />
            )}
          </Stack>
        </Reveal>
      )}

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}
      {isError   && <Alert severity="error">Failed to load delivery history.</Alert>}

      {!isLoading && !isError && driverIds.length === 0 && (
        <Typography color="text.disabled">No deliveries found for this period.</Typography>
      )}

      <Stagger>
        {driverIds.map(id => (
          <DriverGroup
            key={id}
            driverId={id}
            driverName={driverById[id]?.name ?? `Driver #${id}`}
            tasks={grouped[id]}
            backRoute={backPath}
          />
        ))}
      </Stagger>
    </Box>
  );
}
