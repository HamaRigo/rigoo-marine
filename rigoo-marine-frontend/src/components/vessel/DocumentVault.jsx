import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, Chip, Card, CardContent, CardActions,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Tooltip, Skeleton, Alert, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import FolderSpecialRoundedIcon from '@mui/icons-material/FolderSpecialRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import toast from 'react-hot-toast';
import { vesselApi } from '../../services/api';
import { Stagger, Reveal, HoverLift } from '../common/Motion';

const DOC_TYPES = [
  'REGISTRATION', 'INSURANCE', 'SURVEY', 'CERTIFICATE',
  'CLASSIFICATION', 'LICENCE', 'OTHER',
];

const DOC_TYPE_LABELS = {
  REGISTRATION: 'Registration',
  INSURANCE: 'Insurance',
  SURVEY: 'Survey',
  CERTIFICATE: 'Certificate',
  CLASSIFICATION: 'Classification',
  LICENCE: 'Licence',
  OTHER: 'Other',
};

const EMPTY_FORM = {
  documentType: '',
  documentName: '',
  url: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
};

function expiryColor(doc) {
  if (doc.expired) return 'error';
  if (doc.expiringSoon) return 'warning';
  return 'success';
}

function expiryLabel(doc) {
  if (doc.expired) return 'Expired';
  if (doc.expiringSoon) return 'Expiring soon';
  if (doc.expiryDate) return `Expires ${new Date(doc.expiryDate).toLocaleDateString()}`;
  return 'No expiry';
}

function ExpiryIcon({ doc }) {
  if (doc.expired) return <ErrorOutlineRoundedIcon fontSize="small" color="error" />;
  if (doc.expiringSoon) return <WarningAmberRoundedIcon fontSize="small" color="warning" />;
  return <CheckCircleOutlineRoundedIcon fontSize="small" color="success" />;
}

// ── Single document card ────────────────────────────────────────────────────

function DocCard({ doc, onDelete }) {
  return (
    <HoverLift lift={4}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderColor: doc.expired ? 'error.light'
            : doc.expiringSoon ? 'warning.light'
            : 'divider',
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #003356 0%, #005580 100%)',
            px: 2, py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <FolderSpecialRoundedIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
          <Typography variant="caption" fontWeight={600} sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
          </Typography>
        </Box>

        <CardContent sx={{ flex: 1, py: 1.5, px: 2 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }} noWrap>
            {doc.documentName}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
            <ExpiryIcon doc={doc} />
            <Typography variant="caption" color={`${expiryColor(doc)}.main`}>
              {expiryLabel(doc)}
            </Typography>
          </Stack>

          {doc.issueDate && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              Issued: {new Date(doc.issueDate).toLocaleDateString()}
            </Typography>
          )}

          {doc.notes && (
            <Typography variant="caption" color="text.disabled" display="block" mt={0.5} noWrap>
              {doc.notes}
            </Typography>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ px: 1.5, py: 0.75, gap: 0.5 }}>
          <Tooltip title="Open document">
            <span>
              <IconButton
                size="small"
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                component="a"
              >
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(doc)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    </HoverLift>
  );
}

// ── Add document dialog ─────────────────────────────────────────────────────

function AddDocumentDialog({ open, onClose, vesselId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () => vesselApi.addDocument(vesselId, {
      documentType:  form.documentType,
      documentName:  form.documentName,
      url:           form.url,
      issueDate:     form.issueDate  || null,
      expiryDate:    form.expiryDate || null,
      notes:         form.notes      || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vessel-docs', vesselId] });
      toast.success('Document added');
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to add document'),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const valid = form.documentType && form.documentName && form.url;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Document</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select label="Document type" value={form.documentType} onChange={set('documentType')} required fullWidth>
            {DOC_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{DOC_TYPE_LABELS[t]}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Document name" value={form.documentName} onChange={set('documentName')}
            required fullWidth placeholder="e.g. Hull Insurance 2025" />

          <TextField
            label="Document URL" value={form.url} onChange={set('url')}
            required fullWidth placeholder="https://…" />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Issue date" type="date" value={form.issueDate} onChange={set('issueDate')}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField
              label="Expiry date" type="date" value={form.expiryDate} onChange={set('expiryDate')}
              InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>

          <TextField
            label="Notes" value={form.notes} onChange={set('notes')}
            multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Add Document
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirm dialog ───────────────────────────────────────────────────

function DeleteDocDialog({ doc, onClose }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => vesselApi.deleteDocument(doc.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vessel-docs', doc.vesselId] });
      toast.success('Document removed');
      onClose();
    },
    onError: () => toast.error('Failed to delete document'),
  });

  return (
    <Dialog open={!!doc} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete document?</DialogTitle>
      <DialogContent>
        <Typography>
          Remove <strong>{doc?.documentName}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error" variant="contained"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function DocumentVault({ vesselId }) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: docs = [], isLoading, error } = useQuery({
    queryKey: ['vessel-docs', vesselId],
    queryFn: () => vesselApi.listDocuments(vesselId),
    enabled: !!vesselId,
  });

  const expiredCount    = docs.filter((d) => d.expired).length;
  const expiringSoonCount = docs.filter((d) => !d.expired && d.expiringSoon).length;

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[0, 1, 2].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rounded" height={160} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load documents.</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Document Vault</Typography>
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <Stack direction="row" spacing={1} mt={0.5}>
              {expiredCount > 0 && (
                <Chip size="small" color="error" label={`${expiredCount} expired`} />
              )}
              {expiringSoonCount > 0 && (
                <Chip size="small" color="warning" label={`${expiringSoonCount} expiring soon`} />
              )}
            </Stack>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          Add Document
        </Button>
      </Stack>

      {docs.length === 0 ? (
        <Reveal variant="fade">
          <Box
            sx={{
              textAlign: 'center', py: 8,
              border: '2px dashed', borderColor: 'divider', borderRadius: 3,
            }}
          >
            <FolderSpecialRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary">No documents yet.</Typography>
            <Typography variant="caption" color="text.disabled">
              Add registration papers, insurance, surveys and certificates.
            </Typography>
          </Box>
        </Reveal>
      ) : (
        <Stagger>
          <Grid container spacing={2}>
            {docs.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <DocCard doc={doc} onDelete={setDeleteTarget} />
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      <AddDocumentDialog open={addOpen} onClose={() => setAddOpen(false)} vesselId={vesselId} />
      {deleteTarget && (
        <DeleteDocDialog doc={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </Box>
  );
}
