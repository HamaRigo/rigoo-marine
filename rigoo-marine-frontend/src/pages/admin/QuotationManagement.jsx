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
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  ACCEPTED: 'success',
  PENDING: 'warning',
  DRAFT: 'default',
  EXPIRED: 'error',
  REJECTED: 'error',
};

export default function QuotationManagement() {
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: quotations, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-quotations'],
    queryFn: async () => {
      const response = await adminApi.getAllQuotations();
      return response;
    },
  });

  const handleDownloadPdf = async (quotation) => {
    try {
      const blob = await adminApi.downloadQuotationPdf(quotation.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation-${quotation.quotationNumber || quotation.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedQuotation || !newStatus) return;

    try {
      await adminApi.updateQuotationStatus(selectedQuotation.id, newStatus);
      toast.success('Quotation status updated');
      setStatusDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openStatusDialog = (quotation) => {
    setSelectedQuotation(quotation);
    setNewStatus(quotation.status);
    setStatusDialogOpen(true);
  };

  const filteredQuotations = quotations?.filter((quotation) => {
    if (!statusFilter) return true;
    return quotation.status === statusFilter;
  });

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
        Failed to load quotations. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Quotation Management</Typography>
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
                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total: {filteredQuotations?.length || 0} quotations
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!filteredQuotations || filteredQuotations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>No quotations found</Typography>
            <Typography color="text.secondary">
              {statusFilter ? 'Try changing the filter' : 'Quotations will appear here once created'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Quotation #</TableCell>
                <TableCell>Client ID</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell>{quotation.quotationNumber || `#${quotation.id}`}</TableCell>
                  <TableCell>{quotation.clientId}</TableCell>
                  <TableCell>
                    {new Date(quotation.issueDate || quotation.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(quotation.expiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${quotation.total?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    <Chip
                      label={quotation.status}
                      color={statusColors[quotation.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => setSelectedQuotation(quotation)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleDownloadPdf(quotation)}
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

      {/* Quotation Preview Dialog */}
      <Dialog
        open={!!selectedQuotation && !statusDialogOpen}
        onClose={() => setSelectedQuotation(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        {selectedQuotation && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
              <Typography variant="h6">
                Quotation {selectedQuotation.quotationNumber || selectedQuotation.id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadPdf(selectedQuotation)}
                >
                  Download PDF
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={() => openStatusDialog(selectedQuotation)}
                >
                  Update Status
                </Button>
              </Box>
            </Box>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Quotation Details:</Typography>
                  <Typography variant="body1">
                    Quotation #: {selectedQuotation.quotationNumber || `#${selectedQuotation.id}`}
                  </Typography>
                  <Typography variant="body1">
                    Client ID: {selectedQuotation.clientId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Dates:</Typography>
                  <Typography variant="body1">
                    Issue: {new Date(selectedQuotation.issueDate || selectedQuotation.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1">
                    Expiry: {new Date(selectedQuotation.expiryDate).toLocaleDateString()}
                  </Typography>
                  {selectedQuotation.acceptedAt && (
                    <Typography variant="body1">
                      Accepted: {new Date(selectedQuotation.acceptedAt).toLocaleDateString()}
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
                        {selectedQuotation.items?.map((item, index) => (
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
                      <Typography variant="body2">${selectedQuotation.subtotal?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                    {selectedQuotation.taxRate && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                        <Typography variant="body2">Tax ({selectedQuotation.taxRate}%):</Typography>
                        <Typography variant="body2">${selectedQuotation.taxAmount?.toFixed(2) || '0.00'}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '2px solid #000', fontWeight: 'bold' }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6">${selectedQuotation.total?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                  </Box>
                </Grid>
                {selectedQuotation.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notes:</Typography>
                    <Typography variant="body2">{selectedQuotation.notes}</Typography>
                  </Grid>
                )}
                {selectedQuotation.terms && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Terms:</Typography>
                    <Typography variant="body2">{selectedQuotation.terms}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedQuotation(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Update Quotation Status</Typography>
          <TextField
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          >
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="ACCEPTED">Accepted</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
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
