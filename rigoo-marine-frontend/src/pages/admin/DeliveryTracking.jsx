import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Stack, Card, CardContent, CardActionArea,
  Chip, Alert, LinearProgress, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Collapse,
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
import toast from 'react-hot-toast';
import { deliveryApi, driverApi } from '../../services/api';
import DeliveryMap from '../../components/delivery/DeliveryMap';
import CreateDeliveryTaskDialog from '../../components/delivery/CreateDeliveryTaskDialog';

const POLL_MS = 30_000;

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

function isException(task) {
  return task.status === 'FAILED' || (task.status === 'PENDING' && !task.assignedTo);
}

export default function DeliveryTracking() {
  const { techId } = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const [createOpen, setCreateOpen]             = useState(false);
  const [assignTarget, setAssignTarget]         = useState(null);
  const [assignDriverId, setAssignDriverId]     = useState('');
  const [cancelTarget, setCancelTarget]         = useState(null);
  const [cancelReason, setCancelReason]         = useState('');
  const [forceTarget, setForceTarget]           = useState(null);
  const [forceStatus, setForceStatus]           = useState('');
  const [selectedStopId, setSelectedStopId]     = useState(null);

  /* ── Data ── */
  const queryKey = techId ? ['admin-delivery-driver', techId] : ['admin-delivery-all'];

  const { data: tasksPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => techId
      ? deliveryApi.adminListTasks({ assignedTo: Number(techId), size: 100 })
      : deliveryApi.adminListTasks({ size: 200 }),
    refetchInterval: POLL_MS,
  });
  const tasks = tasksPage?.content ?? [];

  const { data: positions = [] } = useQuery({
    queryKey: ['admin-delivery-positions'],
    queryFn: deliveryApi.adminListPositions,
    refetchInterval: POLL_MS,
  });

  const filteredPositions = techId
    ? positions.filter(p => String(p.techId) === String(techId))
    : positions;

  const { data: drivers = [] } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: driverApi.getAll,
  });
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));

  /* ── Mutations ── */
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
    onSuccess: updated => {
      patch(updated);
      setCancelTarget(null);
      setCancelReason('');
      toast.success('Task cancelled');
    },
    onError: () => toast.error('Failed to cancel task'),
  });

  const forceMutation = useMutation({
    mutationFn: ({ id, status }) => deliveryApi.adminForceStatus(id, status),
    onSuccess: updated => { patch(updated); setForceTarget(null); toast.success(`Status → ${updated.status}`); },
    onError: () => toast.error('Failed to update status'),
  });

  /* ── Derived ── */
  const exceptions = tasks.filter(isException);
  const active     = tasks.filter(t => !['DELIVERED', 'CANCELLED'].includes(t.status)).length;
  const delivered  = tasks.filter(t => t.status === 'DELIVERED').length;

  // Group by driver for all-techs view
  const grouped = {};
  tasks.forEach(t => {
    const key = t.assignedTo ?? 'unassigned';
    (grouped[key] ??= []).push(t);
  });
  const techIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];

  const openAssign = (task) => {
    setAssignDriverId(task.assignedTo ? String(task.assignedTo) : '');
    setAssignTarget(task);
  };

  const openForce = (task) => {
    setForceStatus(task.status);
    setForceTarget(task);
  };

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  );

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {techId && (
            <IconButton onClick={() => navigate('/admin/delivery')} size="small">
              <ArrowBackRoundedIcon />
            </IconButton>
          )}
          <Typography variant="h4" fontWeight={700}>
            {techId
              ? `Driver: ${driverById[Number(techId)]?.name ?? `#${techId}`}`
              : 'Delivery Tracking'}
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddRoundedIcon />}
          onClick={() => setCreateOpen(true)} size="small">
          New Task
        </Button>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()} disabled={isFetching}>
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load delivery data.</Alert>}

      {/* Summary strip */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <Chip icon={<LocalShippingRoundedIcon />} label={`${active} active`} color="primary" variant="outlined" />
        <Chip icon={<CheckCircleOutlineRoundedIcon />} label={`${delivered} delivered`} color="success" variant="outlined" />
        {exceptions.length > 0 && (
          <Chip icon={<WarningAmberRoundedIcon />} label={`${exceptions.length} exceptions`} color="error" />
        )}
        <Typography variant="body2" color="text.disabled" sx={{ ml: 'auto !important', alignSelf: 'center' }}>
          Auto-refreshes every 30s
        </Typography>
      </Stack>

      {/* Exception banner */}
      {exceptions.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {exceptions.length} exception{exceptions.length > 1 ? 's' : ''} require intervention
          </Typography>
          <Stack spacing={1}>
            {exceptions.map(task => (
              <Stack key={task.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 200 }}>
                  <strong>#{task.id}</strong>{' '}
                  {task.status === 'FAILED'
                    ? `FAILED — ${task.failedReason || task.deliveryAddress}`
                    : `Unassigned — ${task.deliveryAddress}`}
                </Typography>
                <Button size="small" variant="outlined" startIcon={<PersonAddRoundedIcon />}
                  onClick={() => openAssign(task)} sx={{ fontSize: 11 }}>
                  {task.assignedTo ? 'Reassign' : 'Assign'}
                </Button>
                <Button size="small" variant="outlined" color="warning" startIcon={<TuneRoundedIcon />}
                  onClick={() => openForce(task)} sx={{ fontSize: 11 }}>
                  Override
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CancelRoundedIcon />}
                  onClick={() => { setCancelReason(''); setCancelTarget(task); }} sx={{ fontSize: 11 }}>
                  Cancel
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Map */}
      <Box mb={3}>
        <DeliveryMap
          positions={filteredPositions}
          tasks={tasks}
          driverById={driverById}
          onDriverClick={!techId ? (id) => navigate(`/admin/delivery/${id}`) : undefined}
          selectedDriverId={techId ? Number(techId) : undefined}
          showStops={!!techId}
          height="420px"
          selectedStopId={techId ? selectedStopId : undefined}
          onStopSelect={techId ? (id) => setSelectedStopId(prev => prev === id ? null : id) : undefined}
        />
      </Box>

      {/* Content: single driver detail OR all-drivers grid */}
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
        <AllDriversGrid
          techIds={techIds}
          grouped={grouped}
          driverById={driverById}
          navigate={navigate}
          openAssign={openAssign}
        />
      )}

      {/* Assign / Reassign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {assignTarget?.assignedTo ? 'Reassign Driver' : 'Assign Driver'} — Task #{assignTarget?.id}
        </DialogTitle>
        <DialogContent>
          {assignTarget && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {assignTarget.deliveryAddress}
              {assignTarget.failedReason && (
                <Box component="span" color="error.main"> · {assignTarget.failedReason}</Box>
              )}
            </Typography>
          )}
          <FormControl fullWidth>
            <InputLabel>Driver</InputLabel>
            <Select value={assignDriverId} label="Driver"
              onChange={e => setAssignDriverId(e.target.value)}>
              {drivers.map(d => (
                <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
              ))}
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

      {/* Force status override dialog */}
      <Dialog open={!!forceTarget} onClose={() => setForceTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Override Status — Task #{forceTarget?.id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Current: <strong>{forceTarget?.status}</strong> · {forceTarget?.deliveryAddress}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select value={forceStatus} label="New Status"
              onChange={e => setForceStatus(e.target.value)}>
              {FORCE_STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
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

      {/* Cancel task dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Task #{cancelTarget?.id}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {cancelTarget?.deliveryAddress}
          </Typography>
          <TextField fullWidth multiline rows={2} label="Reason (optional)"
            value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Back</Button>
          <Button variant="contained" color="error" disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() })}>
            Cancel Task
          </Button>
        </DialogActions>
      </Dialog>

      <CreateDeliveryTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        drivers={drivers}
        invalidateKeys={[queryKey[0]]}
      />
    </Box>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SingleDriverDetail({ tasks, openAssign, openForce, setCancelTarget, selectedStopId, onSelectStop }) {
  if (tasks.length === 0) {
    return <Typography color="text.disabled">No stops assigned to this driver today.</Typography>;
  }
  return (
    <Stack spacing={1}>
      <Typography variant="h6" fontWeight={600}>Stop List</Typography>
      {tasks.map((task, i) => {
        const done      = ['DELIVERED', 'FAILED'].includes(task.status);
        const selected  = task.id === selectedStopId;
        const hasCoords = task.deliveryLat && task.deliveryLng;
        const canAct    = task.status === 'FAILED' || task.status === 'PENDING';

        return (
          <Card
            key={task.id}
            variant="outlined"
            onClick={() => hasCoords && onSelectStop?.(task.id)}
            sx={{
              cursor: hasCoords ? 'pointer' : 'default',
              borderColor: selected ? 'warning.main' : 'divider',
              borderWidth: selected ? 2 : 1,
              bgcolor: selected ? 'warning.50' : 'background.paper',
              opacity: done ? 0.75 : 1,
              transition: 'border-color .2s, background-color .2s',
              '&:hover': hasCoords ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
            }}
          >
            <CardContent sx={{ py: '8px !important', px: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Box sx={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  bgcolor: selected ? 'warning.main' : done ? 'grey.400' : 'primary.main',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {done ? '✓' : task.stopOrder ?? i + 1}
                </Box>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }} noWrap>
                  {task.deliveryAddress}
                </Typography>
                <Chip
                  label={STATUS_LABEL[task.status] ?? task.status}
                  size="small"
                  color={STATUS_COLOR[task.status] ?? 'default'}
                  sx={{ flexShrink: 0, fontSize: 10 }}
                />
                {canAct && (
                  <Stack direction="row" spacing={0.5} flexShrink={0} onClick={e => e.stopPropagation()}>
                    <Tooltip title="Reassign driver">
                      <IconButton size="small" onClick={() => openAssign(task)}>
                        <PersonAddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Override status">
                      <IconButton size="small" color="warning" onClick={() => openForce(task)}>
                        <TuneRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel task">
                      <IconButton size="small" color="error" onClick={() => setCancelTarget(task)}>
                        <CancelRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
              {task.failedReason && (
                <Typography variant="caption" color="error" sx={{ ml: 4.5, display: 'block', mt: 0.5 }}>
                  {task.failedReason}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function AllDriversGrid({ techIds, grouped, driverById, navigate, openAssign }) {
  if (techIds.length === 0) {
    return <Typography color="text.disabled">No active delivery drivers today.</Typography>;
  }
  return (
    <Grid container spacing={2}>
      {techIds.map(id => {
        const techTasks  = grouped[id] ?? [];
        const done       = techTasks.filter(t => t.status === 'DELIVERED').length;
        const total      = techTasks.length;
        const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
        const hasFailed  = techTasks.some(t => t.status === 'FAILED');
        const driverName = driverById[id]?.name ?? `Driver #${id}`;

        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={id}>
            <Card variant="outlined"
              sx={{ borderColor: hasFailed ? 'error.main' : 'divider', height: '100%' }}>
              <CardActionArea onClick={() => navigate(`/admin/delivery/${id}`)} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <LocalShippingRoundedIcon color={hasFailed ? 'error' : 'primary'} fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }} noWrap>
                    {driverName}
                  </Typography>
                  {hasFailed && <Chip label="Failed stop" size="small" color="error" />}
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  {done} of {total} stops completed
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={hasFailed ? 'error' : 'success'}
                  sx={{ borderRadius: 1, height: 6 }}
                />
              </CardActionArea>
              {hasFailed && (
                <Box sx={{ px: 2, pb: 1.5 }}>
                  <Button
                    size="small"
                    startIcon={<PersonAddRoundedIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      const failedTask = techTasks.find(t => t.status === 'FAILED');
                      if (failedTask) openAssign(failedTask);
                    }}
                    sx={{ fontSize: 11 }}
                  >
                    Reassign failed stop
                  </Button>
                </Box>
              )}
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
