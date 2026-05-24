import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Card, CardContent, CardActions, Button,
  Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Divider, Grid, Tabs, Tab, InputAdornment,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { useAuth } from '../../context/AuthContext';
import { workOrderApi, adminApi, marketplaceApi } from '../../services/api';
import { formatPrice } from '../../utils/format';
import toast from 'react-hot-toast';
import { Reveal, Stagger } from '../../components/common/Motion';

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';

// ── Work-order approvals ───────────────────────────────────────────────────

function WorkOrderApprovals() {
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
    onSuccess: () => { toast.success('Order approved'); qc.invalidateQueries({ queryKey: ['tl-approvals'] }); },
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
    <>
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
                      <Typography variant="caption" color="text.secondary">Vessel: {order.vesselName ?? `#${order.vesselId}`}</Typography>
                      <Typography variant="caption" color="text.secondary">Submitted: {formatDate(order.createdAt)}</Typography>
                      {order.clientName && <Typography variant="caption" color="text.secondary">Client: {order.clientName}</Typography>}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                    <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => approveMutation.mutate(order.id)} disabled={approveMutation.isPending} sx={{ flex: 1 }}>
                      Approve
                    </Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<CancelOutlinedIcon />}
                      onClick={() => { setRejectTarget(order); setRejectReason(''); }} sx={{ flex: 1 }}>
                      Reject
                    </Button>
                    <Button size="small" onClick={() => navigate(`/team-lead/orders/${order.id}`)} sx={{ minWidth: 0 }}>
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
          <TextField label="Reason (optional)" multiline rows={3} fullWidth value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Let the client know why this request can't be processed…" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error"
            onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
            disabled={rejectMutation.isPending}>
            {rejectMutation.isPending ? <CircularProgress size={18} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Boat listing approvals ─────────────────────────────────────────────────

function BoatListingApprovals() {
  const qc = useQueryClient();
  const [approveTarget, setApproveTarget] = useState(null);
  const [gainPct, setGainPct] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tl-pending-listings'],
    queryFn: () => marketplaceApi.searchListings({ adminStatus: 'PENDING_REVIEW', size: 50, sort: 'createdAt,asc' }),
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: () => marketplaceApi.approveListing(approveTarget.id, {
      companyGainPct: gainPct !== '' ? parseFloat(gainPct) : 0,
    }),
    onSuccess: () => {
      toast.success('Listing approved and published');
      qc.invalidateQueries({ queryKey: ['tl-pending-listings'] });
      setApproveTarget(null);
      setGainPct('');
    },
    onError: () => toast.error('Failed to approve listing'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => marketplaceApi.rejectListing(rejectTarget.id, rejectReason),
    onSuccess: () => {
      toast.success('Listing rejected');
      qc.invalidateQueries({ queryKey: ['tl-pending-listings'] });
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject listing'),
  });

  const { data: recentData } = useQuery({
    queryKey: ['tl-recent-listings'],
    queryFn: () => marketplaceApi.searchListings({ adminStatus: 'ALL', size: 10, sort: 'updatedAt,desc' }),
    refetchInterval: 60_000,
  });

  const listings = data?.content ?? [];
  const recentReviewed = (recentData?.content ?? []).filter(
    l => (l.status === 'AVAILABLE' || l.status === 'REJECTED') && l.reviewedByEmail
  ).slice(0, 6);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Failed to load pending listings.</Alert>;

  return (
    <>
      {listings.length === 0 ? (
        <Reveal variant="fade">
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', opacity: 0.6, mb: 1 }} />
              <Typography variant="h6" color="text.secondary">No pending listings</Typography>
              <Typography variant="body2" color="text.disabled">All client boat submissions have been reviewed.</Typography>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Stagger>
          <Grid container spacing={2}>
            {listings.map(listing => (
              <Grid key={listing.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <DirectionsBoatIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: 160 }}>
                          {listing.titleEn || `Listing #${listing.id}`}
                        </Typography>
                      </Stack>
                      <Chip label="Pending Review" color="warning" size="small" />
                    </Stack>

                    <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                      {listing.forSale && <Chip size="small" label="For Sale" color="primary" />}
                      {listing.forRent && <Chip size="small" label="For Rent" color="secondary" />}
                    </Stack>

                    {listing.boatType && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {[listing.boatType, listing.brand, listing.yearBuilt].filter(Boolean).join(' · ')}
                      </Typography>
                    )}

                    {listing.salePrice && (
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {formatPrice(listing.salePrice, { maximumFractionDigits: 0 })}
                      </Typography>
                    )}
                    {listing.dailyRate && (
                      <Typography variant="body2" fontWeight={600} color="secondary.main">
                        {formatPrice(listing.dailyRate, { maximumFractionDigits: 0 })} / day
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Submitted: {formatDate(listing.createdAt)}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                    <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => { setApproveTarget(listing); setGainPct(''); }} sx={{ flex: 1 }}>
                      Approve
                    </Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<CancelOutlinedIcon />}
                      onClick={() => { setRejectTarget(listing); setRejectReason(''); }} sx={{ flex: 1 }}>
                      Reject
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      {/* ── Recent decisions audit trail ─────────────────────────── */}
      {recentReviewed.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
            Recent Decisions
          </Typography>
          <Stack spacing={1}>
            {recentReviewed.map(l => (
              <Card key={l.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {l.status === 'AVAILABLE'
                      ? <VerifiedUserOutlinedIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      : <BlockOutlinedIcon sx={{ color: 'error.main', fontSize: 20 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {l.titleEn || `Listing #${l.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {l.status === 'AVAILABLE' ? 'Approved' : 'Rejected'} by{' '}
                        <strong>{l.reviewedByEmail}</strong> ({l.reviewedByRole}) ·{' '}
                        {l.reviewedAt ? new Date(l.reviewedAt).toLocaleString() : '—'}
                        {l.rejectionReason && ` — "${l.rejectionReason}"`}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={l.status}
                      color={l.status === 'AVAILABLE' ? 'success' : 'error'}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Approve & Publish Listing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set the company commission and publish this listing to the marketplace.
          </Typography>
          <TextField
            label="Company gain (%)"
            type="number"
            value={gainPct}
            onChange={e => setGainPct(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 0, max: 100, step: 0.5 }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            helperText="Added on top of seller price before publishing"
          />
          {gainPct !== '' && approveTarget?.salePrice && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Effective sale price: {formatPrice(approveTarget.salePrice * (1 + parseFloat(gainPct || 0) / 100), { maximumFractionDigits: 0 })}
            </Alert>
          )}
          {gainPct !== '' && approveTarget?.dailyRate && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Effective daily rate: {formatPrice(approveTarget.dailyRate * (1 + parseFloat(gainPct || 0) / 100), { maximumFractionDigits: 0 })} / day
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setApproveTarget(null)} color="inherit" disabled={approveMutation.isPending}>Cancel</Button>
          <Button variant="contained" color="success" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
            startIcon={approveMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon />}>
            Approve & Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Reject Listing</DialogTitle>
        <DialogContent>
          <TextField label="Reason (shown to client)" multiline rows={3} fullWidth value={rejectReason}
            onChange={e => setRejectReason(e.target.value)} autoFocus
            placeholder="Explain why this listing cannot be published…" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectTarget(null)} color="inherit" disabled={rejectMutation.isPending}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}
            startIcon={rejectMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CancelOutlinedIcon />}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── TeamLeadApprovals ──────────────────────────────────────────────────────

export default function TeamLeadApprovals() {
  const [tab, setTab] = useState(0);

  const { data: ordersData } = useQuery({
    queryKey: ['tl-approvals'],
    queryFn: () => adminApi.searchOrders({ status: 'PENDING_APPROVAL', size: 50, sort: 'createdAt,asc' }),
    refetchInterval: 60_000,
  });

  const { data: listingsData } = useQuery({
    queryKey: ['tl-pending-listings'],
    queryFn: () => marketplaceApi.searchListings({ adminStatus: 'PENDING_REVIEW', size: 50, sort: 'createdAt,asc' }),
    refetchInterval: 60_000,
  });

  const orderCount = ordersData?.content?.length ?? 0;
  const listingCount = listingsData?.content?.length ?? 0;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>Pending Approvals</Typography>
          {(orderCount + listingCount) > 0 && (
            <Chip label={orderCount + listingCount} color="warning" size="small" />
          )}
        </Stack>
      </Reveal>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <span>Work Orders</span>
              {orderCount > 0 && <Chip label={orderCount} color="warning" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
            </Stack>
          }
        />
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <span>Boat Listings</span>
              {listingCount > 0 && <Chip label={listingCount} color="warning" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
            </Stack>
          }
        />
      </Tabs>

      {tab === 0 && <WorkOrderApprovals />}
      {tab === 1 && <BoatListingApprovals />}
    </Box>
  );
}
