/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  IconButton, Tooltip, CircularProgress, Alert, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import CheckCircleRoundedIcon  from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon       from '@mui/icons-material/CancelRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import TaskAltRoundedIcon      from '@mui/icons-material/TaskAltRounded';
import PersonAddRoundedIcon    from '@mui/icons-material/PersonAddRounded';
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined';
import WhatsAppIcon            from '@mui/icons-material/WhatsApp';
import AttachFileIcon          from '@mui/icons-material/AttachFile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamRequestApi, technicianApi, adminApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';
import QuickDocumentMenu from '../../components/admin/QuickDocumentMenu';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';

const COLS = [
  { status: 'PENDING',    label: 'Pending',    color: '#E65100', bg: '#FFF3E0' },
  { status: 'APPROVED',   label: 'Approved',   color: '#00796B', bg: '#E0F2F1' },
  { status: 'DISPATCHED', label: 'Dispatched', color: '#6A1B9A', bg: '#F3E5F5' },
  { status: 'COMPLETED',  label: 'Done',       color: '#1B5E20', bg: '#F1F8E9' },
  { status: 'REJECTED',   label: 'Rejected',   color: '#B71C1C', bg: '#FFEBEE' },
];

const CATEGORY_EMOJIS = {
  mechanical: '🔧', structural: '⛵', electrical: '⚡',
  cosmetic: '✨', renovation: '🔄', emergency: '🆘',
};

function RequestCard({ req, techById, onAction, onView, onDocument }) {
  const techName = req.assignedTo
    ? (techById[String(req.assignedTo)]?.name ?? `Tech #${req.assignedTo}`)
    : null;

  return (
    <Card variant="outlined" sx={{
      transition: 'transform 150ms, box-shadow 150ms',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
    }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>#{req.id}</Typography>
            <Typography variant="caption">
              {CATEGORY_EMOJIS[req.category] ?? '🔧'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {req.whatsappOptIn && <WhatsAppIcon sx={{ color: '#25D366', fontSize: 14 }} />}
            {onDocument && (
              <QuickDocumentMenu
                label={`TR #${req.id}`}
                onCreateInvoice={() => onDocument('invoice', req)}
                onCreateQuotation={() => onDocument('quotation', req)}
              />
            )}
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
          {req.description?.slice(0, 80)}{req.description?.length > 80 ? '…' : ''}
        </Typography>

        {req.locationDescription && (
          <Typography variant="caption" color="text.disabled" display="block">
            📍 {req.locationDescription?.slice(0, 40)}
          </Typography>
        )}
        {req.contactPhone && (
          <Typography variant="caption" color="text.disabled" display="block">
            📞 {req.contactPhone}
          </Typography>
        )}
        {techName && (
          <Typography variant="caption" color="text.disabled" display="block">
            👤 {techName}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} mt={1.5} flexWrap="wrap" useFlexGap>
          {req.status === 'PENDING' && <>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckCircleRoundedIcon />}
              onClick={() => onAction('APPROVED', req)} sx={{ fontSize: 11 }}>
              Approve
            </Button>
            <Button size="small" variant="outlined" color="error"
              startIcon={<CancelRoundedIcon />}
              onClick={() => onAction('REJECTED', req)} sx={{ fontSize: 11 }}>
              Reject
            </Button>
            <Tooltip title="Assign technician">
              <IconButton size="small" color="primary" onClick={() => onAction('assign', req)}>
                <PersonAddRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>}
          {req.status === 'APPROVED' && <>
            <Button size="small" variant="contained"
              startIcon={<LocalShippingRoundedIcon />}
              onClick={() => onAction('DISPATCHED', req)} sx={{ fontSize: 11 }}>
              Dispatch
            </Button>
            <Tooltip title="Assign technician">
              <IconButton size="small" color="primary" onClick={() => onAction('assign', req)}>
                <PersonAddRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>}
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

function KanbanCol({ col, cards, techById, onAction, onView, onDocument }) {
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
          <RequestCard key={r.id} req={r} techById={techById} onAction={onAction} onView={onView} onDocument={onDocument} />
        ))}
      </Box>
    </Box>
  );
}

