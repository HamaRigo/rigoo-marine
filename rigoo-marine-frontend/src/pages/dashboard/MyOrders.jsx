/* eslint-disable react/prop-types */
import { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Skeleton,
  Alert, Divider, IconButton, Tabs, Tab, Grid,
} from '@mui/material';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import { workOrderApi } from '../../services/api';
import { Reveal, Stagger, HoverLift } from '../../components/common/Motion';

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_META = {
  PENDING_APPROVAL: { color: 'default',   label: 'Awaiting Approval', bg: '#f5f5f5' },
  PENDING:          { color: 'warning',   label: 'Pending',           bg: '#fff8e1' },
  IN_PROGRESS:      { color: 'info',      label: 'In Progress',       bg: '#e3f2fd' },
  WAITING_PARTS:    { color: 'secondary', label: 'Waiting for Parts', bg: '#f3e5f5' },
  COMPLETED:        { color: 'success',   label: 'Completed',         bg: '#e8f5e9' },
  CANCELLED:        { color: 'error',     label: 'Cancelled',         bg: '#ffebee' },
};

const CATEGORY_EMOJIS = {
  ENGINE: '🔧', ELECTRICAL: '⚡', HULL: '⛵', PROPULSION: '🚀',
  NAVIGATION: '🧭', PLUMBING: '💧', SAFETY: '🆘', MAINTENANCE: '🔄', OTHER: '❓',
};

