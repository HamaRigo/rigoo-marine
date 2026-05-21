import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, Select, MenuItem,
  FormControl, InputLabel, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, Tooltip, Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamRequestApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';

const STATUS_COLORS = {
  PENDING:    'warning',
  APPROVED:   'info',
  REJECTED:   'error',
  DISPATCHED: 'primary',
  COMPLETED:  'success',
};

const CATEGORY_EMOJIS = {
  mechanical: '🔧', structural: '⛵', electrical: '⚡',
  cosmetic: '✨', renovation: '🔄', emergency: '🆘',
};

const TRANSITIONS = [
  { from: 'PENDING',   to: 'APPROVED',   label: 'Approve',  icon: <CheckCircleIcon />,   color: 'info' },
  { from: 'PENDING',   to: 'REJECTED',   label: 'Reject',   icon: <CancelIcon />,        color: 'error' },
  { from: 'APPROVED',  to: 'DISPATCHED', label: 'Dispatch', icon: <LocalShippingIcon />, color: 'primary' },
  { from: 'DISPATCHED',to: 'COMPLETED',  label: 'Complete', icon: <TaskAltIcon />,       color: 'success' },
];

export default function TeamRequestManagement() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(20);
  const [selected, setSelected]         = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [adminNotes, setAdminNotes]     = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team-requests', statusFilter, page, rowsPerPage],
    queryFn: () => teamRequestApi.list({ status: statusFilter || undefined, page, size: rowsPerPage }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, notes }) => teamRequestApi.updateStatus(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-requests'] });
      setActionTarget(null);
      setAdminNotes('');
    },
  });

  const handleAction = (req, toStatus) => {
    setActionTarget({ req, toStatus });
    setAdminNotes('');
  };

  const confirmAction = () => {
    mutation.mutate({ id: actionTarget.req.id, status: actionTarget.toStatus, notes: adminNotes });
  };

  const rows        = data?.content       ?? [];
  const totalCount  = data?.totalElements ?? 0;

  return (
    <Box>
      <Reveal variant="fade">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Team Requests</Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status filter</InputLabel>
            <Select value={statusFilter} label="Status filter" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(STATUS_COLORS).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
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
                <TableCell>Attachments</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                    No requests found
                  </TableCell>
                </TableRow>
              )}
              {rows.map(req => (
                <TableRow key={req.id} hover>
                  <TableCell>{req.id}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>{CATEGORY_EMOJIS[req.category] ?? '🔧'}</span>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {req.category}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={req.description}>
                      {req.description}
                    </Typography>
                    {req.locationDescription && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        📍 {req.locationDescription}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{req.contactPhone ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {req.whatsappOptIn && <WhatsAppIcon sx={{ color: '#25D366', fontSize: 18 }} />}
                  </TableCell>
                  <TableCell>
                    {req.attachments?.length > 0 && (
                      <Chip
                        icon={<AttachFileIcon />}
                        label={req.attachments.length}
                        size="small" variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={req.status} color={STATUS_COLORS[req.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => setSelected(req)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {TRANSITIONS.filter(t => t.from === req.status).map(t => (
                        <Tooltip key={t.to} title={t.label}>
                          <IconButton
                            size="small"
                            color={t.color}
                            onClick={() => handleAction(req, t.to)}
                          >
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
            onPageChange={(_, newPage) => setPage(newPage)}
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
              <Typography paragraph>📍 {selected?.locationDescription}</Typography>
            </>
          )}
          {selected?.adminNotes && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Admin notes</Typography>
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

      {/* Action confirmation dialog */}
      <Dialog open={!!actionTarget} onClose={() => setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {actionTarget?.toStatus === 'REJECTED' ? 'Reject' : 'Confirm'} Request #{actionTarget?.req?.id}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3}
            label="Admin notes (optional)"
            placeholder={actionTarget?.toStatus === 'APPROVED'
              ? 'e.g. Team will arrive within 2 hours'
              : actionTarget?.toStatus === 'REJECTED'
              ? 'Reason for rejection'
              : ''}
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
          {mutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mutation.error?.response?.data?.message || 'Action failed'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionTarget?.toStatus === 'REJECTED' ? 'error' : 'primary'}
            onClick={confirmAction}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <CircularProgress size={20} /> : `Set ${actionTarget?.toStatus}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