export default function TeamLeadTeamRequests() {
  const qc = useQueryClient();

  const [detailReq, setDetailReq]       = useState(null);
  const [actionTarget, setActionTarget] = useState(null); // { req, toStatus }
  const [adminNotes, setAdminNotes]     = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [techId, setTechId]             = useState('');
  const [techs, setTechs]               = useState([]);

  const [docOpen, setDocOpen]       = useState(false);
  const [docType, setDocType]       = useState('invoice');
  const [docPrefill, setDocPrefill] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: adminApi.getAll,
  });

  useEffect(() => {
    technicianApi.getAll().then(list => setTechs(list || [])).catch(() => {});
  }, []);

  const techById = Object.fromEntries(techs.map(t => [String(t.id), t]));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tl-team-requests'],
    queryFn: () => teamRequestApi.list({ size: 200 }),
  });
  const requests = data?.content ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tl-team-requests'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => teamRequestApi.updateStatus(id, status, notes),
    onSuccess: () => { invalidate(); setActionTarget(null); setAdminNotes(''); },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, technicianId }) => teamRequestApi.assign(id, technicianId),
    onSuccess: () => { invalidate(); setAssignTarget(null); setTechId(''); },
  });

  const handleAction = (action, req) => {
    if (action === 'assign') {
      setAssignTarget(req);
      setTechId(req.assignedTo?.toString() || '');
    } else {
      setAdminNotes('');
      setActionTarget({ req, toStatus: action });
    }
  };

  const handleDocument = (type, req) => {
    setDocType(type);
    setDocPrefill({
      notes: `Team Request #${req.id}${req.category ? ` — ${req.category}` : ''}`,
      billToPhone: req.contactPhone || '',
      billToMode: 'manual',
      items: req.category ? [{ description: req.category.charAt(0).toUpperCase() + req.category.slice(1) + ' service', quantity: 1, unitPrice: '', taxRate: 5 }] : [],
    });
    setDocOpen(true);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  const active = requests.filter(r => !['COMPLETED', 'REJECTED'].includes(r.status)).length;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={3}>
          <Typography variant="h5" fontWeight={700}>Team Requests</Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="body2" color="text.secondary">{active} active</Typography>
            <Typography variant="body2" color="text.disabled">{requests.length} total</Typography>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load team requests.</Alert>}

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {COLS.map(col => (
          <KanbanCol
            key={col.status}
            col={col}
            cards={requests.filter(r => r.status === col.status)}
            techById={techById}
            onAction={handleAction}
            onView={setDetailReq}
            onDocument={handleDocument}
          />
        ))}
      </Box>

      <CreateInvoiceDialog
        open={docOpen}
        onClose={() => setDocOpen(false)}
        type={docType}
        clients={clients}
        prefill={docPrefill}
        onCreated={() => setDocOpen(false)}
      />

      {/* Detail dialog */}
      <Dialog open={!!detailReq} onClose={() => setDetailReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Request #{detailReq?.id} — {detailReq?.category}
          {' '}
          <Chip label={detailReq?.status} size="small" sx={{ ml: 1 }} />
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>Description</Typography>
          <Typography paragraph>{detailReq?.description}</Typography>
          {detailReq?.locationDescription && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Location</Typography>
              <Typography paragraph>📍 {detailReq.locationDescription}</Typography>
            </>
          )}
          {detailReq?.contactPhone && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Contact</Typography>
              <Typography paragraph>{detailReq.contactPhone}</Typography>
            </>
          )}
          {detailReq?.adminNotes && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>Notes</Typography>
              <Typography paragraph>{detailReq.adminNotes}</Typography>
            </>
          )}
          {detailReq?.attachments?.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Attachments ({detailReq.attachments.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {detailReq.attachments.map(a => (
                  <Chip key={a.id} label={a.originalName} size="small" icon={<AttachFileIcon />} />
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailReq(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status action dialog */}
      <Dialog open={!!actionTarget} onClose={() => setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {actionTarget?.toStatus === 'REJECTED' ? 'Reject' : `Set to ${actionTarget?.toStatus}`}
          {' '}— Request #{actionTarget?.req?.id}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Notes (optional)"
            value={adminNotes} onChange={e => setAdminNotes(e.target.value)} sx={{ mt: 1 }}
          />
          {statusMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>Action failed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionTarget?.toStatus === 'REJECTED' ? 'error' : 'primary'}
            disabled={statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate({ id: actionTarget.req.id, status: actionTarget.toStatus, notes: adminNotes })
            }>
            {statusMutation.isPending ? <CircularProgress size={20} /> : 'Confirm'}
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
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {assignMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>Assignment failed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button variant="contained"
            disabled={!techId || assignMutation.isPending}
            onClick={() => assignMutation.mutate({ id: assignTarget.id, technicianId: Number(techId) })}>
            {assignMutation.isPending ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
