import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  CircularProgress, Tooltip, Select, MenuItem, FormControl, InputLabel,
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
import { formatPrice, formatDate } from '../../utils/format';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';

const STATUSES = ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'ARCHIVED'];
const STATUS_COLORS = {
  DRAFT: 'default', PENDING: 'warning', PAID: 'success',
  OVERDUE: 'error', CANCELLED: 'secondary', ARCHIVED: 'info',
};

export default function TeamLeadInvoices() {
  const queryClient = useQueryClient();

  const [previewRow, setPreviewRow]     = useState(null);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [loadingId, setLoadingId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [clients, setClients]           = useState([]);
  const [changingStatus, setChangingStatus]       = useState(false);
  const [rowStatusChanging, setRowStatusChanging] = useState(new Set());
  const [downloadingAr, setDownloadingAr]         = useState(false);

  useEffect(() => {
    clientApi.getAll()
      .then(users => setClients(users.filter(u => u.role === 'CLIENT' || u.role === 'TECHNICIAN')))
      .catch(() => {});
  }, []);

  const openPreview = async (row) => {
    setLoadingId(row.id);
    try {
      const blob = await invoiceApi.downloadPdf(row.id);
      setPreviewRow(row);
      setPreviewUrl(URL.createObjectURL(blob));
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

  const handleRowStatusChange = async (row, newStatus) => {
    if (rowStatusChanging.has(row.id)) return;
    setRowStatusChanging((prev) => new Set([...prev, row.id]));
    try {
      await adminApi.updateInvoiceStatus(row.id, newStatus);
      toast.success(`Status changed to ${newStatus}`);
      queryClient.invalidateQueries(['team-lead', 'invoices']);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setRowStatusChanging((prev) => { const s = new Set(prev); s.delete(row.id); return s; });
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!previewRow || changingStatus) return;
    setChangingStatus(true);
    try {
      await adminApi.updateInvoiceStatus(previewRow.id, newStatus);
      toast.success(`Invoice status changed to ${newStatus}`);
      setPreviewRow((prev) => ({ ...prev, status: newStatus }));
      queryClient.invalidateQueries(['team-lead', 'invoices']);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      const blob = await invoiceApi.downloadPdf(previewRow.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl || !previewRow) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `invoice-${previewRow.invoiceNumber || previewRow.id}.pdf`;
    a.click();
  };

  const handleDownloadAr = async () => {
    if (!previewRow || downloadingAr) return;
    setDownloadingAr(true);
    try {
      const blob = await invoiceApi.downloadPdf(previewRow.id, 'ar');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${previewRow.invoiceNumber || previewRow.id}-ar.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate Arabic PDF');
    } finally {
      setDownloadingAr(false);
    }
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
    { id: 'invoiceNumber', label: 'Invoice #' },
    { id: 'billToName',    label: 'Client',
      render: (r) => r.billToName || (r.clientId ? `Client #${r.clientId}` : '—') },
    { id: 'issueDate',     label: 'Issue Date', render: (r) => formatDate(r.issueDate) },
    { id: 'dueDate',       label: 'Due Date',   render: (r) => formatDate(r.dueDate) },
    { id: 'total',         label: 'Total',
      render: (r) => formatPrice(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { id: 'status', label: 'Status',
      render: (r) => (
        <Select
          size="small"
          value={r.status}
          disabled={rowStatusChanging.has(r.id)}
          onChange={(e) => { e.stopPropagation(); handleRowStatusChange(r, e.target.value); }}
          renderValue={(val) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {rowStatusChanging.has(r.id) && <CircularProgress size={12} />}
              <Chip size="small" label={val} color={STATUS_COLORS[val] || 'default'} sx={{ pointerEvents: 'none' }} />
            </Box>
          )}
          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, minWidth: 120 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              <Chip size="small" label={s} color={STATUS_COLORS[s] || 'default'} sx={{ cursor: 'pointer' }} />
            </MenuItem>
          ))}
        </Select>
      ) },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Invoices</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Invoice
        </Button>
      </Box>

      <FilterableTable
        queryKey={['team-lead', 'invoices']}
        fetchPage={adminApi.searchInvoices}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          { id: 'status',     label: 'Status',
            options: STATUSES.map((s) => ({ value: s, label: s })) },
          { id: 'clientName', label: 'Client Name', type: 'text' },
          { id: 'itemName',   label: 'Item',        type: 'text' },
          { id: 'dateFrom',   label: 'From',        type: 'date' },
          { id: 'dateTo',     label: 'To',          type: 'date' },
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
              Preview
            </Button>
            <Tooltip title="Edit invoice">
              <IconButton size="small" onClick={() => setEditTarget(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete invoice">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
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
        onCreated={() => queryClient.invalidateQueries(['team-lead', 'invoices'])}
      />

      <CreateInvoiceDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        clients={clients}
        type="invoice"
        initialData={editTarget}
        editId={editTarget?.id}
        onCreated={() => queryClient.invalidateQueries(['team-lead', 'invoices'])}
      />

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
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
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PDF Preview ─────────────────────────────────────────────── */}
      <Dialog
        open={!!previewRow}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '92vh', display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        }}>
          <Typography variant="h6" fontWeight="bold">
            Invoice {previewRow?.invoiceNumber || `#${previewRow?.id}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={previewRow?.status || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={changingStatus}
                startAdornment={changingStatus ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    <Chip size="small" label={s} color={STATUS_COLORS[s] || 'default'} sx={{ cursor: 'pointer' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" size="small" startIcon={<DownloadIcon />}
              onClick={handleDownload} disabled={!previewUrl}>
              Download PDF
            </Button>
            <Button variant="outlined" size="small"
              startIcon={downloadingAr ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={handleDownloadAr} disabled={!previewRow || downloadingAr}>
              AR PDF
            </Button>
            <IconButton onClick={closePreview} size="small"><CloseIcon /></IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, flexGrow: 1, bgcolor: '#525659', overflow: 'hidden' }}>
          {previewUrl ? (
            <iframe src={previewUrl} title="Invoice Preview"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
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
