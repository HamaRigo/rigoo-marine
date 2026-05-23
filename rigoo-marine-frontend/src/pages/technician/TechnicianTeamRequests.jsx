import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  IconButton, Tooltip, CircularProgress, Alert, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import TaskAltRoundedIcon       from '@mui/icons-material/TaskAltRounded';
import InfoOutlinedIcon         from '@mui/icons-material/InfoOutlined';
import WhatsAppIcon             from '@mui/icons-material/WhatsApp';
import toast from 'react-hot-toast';
import { teamRequestApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';

// Technician sees requests that were APPROVED (assigned to them) and beyond.
// respond() lets a technician mark APPROVED or COMPLETED.
const COLS = [
  { status: 'APPROVED',   label: 'Assigned to Me', color: '#00796B', bg: '#E0F2F1' },
  { status: 'DISPATCHED', label: 'In Field',        color: '#6A1B9A', bg: '#F3E5F5' },
  { status: 'COMPLETED',  label: 'Done',            color: '#1B5E20', bg: '#F1F8E9' },
];

const CATEGORY_EMOJIS = {
  mechanical: '🔧', structural: '⛵', electrical: '⚡',
  cosmetic: '✨', renovation: '🔄', emergency: '🆘',
};

function RequestCard({ req, onAction, onView }) {
  return (
    <Card variant="outlined" sx={{
      transition: 'transform 150ms, box-shadow 150ms',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
    }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>#{req.id}</Typography>
            <Typography variant="caption">{CATEGORY_EMOJIS[req.category] ?? '🔧'}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {req.whatsappOptIn && <WhatsAppIcon sx={{ color: '#25D366', fontSize: 14 }} />}
            <Tooltip title="View details">
              <IconButton size="small" onClick={() => onView(req)}>
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.secondary" fontWeight={600}
          display="block" mb={0.5} sx={{ textTransform: 'capitalize' }}>
          {req.category}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, lineHeight: 1.4 }}>
          {req.description?.slice(0, 90)}{req.description?.length > 90 ? '…' : ''}
        </Typography>

        {req.locationDescription && (
          <Typography variant="caption" color="text.disabled" display="block">
            📍 {req.locationDescription?.slice(0, 45)}
          </Typography>
        )}
        {req.contactPhone && (
          <Typography variant="caption" color="text.disabled" display="block">
            📞 {req.contactPhone}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} mt={1.5} flexWrap="wrap" useFlexGap>
          {req.status === 'APPROVED' && (
            <Button size="small" variant="contained"
              startIcon={<LocalShippingRoundedIcon />}
              onClick={() => onAction('COMPLETED', req)} sx={{ fontSize: 11 }}>
              Mark Complete
            </Button>
          )}
          {req.status === 'DISPATCHED' && (
            <Button size="small" variant="contained" color="success"
              startIcon={<TaskAltRoundedIcon />}
              onClick={() => onAction('COMPLETED', req)} sx={{ fontSize: 11 }}>
              Complete
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function KanbanCol({ col, cards, onAction, onView }) {
  return (
    <Box sx={{ minWidth: 268, flex: '0 0 268px' }}>
      <Box sx={{
        bgcolor: 'background.paper', borderRadius: '6px 6px 0 0',
        borderTop: `4px solid ${col.color}`, border: '1px solid', borderColor: 'divider',
        px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Typography variant="subtitle2" fontWeight={700}>{col.label}</Typography>
        <Box sx={{
          bgcolor: col.color, color: '#fff', borderRadius: 10,
          minWidth: 22, height: 22, px: 0.75,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>
          {cards.length}
        </Box>
      </Box>
      <Box sx={{
        border: '1px solid', borderTop: 0, borderColor: 'divider',
        borderRadius: '0 0 6px 6px', bgcolor: col.bg, p: 1, minHeight: 260,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {cards.length === 0 ? (
          <Typography variant="caption" color="text.disabled"
            sx={{ textAlign: 'center', pt: 5, display: 'block' }}>
            Empty
          </Typography>
        ) : cards.map(r => (
          <RequestCard key={r.id} req={r} onAction={onAction} onView={onView} />
        ))}
      </Box>
    </Box>
  );
}

export default function TechnicianTeamRequests() {
  const qc = useQueryClient();

  const [detailReq, setDetailReq]       = useState(null);
  const [actionTarget, setActionTarget] = useState(null); // { req, toStatus }
  const [note, setNote]                 = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tech-team-requests'],
    queryFn: () => teamRequestApi.myAssigned({ page: 0, size: 100 }),
  });
  const requests = data?.content ?? [];

  const respondMutation = useMutation({
    mutationFn: ({ id, status, note: n }) => teamRequestApi.respond(id, status, n || undefined),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['tech-team-requests'] });
      setActionTarget(null);
      setNote('');
      toast.success(`Request marked as ${status}`);
    },
    onError: () => toast.error('Could not update request'),
  });

  const handleAction = (toStatus, req) => {
    setNote('');
    setActionTarget({ req, toStatus });
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  const active = requests.filter(r => r.status !== 'COMPLETED').length;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={3}>
          <Typography variant="h5" fontWeight={700}>My Team Requests</Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="body2" color="text.secondary">{active} active</Typography>
            <Typography variant="body2" color="text.disabled">{requests.length} total</Typography>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load assigned requests.</Alert>}

      {!isError && requests.length === 0 && !isLoading && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          No team requests assigned to you.
        </Typography>
      )}

      {requests.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
          {COLS.map(col => (
            <KanbanCol
              key={col.status}
              col={col}
              cards={requests.filter(r => r.status === col.status)}
              onAction={handleAction}
              onView={setDetailReq}
            />
          ))}
        </Box>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailReq} onClose={() => setDetailReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Request #{detailReq?.id} — {detailReq?.category}
        </DialogTitle>
        <DialogContent dividers>
          {detailReq?.locationDescription && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Location:</strong> {detailReq.locationDescription}
            </Typography>
          )}
          {detailReq?.contactPhone && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Phone:</strong> {detailReq.contactPhone}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 1 }}>{detailReq?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailReq(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Action confirmation dialog */}
      <Dialog open={!!actionTarget} onClose={() => setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Mark as {actionTarget?.toStatus} — Request #{actionTarget?.req?.id}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={2} label="Note (optional)"
            value={note} onChange={e => setNote(e.target.value)} sx={{ mt: 1 }}
            disabled={respondMutation.isPending}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)} disabled={respondMutation.isPending}>Cancel</Button>
          <Button variant="contained" disabled={respondMutation.isPending}
            onClick={() => respondMutation.mutate({ id: actionTarget.req.id, status: actionTarget.toStatus, note })}>
            {respondMutation.isPending ? <CircularProgress size={18} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
