import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Card, CardContent, Chip, Alert,
  LinearProgress, Button, Divider, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Collapse,
} from '@mui/material';
import RefreshRoundedIcon           from '@mui/icons-material/RefreshRounded';
import LocalShippingRoundedIcon     from '@mui/icons-material/LocalShippingRounded';
import WarningAmberRoundedIcon      from '@mui/icons-material/WarningAmberRounded';
import PersonAddRoundedIcon         from '@mui/icons-material/PersonAddRounded';
import CancelRoundedIcon            from '@mui/icons-material/CancelRounded';
import ExpandMoreRoundedIcon        from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon        from '@mui/icons-material/ExpandLessRounded';
import AddRoundedIcon               from '@mui/icons-material/AddRounded';
import FiberManualRecordIcon        from '@mui/icons-material/FiberManualRecord';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import toast from 'react-hot-toast';
import { deliveryApi, driverApi } from '../../services/api';
import { useDeliveryPositions } from '../../services/useDeliveryPositions';
import { Reveal } from '../../components/common/Motion';
import DeliveryMap from '../../components/delivery/DeliveryMap';
import CreateDeliveryTaskDialog from '../../components/delivery/CreateDeliveryTaskDialog';

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

function isException(task) {
  return task.status === 'FAILED' || (task.status === 'PENDING' && !task.assignedTo);
}

const TASK_POLL_MS = 20_000;

