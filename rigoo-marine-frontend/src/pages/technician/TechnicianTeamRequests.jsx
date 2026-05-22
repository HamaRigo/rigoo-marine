import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, CardActions, Grid,
  Chip, Button, TextField, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Pagination,
} from '@mui/material';
import { teamRequestApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const STATUS_COLORS = {
  PENDING:    'warning',
  ASSIGNED:   'info',
  APPROVED:   'success',
  COMPLETED:  'success',
  REJECTED:   'error',
  CANCELLED:  'default',
};

function RespondDialog({ open, request, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [action, setAction] = useState('');
  const qc = useQueryClient();
  const { success: toastOk, error: toastErr } = useToast();

  const mutation = useMutation({
    mutationFn: () => teamRequestApi.respond(request.id, action, note.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tech-team-requests'] });
      toastOk(`Request #${request.id} marked as ${action}`);
      onDone();
    },
    onError: () => toastErr('Could not update request. Please try again.'),
  });

  const handleOpen = (a) => { setAction(a); setNote(''); };

  if (!request) return null;

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Team Request #{request.id}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Category:</strong> {request.category}
          </Typography>
          {request.location && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Location:</strong> {request.location}
            </Typography>
          )}
          {request.contactPhone && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Phone:</strong> {request.contactPhone}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 1 }}>{request.description}</Typography>
        </Box>

        {action && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={mutation.isPending}
          />
        )}

        {!action && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="contained" color="success" onClick={() => handleOpen('APPROVED')}>
              Mark Approved
            </Button>
            <Button variant="contained" color="primary" onClick={() => handleOpen('COMPLETED')}>
              Mark Completed
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Close</Button>
        {action && (
          <Button variant="contained" disabled={mutation.isPending}
            onClick={() => mutation.mutate()}>
            {mutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Confirm {action === 'APPROVED' ? 'Approval' : 'Completion'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function TechnicianTeamRequests() {
  const [page, setPage] = useState(1);
  const [dialogTarget, setDialogTarget] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tech-team-requests', page],
    queryFn: () => teamRequestApi.myAssigned({ page: page - 1, size: 12 }),
  });

  const requests = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>My Team Requests</Typography>

      {isError && <Alert severity="error" sx={{ mb: 3 }}>Failed to load assigned requests.</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          {requests.length === 0 && !isError && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
              No team requests assigned to you.
            </Typography>
          )}

          <Grid container spacing={2}>
            {requests.map((req) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={req.id} >
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">#{req.id}</Typography>
                      <Chip
                        label={req.status}
                        color={STATUS_COLORS[req.status] || 'default'}
                        size="small"
                      />
                    </Box>
                    <Chip label={req.category} size="small" variant="outlined" sx={{ mb: 1 }} />
                    <Typography variant="body2" paragraph>
                      {req.description?.slice(0, 120)}{req.description?.length > 120 ? '…' : ''}
                    </Typography>
                    {req.location && (
                      <Typography variant="caption" color="text.secondary">
                        📍 {req.location}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button size="small" onClick={() => setDialogTarget(req)}>
                      {['PENDING', 'ASSIGNED'].includes(req.status) ? 'Respond' : 'View'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </>
      )}

      <RespondDialog
        open={!!dialogTarget}
        request={dialogTarget}
        onClose={() => setDialogTarget(null)}
        onDone={() => setDialogTarget(null)}
      />
    </Box>
  );
}