// Ordered flow steps for the lightweight progress tracker.
const FLOW_STEPS = ['PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];
const FLOW_LABELS = { PENDING_APPROVAL: 'Approval', PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Done' };

// ── Lightweight status tracker (replaces MUI Stepper) ─────────────────────
//
// MUI Stepper renders ~20 DOM nodes per step (connector, icon wrapper, label
// container, etc.).  With 4 steps × 50 orders that's 4 000 extra nodes.
// This replacement uses 4 dots + 3 connector lines — ~14 nodes total per card.

function StatusTracker({ status }) {
  if (status === 'CANCELLED') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" py={0.75}>
        <CancelIcon sx={{ color: 'error.main', fontSize: 20 }} />
        <Typography variant="body2" color="error.main" fontWeight={600}>Order Cancelled</Typography>
      </Stack>
    );
  }
  if (status === 'WAITING_PARTS') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" py={0.75}>
        <HourglassBottomRoundedIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography variant="body2" color="secondary.main" fontWeight={600}>Waiting for Parts</Typography>
      </Stack>
    );
  }
  const activeIdx = FLOW_STEPS.indexOf(status);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, py: 0.75 }}>
      {FLOW_STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        return (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', flex: i < FLOW_STEPS.length - 1 ? 1 : 'unset' }}>
            {/* Dot */}
            <Stack alignItems="center" spacing={0.25} sx={{ minWidth: 40 }}>
              {done ? (
                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              ) : current ? (
                <CheckCircleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: current ? 700 : 400,
                  color: i <= activeIdx ? 'text.primary' : 'text.disabled',
                  textAlign: 'center', lineHeight: 1.2,
                }}
              >
                {FLOW_LABELS[step]}
              </Typography>
            </Stack>
            {/* Connector line */}
            {i < FLOW_STEPS.length - 1 && (
              <Box sx={{
                flex: 1, height: 2, borderRadius: 1, mx: 0.5, mb: 1.5,
                bgcolor: done ? 'primary.main' : 'divider',
                transition: 'background-color 300ms',
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────
// memo() with structural equality on id + status so a tab-filter change that
// doesn't touch an order's data doesn't re-render its card.

const OrderCard = memo(function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const meta    = STATUS_META[order.status] ?? STATUS_META.PENDING;
  const emoji   = CATEGORY_EMOJIS[order.issueCategory] ?? '🔧';
  const isLong  = (order.description?.length ?? 0) > 140;
  const desc    = isLong && !expanded
    ? order.description.slice(0, 140) + '…'
    : (order.description || '—');

  return (
    <HoverLift lift={4}>
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'divider' }}>
        {/* ── Hero band ── */}
        <Box sx={{
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          px: 2.5, pt: 2, pb: 2.75,
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{
            position: 'absolute', bottom: -1, left: 0, right: 0, height: 20,
            bgcolor: 'background.paper',
            clipPath: 'ellipse(60% 100% at 50% 100%)',
          }} />
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.15)', fontSize: '1.4rem',
              }}>
                {emoji}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Order #{order.id}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="white" lineHeight={1.2}>
                  {(order.issueCategory || 'Service Request').replace(/_/g, ' ')}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={meta.label}
              color={meta.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
            />
          </Stack>
        </Box>

        <CardContent sx={{ pt: 1.5 }}>
          <StatusTracker status={order.status} />

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {order.vesselId && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <DirectionsBoatIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    Vessel #{order.vesselId}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.preferredDate && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CalendarTodayIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    Preferred: {new Date(order.preferredDate).toLocaleDateString()}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.locationText && (
              <Grid size={12}>
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <LocationOnIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.15 }} />
                  <Typography variant="caption" color="text.secondary">
                    {order.locationText}
                  </Typography>
                </Stack>
              </Grid>
            )}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {desc}
          </Typography>
          {isLong && (
            <IconButton
              size="small"
              onClick={() => setExpanded(e => !e)}
              sx={{ p: 0, mt: 0.5, color: 'primary.main' }}
            >
              <ExpandMoreIcon
                fontSize="small"
                sx={{ transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
            </IconButton>
          )}

          {order.services?.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
              {order.services.map((s, i) => (
                <Chip key={i} label={s} size="small" variant="outlined"
                  sx={{ fontSize: '0.68rem', height: 22 }} />
              ))}
            </Stack>
          )}

          {order.rejectionReason && (
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#ffebee', border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="caption" fontWeight={700} color="error.main" display="block">
                Rejection reason
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>{order.rejectionReason}</Typography>
            </Box>
          )}

          <Divider sx={{ mt: 1.5, mb: 1.25 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.disabled">
              Submitted {new Date(order.createdAt).toLocaleDateString()}
            </Typography>
            {order.status === 'COMPLETED' && (
              <Button
                component={Link}
                to="/dashboard/invoices"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.72rem', py: 0.25, px: 1.5 }}
              >
                View Invoice
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </HoverLift>
  );
}, (prev, next) =>
  prev.order.id === next.order.id &&
  prev.order.status === next.order.status &&
  prev.order.description === next.order.description
);

// ── Skeleton ───────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={90} />
      <CardContent>
        <Skeleton variant="rounded" height={36} sx={{ mb: 1.5 }} />
        <Skeleton width="80%" />
        <Skeleton width="60%" sx={{ mt: 0.5 }} />
        <Skeleton width="40%" sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Reveal variant="fade">
      <Box sx={{
        textAlign: 'center', py: 10,
        background: 'radial-gradient(ellipse at center, rgba(0,105,148,0.05) 0%, transparent 70%)',
        borderRadius: 4,
      }}>
        <Box sx={{
          width: 96, height: 96, borderRadius: '50%', mx: 'auto', mb: 3,
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,105,148,0.25)',
          animation: 'rmFloat 4s ease-in-out infinite',
        }}>
          <BuildIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>No service orders yet</Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          Submit a service request and track its progress from approval to completion.
        </Typography>
        <Button component={Link} to="/service-request" variant="contained" size="large"
          startIcon={<AddIcon />} sx={{ px: 4 }}>
          Submit a Request
        </Button>
      </Box>
    </Reveal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function MyOrders() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['workOrders', 'my'],
    queryFn: workOrderApi.getMyWorkOrders,
    staleTime: 30_000,
  });

  // Compute status counts once per orders change, not on every render.
  const counts = useMemo(() => {
    const map = { ALL: orders.length };
    for (const o of orders) {
      map[o.status] = (map[o.status] ?? 0) + 1;
    }
    return map;
  }, [orders]);

  const TAB_OPTIONS = useMemo(() => [
    { value: 'ALL',              label: 'All' },
    { value: 'PENDING_APPROVAL', label: 'Awaiting Approval' },
    { value: 'PENDING',          label: 'Pending' },
    { value: 'IN_PROGRESS',      label: 'In Progress' },
    { value: 'COMPLETED',        label: 'Completed' },
    { value: 'CANCELLED',        label: 'Cancelled' },
  ].filter(t => t.value === 'ALL' || (counts[t.value] ?? 0) > 0), [counts]);

  const filtered = useMemo(
    () => statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter),
    [orders, statusFilter]
  );

  if (isError) {
    return <Alert severity="error" sx={{ mt: 2 }}>Failed to load service orders.</Alert>;
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={700}>My Service Orders</Typography>
            {!isLoading && orders.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {orders.length} order{orders.length !== 1 ? 's' : ''} total
              </Typography>
            )}
          </Box>
          <Button component={Link} to="/service-request" variant="contained"
            startIcon={<AddIcon />} sx={{ fontWeight: 600 }}>
            New Request
          </Button>
        </Stack>
      </Reveal>

      {/* ── Status filter tabs ── */}
      {!isLoading && orders.length > 0 && (
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {TAB_OPTIONS.map(t => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>{t.label}</span>
                  {(counts[t.value] ?? 0) > 0 && (
                    <Chip
                      label={counts[t.value]}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.65rem', fontWeight: 700,
                        bgcolor: statusFilter === t.value ? 'primary.main' : 'action.selected',
                        color: statusFilter === t.value ? 'white' : 'text.secondary',
                      }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>
      )}

      {isLoading && (
        <Stack spacing={2.5}>
          {[1, 2, 3].map(i => <OrderSkeleton key={i} />)}
        </Stack>
      )}

      {!isLoading && orders.length === 0 && <EmptyState />}

      {!isLoading && orders.length > 0 && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">No orders with this status.</Typography>
        </Box>
      )}

      {!isLoading && filtered.length > 0 && (
        <Stagger step={60}>
          <Stack spacing={2.5}>
            {filtered.map(order => (
              <Reveal key={order.id} variant="slideUp">
                <OrderCard order={order} />
              </Reveal>
            ))}
          </Stack>
        </Stagger>
      )}
    </Box>
  );
}
