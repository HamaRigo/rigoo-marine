import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Divider, Button,
  Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Skeleton, Alert, Avatar, Paper, Grid,
} from '@mui/material';
import { styled }              from '@mui/material/styles';
import ArrowBackRoundedIcon    from '@mui/icons-material/ArrowBackRounded';
import CheckCircleIcon         from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon              from '@mui/icons-material/Cancel';
import HourglassBottomIcon     from '@mui/icons-material/HourglassBottom';
import PersonIcon              from '@mui/icons-material/Person';
import BuildRoundedIcon        from '@mui/icons-material/BuildRounded';
import LocationOnIcon          from '@mui/icons-material/LocationOn';
import DirectionsBoatIcon      from '@mui/icons-material/DirectionsBoat';
import CalendarTodayIcon       from '@mui/icons-material/CalendarToday';
import AttachFileIcon          from '@mui/icons-material/AttachFile';
import PendingActionsIcon      from '@mui/icons-material/PendingActions';
import { useQuery }            from '@tanstack/react-query';
import { useTranslation }      from 'react-i18next';

import { workOrderApi }          from '../../services/api';
import { Reveal, Stagger }       from '../../components/common/Motion';

// ─── Status definitions ───────────────────────────────────────────────────────

const STATUS_FLOW = ['PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_META = {
  PENDING_APPROVAL: { color: 'default',   label: 'Pending Approval' },
  PENDING:          { color: 'warning',   label: 'Pending' },
  IN_PROGRESS:      { color: 'info',      label: 'In Progress' },
  WAITING_PARTS:    { color: 'secondary', label: 'Waiting Parts' },
  COMPLETED:        { color: 'success',   label: 'Completed' },
  CANCELLED:        { color: 'error',     label: 'Cancelled' },
};

const CAT_EMOJI = {
  ENGINE:'🔧', ELECTRICAL:'⚡', HULL:'⛵', PROPULSION:'🚀',
  NAVIGATION:'🧭', PLUMBING:'💧', SAFETY:'🆘', MAINTENANCE:'🔄', OTHER:'❓',
};

// ─── Styled Stepper connector ─────────────────────────────────────────────────

const RmConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 14 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3, border: 0, borderRadius: 2,
    backgroundColor: theme.palette.divider,
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line},
    &.${stepConnectorClasses.active}   .${stepConnectorClasses.line}`]: {
    background: 'linear-gradient(90deg,#006994,#00acc1)',
  },
}));

const STEP_LABELS = {
  PENDING_APPROVAL: 'Submitted',
  PENDING:          'Approved',
  IN_PROGRESS:      'In Progress',
  COMPLETED:        'Completed',
};

function StatusStepper({ status }) {
  if (status === 'CANCELLED') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" py={1}>
        <CancelIcon sx={{ color: 'error.main' }} />
        <Typography variant="body2" color="error.main" fontWeight={700}>
          Order Cancelled
        </Typography>
      </Stack>
    );
  }

  if (status === 'WAITING_PARTS') {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HourglassBottomIcon sx={{ color: 'secondary.main' }} />
          <Typography variant="body2" color="secondary.main" fontWeight={700}>
            Waiting for Parts
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Your technician has ordered the required parts. Work will resume once they arrive.
        </Typography>
      </Stack>
    );
  }

  const activeStep = STATUS_FLOW.indexOf(status);
  return (
    <Stepper activeStep={activeStep} alternativeLabel connector={<RmConnector />}>
      {STATUS_FLOW.map((step, i) => (
        <Step key={step} completed={i < activeStep}>
          <StepLabel
            StepIconComponent={({ active, completed }) =>
              completed
                ? <CheckCircleIcon sx={{ fontSize: 28, color: 'success.main' }} />
                : active
                ? <CheckCircleIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                : <RadioButtonUncheckedIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
            }
            sx={{ '& .MuiStepLabel-label': { fontSize: '0.72rem', fontWeight: i === activeStep ? 800 : 400 } }}
          >
            {STEP_LABELS[step] || step.replace(/_/g, ' ')}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

// ─── Update timeline entry ─────────────────────────────────────────────────────

function UpdateEntry({ update }) {
  const isStaff = update.authorRole === 'ADMIN' || update.authorRole === 'TECHNICIAN';
  const initials = isStaff ? 'RM' : 'Me';
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar sx={{
        width: 32, height: 32, fontSize: '0.7rem', flexShrink: 0,
        bgcolor: isStaff ? 'primary.main' : 'secondary.main',
      }}>
        {isStaff ? <PersonIcon sx={{ fontSize: 16 }} /> : initials}
      </Avatar>
      <Paper variant="outlined" sx={{ flex: 1, px: 1.75, py: 1.25, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" fontWeight={700} color={isStaff ? 'primary.main' : 'text.primary'}>
            {isStaff ? 'Rigoo Marine Team' : 'You'}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {update.createdAt ? new Date(update.createdAt).toLocaleString() : '—'}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {update.message}
        </Typography>
      </Paper>
    </Stack>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClientOrderDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation('dashboard');

  const orderQ = useQuery({
    queryKey: ['work-orders', 'detail', id],
    queryFn:  () => workOrderApi.getWorkOrderById(id),
    retry: 1,
  });

  const updatesQ = useQuery({
    queryKey: ['work-orders', 'updates', id],
    queryFn:  () => workOrderApi.getUpdates(id),
    enabled:  !!orderQ.data,
  });

  // Only show updates the client should see
  const visibleUpdates = (updatesQ.data || []).filter(u => u.visibleToClient);

  if (orderQ.isLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (orderQ.isError) {
    const is404 = orderQ.error?.response?.status === 404;
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {is404 ? 'Order not found.' : 'Failed to load order. Please try again.'}
        </Alert>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go back
        </Button>
      </Box>
    );
  }

  const order  = orderQ.data;
  const status = order?.status ?? 'PENDING';
  const meta   = STATUS_META[status] ?? { color: 'default', label: status };
  const emoji  = CAT_EMOJI[order.issueCategory] ?? '🔧';

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/dashboard/account')}
        sx={{ mb: 2, color: 'text.secondary' }}
        size="small"
      >
        Back to orders
      </Button>

      {/* ─── Header card ─────────────────────────────────── */}
      <Reveal variant="fade" timeout={420}>
        <Card sx={{ borderRadius: 3, overflow: 'hidden', mb: 2.5,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Box sx={{
            background: 'linear-gradient(135deg,#006994 0%,#004263 100%)',
            px: 3, pt: 2.5, pb: 3.5, position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', bottom: -1, left: 0, right: 0,
              height: 22, bgcolor: 'background.paper',
              clipPath: 'ellipse(60% 100% at 50% 100%)',
            }} />
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  width: 52, height: 52, borderRadius: 2.5, fontSize: '1.6rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.15)',
                }}>
                  {emoji}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Order #{order.id}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="white">
                    {(order.issueCategory || 'Service Request').replace(/_/g, ' ')}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={meta.label}
                color={meta.color}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Stack>
          </Box>

          <CardContent sx={{ pt: 2 }}>
            {/* PENDING_APPROVAL explanation */}
            {status === 'PENDING_APPROVAL' && (
              <Alert severity="info" icon={<PendingActionsIcon />}
                sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600}>Under Review</Typography>
                <Typography variant="caption">
                  Our team is reviewing your request. You'll be notified once it's approved and assigned.
                </Typography>
              </Alert>
            )}

            {/* Rejection reason */}
            {order.rejectionReason && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700}>Request Rejected</Typography>
                <Typography variant="body2">{order.rejectionReason}</Typography>
              </Alert>
            )}

            <StatusStepper status={status} />

            <Divider sx={{ my: 2 }} />

            {/* Meta grid */}
            <Grid container spacing={1.5}>
              {order.vesselId && (
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DirectionsBoatIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Vessel #{order.vesselId}
                    </Typography>
                  </Stack>
                </Grid>
              )}
              {order.locationText && (
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <LocationOnIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.15 }} />
                    <Typography variant="body2" color="text.secondary">
                      {order.locationText}
                    </Typography>
                  </Stack>
                </Grid>
              )}
              {order.createdAt && (
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Submitted {new Date(order.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </Grid>
              )}
              {order.completedAt && (
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Completed {new Date(order.completedAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Description */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {order.description || '—'}
            </Typography>
          </CardContent>
        </Card>
      </Reveal>

      {/* ─── Update timeline ─────────────────────────────── */}
      <Reveal variant="fade" timeout={520}>
        <Card sx={{ borderRadius: 3, mb: 2.5, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <BuildRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Updates from Our Team
              </Typography>
            </Stack>

            {updatesQ.isLoading ? (
              [0,1].map(i => <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1, borderRadius: 2 }} />)
            ) : visibleUpdates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.disabled">
                  No updates yet. We'll notify you when your technician posts a progress note.
                </Typography>
              </Box>
            ) : (
              <Stagger variant="fade" step={80}>
                {visibleUpdates.map(u => <UpdateEntry key={u.id} update={u} />)}
              </Stagger>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* ─── Attachments ─────────────────────────────────── */}
      {order.mediaUrls?.length > 0 && (
        <Reveal variant="fade" timeout={600}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <AttachFileIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Attachments</Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {(Array.isArray(order.mediaUrls) ? order.mediaUrls : []).map((url, i) => (
                  <Chip
                    key={i}
                    label={`File ${i + 1}`}
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    icon={<AttachFileIcon />}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </Box>
  );
}
