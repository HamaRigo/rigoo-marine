import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Chip, Stack, Skeleton,
  Alert, Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Collapse, IconButton, Pagination, Divider, Tooltip, useTheme, useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { teamRequestApi } from '../../services/api';
import { Reveal, Stagger } from '../common/Motion';

// ── Constants ──────────────────────────────────────────────────────────────

const FLOW_STEPS  = ['PENDING', 'APPROVED', 'DISPATCHED', 'COMPLETED'];
const STATUS_META = {
  PENDING:    { color: 'warning',  bgVar: '#fff8e1' },
  APPROVED:   { color: 'info',     bgVar: '#e3f2fd' },
  DISPATCHED: { color: 'primary',  bgVar: '#e8eaf6' },
  COMPLETED:  { color: 'success',  bgVar: '#e8f5e9' },
  REJECTED:   { color: 'error',    bgVar: '#ffebee' },
};
const CATEGORY_EMOJIS = {
  mechanical: '🔧', structural: '⛵', electrical: '⚡',
  cosmetic: '✨', renovation: '🔄', emergency: '🆘',
};

// ── Custom stepper connector ───────────────────────────────────────────────

const RmConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 11 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2,
    border: 0,
    borderRadius: 1,
    backgroundColor: theme.palette.divider,
    transition: 'background-color 300ms',
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line},
    &.${stepConnectorClasses.active}   .${stepConnectorClasses.line}`]: {
    backgroundColor: theme.palette.primary.main,
  },
}));

// ── Custom step icon ───────────────────────────────────────────────────────

function StatusStepIcon({ active, completed, rejected }) {
  if (rejected) return <CancelIcon sx={{ fontSize: 22, color: 'error.main' }} />;
  if (completed) return <CheckCircleIcon sx={{ fontSize: 22, color: 'success.main' }} />;
  if (active)    return <CheckCircleIcon sx={{ fontSize: 22, color: 'primary.main' }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 22, color: 'text.disabled' }} />;
}

// ── Status Stepper ─────────────────────────────────────────────────────────

function RequestStepper({ status }) {
  const { t } = useTranslation('maintenance');
  const theme  = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (status === 'REJECTED') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
        <CancelIcon sx={{ color: 'error.main', fontSize: 22 }} />
        <Typography variant="body2" color="error.main" fontWeight={600}>
          {t('teamRequests.status.REJECTED')}
        </Typography>
      </Box>
    );
  }

  const activeStep = FLOW_STEPS.indexOf(status);

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel={!mobile}
      orientation={mobile ? 'vertical' : 'horizontal'}
      connector={<RmConnector />}
      sx={{ pt: 0.5, pb: mobile ? 0 : 1 }}
    >
      {FLOW_STEPS.map((step, i) => (
        <Step key={step} completed={i < activeStep}>
          <StepLabel
            StepIconComponent={({ active, completed }) => (
              <StatusStepIcon active={active} completed={completed} />
            )}
            sx={{
              '& .MuiStepLabel-label': {
                fontSize: '0.7rem',
                fontWeight: i === activeStep ? 700 : 400,
                color: i <= activeStep ? 'text.primary' : 'text.disabled',
                mt: 0.5,
              },
            }}
          >
            {t(`teamRequests.steps.${step}`)}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

// ── Admin notes box ────────────────────────────────────────────────────────

function AdminNotesBox({ notes, status }) {
  const { t } = useTranslation('maintenance');
  const { bgVar } = STATUS_META[status] ?? STATUS_META.APPROVED;

  return (
    <Box
      sx={{
        mt: 1.5, p: 1.5, borderRadius: 2,
        bgcolor: bgVar,
        border: '1px solid',
        borderColor: `${STATUS_META[status]?.color ?? 'primary'}.light`,
        animation: 'rmFadeUp 0.4s ease',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <AdminPanelSettingsIcon sx={{ fontSize: 18, color: `${STATUS_META[status]?.color}.main`, mt: 0.15 }} />
        <Box>
          <Typography variant="caption" fontWeight={700} color={`${STATUS_META[status]?.color}.main`} display="block">
            {t('teamRequests.adminNotes')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
            {notes}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

// ── Request Card ───────────────────────────────────────────────────────────

function RequestCard({ req }) {
  const { t } = useTranslation('maintenance');
  const [expanded, setExpanded] = useState(false);
  const meta     = STATUS_META[req.status] ?? STATUS_META.PENDING;
  const emoji    = CATEGORY_EMOJIS[req.category] ?? '🔧';
  const isLong   = req.description.length > 120;

  const displayDesc = isLong && !expanded
    ? req.description.slice(0, 120) + '…'
    : req.description;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: 'divider',
        transition: 'box-shadow 200ms',
        '&:hover': { boxShadow: 3 },
      }}
    >
      {/* ── Header ── */}
      <CardHeader
        sx={{ pb: 0 }}
        avatar={
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: meta.bgVar, fontSize: '1.5rem',
          }}>
            {emoji}
          </Box>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
              {t(`teamRequests.categories.${req.category}`, { defaultValue: req.category })}
            </Typography>
            <Chip
              label={t(`teamRequests.status.${req.status}`, { defaultValue: req.status })}
              color={meta.color}
              size="small"
              sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
            />
          </Stack>
        }
        subheader={
          <Typography variant="caption" color="text.disabled">
            {t('teamRequests.submitted')}: {new Date(req.createdAt).toLocaleDateString()}
          </Typography>
        }
      />

      <CardContent sx={{ pt: 1.5 }}>

        {/* ── Status stepper ── */}
        <RequestStepper status={req.status} />

        <Divider sx={{ my: 1.5 }} />

        {/* ── Description ── */}
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {displayDesc}
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

        {/* ── Admin notes ── */}
        {req.adminNotes && (
          <AdminNotesBox notes={req.adminNotes} status={req.status} />
        )}

        {/* ── Meta row ── */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap">
          {req.locationDescription && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOnIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                {req.locationDescription}
              </Typography>
            </Stack>
          )}
          {req.attachments?.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AttachFileIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {t('teamRequests.attachmentsCount', { count: req.attachments.length })}
              </Typography>
            </Stack>
          )}
          {req.whatsappOptIn && (
            <Tooltip title={t('teamRequests.whatsapp')}>
              <WhatsAppIcon sx={{ fontSize: 16, color: '#25D366' }} />
            </Tooltip>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function RequestSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} mb={1.5}>
          <Skeleton variant="rounded" width={44} height={44} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="40%" height={22} />
            <Skeleton width="25%" height={16} />
          </Box>
        </Stack>
        <Skeleton variant="rounded" height={40} sx={{ mb: 1.5 }} />
        <Skeleton width="90%" />
        <Skeleton width="70%" />
      </CardContent>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation('maintenance');
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h2" sx={{ mb: 1, opacity: 0.3 }}>🔧</Typography>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {t('teamRequests.empty')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
        {t('teamRequests.emptyHint')}
      </Typography>
    </Box>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export default function TeamRequestTracker({ active }) {
  const { t } = useTranslation('maintenance');
  const [page, setPage] = useState(1); // 1-based for MUI Pagination

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-team-requests', page],
    queryFn: () => teamRequestApi.myRequests({ page: page - 1, size: 5 }),
    enabled: active,
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const rows       = data?.content       ?? [];
  const totalPages = data?.totalPages    ?? 0;

  if (isError) {
    return <Alert severity="error" sx={{ mt: 2 }}>Failed to load team requests.</Alert>;
  }

  return (
    <Box>
      {/* Scope note */}
      <Stack direction="row" spacing={0.75} alignItems="center" mb={2.5}>
        <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.disabled">
          {t('teamRequests.scopeNote')}
        </Typography>
      </Stack>

      {/* Skeletons */}
      {isLoading && (
        <Stack spacing={2}>
          {[1, 2, 3].map(i => <RequestSkeleton key={i} />)}
        </Stack>
      )}

      {/* Empty */}
      {!isLoading && rows.length === 0 && <EmptyState />}

      {/* Cards */}
      {!isLoading && rows.length > 0 && (
        <Stagger>
          <Stack spacing={2}>
            {rows.map(req => (
              <Reveal key={req.id} variant="slideUp">
                <RequestCard req={req} />
              </Reveal>
            ))}
          </Stack>
        </Stagger>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
