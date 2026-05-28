/**
 * PendingApprovalsBanner — shows at the top of the admin dashboard whenever
 * there are service requests waiting for admin/team-lead sign-off.
 *
 * Design decisions:
 * - Fetches once per mount (staleTime 60 s), not on every render.
 * - Shows at most 3 rows inline; overflow goes to the Orders page.
 * - Each row has inline Approve / Reject buttons so admins can act without
 *   navigating away, keeping the UX fast.
 * - Approve mutates the query cache optimistically by invalidating after success.
 */
import { useState }         from 'react';
import {
  Box, Typography, Button, Stack, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Skeleton,
} from '@mui/material';
import CheckRoundedIcon        from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import OpenInNewRoundedIcon    from '@mui/icons-material/OpenInNewRounded';
import { Link }                from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth }             from '../../context/AuthContext';
import { workOrderApi }        from '../../services/api';
import toast                   from 'react-hot-toast';

const CAT_EMOJI = {
  ENGINE:'🔧', ELECTRICAL:'⚡', HULL:'⛵', PROPULSION:'🚀',
  NAVIGATION:'🧭', PLUMBING:'💧', SAFETY:'🆘', MAINTENANCE:'🔄', OTHER:'❓',
};

export default function PendingApprovalsBanner() {
  const { user }   = useAuth();
  const qc         = useQueryClient();
  const [rejecting, setRejecting] = useState(null); // workOrderId | null
  const [reason,    setReason   ] = useState('');

  const { data: page, isLoading } = useQuery({
    queryKey: ['admin', 'orders', { status: 'PENDING_APPROVAL', size: 10 }],
    queryFn:  () => workOrderApi.searchOrders?.({ status: 'PENDING_APPROVAL', size: 10 })
                 ?? Promise.resolve({ content: [], totalElements: 0 }),
    staleTime: 60_000,
  });

  const pending = page?.content ?? [];
  const total   = page?.totalElements ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    qc.invalidateQueries({ queryKey: ['work-orders'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id) => workOrderApi.approve(id, user.id),
    onSuccess: () => { toast.success('Order approved'); invalidate(); },
    onError: () => toast.error('Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => workOrderApi.reject(id, user.id, reason || undefined),
    onSuccess: () => {
      toast.success('Order rejected');
      setRejecting(null);
      setReason('');
      invalidate();
    },
    onError: () => toast.error('Rejection failed'),
  });

  if (isLoading) {
    return <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2, mb: 2 }} />;
  }
  if (total === 0) return null;

  return (
    <>
      <Alert
        severity="warning"
        icon={<PendingActionsRoundedIcon />}
        sx={{ mb: 2.5, borderRadius: 2.5, alignItems: 'flex-start',
          '& .MuiAlert-message': { width: '100%' } }}
        action={
          <Button
            component={Link}
            to="/admin/orders"
            size="small"
            endIcon={<OpenInNewRoundedIcon />}
            sx={{ whiteSpace: 'nowrap', mt: 0.5 }}
          >
            All orders
          </Button>
        }
      >
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {total} service {total === 1 ? 'request' : 'requests'} awaiting approval
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Client ID</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 0.5 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.slice(0, 5).map(o => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography variant="body2" fontWeight={600}>#{o.id}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span style={{ fontSize: '1rem' }}>{CAT_EMOJI[o.issueCategory] ?? '🔧'}</span>
                      <Typography variant="caption">
                        {(o.issueCategory || 'SERVICE').replace(/_/g, ' ')}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      #{o.clientId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }} align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => approveMutation.mutate(o.id)}
                        disabled={approveMutation.isPending}
                        title="Approve"
                      >
                        <CheckRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { setRejecting(o.id); setReason(''); }}
                        title="Reject"
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {total > 5 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      +{total - 5} more — <Link to="/admin/orders" style={{ color: 'inherit', fontWeight: 700 }}>view all</Link>
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Alert>

      {/* Reject dialog — captures reason before submitting */}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Service Request #{rejecting}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why the request is being rejected…"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate({ id: rejecting, reason })}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
