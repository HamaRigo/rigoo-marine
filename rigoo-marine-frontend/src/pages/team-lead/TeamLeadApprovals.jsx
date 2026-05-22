import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Card, CardContent, CardActions, Button,
  Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Divider, Grid,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../../context/AuthContext';
import { workOrderApi } from '../../services/api';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Reveal, Stagger } from '../../components/common/Motion';

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';

export default function TeamLeadApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tl-approvals'],
    queryFn: () => adminApi.searchOrders({ status: 'PENDING_APPROVAL', size: 50, sort: 'createdAt,asc' }),
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => workOrderApi.approve(id, user?.id),
    onSuccess: () => {
      toast.success('Order approved');
      qc.invalidateQueries({ queryKey: ['tl-approvals'] });
    },
    onError: () => toast.error('Failed to approve order'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => workOrderApi.reject(id, user?.id, reason),
    onSuccess: () => {
      toast.success('Order rejected');
      qc.invalidateQueries({ queryKey: ['tl-approvals'] });
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject order'),
  });

  const orders = data?.content ?? [];

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Failed to load pending approvals.</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Pending Approvals</Typography>
          {orders.length > 0 && (
            <Chip label={orders.length} color="warning" size="small" />
          )}
        </Stack>
      </Reveal>

      {orders.length === 0 ? (
        <Reveal variant="fade">
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', opacity: 0.6, mb: 1 }} />
              <Typography variant="h6" color="text.secondary">All caught up!</Typography>
              <Typography variant="body2" color="text.disabled">No orders waiting for approval.</Typography>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Stagger>
          <Grid container spacing={2}>
            {orders.map(order => (
              <Grid key={order.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>Order #{order.id}</Typography>
                      <Chip label="Pending Approval" color="warning" size="small" />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.serviceType?.replace(/_/g, ' ') ?? 'Service'}
                    </Typography>

                    {order.description && (
                      <Typography variant="body2" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {order.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Vessel: {order.vesselName ?? `#${order.vesselId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {formatDate(order.createdAt)}
                      </Typography>
                      {order.clientName && (
                        <Typography variant="caption" color="text.secondary">
                          Client: {order.clientName}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => approveMutation.mutate(order.id)}
                      disabled={approveMutation.isPending}
                      sx={{ flex: 1 }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelOutlinedIcon />}
                      onClick={() => { setRejectTarget(order); setRejectReason(''); }}
                      sx={{ flex: 1 }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="small"
                      onClick={() => navigate(`/team-lead/orders/${order.id}`)}
                      sx={{ minWidth: 0 }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Order #{rejectTarget?.id}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Reason (optional)"
            multiline
            rows={3}
            fullWidth
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Let the client know why this request can't be processed…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? <CircularProgress size={18} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
