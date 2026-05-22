import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, CardHeader, Chip, Stack, Skeleton,
  Alert, Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Divider, IconButton, Tabs, Tab, Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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

const FLOW_STEPS = ['PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

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

const ALL_STATUSES = ['ALL', 'PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'];

// ── Custom stepper connector ───────────────────────────────────────────────

const RmConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 11 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2, border: 0, borderRadius: 1,
    backgroundColor: theme.palette.divider,
    transition: 'background-color 300ms',
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line},
    &.${stepConnectorClasses.active}   .${stepConnectorClasses.line}`]: {
    backgroundColor: theme.palette.primary.main,
  },
}));

function StatusStepIcon({ active, completed, isCancelled, isWaiting }) {
  if (isCancelled) return <CancelIcon sx={{ fontSize: 22, color: 'error.main' }} />;
  if (isWaiting)   return <HourglassBottomRoundedIcon sx={{ fontSize: 22, color: 'secondary.main' }} />;
  if (completed)   return <CheckCircleIcon sx={{ fontSize: 22, color: 'success.main' }} />;
  if (active)      return <CheckCircleIcon sx={{ fontSize: 22, color: 'primary.main' }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 22, color: 'text.disabled' }} />;
}

function OrderStepper({ status }) {
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
  const activeStep = FLOW_STEPS.indexOf(status);
  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      connector={<RmConnector />}
      sx={{ pt: 0.5, pb: 0.5 }}
    >
      {FLOW_STEPS.map((step, i) => (
        <Step key={step} completed={i < activeStep}>
          <StepLabel
            StepIconComponent={({ active, completed }) => (
              <StatusStepIcon active={active} completed={completed} />
            )}
            sx={{
              '& .MuiStepLabel-label': {
                fontSize: '0.68rem',
                fontWeight: i === activeStep ? 700 : 400,
                color: i <= activeStep ? 'text.primary' : 'text.disabled',
                mt: 0.5,
              },
            }}
          >
            {step.replace(/_/g, ' ')}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const meta    = STATUS_META[order.status] ?? STATUS_META.PENDING;
  const emoji   = CATEGORY_EMOJIS[order.issueCategory] ?? '🔧';
  const isLong  = (order.description?.length ?? 0) > 140;
  const desc    = isLong && !expanded
    ? order.description.slice(0, 140) + '…'
    : (order.description || '—');

  return (
    <HoverLift lift={4}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          borderColor: 'divider',
        }}
      >
        {/* ── Hero band ── */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
            px: 2.5, pt: 2, pb: 2.75,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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
          {/* Stepper */}
          <OrderStepper status={order.status} />

          <Divider sx={{ my: 1.5 }} />

          {/* Meta grid */}
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {order.vesselId && (
              <Grid size={{ xs: 12, sm: 6 }} >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <DirectionsBoatIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    Vessel #{order.vesselId}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.preferredDate && (
              <Grid size={{ xs: 12, sm: 6 }} >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CalendarTodayIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    Preferred: {new Date(order.preferredDate).toLocaleDateString()}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.locationText && (
              <Grid size={12} >
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <LocationOnIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.15 }} />
                  <Typography variant="caption" color="text.secondary">
                    {order.locationText}
                  </Typography>
                </Stack>
              </Grid>
            )}
          </Grid>

          {/* Description */}
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

          {/* Services chips */}
          {order.services?.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
              {order.services.map((s, i) => (
                <Chip
                  key={i}
                  label={s}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              ))}
            </Stack>
          )}

          {/* Admin notes / rejection reason */}
          {order.rejectionReason && (
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#ffebee', border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="caption" fontWeight={700} color="error.main" display="block">
                Rejection reason
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>{order.rejectionReason}</Typography>
            </Box>
          )}

          {/* Footer */}
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
}

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
      <Box
        sx={{
          textAlign: 'center', py: 10,
          background: 'radial-gradient(ellipse at center, rgba(0,105,148,0.05) 0%, transparent 70%)',
          borderRadius: 4,
        }}
      >
        <Box sx={{
          width: 96, height: 96, borderRadius: '50%', mx: 'auto', mb: 3,
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,105,148,0.25)',
          animation: 'rmFloat 4s ease-in-out infinite',
        }}>
          <BuildIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          No service orders yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          Submit a service request and track its progress from approval to completion.
        </Typography>
        <Button
          component={Link}
          to="/service-request"
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          sx={{ px: 4 }}
        >
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

  const filtered = statusFilter === 'ALL'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const countFor = (s) => s === 'ALL' ? orders.length : orders.filter(o => o.status === s).length;

  const TAB_OPTIONS = [
    { value: 'ALL',             label: 'All' },
    { value: 'PENDING_APPROVAL',label: 'Awaiting Approval' },
    { value: 'PENDING',         label: 'Pending' },
    { value: 'IN_PROGRESS',     label: 'In Progress' },
    { value: 'COMPLETED',       label: 'Completed' },
    { value: 'CANCELLED',       label: 'Cancelled' },
  ].filter(t => t.value === 'ALL' || countFor(t.value) > 0);

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
          <Button
            component={Link}
            to="/service-request"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ fontWeight: 600 }}
          >
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
                  {countFor(t.value) > 0 && (
                    <Chip
                      label={countFor(t.value)}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700,
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

      {/* ── Skeletons ── */}
      {isLoading && (
        <Stack spacing={2.5}>
          {[1, 2, 3].map(i => <OrderSkeleton key={i} />)}
        </Stack>
      )}

      {/* ── Empty ── */}
      {!isLoading && orders.length === 0 && <EmptyState />}

      {/* ── Filtered empty ── */}
      {!isLoading && orders.length > 0 && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">No orders with this status.</Typography>
        </Box>
      )}

      {/* ── Cards ── */}
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
