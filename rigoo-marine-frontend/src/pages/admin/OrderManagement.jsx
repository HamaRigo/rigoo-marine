import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { adminApi, workOrderApi, technicianApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import WorkOrderKanban from '../../components/common/WorkOrderKanban';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';

export default function OrderManagement() {
  const { t }     = useTranslation('admin');
  const qc        = useQueryClient();
  const { user }  = useAuth();

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignTechId, setAssignTechId] = useState('');

  const [docOpen, setDocOpen]       = useState(false);
  const [docType, setDocType]       = useState('invoice');
  const [docPrefill, setDocPrefill] = useState(null);

  /* ── Data ── */
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => adminApi.searchOrders({ size: 300, sort: 'createdAt,desc' }),
  });
  const orders = pageData?.content ?? [];

  const { data: technicians = [] } = useQuery({
    queryKey: ['staff-technicians'],
    queryFn: technicianApi.getAll,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: adminApi.getAllUsers,
  });

  /* ── Optimistic cache patch ── */
  const patch = (updated) =>
    qc.setQueryData(['admin-orders'], prev => ({
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
    onSuccess: updated => { patch(updated); toast.success(t('orders.approveSuccess')); },
    onError: () => toast.error(t('orders.actionFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => workOrderApi.reject(id, user?.id, reason || undefined),
    onSuccess: updated => {
      patch(updated);
      setRejectTarget(null);
      setRejectReason('');
      toast.success(t('orders.rejectSuccess'));
    },
    onError: () => toast.error(t('orders.actionFailed')),
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

  const handleDocument = (type, order) => {
    setDocType(type);
    setDocPrefill({
      workOrderId: order.id,
      clientId: order.clientId || '',
      notes: `Work Order #${order.id}${order.serviceType ? ` — ${order.serviceType.replace(/_/g, ' ')}` : ''}`,
      items: order.serviceType ? [{ description: order.serviceType.replace(/_/g, ' '), quantity: 1, unitPrice: '', taxRate: 5 }] : [],
    });
    setDocOpen(true);
  };

  /* ── Render ── */
  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t('orders.title')}
      </Typography>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load orders.</Alert>}

      <WorkOrderKanban
        orders={orders}
        technicians={technicians}
        onStatusChange={handleStatusChange}
        onAction={handleAction}
        onDocument={handleDocument}
        detailBasePath="/team-lead/orders"
      />

      <CreateInvoiceDialog
        open={docOpen}
        onClose={() => setDocOpen(false)}
        type={docType}
        clients={clients}
        prefill={docPrefill}
        onCreated={() => setDocOpen(false)}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('orders.rejectDialog.title', { id: rejectTarget?.id })}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth multiline minRows={3}
            label={t('orders.rejectDialog.reasonLabel')}
            placeholder={t('orders.rejectDialog.reasonPlaceholder')}
            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            inputProps={{ maxLength: 1000 }} sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={rejectMutation.isPending}>
            {t('orders.rejectDialog.cancel')}
          </Button>
          <Button variant="contained" color="error" disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })}>
            {t('orders.rejectDialog.confirm')}
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
