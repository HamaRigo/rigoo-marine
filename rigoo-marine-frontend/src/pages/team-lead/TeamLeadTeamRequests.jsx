import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, Tooltip, Stack, Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamRequestApi, technicianApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';

const STATUS_COLORS = {
  PENDING: 'warning', APPROVED: 'info', REJECTED: 'error', DISPATCHED: 'primary', COMPLETED: 'success',
};

const CATEGORY_EMOJIS = {
  mechanical: '🔧', structural: '⛵', electrical: '⚡',
  cosmetic: '✨', renovation: '🔄', emergency: '🆘',
};

const TRANSITIONS = [
  { from: 'PENDING',    to: 'APPROVED',   label: 'Approve',  icon: <CheckCircleIcon />,   color: 'info' },
  { from: 'PENDING',    to: 'REJECTED',   label: 'Reject',   icon: <CancelIcon />,        color: 'error' },
  { from: 'APPROVED',   to: 'DISPATCHED', label: 'Dispatch', icon: <LocalShippingIcon />, color: 'primary' },
  { from: 'DISPATCHED', to: 'COMPLETED',  label: 'Complete', icon: <TaskAltIcon />,       color: 'success' },
];

export default function TeamLeadTeamRequests() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(20);
  const [selected, setSelected]         = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [adminNotes, setAdminNotes]     = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [techId, setTechId]             = useState('');
  const [techs, setTechs]               = useState([]);

  useEffect(() => {
    technicianApi.getAll().then(list => setTechs(list || [])).catch(() => {});
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team-lead', 'team-requests', statusFilter, page, rowsPerPage],
    queryFn: () => teamRequestApi.list({ status: statusFilter || undefined, page, size: rowsPerPage }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => teamRequestApi.updateStatus(id, status, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-lead', 'team-requests'] }); setActionTarget(null); setAdminNotes(''); },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, technicianId }) => teamRequestApi.assign(id, technicianId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-lead', 'team-requests'] }); setAssignTarget(null); setTechId(''); },
  });

  const rows       = data?.content       ?? [];
  const totalCount = data?.totalElements ?? 0;

  return (
    <Box>
      <Reveal variant="fade">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Team Requests</Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status filter</InputLabel>
            <Select value={statusFilter} label="Status filter" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(STATUS_COLORS).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Reveal>

      {isLoading && <CircularProgress />}
      {isError   && <Alert severity="error">Failed to load team requests.</Alert>}

      {!isLoading && !isError && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell>#</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>WA</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.disabled' }}>No requests found</TableCell>
                </TableRow>
              )}
              {rows.map(req => (
                <TableRow key={req.id} hover>
                  <TableCell>{req.id}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>{CATEGORY_EMOJIS[req.category] ?? '🔧'}</span>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{req.category}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={req.description}>{req.description}</Typography>
                    {req.locationDescription && (
                      <Typography variant="caption" color="text.secondary" noWrap>📍 {req.locationDescription}</Typography>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="body2">{req.contactPhone ?? '—'}</Typography></TableCell>
                  <TableCell>
                    {req.whatsappOptIn && <WhatsAppIcon sx={{ color: '#25D366', fontSize: 18 }} />}
                  </TableCell>
                  <TableCell>
                    {req.assignedTo
                      ? <Chip label={`Tech #${req.assignedTo}`} size="small" color="primary" />
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip label={req.status} color={STATUS_COLORS[req.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(req.createdAt).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => setSelected(req)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Assign technician">
                        <IconButton size="small" color="primary" onClick={() => { setAssignTarget(req); setTechId(req.assignedTo?.toString() || ''); }}>
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {TRANSITIONS.filter(t => t.from === req.status).map(t => (
                        <Tooltip key={t.to} title={t.label}>
                          <IconButton size="small" color={t.color} onClick={() => { setActionTarget({ req, toStatus: t.to }); setAdminNotes(''); }}>
                            {t.icon}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </TableContainer>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Request #{selected?.id} — {selected?.category}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>Description</Typography>
          <Typography paragraph>{selected?.description}</Typography>
          {selected?.locationDescription && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Location</Typography>
              <Typography paragraph>📍 {selected.locationDescription}</Typography>
            </>
          )}
          {selected?.adminNotes && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Notes</Typography>
              <Typography paragraph>{selected.adminNotes}</Typography>
            </>
          )}
          {selected?.attachments?.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Attachments ({selected.attachments.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {selected.attachments.map(a => (
                  <Chip key={a.id} label={a.originalName} size="small" icon={<AttachFileIcon />} />
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status action dialog */}
      <Dialog open={!!actionTarget} onClose={() => setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm — Set to {actionTarget?.toStatus}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3}
            label="Notes (optional)"
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
          {statusMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>Action failed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionTarget?.toStatus === 'REJECTED' ? 'error' : 'primary'}
            onClick={() => statusMutation.mutate({ id: actionTarget.req.id, status: actionTarget.toStatus, notes: adminNotes })}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? <CircularProgress size={20} /> : `Set ${actionTarget?.toStatus}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Request #{assignTarget?.id}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Technician</InputLabel>
            <Select value={techId} label="Technician" onChange={e => setTechId(e.target.value)}>
              {techs.map(t => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}{t.specialization ? ` — ${t.specialization}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {assignMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>Assignment failed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => assignMutation.mutate({ id: assignTarget.id, technicianId: Number(techId) })}
            disabled={!techId || assignMutation.isPending}
          >
            {assignMutation.isPending ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
