import { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
  Skeleton, Alert, Button, Link as MuiLink, Pagination,
} from '@mui/material';
import { Link } from 'react-router-dom';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { maintenanceApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';

const SERVICE_TYPES = [
  'OIL_CHANGE', 'ENGINE_SERVICE', 'HULL_CLEANING', 'ANTIFOULING',
  'PROPELLER_SERVICE', 'IMPELLER', 'FUEL_FILTER', 'ZINC_ANODES',
  'BATTERY', 'INSPECTION', 'OTHER',
];

const URGENCY_STYLES = {
  OVERDUE:  { color: 'error',   Icon: WarningAmberRoundedIcon },
  DUE_SOON: { color: 'warning', Icon: ScheduleRoundedIcon },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

/**
 * Admin cross-client maintenance inbox. One backend call returns every
 * OVERDUE + DUE_SOON row across all vessels; filters apply client-side for
 * snappy interaction. The page is the proactive-outreach surface — admins
 * scan, then click the vessel link to drill into the dossier (where they
 * can edit the schedule, mark services, etc).
 */
const PAGE_SIZE = 25;

export default function MaintenanceDashboard() {
  const { t } = useTranslation('maintenance');
  const [urgency, setUrgency] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  // Server-side filter params kept narrow: urgency + type + free-text q go
  // through, plus standard Spring page/size. Changing any filter resets the
  // page to 0 — otherwise an active filter on page 5 could land on an empty
  // slice.
  const params = useMemo(() => {
    const p = { page, size: PAGE_SIZE };
    if (urgency) p.urgency = urgency;
    if (type) p.type = type;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [urgency, type, q, page]);

  const onFilterChange = (setter) => (v) => {
    setter(v);
    setPage(0);
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'maintenance', 'upcoming', params],
    queryFn: () => maintenanceApi.adminGetUpcoming(params),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  // Backend now returns a Spring Page<>. Fall back gracefully for older
  // staging environments still on the list response shape.
  const rows = Array.isArray(data) ? data : (data?.content || []);
  const totalElements = Array.isArray(data) ? data.length : (data?.totalElements ?? 0);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <Typography variant="h4">Maintenance</Typography>
        <Chip label={totalElements} size="small" />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={() => refetch()} disabled={isFetching}>
              <RefreshRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Reveal variant="fade" timeout={420}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <TextField
                select
                label="Urgency"
                value={urgency}
                onChange={(e) => onFilterChange(setUrgency)(e.target.value)}
                size="small"
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
                <MenuItem value="DUE_SOON">Due soon</MenuItem>
              </TextField>
              <TextField
                select
                label="Service"
                value={type}
                onChange={(e) => onFilterChange(setType)(e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All</MenuItem>
                {SERVICE_TYPES.map((s) => (
                  <MenuItem key={s} value={s}>{t(`types.${s}`, { defaultValue: s })}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Search client or vessel"
                value={q}
                onChange={(e) => onFilterChange(setQ)(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, minWidth: 220 }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Reveal>

      {error && <Alert severity="error" sx={{ mb: 2 }}>
        {error.response?.data?.message || error.message}
      </Alert>}

      <Card>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1 }} />)}
          </Box>
        ) : rows.length === 0 ? (
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>No overdue or due-soon services right now.</Typography>
            <Typography variant="body2" color="text.secondary">
              {q || urgency || type ? 'Try clearing the filters above.' : 'Everything is up to date.'}
            </Typography>
          </CardContent>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Urgency</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Vessel</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Next due</TableCell>
                  <TableCell>Days / Hours</TableCell>
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const us = URGENCY_STYLES[r.urgency] || {};
                  const Icon = us.Icon;
                  return (
                    <TableRow key={r.scheduleId} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          color={us.color}
                          icon={Icon ? <Icon /> : undefined}
                          label={r.urgency === 'OVERDUE' ? 'Overdue' : 'Due soon'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.clientName || '—'}
                          </Typography>
                          <Stack direction="row" gap={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                            {r.clientEmail && (
                              <MuiLink href={`mailto:${r.clientEmail}`} variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                <EmailRoundedIcon sx={{ fontSize: 14 }} />
                                {r.clientEmail}
                              </MuiLink>
                            )}
                            {r.clientPhone && (
                              <MuiLink href={`tel:${r.clientPhone}`} variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                <PhoneRoundedIcon sx={{ fontSize: 14 }} />
                                {r.clientPhone}
                              </MuiLink>
                            )}
                          </Stack>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <MuiLink component={Link} to={`/dashboard/vessels/${r.vesselId}`} underline="hover">
                          {r.vesselName || `#${r.vesselId}`}
                        </MuiLink>
                      </TableCell>
                      <TableCell>
                        {t(`types.${r.serviceType}`, { defaultValue: r.serviceType })}
                      </TableCell>
                      <TableCell>{formatDate(r.nextDueDate)}</TableCell>
                      <TableCell>
                        {r.daysUntilDue != null && (
                          <Typography variant="caption" component="div" sx={{
                            color: r.daysUntilDue < 0 ? 'error.main' : 'text.secondary',
                            fontWeight: r.daysUntilDue < 0 ? 600 : 400,
                          }}>
                            {r.daysUntilDue} d
                          </Typography>
                        )}
                        {r.hoursUntilDue != null && (
                          <Typography variant="caption" component="div" color="text.secondary">
                            {Number(r.hoursUntilDue).toFixed(1)} h
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={Link}
                          to={`/dashboard/vessels/${r.vesselId}`}
                          size="small"
                          endIcon={<OpenInNewRoundedIcon />}
                        >
                          Dossier
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, v) => setPage(v - 1)}
            color="primary"
          />
        </Stack>
      )}
    </Box>
  );
}
