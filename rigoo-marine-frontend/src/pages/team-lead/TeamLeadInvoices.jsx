import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, CircularProgress, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi, invoiceApi, clientApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';

const STATUS_COLORS = { PENDING: 'warning', PAID: 'success', OVERDUE: 'error', CANCELLED: 'default' };

export default function TeamLeadInvoices() {
  const queryClient = useQueryClient();
  const [previewRow, setPreviewRow]   = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [loadingId, setLoadingId]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [clients, setClients]         = useState([]);

  useEffect(() => {
    clientApi.getAll().then(setClients).catch(() => {});
  }, []);

  const openPreview = async (row) => {
    setLoadingId(row.id);
    try {
      const blob = await invoiceApi.downloadPdf(row.id);
      const url  = URL.createObjectURL(blob);
      setPreviewRow(row);
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load PDF');
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
      queryClient.invalidateQueries(['team-lead', 'invoices']);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { id: 'invoiceNumber', label: 'Invoice #', render: r => r.invoiceNumber ?? `#${r.id}` },
    { id: 'clientName',    label: 'Client',    render: r => r.clientName ?? `Client #${r.clientId}` },
    { id: 'amount',        label: 'Amount',    render: r => r.totalAmount ? `${r.totalAmount.toFixed(2)} QAR` : '—' },
    { id: 'status',        label: 'Status',    render: r => <Chip label={r.status} color={STATUS_COLORS[r.status] || 'default'} size="small" /> },
    { id: 'issueDate',     label: 'Issued',    render: r => r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '—' },
  ];

  const filters = [
    { id: 'status', label: 'Status', options: Object.keys(STATUS_COLORS).map(s => ({ value: s, label: s })) },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Invoices</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Invoice
        </Button>
      </Box>

      <FilterableTable
        queryKey={['team-lead', 'invoices']}
        fetchPage={(params) => adminApi.searchInvoices(params)}
        columns={columns}
        filters={filters}
        rowKey={r => r.id}
        renderActions={r => (
          <>
            <Tooltip title="Preview PDF">
              <IconButton size="small" onClick={() => openPreview(r)} disabled={loadingId === r.id}>
                {loadingId === r.id ? <CircularProgress size={16} /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setEditTarget(r)}><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}><DeleteIcon fontSize="small" /></IconButton>
            </Tooltip>
          </>
        )}
      />

      {/* PDF preview */}
      <Dialog open={!!previewRow} onClose={closePreview} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Invoice {previewRow?.invoiceNumber}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => {
                const a = document.createElement('a');
                a.href = previewUrl;
                a.download = `invoice-${previewRow.id}.pdf`;
                a.click();
              }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={closePreview}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '70vh' }}>
          {previewUrl && <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 0 }} title="Invoice PDF" />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete invoice {deleteTarget?.invoiceNumber}.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit dialog */}
      <CreateInvoiceDialog
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        type="invoice"
        clients={clients}
        editId={editTarget?.id}
        onCreated={() => queryClient.invalidateQueries(['team-lead', 'invoices'])}
      />
    </Box>
  );
}
