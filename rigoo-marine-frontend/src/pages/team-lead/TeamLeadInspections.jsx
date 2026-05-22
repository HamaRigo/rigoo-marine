import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Stack, CircularProgress, Alert, Button,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Pagination, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import toast      from 'react-hot-toast';
import { Reveal, Stagger } from '../../components/common/Motion';
import { vesselInspectionApi } from '../../services/api';

const STATUS_COLORS = {
  SCHEDULED:      'default',
  IN_PROGRESS:    'info',
  PASSED:         'success',
  FAILED:         'error',
  PENDING_REVIEW: 'warning',
};

const TYPES    = ['ROUTINE', 'ANNUAL', 'SAFETY', 'INSURANCE'];
const STATUSES = Object.keys(STATUS_COLORS);

const EMPTY_FORM = {
  vesselId: '', clientId: '', inspectorId: '',
  inspectionDate: '', type: 'ROUTINE', status: 'SCHEDULED',
  findings: '', notes: '', nextInspectionDate: '',
};

export default function TeamLeadInspections() {
  const qc = useQueryClient();
  const [page, setPage]               = useState(1);
  const [createOpen, setCreateOpen]   = useState(false);
  const [statusTarget, setStatusTarget] = useState(null); // { id, status, findings }
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tl-vessel-inspections', page],
    queryFn: () => vesselInspectionApi.search({ page: page - 1, size: 20 }),
    keepPreviousData: true,
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCreate = async () => {
    if (!form.vesselId || !form.clientId || !form.inspectionDate) {
      setFormError('Vessel ID, Client ID and Inspection Date are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await vesselInspectionApi.create({
        ...form,
        vesselId:    Number(form.vesselId),
        clientId:    Number(form.clientId),
        inspectorId: form.inspectorId ? Number(form.inspectorId) : null,
      });
      toast.success('Inspection created');
      qc.invalidateQueries(['tl-vessel-inspections']);
      setCreateOpen(false);
    } catch {
      setFormError('Failed to create inspection.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = async () => {
    setSaving(true);
    try {
      await vesselInspectionApi.updateStatus(statusTarget.id, statusTarget.status, statusTarget.findings);
      toast.success('Status updated');
      qc.invalidateQueries(['tl-vessel-inspections']);
      setStatusTarget(null);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const rows       = data?.content    ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (isError)   return <Alert severity="error">Failed to load inspections.</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Vessel Inspections</Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => { setForm(EMPTY_FORM); setFormError(''); setCreateOpen(true); }}>
            New Inspection
          </Button>
        </Stack>
      </Reveal>

      {rows.length === 0 ? (
        <Typography color="text.disabled">No inspection records found.</Typography>
      ) : (
        <Stagger>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Vessel</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Inspector</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Next Due</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell>#{row.id}</TableCell>
                    <TableCell>Vessel #{row.vesselId}</TableCell>
                    <TableCell>{row.type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{row.inspectionDate}</TableCell>
                    <TableCell>{row.inspectorId ? `Tech #${row.inspectorId}` : '—'}</TableCell>
                    <TableCell>
                      <Chip label={row.status?.replace(/_/g, ' ')} size="small"
                        color={STATUS_COLORS[row.status] || 'default'} />
                    </TableCell>
                    <TableCell>{row.nextInspectionDate ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Update Status">
                        <IconButton size="small"
                          onClick={() => setStatusTarget({ id: row.id, status: row.status, findings: row.findings || '' })}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Pagination count={totalPages} page={page}
              onChange={(_, v) => setPage(v)}
              sx={{ display: 'flex', justifyContent: 'center' }} />
          )}
        </Stagger>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Vessel Inspection</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField label="Vessel ID" type="number" value={form.vesselId} onChange={set('vesselId')} fullWidth required />
              <TextField label="Client ID" type="number" value={form.clientId} onChange={set('clientId')} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Inspector ID" type="number" value={form.inspectorId} onChange={set('inspectorId')} fullWidth />
              <TextField label="Inspection Date" type="date" value={form.inspectionDate}
                onChange={set('inspectionDate')} fullWidth required InputLabelProps={{ shrink: true }} />
            </Stack>
            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={set('type')}>
                {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Findings" multiline rows={3} value={form.findings} onChange={set('findings')} fullWidth />
            <TextField label="Notes" multiline rows={2} value={form.notes} onChange={set('notes')} fullWidth />
            <TextField label="Next Inspection Date" type="date" value={form.nextInspectionDate}
              onChange={set('nextInspectionDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status update dialog */}
      <Dialog open={!!statusTarget} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Inspection Status</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusTarget?.status ?? ''} label="Status"
                onChange={e => setStatusTarget(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Findings" multiline rows={3} fullWidth
              value={statusTarget?.findings ?? ''}
              onChange={e => setStatusTarget(p => ({ ...p, findings: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
