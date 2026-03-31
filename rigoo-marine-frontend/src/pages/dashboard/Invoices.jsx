import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, DialogActions, IconButton, CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { invoiceApi } from '../../services/api';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import toast from 'react-hot-toast';

const statusColors = {
  PAID: 'success',
  PENDING: 'warning',
  DRAFT: 'default',
  CANCELLED: 'error',
};

export default function Invoices() {
  const { user } = useAuth();
  const clientId = user?.id;
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', 'my'],
    queryFn: () => invoiceApi.getMyInvoices(clientId),
    enabled: !!clientId,
  });

  const handleDownloadPdf = async (id) => {
    try {
      const blob = await invoiceApi.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handlePay = async (id) => {
    try {
      const response = await invoiceApi.initiatePayment(id, 'card');
      if (response.paymentUrl) {
        window.open(response.paymentUrl, '_blank');
      }
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
                  <TableCell>{new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${invoice.total?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={statusColors[invoice.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedInvoice(invoice)}
                      startIcon={<DownloadIcon />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Invoice Preview Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        {selectedInvoice && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
              <Typography variant="h6">Invoice {selectedInvoice.invoiceNumber || selectedInvoice.id}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                >
                  Print
                </Button>
                <IconButton onClick={() => setSelectedInvoice(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Bill To:</Typography>
                  <Typography variant="body1">{selectedInvoice.customer?.name || 'Customer'}</Typography>
                  {selectedInvoice.customer?.email && (
                    <Typography variant="body2" color="text.secondary">{selectedInvoice.customer.email}</Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" color="text.secondary">Invoice Details:</Typography>
                  <Typography variant="body1">
                    Issue: {new Date(selectedInvoice.issueDate || selectedInvoice.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1">
                    Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoice.items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">${item.unitPrice?.toFixed(2)}</TableCell>
                            <TableCell align="right">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Box sx={{ width: 200 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2">${selectedInvoice.subtotal?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                    {selectedInvoice.taxRate && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                        <Typography variant="body2">Tax ({selectedInvoice.taxRate}%):</Typography>
                        <Typography variant="body2">${selectedInvoice.taxAmount?.toFixed(2) || '0.00'}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '2px solid #000', fontWeight: 'bold' }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6">${selectedInvoice.total?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadPdf(selectedInvoice.id)}
              >
                Download PDF
              </Button>
              {selectedInvoice.status === 'PENDING' && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handlePay(selectedInvoice.id)}
                  sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                >
                  Pay Now
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
