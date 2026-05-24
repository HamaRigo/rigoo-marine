import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Stack, Card, CardContent, CardActionArea,
  Chip, Alert, LinearProgress, Button, IconButton, Tooltip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Badge,
} from '@mui/material';
import ArrowBackRoundedIcon          from '@mui/icons-material/ArrowBackRounded';
import RefreshRoundedIcon             from '@mui/icons-material/RefreshRounded';
import LocalShippingRoundedIcon       from '@mui/icons-material/LocalShippingRounded';
import WarningAmberRoundedIcon        from '@mui/icons-material/WarningAmberRounded';
import PersonAddRoundedIcon           from '@mui/icons-material/PersonAddRounded';
import CancelRoundedIcon              from '@mui/icons-material/CancelRounded';
import TuneRoundedIcon                from '@mui/icons-material/TuneRounded';
import CheckCircleOutlineRoundedIcon  from '@mui/icons-material/CheckCircleOutlineRounded';
import AddRoundedIcon                 from '@mui/icons-material/AddRounded';
import FiberManualRecordIcon          from '@mui/icons-material/FiberManualRecord';
import FullscreenRoundedIcon          from '@mui/icons-material/FullscreenRounded';
import CloseRoundedIcon               from '@mui/icons-material/CloseRounded';
import SettingsRoundedIcon            from '@mui/icons-material/SettingsRounded';
import toast from 'react-hot-toast';
import { deliveryApi, driverApi } from '../../services/api';
import { useDeliveryPositions, fetchPositionHistory } from '../../services/useDeliveryPositions';
import DeliveryMap from '../../components/delivery/DeliveryMap';
import CreateDeliveryTaskDialog from '../../components/delivery/CreateDeliveryTaskDialog';

const TASK_POLL_MS = 20_000;
const PANEL_HEIGHT = 500;

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_COLOR = {
  PENDING:    'default',
  ASSIGNED:   'info',
  PICKED_UP:  'primary',
  IN_TRANSIT: 'warning',
  DELIVERED:  'success',
  FAILED:     'error',
  CANCELLED:  'default',
};

const STATUS_LABEL = {
  PENDING:    'Pending',
  ASSIGNED:   'Assigned',
  PICKED_UP:  'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED:  'Delivered',
  FAILED:     'Failed',
  CANCELLED:  'Cancelled',
};

const FORCE_STATUS_OPTIONS = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
const DONE_STATUSES = ['DELIVERED', 'CANCELLED'];

function isException(task) {
  return task.status === 'FAILED' || (task.status === 'PENDING' && !task.assignedTo);
}

