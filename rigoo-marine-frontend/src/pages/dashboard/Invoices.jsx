import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, DialogActions, IconButton, CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { invoiceApi } from '../../services/api';
import { formatPrice, formatDate } from '../../utils/format';

const STATUS_COLORS = {
  PAID: 'success', PENDING: 'warning', DRAFT: 'default', CANCELLED: 'error',
};

export default function Invoices() {
  const { user } = useAuth();
  const clientId = user?.id;

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', 'my'],
    queryFn: () => invoiceApi.getMyInvoices(clientId),
    enabled: !!clientId,
  });

  const openPreview = async (invoice) => {
    setLoadingId(invoice.id);
    try {
      const blob = await invoiceApi.downloadPdf(invoice.id);
      const url = URL.createObjectURL(blob);
      setPreviewInvoice(invoice);
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load PDF preview');
    } finally {
      setLoadingId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewInvoice(null);
    setPreviewUrl(null);
  };

  const handleDownload = () => {
    if (!previewUrl || !previewInvoice) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `invoice-${previewInvoice.invoiceNumber || previewInvoice.id}.pdf`;
    a.click();
  };

  const handlePay = async (id) => {
    try {
      const response = await invoiceApi.initiatePayment(id, 'card');
      if (response.paymentUrl) window.open(response.paymentUrl, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load invoices</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Invoices</Typography>

      {!invoices || invoices.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>No invoices</Typography>
            <Typography color="text.secondary">
              Invoices will appear here once you have completed orders
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber || `#${invoice.id}`}</TableCell>
                  <TableCell>Order #{invoice.workOrderId}</TableCell>
                  <TableCell>{formatDate(invoice.issueDate || invoice.createdAt)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    {formatPrice(invoice.total ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip label={invoice.status} color={STATUS_COLORS[invoice.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={loadingId === invoice.id ? <CircularProgress size={14} /> : <VisibilityIcon />}
                      disabled={loadingId === invoice.id}
                      onClick={() => openPreview(invoice)}
                    >
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── PDF Preview Dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!previewInvoice}
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
            Invoice {previewInvoice?.invoiceNumber || `#${previewInvoice?.id}`}
          </Typography>
          <IconButton onClick={closePreview} size="small">
            <CloseIcon />
          </IconButton>
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

        {/* Action bar */}
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Button onClick={closePreview}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!previewUrl}
          >
            Download PDF
          </Button>
          {previewInvoice?.status === 'PENDING' && (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handlePay(previewInvoice.id)}
            >
              Pay Now
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
