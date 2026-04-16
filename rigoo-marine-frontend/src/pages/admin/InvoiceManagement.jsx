import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import DescriptionIcon from '@mui/icons-material/Description';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { adminApi, invoiceApi } from '../../services/api';
import toast from 'react-hot-toast';

const invoiceStatusColors = {
  PAID: 'success',
  PENDING: 'warning',
  DRAFT: 'default',
  OVERDUE: 'error',
  CANCELLED: 'error',
};

const quotationStatusColors = {
  ACCEPTED: 'success',
  PENDING: 'warning',
  DRAFT: 'default',
  EXPIRED: 'error',
  REJECTED: 'error',
};

export default function InvoiceManagement() {
  const [documentType, setDocumentType] = useState('invoice'); // 'invoice' or 'quotation'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: invoices, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const response = await adminApi.getAllInvoices();
      return response;
    },
  });

  const { data: quotations, isLoading: quotationsLoading, error: quotationsError, refetch: refetchQuotations } = useQuery({
    queryKey: ['admin-quotations'],
    queryFn: async () => {
      const response = await adminApi.getAllQuotations();
      return response;
    },
  });

  const handleDownloadPdf = async (document) => {
    try {
      const blob = documentType === 'invoice'
        ? await invoiceApi.downloadPdf(document.id)
        : await adminApi.downloadQuotationPdf(document.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentType}-${document.documentNumber || document.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedDocument || !newStatus) return;

    try {
      if (documentType === 'invoice') {
        await adminApi.updateInvoiceStatus(selectedDocument.id, newStatus);
        toast.success('Invoice status updated');
      } else {
        await adminApi.updateQuotationStatus(selectedDocument.id, newStatus);
        toast.success('Quotation status updated');
      }
      setStatusDialogOpen(false);
      documentType === 'invoice' ? refetchInvoices() : refetchQuotations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openStatusDialog = (document) => {
    setSelectedDocument(document);
    setNewStatus(document.status);
    setStatusDialogOpen(true);
  };

  const currentData = documentType === 'invoice' ? invoices : quotations;
  const filteredDocuments = currentData?.filter((doc) => {
    if (!statusFilter) return true;
    return doc.status === statusFilter;
  });

  const isLoading = documentType === 'invoice' ? invoicesLoading : quotationsLoading;
  const error = documentType === 'invoice' ? invoicesError : quotationsError;
  const refetch = documentType === 'invoice' ? refetchInvoices : refetchQuotations;
  const statusColors = documentType === 'invoice' ? invoiceStatusColors : quotationStatusColors;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load {documentType}s. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">
            {documentType === 'invoice' ? 'Invoice' : 'Quotation'} Management
          </Typography>
          <ToggleButtonGroup
            value={documentType}
            exclusive
            onChange={(event, newType) => {
              if (newType) setDocumentType(newType);
              setStatusFilter('');
            }}
            aria-label="document type"
            size="medium"
          >
            <ToggleButton value="invoice" aria-label="invoice">
              <DescriptionIcon sx={{ mr: 1, fontSize: 'small' }} />
              Invoice
            </ToggleButton>
            <ToggleButton value="quotation" aria-label="quotation">
              <RequestQuoteIcon sx={{ mr: 1, fontSize: 'small' }} />
              Quotation
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                {documentType === 'invoice' ? (
                  <>
                    <MenuItem value="PAID">Paid</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="OVERDUE">Overdue</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="ACCEPTED">Accepted</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total: {filteredDocuments?.length || 0} {documentType === 'invoice' ? 'invoices' : 'quotations'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!filteredDocuments || filteredDocuments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>No {documentType === 'invoice' ? 'invoices' : 'quotations'} found</Typography>
            <Typography color="text.secondary">
              {statusFilter ? 'Try changing the filter' : documentType === 'invoice' ? 'Invoices will appear here once created' : 'Quotations will appear here once created'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{documentType === 'invoice' ? 'Invoice' : 'Quotation'} #</TableCell>
                {documentType === 'invoice' && <TableCell>Work Order #</TableCell>}
                <TableCell>Client ID</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>{documentType === 'invoice' ? 'Due Date' : 'Expiry Date'}</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.documentNumber || doc.invoiceNumber || `#${doc.id}`}</TableCell>
                  {documentType === 'invoice' && <TableCell>#{doc.workOrderId}</TableCell>}
                  <TableCell>{doc.clientId}</TableCell>
                  <TableCell>
                    {new Date(doc.issueDate || doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(documentType === 'invoice' ? doc.dueDate : doc.expiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${doc.total?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    <Chip
                      label={doc.status}
                      color={statusColors[doc.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => setSelectedDocument(doc)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleDownloadPdf(doc)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Document Preview Dialog (Invoice/Quotation) */}
      <Dialog
        open={!!selectedDocument && !statusDialogOpen}
        onClose={() => setSelectedDocument(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        {selectedDocument && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
              <Typography variant="h6">
                {documentType === 'invoice' ? 'Invoice' : 'Quotation'} {selectedDocument.documentNumber || selectedDocument.invoiceNumber || selectedDocument.id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadPdf(selectedDocument)}
                >
                  Download PDF
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={() => openStatusDialog(selectedDocument)}
                >
                  Update Status
                </Button>
              </Box>
            </Box>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">{documentType === 'invoice' ? 'Invoice' : 'Quotation'} Details:</Typography>
                  <Typography variant="body1">
                    {documentType === 'invoice' ? 'Invoice' : 'Quotation'} #: {selectedDocument.documentNumber || selectedDocument.invoiceNumber || `#${selectedDocument.id}`}
                  </Typography>
                  {documentType === 'invoice' && (
                    <Typography variant="body1">
                      Work Order: #{selectedDocument.workOrderId}
                    </Typography>
                  )}
                  <Typography variant="body1">
                    Client ID: {selectedDocument.clientId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Dates:</Typography>
                  <Typography variant="body1">
                    Issue: {new Date(selectedDocument.issueDate || selectedDocument.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1">
                    {documentType === 'invoice' ? 'Due' : 'Expiry'}: {new Date(documentType === 'invoice' ? selectedDocument.dueDate : selectedDocument.expiryDate).toLocaleDateString()}
                  </Typography>
                  {documentType === 'invoice' && selectedDocument.paidAt && (
                    <Typography variant="body1">
                      Paid: {new Date(selectedDocument.paidAt).toLocaleDateString()}
                    </Typography>
                  )}
                  {documentType === 'quotation' && selectedDocument.acceptedAt && (
                    <Typography variant="body1">
                      Accepted: {new Date(selectedDocument.acceptedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Items:</Typography>
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
                        {selectedDocument.items?.map((item, index) => (
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
                  <Box sx={{ width: 250 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2">${selectedDocument.subtotal?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                    {selectedDocument.taxRate && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                        <Typography variant="body2">Tax ({selectedDocument.taxRate}%):</Typography>
                        <Typography variant="body2">${selectedDocument.taxAmount?.toFixed(2) || '0.00'}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '2px solid #000', fontWeight: 'bold' }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6">${selectedDocument.total?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                  </Box>
                </Grid>
                {selectedDocument.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notes:</Typography>
                    <Typography variant="body2">{selectedDocument.notes}</Typography>
                  </Grid>
                )}
                {selectedDocument.terms && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Terms:</Typography>
                    <Typography variant="body2">{selectedDocument.terms}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedDocument(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Update {documentType === 'invoice' ? 'Invoice' : 'Quotation'} Status
          </Typography>
          <TextField
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          >
            {documentType === 'invoice' ? (
              <>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </>
            ) : (
              <>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
              </>
            )}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={!newStatus}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
