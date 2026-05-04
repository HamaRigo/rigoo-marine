import { useState } from 'react';
import {
  Box, Typography, Chip, Button, Stack, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { adminApi, workOrderApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';

const STATUSES = [
  'PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS',
  'WAITING_PARTS', 'COMPLETED', 'CANCELLED',
];
const ROLES = ['CLIENT', 'TECHNICIAN'];

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export default function OrderManagement() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(null); // {id} or null
  const [reason, setReason] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });

  const approveMutation = useMutation({
    mutationFn: ({ id }) => workOrderApi.approve(id, user.id),
    onSuccess: () => { toast.success(t('orders.approveSuccess')); refresh(); },
    onError: () => toast.error(t('orders.actionFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => workOrderApi.reject(id, user.id, reason || undefined),
    onSuccess: () => {
      toast.success(t('orders.rejectSuccess'));
      setRejecting(null);
      setReason('');
      refresh();
    },
    onError: () => toast.error(t('orders.actionFailed')),
  });

  const columns = [
    { id: 'id', label: t('orders.columns.id'), render: (r) => `#${r.id}` },
    { id: 'clientId', label: t('orders.columns.client') },
    { id: 'vesselId', label: t('orders.columns.vessel') },
    { id: 'issueCategory', label: t('orders.columns.category'),
      render: (r) => r.issueCategory || '—' },
    { id: 'submittedByRole', label: t('orders.columns.submittedBy'),
      render: (r) => r.submittedByRole || '—' },
    { id: 'createdAt', label: t('orders.columns.createdAt'),
      render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
    { id: 'status', label: t('orders.columns.status'),
      render: (r) => (
        <Chip
          size="small"
          label={r.status?.replace(/_/g, ' ')}
          color={STATUS_COLORS[r.status] || 'default'}
        />
      ) },
  ];

  const renderActions = (row) => {
    if (row.status === 'PENDING_APPROVAL') {
      return (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            onClick={() => approveMutation.mutate({ id: row.id })}
            disabled={approveMutation.isPending}
          >
            {t('orders.approve')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            onClick={() => { setRejecting({ id: row.id }); setReason(''); }}
          >
            {t('orders.reject')}
          </Button>
        </Stack>
      );
    }
    return (
      <Button size="small" variant="outlined" href={`/admin/orders/${row.id}`}>
        {t('orders.manage')}
      </Button>
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('orders.title')}</Typography>
      <FilterableTable
        queryKey={['admin', 'orders']}
        fetchPage={adminApi.searchOrders}
        columns={columns}
        rowKey={(r) => r.id}
        defaultFilters={{ status: 'PENDING_APPROVAL' }}
        filters={[
          { id: 'status', label: t('filters.status'),
            options: STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })) },
          { id: 'submittedByRole', label: t('filters.role'),
            options: ROLES.map((r) => ({ value: r, label: r })) },
        ]}
        renderActions={renderActions}
      />

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('orders.rejectDialog.title', { id: rejecting?.id })}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('orders.rejectDialog.body')}</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={t('orders.rejectDialog.reasonLabel')}
            placeholder={t('orders.rejectDialog.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)} disabled={rejectMutation.isPending}>
            {t('orders.rejectDialog.cancel')}
          </Button>
          <Button
            onClick={() => rejectMutation.mutate({ id: rejecting.id, reason: reason.trim() })}
            color="error"
            variant="contained"
            disabled={rejectMutation.isPending}
          >
            {t('orders.rejectDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
