import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Button,
} from '@mui/material';
import toast from 'react-hot-toast';
import { adminApi, workOrderApi, technicianApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Reveal } from '../../components/common/Motion';
import WorkOrderKanban from '../../components/common/WorkOrderKanban';

export default function TeamLeadOrders() {
  const qc        = useQueryClient();
  const { user }  = useAuth();

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignTechId, setAssignTechId] = useState('');

  /* ── Data ── */
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['tl-orders'],
    queryFn: () => adminApi.searchOrders({ size: 300, sort: 'createdAt,desc' }),
  });
  const orders = pageData?.content ?? [];

  const { data: technicians = [] } = useQuery({
    queryKey: ['staff-technicians'],
    queryFn: technicianApi.getAll,
  });

  /* ── Optimistic cache patch ── */
  const patch = (updated) =>
    qc.setQueryData(['tl-orders'], prev => ({
      ...prev,
      content: (prev?.content ?? []).map(o => o.id === updated.id ? updated : o),
    }));

  /* ── Mutations ── */
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => workOrderApi.updateStatus(id, status),
    onSuccess: updated => { patch(updated); toast.success(`→ ${updated.status.replace(/_/g, ' ')}`); },
    onError: () => toast.error('Failed to update'),
  });

  const approveMutation = useMutation({
    mutationFn: id => workOrderApi.approve(id, user?.id),
    onSuccess: updated => { patch(updated); toast.success('Order approved'); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => workOrderApi.reject(id, user?.id, reason),
    onSuccess: updated => {
      patch(updated);
      setRejectTarget(null);
      setRejectReason('');
      toast.success('Order rejected');
    },
    onError: () => toast.error('Failed to reject'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, technicianId }) => workOrderApi.assignTechnician(id, technicianId),
    onSuccess: updated => {
      patch(updated);
      setAssignTarget(null);
      toast.success('Technician assigned');
    },
    onError: () => toast.error('Failed to assign'),
  });

  /* ── Handlers passed to kanban ── */
  const handleStatusChange = (orderId, newStatus) => {
    statusMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleAction = (action, order) => {
    if (action === 'approve') approveMutation.mutate(order.id);
    if (action === 'reject')  { setRejectReason(''); setRejectTarget(order); }
    if (action === 'assign')  { setAssignTechId(order.assignedTechnicianId?.toString() || ''); setAssignTarget(order); }
  };

  /* ── Render ── */
  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} mb={3}>Work Orders</Typography>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load orders.</Alert>}

      <WorkOrderKanban
        orders={orders}
        technicians={technicians}
        onStatusChange={handleStatusChange}
        onAction={handleAction}
        detailBasePath="/team-lead/orders"
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Order #{rejectTarget?.id}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Reason (optional)"
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Technician — Order #{assignTarget?.id}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Technician</InputLabel>
            <Select value={assignTechId} label="Technician"
              onChange={e => setAssignTechId(e.target.value)}>
              {technicians.map(t => (
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={!assignTechId || assignMutation.isPending}
            onClick={() => assignMutation.mutate({ id: assignTarget.id, technicianId: Number(assignTechId) })}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