export default function DeliveryTracking() {
  const { techId } = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const [createOpen, setCreateOpen]         = useState(false);
  const [assignTarget, setAssignTarget]     = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [cancelTarget, setCancelTarget]     = useState(null);
  const [cancelReason, setCancelReason]     = useState('');
  const [forceTarget, setForceTarget]       = useState(null);
  const [forceStatus, setForceStatus]       = useState('');
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [trail, setTrail]                   = useState([]);
  const [mapExpanded, setMapExpanded]       = useState(false);
  const [trackDate, setTrackDate]           = useState(localToday);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [historyDaysInput, setHistoryDaysInput] = useState('7');

  const { positions: allPositions, lastUpdated } = useDeliveryPositions({ intervalMs: 5_000 });
  const filteredPositions = techId
    ? allPositions.filter(p => String(p.techId) === String(techId))
    : allPositions;

  useEffect(() => {
    if (!techId) { setTrail([]); return; }
    fetchPositionHistory(Number(techId), 40).then(setTrail);
    const id = setInterval(() => fetchPositionHistory(Number(techId), 40).then(setTrail), 15_000);
    return () => clearInterval(id);
  }, [techId]);

  const queryKey = techId ? ['admin-delivery-driver', techId, trackDate] : ['admin-delivery-all', trackDate];
  const { data: tasksPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => techId
      ? deliveryApi.adminListTasks({ assignedTo: Number(techId), date: trackDate, size: 100 })
      : deliveryApi.adminListTasks({ date: trackDate, size: 200 }),
    refetchInterval: TASK_POLL_MS,
  });
  const tasks = tasksPage?.content ?? [];

  const { data: drivers = [] } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: driverApi.getAll,
  });
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));

  const patch = useCallback((updated) =>
    qc.setQueryData(queryKey, prev => ({
      ...prev,
      content: (prev?.content ?? []).map(t => t.id === updated.id ? updated : t),
    })), [qc, queryKey]);

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId }) => deliveryApi.adminAssignTask(id, driverId),
    onSuccess: updated => { patch(updated); setAssignTarget(null); toast.success('Driver assigned'); },
    onError: () => toast.error('Failed to assign driver'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => deliveryApi.adminCancelTask(id, reason || undefined),
    onSuccess: updated => { patch(updated); setCancelTarget(null); setCancelReason(''); toast.success('Task cancelled'); },
    onError: () => toast.error('Failed to cancel task'),
  });

  const forceMutation = useMutation({
    mutationFn: ({ id, status }) => deliveryApi.adminForceStatus(id, status),
    onSuccess: updated => { patch(updated); setForceTarget(null); toast.success(`Status → ${updated.status}`); },
    onError: () => toast.error('Failed to update status'),
  });

  const { data: deliverySettings } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: deliveryApi.getDeliverySettings,
  });

  const settingsMutation = useMutation({
    mutationFn: (days) => deliveryApi.adminUpdateDeliverySettings(days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery-settings'] }); setSettingsOpen(false); toast.success('Settings saved'); },
    onError: () => toast.error('Failed to save settings'),
  });

  const exceptions = tasks.filter(isException);
  const active     = tasks.filter(t => !DONE_STATUSES.includes(t.status)).length;
  const delivered  = tasks.filter(t => t.status === 'DELIVERED').length;
  const grouped    = {};
  tasks.forEach(t => { const key = t.assignedTo ?? 'unassigned'; (grouped[key] ??= []).push(t); });
  const techIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];

  const openAssign = (task) => { setAssignDriverId(task.assignedTo ? String(task.assignedTo) : ''); setAssignTarget(task); };
  const openForce  = (task) => { setForceStatus(task.status); setForceTarget(task); };

  const mapProps = {
    positions: filteredPositions,
    tasks,
    trail,
    driverById,
    onDriverClick: !techId ? (id) => navigate(`/admin/delivery/${id}`) : undefined,
    selectedDriverId: techId ? Number(techId) : undefined,
    showStops: !!techId,
    selectedStopId: techId ? selectedStopId : undefined,
    onStopSelect: techId ? (id) => setSelectedStopId(prev => prev === id ? null : id) : undefined,
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  const liveAgoSec = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : null;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" useFlexGap gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {techId && (
            <IconButton onClick={() => navigate('/admin/delivery')} size="small">
              <ArrowBackRoundedIcon />
            </IconButton>
          )}
          <Typography variant="h4" fontWeight={700}>
            {techId ? `Driver: ${driverById[Number(techId)]?.name ?? `#${techId}`}` : 'Delivery Tracking'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="date"
            size="small"
            value={trackDate}
            onChange={e => setTrackDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: '#43a047 !important' }} />}
            label={liveAgoSec != null ? `Live · ${liveAgoSec}s ago` : 'Live'}
            size="small" variant="outlined"
            sx={{ fontSize: 11, color: 'text.secondary', borderColor: 'divider' }}
          />
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)} size="small">
            New Task
          </Button>
          <Tooltip title="Refresh tasks"><IconButton onClick={() => refetch()} disabled={isFetching} size="small"><RefreshRoundedIcon /></IconButton></Tooltip>
          <Tooltip title="Delivery settings">
            <IconButton size="small" onClick={() => { setHistoryDaysInput(String(deliverySettings?.historyDays ?? 7)); setSettingsOpen(true); }}>
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load delivery data.</Alert>}

      {/* KPI */}
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <Chip icon={<LocalShippingRoundedIcon />} label={`${active} active`} color="primary" variant="outlined" />
        <Chip icon={<CheckCircleOutlineRoundedIcon />} label={`${delivered} delivered`} color="success" variant="outlined" />
        <Chip label={`${allPositions.length} online`} color={allPositions.length ? 'info' : 'default'} variant="outlined" size="small" />
        {exceptions.length > 0 && <Chip icon={<WarningAmberRoundedIcon />} label={`${exceptions.length} exceptions`} color="error" />}
      </Stack>

      {/* Exception banner */}
      {exceptions.length > 0 && (
        <Alert severity="error" sx={{ mb: 2.5, '& .MuiAlert-message': { width: '100%' } }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {exceptions.length} exception{exceptions.length > 1 ? 's' : ''} require intervention
          </Typography>
          <Stack spacing={1}>
            {exceptions.map(task => (
              <Stack key={task.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 180 }}>
                  <strong>#{task.id}</strong>{' '}
                  {task.status === 'FAILED' ? `FAILED — ${task.failedReason || task.deliveryAddress}` : `Unassigned — ${task.deliveryAddress}`}
                </Typography>
                <Button size="small" variant="outlined" startIcon={<PersonAddRoundedIcon />} onClick={() => openAssign(task)} sx={{ fontSize: 11 }}>
                  {task.assignedTo ? 'Reassign' : 'Assign'}
                </Button>
                <Button size="small" variant="outlined" color="warning" startIcon={<TuneRoundedIcon />} onClick={() => openForce(task)} sx={{ fontSize: 11 }}>Override</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CancelRoundedIcon />} onClick={() => { setCancelReason(''); setCancelTarget(task); }} sx={{ fontSize: 11 }}>Cancel</Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Map (left) + Content (right) */}
      <Grid container spacing={2.5} alignItems="flex-start">
        {/* ── Map panel ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <DeliveryMap {...mapProps} height={`${PANEL_HEIGHT}px`} />
            <Tooltip title="Expand map">
              <IconButton
                size="small"
                onClick={() => setMapExpanded(true)}
                sx={{
                  position: 'absolute', top: 8, right: 8, zIndex: 999,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'grey.100', transform: 'scale(1.1)' },
                  transition: 'transform .15s',
                }}
              >
                <FullscreenRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>

        {/* ── Content panel ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          {techId ? (
            <SingleDriverDetail
              tasks={tasks}
              openAssign={openAssign}
              openForce={openForce}
              setCancelTarget={t => { setCancelReason(''); setCancelTarget(t); }}
              selectedStopId={selectedStopId}
              onSelectStop={(id) => setSelectedStopId(prev => prev === id ? null : id)}
            />
          ) : (
            <AllDriversSplit
              techIds={techIds}
              grouped={grouped}
              driverById={driverById}
              allPositions={allPositions}
              navigate={navigate}
              openAssign={openAssign}
              baseRoute="/admin/delivery"
            />
          )}
        </Grid>
      </Grid>

      {/* ── Expanded map dialog ── */}
      <Dialog
        open={mapExpanded}
        onClose={() => setMapExpanded(false)}
        maxWidth={false}
        PaperProps={{ sx: { width: '92vw', height: '88vh', m: 1, borderRadius: 3, overflow: 'hidden' } }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          <DeliveryMap
            {...mapProps}
            height="100%"
            onDriverClick={!techId ? (id) => { navigate(`/admin/delivery/${id}`); setMapExpanded(false); } : undefined}
          />
          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={() => setMapExpanded(false)}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 999, bgcolor: 'background.paper', boxShadow: 2 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{assignTarget?.assignedTo ? 'Reassign Driver' : 'Assign Driver'} — Task #{assignTarget?.id}</DialogTitle>
        <DialogContent>
          {assignTarget && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {assignTarget.deliveryAddress}
              {assignTarget.failedReason && <Box component="span" color="error.main"> · {assignTarget.failedReason}</Box>}
            </Typography>
          )}
          <FormControl fullWidth>
            <InputLabel>Driver</InputLabel>
            <Select value={assignDriverId} label="Driver" onChange={e => setAssignDriverId(e.target.value)}>
              {drivers.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={!assignDriverId || assignMutation.isPending}
            onClick={() => assignMutation.mutate({ id: assignTarget.id, driverId: Number(assignDriverId) })}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Force status dialog */}
      <Dialog open={!!forceTarget} onClose={() => setForceTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Override Status — Task #{forceTarget?.id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Current: <strong>{forceTarget?.status}</strong> · {forceTarget?.deliveryAddress}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select value={forceStatus} label="New Status" onChange={e => setForceStatus(e.target.value)}>
              {FORCE_STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForceTarget(null)}>Cancel</Button>
          <Button variant="contained" color="warning"
            disabled={!forceStatus || forceStatus === forceTarget?.status || forceMutation.isPending}
            onClick={() => forceMutation.mutate({ id: forceTarget.id, status: forceStatus })}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Task #{cancelTarget?.id}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>{cancelTarget?.deliveryAddress}</Typography>
          <TextField fullWidth multiline rows={2} label="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Back</Button>
          <Button variant="contained" color="error" disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() })}>
            Cancel Task
          </Button>
        </DialogActions>
      </Dialog>

      <CreateDeliveryTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} drivers={drivers} invalidateKeys={[queryKey[0]]} />

      {/* Delivery Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delivery Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set how many days back drivers can see in their History tab.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>History Period</InputLabel>
            <Select
              value={historyDaysInput}
              label="History Period"
              onChange={e => setHistoryDaysInput(e.target.value)}
            >
              <MenuItem value="7">1 Week (7 days)</MenuItem>
              <MenuItem value="14">2 Weeks (14 days)</MenuItem>
              <MenuItem value="30">1 Month (30 days)</MenuItem>
              <MenuItem value="60">2 Months (60 days)</MenuItem>
              <MenuItem value="90">3 Months (90 days)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={settingsMutation.isPending}
            onClick={() => settingsMutation.mutate(Number(historyDaysInput))}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function StopCard({ task, index, openAssign, openForce, setCancelTarget, selectedStopId, onSelectStop }) {
  const done     = DONE_STATUSES.includes(task.status);
  const selected = task.id === selectedStopId;
  const hasCoords= task.deliveryLat && task.deliveryLng;
  const canAct   = task.status === 'FAILED' || task.status === 'PENDING';

  return (
    <Card
      variant="outlined"
      onClick={() => hasCoords && onSelectStop?.(task.id)}
      sx={{
        cursor: hasCoords ? 'pointer' : 'default',
        borderColor: selected ? 'warning.main' : done ? 'divider' : 'primary.light',
        borderWidth: selected ? 2 : 1,
        bgcolor: selected ? 'warning.50' : 'background.paper',
        opacity: done ? 0.72 : 1,
        transition: 'border-color .2s, transform .15s',
        '&:hover': hasCoords ? { borderColor: 'primary.main', transform: 'translateX(3px)' } : {},
      }}
    >
      <CardContent sx={{ py: '8px !important', px: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            bgcolor: selected ? 'warning.main' : done ? 'grey.400' : 'primary.main',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
          }}>
            {done ? '✓' : task.stopOrder ?? index + 1}
          </Box>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 100 }} noWrap>{task.deliveryAddress}</Typography>
          <Chip label={STATUS_LABEL[task.status] ?? task.status} size="small" color={STATUS_COLOR[task.status] ?? 'default'} sx={{ flexShrink: 0, fontSize: 10 }} />
          {canAct && (
            <Stack direction="row" spacing={0.5} flexShrink={0} onClick={e => e.stopPropagation()}>
              <Tooltip title="Reassign"><IconButton size="small" onClick={() => openAssign(task)}><PersonAddRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Override"><IconButton size="small" color="warning" onClick={() => openForce(task)}><TuneRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Cancel"><IconButton size="small" color="error" onClick={() => setCancelTarget(task)}><CancelRoundedIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
          )}
        </Stack>
        {task.failedReason && (
          <Typography variant="caption" color="error" sx={{ ml: 4.5, display: 'block', mt: 0.25 }}>
            {task.failedReason}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function SingleDriverDetail({ tasks, openAssign, openForce, setCancelTarget, selectedStopId, onSelectStop }) {
  const activeTasks = tasks.filter(t => !DONE_STATUSES.includes(t.status));
  const doneTasks   = tasks.filter(t => DONE_STATUSES.includes(t.status));

  if (!tasks.length) return <Typography color="text.disabled">No stops assigned to this driver today.</Typography>;

  const stopProps = { openAssign, openForce, setCancelTarget, selectedStopId, onSelectStop };

  return (
    <Box sx={{ maxHeight: PANEL_HEIGHT, overflowY: 'auto', pr: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
        <Typography variant="subtitle2" fontWeight={700}>Active Stops</Typography>
        <Chip label={activeTasks.length} size="small" color="primary" />
      </Stack>
      {activeTasks.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>All stops completed.</Typography>
      ) : (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {activeTasks.map((task) => (
            <StopCard key={task.id} task={task} index={tasks.indexOf(task)} {...stopProps} />
          ))}
        </Stack>
      )}

      {doneTasks.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }}>
            <Chip label={`Done · ${doneTasks.length}`} size="small" color="success" />
          </Divider>
          <Stack spacing={0.75}>
            {doneTasks.map((task) => (
              <StopCard key={task.id} task={task} index={tasks.indexOf(task)} {...stopProps} />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

function DriverCard({ id, techTasks, driverName, pos, hasFailed, navigate, openAssign, baseRoute }) {
  const done     = techTasks.filter(t => t.status === 'DELIVERED').length;
  const total    = techTasks.length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const isOnline = !!pos;
  const ageMs    = pos?.recordedAt ? Date.now() - Number(pos.recordedAt) : Infinity;
  const isStale  = ageMs > 300_000;

  return (
    <Card variant="outlined" sx={{
      borderColor: hasFailed ? 'error.main' : isOnline && !isStale ? 'success.light' : 'divider',
      transition: 'border-color .3s',
    }}>
      <CardActionArea onClick={() => navigate(`${baseRoute}/${id}`)} sx={{ p: 1.75 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
          <Badge variant="dot" color={isOnline && !isStale ? 'success' : 'default'} overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <LocalShippingRoundedIcon color={hasFailed ? 'error' : 'primary'} fontSize="small" />
          </Badge>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }} noWrap>{driverName}</Typography>
          {hasFailed && <Chip label="Failed" size="small" color="error" />}
          {isOnline && !isStale && !hasFailed && <Chip label="Live" size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />}
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={0.5}>{done} of {total} stops completed</Typography>
        <LinearProgress variant="determinate" value={pct} color={hasFailed ? 'error' : pct === 100 ? 'success' : 'primary'} sx={{ borderRadius: 1, height: 5 }} />
        {pos && !isStale && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            {ageMs < 60_000 ? `Updated ${Math.round(ageMs / 1000)}s ago` : `Updated ${Math.round(ageMs / 60_000)}m ago`}
          </Typography>
        )}
      </CardActionArea>
      {hasFailed && (
        <Box sx={{ px: 1.75, pb: 1.25 }}>
          <Button size="small" startIcon={<PersonAddRoundedIcon />}
            onClick={e => { e.stopPropagation(); const f = techTasks.find(t => t.status === 'FAILED'); if (f) openAssign(f); }}
            sx={{ fontSize: 11 }}>
            Reassign failed stop
          </Button>
        </Box>
      )}
    </Card>
  );
}

function AllDriversSplit({ techIds, grouped, driverById, allPositions, navigate, openAssign, baseRoute }) {
  const posById = Object.fromEntries(allPositions.map(p => [Number(p.techId), p]));

  const activeIds = techIds.filter(id => (grouped[id] ?? []).some(t => !DONE_STATUSES.includes(t.status)));
  const doneIds   = techIds.filter(id => (grouped[id] ?? []).every(t => DONE_STATUSES.includes(t.status)));

  if (!techIds.length) return <Typography color="text.disabled">No active delivery drivers today.</Typography>;

  const cardProps = (id) => ({
    id,
    techTasks: grouped[id] ?? [],
    driverName: driverById[id]?.name ?? `Driver #${id}`,
    pos: posById[id],
    hasFailed: (grouped[id] ?? []).some(t => t.status === 'FAILED'),
    navigate,
    openAssign,
    baseRoute,
  });

  return (
    <Box sx={{ maxHeight: PANEL_HEIGHT, overflowY: 'auto', pr: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
        <Typography variant="subtitle2" fontWeight={700}>Active Drivers</Typography>
        <Chip label={activeIds.length} size="small" color="primary" />
      </Stack>
      {activeIds.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>No active drivers.</Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {activeIds.map(id => <DriverCard key={id} {...cardProps(id)} />)}
        </Stack>
      )}

      {doneIds.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }}>
            <Chip label={`Completed · ${doneIds.length}`} size="small" color="success" />
          </Divider>
          <Stack spacing={1}>
            {doneIds.map(id => <DriverCard key={id} {...cardProps(id)} />)}
          </Stack>
        </>
      )}
    </Box>
  );
}
