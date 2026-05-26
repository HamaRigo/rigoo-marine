import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi, invoiceApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import { formatPrice, formatDate } from '../../utils/format';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';

const STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'warning', PAID: 'success', OVERDUE: 'error', CANCELLED: 'default',
};

export default function InvoiceManagement() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();

  const [previewRow, setPreviewRow] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    adminApi.getAllUsers().then(setClients).catch(() => {});
  }, []);

  const openPreview = async (row) => {
    setLoadingId(row.id);
    try {
      const blob = await invoiceApi.downloadPdf(row.id);
      const url = URL.createObjectURL(blob);
      setPreviewRow(row);
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load PDF preview');
    } finally {
      setLoadingId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewRow(null);
    setPreviewUrl(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await invoiceApi.deleteInvoice(deleteTarget.id);
      toast.success(`Invoice ${deleteTarget.invoiceNumber || deleteTarget.id} deleted`);
      queryClient.invalidateQueries(['admin', 'invoices']);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl || !previewRow) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `invoice-${previewRow.invoiceNumber || previewRow.id}.pdf`;
    a.click();
  };

  const columns = [
    { id: 'invoiceNumber', label: t('invoices.columns.number') },
    { id: 'clientId',     label: t('invoices.columns.client') },
    { id: 'issueDate',    label: t('invoices.columns.issueDate'), render: (r) => formatDate(r.issueDate) },
    { id: 'dueDate',      label: t('invoices.columns.dueDate'),   render: (r) => formatDate(r.dueDate) },
    { id: 'total',        label: t('invoices.columns.total'),
      render: (r) => formatPrice(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { id: 'status',       label: t('invoices.columns.status'),
      render: (r) => <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] || 'default'} /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{t('invoices.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Invoice
        </Button>
      </Box>

      <FilterableTable
        queryKey={['admin', 'invoices']}
        fetchPage={adminApi.searchInvoices}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          { id: 'status', label: t('filters.status'),
            options: STATUSES.map((s) => ({ value: s, label: s })) },
        ]}
        renderActions={(row) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={loadingId === row.id ? <CircularProgress size={14} /> : <VisibilityIcon />}
              disabled={loadingId === row.id}
              onClick={() => openPreview(row)}
            >
              {t('invoices.preview', 'Preview')}
            </Button>
            <Tooltip title="Edit invoice">
              <IconButton size="small" onClick={() => setEditTarget(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete invoice">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteTarget(row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      />

      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clients={clients}
        type="invoice"
        onCreated={() => queryClient.invalidateQueries(['admin', 'invoices'])}
      />

      <CreateInvoiceDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        clients={clients}
        type="invoice"
        initialData={editTarget}
        editId={editTarget?.id}
        onCreated={() => queryClient.invalidateQueries(['admin', 'invoices'])}
      />

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice{' '}
            <strong>{deleteTarget?.invoiceNumber || `#${deleteTarget?.id}`}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PDF Preview Dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!previewRow}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '92vh', display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header bar */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          flexShrink: 0,
        }}>
          <Typography variant="h6" fontWeight="bold">
            Invoice {previewRow?.invoiceNumber || `#${previewRow?.id}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              disabled={!previewUrl}
            >
              Download PDF
            </Button>
            <IconButton onClick={closePreview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* PDF iframe */}
        <DialogContent sx={{ p: 0, flexGrow: 1, bgcolor: '#525659', overflow: 'hidden' }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Invoice Preview"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