export default function TeamLeadDelivery() {
  const qc = useQueryClient();
  const [mapOpen, setMapOpen]           = useState(true);   // map visible by default
  const [createOpen, setCreateOpen]     = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  /* ── Live positions (5s) ── */
  const { positions, lastUpdated } = useDeliveryPositions({ intervalMs: 5_000 });
  const liveAgoSec = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : null;

  /* ── Task data ── */
  const { data: tasksPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['tl-delivery-tasks'],
    queryFn: () => deliveryApi.adminListTasks({ size: 200 }),
    refetchInterval: TASK_POLL_MS,
  });
  const tasks = tasksPage?.content ?? [];

  const { data: drivers = [] } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: driverApi.getAll,
  });
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));

  /* ── Mutations ── */
  const patch = useCallback((updated) =>
    qc.setQueryData(['tl-delivery-tasks'], prev => ({
      ...prev,
      content: (prev?.content ?? []).map(t => t.id === updated.id ? updated : t),
    })), [qc]);

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

  /* ── Derived ── */
  const exceptions  = tasks.filter(isException);
  const active      = tasks.filter(t => !['DELIVERED', 'CANCELLED'].includes(t.status)).length;
  const delivered   = tasks.filter(t => t.status === 'DELIVERED').length;

  const grouped = {};
  tasks.forEach(t => { const key = t.assignedTo ?? 'unassigned'; (grouped[key] ??= []).push(t); });
  const groupKeys = Object.keys(grouped).sort(k => (k === 'unassigned' ? 1 : -1));

  const selectedTasks = selectedDriverId != null
    ? tasks.filter(t => t.assignedTo === selectedDriverId)
    : [];

  const openAssign = (task) => {
    setAssignDriverId(task.assignedTo ? String(task.assignedTo) : '');
    setAssignTarget(task);
  };

  if (isLoading) {
    return <Box sx={{ display:'flex', justifyContent:'center', pt:8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" useFlexGap gap={1}>
          <Stack spacing={0.25}>
            <Typography variant="h5" fontWeight={700}>Delivery Overview</Typography>
            {liveAgoSec != null && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <FiberManualRecordIcon sx={{ fontSize:8, color:'success.main' }} />
                <Typography variant="caption" color="text.disabled">
                  Positions live · updated {liveAgoSec}s ago
                </Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" startIcon={<AddRoundedIcon />}
              onClick={() => setCreateOpen(true)} size="small">
              New Task
            </Button>
            <Tooltip title={mapOpen ? 'Hide map' : 'Show map'}>
              <IconButton onClick={() => setMapOpen(v => !v)} size="small"
                color={mapOpen ? 'primary' : 'default'}>
                {mapOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()} disabled={isFetching} size="small">
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb:2 }}>Failed to load delivery data.</Alert>}

      {/* KPI strip */}
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <Chip icon={<LocalShippingRoundedIcon />} label={`${active} active`} color="primary" variant="outlined" />
        <Chip icon={<CheckCircleOutlineRoundedIcon />} label={`${delivered} delivered`} color="success" variant="outlined" />
        <Chip label={`${positions.length} online`} color={positions.length ? 'info' : 'default'} variant="outlined" size="small" />
        {exceptions.length > 0 && (
          <Chip icon={<WarningAmberRoundedIcon />} label={`${exceptions.length} need attention`} color="error" />
        )}
      </Stack>

      {/* Map — always mounted, collapsible */}
      <Collapse in={mapOpen} unmountOnExit={false}>
        <Box mb={2.5}>
          <DeliveryMap
            positions={positions}
            tasks={tasks}
            driverById={driverById}
            selectedDriverId={selectedDriverId}
            onDriverClick={(id) => setSelectedDriverId(prev => prev === id ? null : id)}
            height="340px"
          />
          {selectedDriverId != null && selectedTasks.length > 0 && (
            <Box mt={1.5} sx={{ borderRadius:2, border:'1px solid', borderColor:'primary.light',
              bgcolor:'primary.50', p:1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {driverById[selectedDriverId]?.name ?? `Driver #${selectedDriverId}`} — Stops
                </Typography>
                <Button size="small" onClick={() => setSelectedDriverId(null)} sx={{ fontSize:11 }}>
                  Clear
                </Button>
              </Stack>
              <Stack spacing={0.5}>
                {selectedTasks.map((t, i) => (
                  <Stack key={t.id} direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" sx={{ flex:1 }} noWrap>
                      Stop {t.stopOrder ?? i+1} — {t.deliveryAddress}
                    </Typography>
                    <Chip label={STATUS_LABEL[t.status]} size="small"
                      color={STATUS_COLOR[t.status] ?? 'default'} sx={{ fontSize:10 }} />
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Exception banner */}
      {exceptions.length > 0 && (
        <Alert severity="error" icon={<WarningAmberRoundedIcon />}
          sx={{ mb:3, '& .MuiAlert-message':{ width:'100%' } }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {exceptions.length} task{exceptions.length > 1 ? 's' : ''} need attention
          </Typography>
          <Stack spacing={1}>
            {exceptions.map(task => (
              <Stack key={task.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" sx={{ flex:1, minWidth:200 }}>
                  <strong>#{task.id}</strong>{' '}
                  {task.status === 'FAILED'
                    ? `Failed — ${task.failedReason || task.deliveryAddress}`
                    : `Unassigned — ${task.deliveryAddress}`}
                </Typography>
                <Button size="small" variant="outlined" startIcon={<PersonAddRoundedIcon />}
                  onClick={() => openAssign(task)} sx={{ fontSize:11 }}>
                  {task.status === 'FAILED' ? 'Reassign' : 'Assign'}
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CancelRoundedIcon />}
                  onClick={() => { setCancelReason(''); setCancelTarget(task); }} sx={{ fontSize:11 }}>
                  Cancel
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Driver progress cards */}
      {tasks.length === 0 ? (
        <Typography color="text.disabled">No delivery tasks found.</Typography>
      ) : (
        <Stack spacing={2}>
          {groupKeys.map(key => {
            const group = grouped[key];
            const driver = key !== 'unassigned' ? driverById[Number(key)] : null;
            const driverName = driver?.name ?? (key === 'unassigned' ? 'Unassigned' : `Driver #${key}`);
            const done   = group.filter(t => t.status === 'DELIVERED').length;
            const total  = group.length;
            const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
            const hasFailed = group.some(t => t.status === 'FAILED');
            const isOnline  = positions.some(p => Number(p.techId) === Number(key));
            const isSelected= Number(key) === selectedDriverId;

            return (
              <Card key={key} variant="outlined" sx={{
                borderColor: isSelected ? 'primary.main'
                  : hasFailed ? 'error.main'
                  : isOnline ? 'success.light'
                  : 'divider',
                borderWidth: isSelected ? 2 : 1,
                transition: 'border-color .25s',
                cursor: key !== 'unassigned' ? 'pointer' : 'default',
                '&:hover': key !== 'unassigned' ? { bgcolor:'action.hover' } : {},
              }}
              onClick={() => key !== 'unassigned' && setSelectedDriverId(
                prev => prev === Number(key) ? null : Number(key)
              )}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <LocalShippingRoundedIcon fontSize="small"
                      color={hasFailed ? 'error' : key === 'unassigned' ? 'disabled' : 'primary'} />
                    <Typography variant="subtitle1" fontWeight={700}>{driverName}</Typography>
                    <Box sx={{ flex:1 }} />
                    {isOnline && key !== 'unassigned' && (
                      <Chip label="Live" size="small" color="success" variant="outlined"
                        sx={{ fontSize:10 }} />
                    )}
                    <Chip label={`${done}/${total}`} size="small"
                      color={hasFailed ? 'error' : done === total && total > 0 ? 'success' : 'default'} />
                    {key !== 'unassigned' && (
                      <Tooltip title="Reassign stops">
                        <IconButton size="small" onClick={e => { e.stopPropagation(); openAssign(group[0]); }}>
                          <PersonAddRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={hasFailed ? 'error' : pct === 100 ? 'success' : 'primary'}
                    sx={{ borderRadius:1, height:5, mb:1.5 }}
                  />

                  <Stack spacing={0.25}>
                    {group.map((task, i) => (
                      <Box key={task.id}>
                        {i > 0 && <Divider sx={{ my:0.5 }} />}
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ flex:1 }} noWrap>
                            Stop {task.stopOrder ?? i+1} — {task.deliveryAddress}
                          </Typography>
                          <Chip label={STATUS_LABEL[task.status] ?? task.status} size="small"
                            color={STATUS_COLOR[task.status] ?? 'default'}
                            sx={{ flexShrink:0, fontSize:10 }} />
                          {task.status === 'FAILED' && (
                            <Button size="small" variant="outlined" sx={{ fontSize:10, flexShrink:0 }}
                              onClick={e => { e.stopPropagation(); openAssign(task); }}>Reassign</Button>
                          )}
                          {isException(task) && (
                            <IconButton size="small" color="error"
                              onClick={e => { e.stopPropagation(); setCancelReason(''); setCancelTarget(task); }}>
                              <CancelRoundedIcon sx={{ fontSize:14 }} />
                            </IconButton>
                          )}
                        </Stack>
                        {task.failedReason && (
                          <Typography variant="caption" color="error" display="block" sx={{ ml:2 }}>
                            Reason: {task.failedReason}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {assignTarget?.assignedTo ? 'Reassign Driver' : 'Assign Driver'} — Task #{assignTarget?.id}
        </DialogTitle>
        <DialogContent>
          {assignTarget && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {assignTarget.deliveryAddress}
              {assignTarget.failedReason && (
                <Box component="span" color="error.main"> · Failed: {assignTarget.failedReason}</Box>
              )}
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

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Task #{cancelTarget?.id}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>{cancelTarget?.deliveryAddress}</Typography>
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
        invalidateKeys={['tl-delivery-tasks']}
      />
    </Box>
  );
}
