import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Tooltip, Skeleton, Alert, Divider, TableContainer,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  TablePagination, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { vesselApi } from '../../services/api';
import { Reveal } from '../common/Motion';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY_FORM = {
  logDate: '',
  litersAdded: '',
  pricePerLiter: '',
  portName: '',
  notes: '',
};

// ── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, accent = '#006994' }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, flex: 1 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              bgcolor: `${accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="subtitle2" fontWeight={700}>{value}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Fuel area chart ─────────────────────────────────────────────────────────

function FuelAreaChart({ analytics }) {
  if (!analytics?.byMonth) return null;

  const chartData = analytics.byMonth.map((m, i) => ({
    month: MONTH_NAMES[i],
    liters: Number(m.liters ?? 0),
    cost: Number(m.cost ?? 0),
  }));

  return (
    <Box sx={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#006994" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#006994" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#f5a623" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <RTooltip
            contentStyle={{
              borderRadius: 8, border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}
            formatter={(v, name) => [
              name === 'liters' ? `${v.toLocaleString()} L` : `${v.toLocaleString()} QAR`,
              name === 'liters' ? 'Liters' : 'Cost',
            ]}
          />
          <Area
            type="monotone" dataKey="liters"
            stroke="#006994" fill="url(#fuelGrad)"
            strokeWidth={2} dot={false} activeDot={{ r: 4 }}
          />
          <Area
            type="monotone" dataKey="cost"
            stroke="#f5a623" fill="url(#costGrad)"
            strokeWidth={2} dot={false} activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ── Add fuel log dialog ─────────────────────────────────────────────────────

function AddFuelLogDialog({ open, onClose, vesselId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () => vesselApi.addFuelLog(vesselId, {
      logDate:       form.logDate,
      litersAdded:   Number(form.litersAdded),
      pricePerLiter: form.pricePerLiter ? Number(form.pricePerLiter) : null,
      portName:      form.portName   || null,
      notes:         form.notes      || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel-logs', vesselId] });
      qc.invalidateQueries({ queryKey: ['fuel-analytics', vesselId] });
      toast.success('Fuel log added');
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to add log'),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const valid = form.logDate && form.litersAdded && Number(form.litersAdded) > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Log Fuel Fill</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Date" type="date" value={form.logDate} onChange={set('logDate')}
            InputLabelProps={{ shrink: true }} required fullWidth />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Liters added" type="number" value={form.litersAdded} onChange={set('litersAdded')}
              required fullWidth inputProps={{ min: 0.01, step: 0.01 }}
              InputProps={{ endAdornment: <InputAdornment position="end">L</InputAdornment> }} />
            <TextField
              label="Price / liter" type="number" value={form.pricePerLiter} onChange={set('pricePerLiter')}
              fullWidth inputProps={{ min: 0, step: 0.001 }}
              InputProps={{ endAdornment: <InputAdornment position="end">QAR</InputAdornment> }} />
          </Stack>

          <TextField
            label="Port / marina" value={form.portName} onChange={set('portName')} fullWidth />

          <TextField
            label="Notes" value={form.notes} onChange={set('notes')} multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Add Log
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirm ──────────────────────────────────────────────────────────

function DeleteLogDialog({ log, vesselId, onClose }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => vesselApi.deleteFuelLog(log.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel-logs', vesselId] });
      qc.invalidateQueries({ queryKey: ['fuel-analytics', vesselId] });
      toast.success('Log deleted');
      onClose();
    },
    onError: () => toast.error('Failed to delete log'),
  });

  return (
    <Dialog open={!!log} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete fuel log?</DialogTitle>
      <DialogContent>
        <Typography>
          Remove entry for <strong>{log?.logDate}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function FuelLogPanel({ vesselId }) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const { data: logsPage, isLoading: logsLoading } = useQuery({
    queryKey: ['fuel-logs', vesselId, page],
    queryFn: () => vesselApi.listFuelLogs(vesselId, { page, size: rowsPerPage }),
    enabled: !!vesselId,
    keepPreviousData: true,
  });

  const { data: analytics } = useQuery({
    queryKey: ['fuel-analytics', vesselId],
    queryFn: () => vesselApi.getFuelAnalytics(vesselId),
    enabled: !!vesselId,
  });

  const logs = logsPage?.content ?? [];
  const totalElements = logsPage?.totalElements ?? 0;
  const year = new Date().getFullYear();

  if (logsLoading && !logsPage) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    );
  }

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>Fuel Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          Log Fill
        </Button>
      </Stack>

      {/* ── KPI cards ──────────────────────────────────────────────── */}
      {analytics && (
        <Reveal variant="fade" timeout={380}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
            <KpiCard
              icon={<LocalGasStationRoundedIcon sx={{ color: '#006994', fontSize: 20 }} />}
              label={`Total liters ${year}`}
              value={`${Number(analytics.totalLiters ?? 0).toLocaleString()} L`}
              accent="#006994"
            />
            <KpiCard
              icon={<AttachMoneyRoundedIcon sx={{ color: '#f5a623', fontSize: 20 }} />}
              label={`Total cost ${year}`}
              value={`${Number(analytics.totalCost ?? 0).toLocaleString()} QAR`}
              accent="#f5a623"
            />
            <KpiCard
              icon={<LocalGasStationRoundedIcon sx={{ color: '#43a047', fontSize: 20 }} />}
              label={`Fill-ups ${year}`}
              value={analytics.recordCount ?? 0}
              accent="#43a047"
            />
          </Stack>
        </Reveal>
      )}

      {/* ── Area chart ─────────────────────────────────────────────── */}
      {analytics && (
        <Reveal variant="slide" direction="up" timeout={420}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Monthly consumption — {year}
              </Typography>
              <FuelAreaChart analytics={analytics} />
              <Stack direction="row" spacing={2} mt={1} justifyContent="center">
                {[
                  { color: '#006994', label: 'Liters' },
                  { color: '#f5a623', label: 'Cost (QAR)' },
                ].map(({ color, label }) => (
                  <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* ── Log table ──────────────────────────────────────────────── */}
      {logs.length === 0 && !logsLoading ? (
        <Reveal variant="fade">
          <Box
            sx={{
              textAlign: 'center', py: 8,
              border: '2px dashed', borderColor: 'divider', borderRadius: 3,
            }}
          >
            <LocalGasStationRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary">No fuel logs yet.</Typography>
            <Typography variant="caption" color="text.disabled">
              Track every fill-up to monitor consumption trends.
            </Typography>
          </Box>
        </Reveal>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Liters</TableCell>
                  <TableCell align="right">Price/L</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Port</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {new Date(log.logDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      {Number(log.litersAdded).toLocaleString()} L
                    </TableCell>
                    <TableCell align="right">
                      {log.pricePerLiter ? `${Number(log.pricePerLiter).toFixed(3)}` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {log.totalCost
                        ? <Chip size="small" label={`${Number(log.totalCost).toLocaleString()} QAR`}
                            sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', fontSize: '0.7rem' }} />
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                        {log.portName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 48 }}>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(log)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10]}
            onPageChange={(_, newPage) => setPage(newPage)}
          />
        </Card>
      )}

      <AddFuelLogDialog open={addOpen} onClose={() => setAddOpen(false)} vesselId={vesselId} />
      {deleteTarget && (
        <DeleteLogDialog log={deleteTarget} vesselId={vesselId} onClose={() => setDeleteTarget(null)} />
      )}
    </Box>
  );
}
