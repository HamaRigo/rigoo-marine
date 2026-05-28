import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Stack, CircularProgress, Alert, Button,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Pagination, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel,
} from '@mui/material';
import AddIcon      from '@mui/icons-material/Add';
import DeleteIcon   from '@mui/icons-material/Delete';
import toast        from 'react-hot-toast';
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

export default function VesselInspections() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [dialogOpen, setDialog]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vessel-inspections', page],
    queryFn: () => vesselInspectionApi.search({ page: page - 1, size: 20 }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => vesselInspectionApi.delete(id),
    onSuccess: () => { toast.success('Inspection deleted'); qc.invalidateQueries(['vessel-inspections']); },
    onError:   () => toast.error('Delete failed'),
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const openCreate = () => { setForm(EMPTY_FORM); setFormError(''); setDialog(true); };

  const handleSave = async () => {
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
      qc.invalidateQueries(['vessel-inspections']);
      setDialog(false);
    } catch {
      setFormError('Failed to create inspection. Check all fields.');
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
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
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
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(row.id)}>
                          <DeleteIcon fontSize="small" />
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

      <Dialog open={dialogOpen} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Vessel Inspection</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField label="Vessel ID" type="number" value={form.vesselId} onChange={set('vesselId')} fullWidth required />
              <TextField label="Client ID" type="number" value={form.clientId} onChange={set('clientId')} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Inspector ID (Technician)" type="number" value={form.inspectorId} onChange={set('inspectorId')} fullWidth />
              <TextField label="Inspection Date" type="date" value={form.inspectionDate} onChange={set('inspectionDate')}
                fullWidth required InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={set('type')}>
                  {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={set('status')}>
                  {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <TextField label="Findings" multiline rows={3} value={form.findings} onChange={set('findings')} fullWidth />
            <TextField label="Notes" multiline rows={2} value={form.notes} onChange={set('notes')} fullWidth />
            <TextField label="Next Inspection Date" type="date" value={form.nextInspectionDate}
              onChange={set('nextInspectionDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
