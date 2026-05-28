/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Stack, Divider, Chip, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, Paper,
  Alert, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function QuotationPreviewDialog({ quotation, open, onClose, stockConflicts = [] }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingAr, setDownloadingAr] = useState(false);

  if (!quotation) return null;

  const conflictMap = Object.fromEntries(
    stockConflicts.map((c) => [c.description, c])
  );

  const handleDownload = async (lang = 'en') => {
    const setLoading = lang === 'ar' ? setDownloadingAr : setDownloading;
    setLoading(true);
    try {
      const blob = await adminApi.downloadQuotationPdf(quotation.id, lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${quotation.quotationNumber}${lang === 'ar' ? '-ar' : ''}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  const items = quotation.items ?? [];
  const subtotal = Number(quotation.subtotal ?? 0);
  const taxAmount = Number(quotation.taxAmount ?? 0);
  const total = Number(quotation.total ?? 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#f5f5f5' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: 'white', borderBottom: '2px solid', borderColor: 'primary.main',
      }}>
        <RequestQuoteRoundedIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="bold">Quotation Preview</Typography>
          <Typography variant="caption" color="text.secondary">
            {quotation.quotationNumber}
          </Typography>
        </Box>
        <Chip label="DRAFT" size="small" color="warning" />
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {stockConflicts.length > 0 && (
          <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Some items have insufficient stock
            </Typography>
            {stockConflicts.map((c) => (
              <Typography key={c.description} variant="caption" display="block">
                <strong>{c.description}</strong>: requested {c.requested}, only {c.available} in stock
              </Typography>
            ))}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              The quotation has been created. Our team will contact you to confirm final quantities.
            </Typography>
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4, bgcolor: 'white', borderRadius: 2 }}>
          {/* Header: logo + title */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Box
                component="img"
                src={quotation.logoUrl || quotation.company?.logo || '/brand/logo.PNG'}
                alt="Rigoo Marine"
                sx={{ height: 48, width: 'auto', objectFit: 'contain', mb: 1 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <Typography variant="body2" fontWeight="bold">
                {quotation.company?.name || 'Rigoo Marine LLC'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quotation.company?.address || 'Doha, Qatar'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4" fontWeight="bold" color="primary.dark" gutterBottom>
                QUOTATION
              </Typography>
              <Typography variant="body2" color="text.secondary">
                # {quotation.quotationNumber}
              </Typography>
              {quotation.issueDate && (
                <Typography variant="body2" color="text.secondary">
                  Date: {new Date(quotation.issueDate).toLocaleDateString()}
                </Typography>
              )}
              {quotation.expiryDate && (
                <Typography variant="body2" color="text.secondary">
                  Valid until: {new Date(quotation.expiryDate).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Bill To */}
          {(quotation.billToName || quotation.customer?.name) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.secondary" fontWeight="bold">
                PREPARED FOR
              </Typography>
              <Box sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, display: 'inline-block', minWidth: 200 }}>
                <Typography variant="body2" fontWeight="bold">
                  {quotation.billToName || quotation.customer?.name}
                </Typography>
                {(quotation.billToEmail || quotation.customer?.email) && (
                  <Typography variant="body2" color="text.secondary">
                    {quotation.billToEmail || quotation.customer?.email}
                  </Typography>
                )}
                {(quotation.billToPhone || quotation.customer?.phone) && (
                  <Typography variant="body2" color="text.secondary">
                    {quotation.billToPhone || quotation.customer?.phone}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Items table */}
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><Typography variant="caption" fontWeight="bold">DESCRIPTION</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption" fontWeight="bold">QTY</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight="bold">UNIT PRICE</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight="bold">TAX %</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight="bold">AMOUNT</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, i) => {
                const conflict = conflictMap[item.description];
                return (
                  <TableRow key={item.id ?? i} sx={{
                    bgcolor: conflict ? 'warning.50' : undefined,
                    '&:nth-of-type(even)': { bgcolor: conflict ? 'warning.50' : 'grey.50' },
                  }}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {conflict && (
                          <Tooltip title={`Only ${conflict.available} in stock`}>
                            <WarningAmberRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2">{item.description}</Typography>
                      </Stack>
                      {conflict && (
                        <Typography variant="caption" color="warning.dark">
                          Available: {conflict.available} — requested: {conflict.requested}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color={conflict ? 'warning.dark' : 'inherit'} fontWeight={conflict ? 700 : 400}>
                        {item.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">QAR {fmt(item.unitPrice)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{fmt(item.taxRate)}%</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        QAR {fmt(item.amount ?? (Number(item.unitPrice) * item.quantity))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Totals */}
          <Stack alignItems="flex-end" mb={3}>
            <Box sx={{ minWidth: 260 }}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">QAR {fmt(subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" color="text.secondary">Tax</Typography>
                <Typography variant="body2">QAR {fmt(taxAmount)}</Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight="bold">TOTAL</Typography>
                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                  QAR {fmt(total)}
                </Typography>
              </Stack>
            </Box>
          </Stack>

          {/* Notes / terms */}
          {quotation.notes && (
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">
                NOTES
              </Typography>
              <Typography variant="body2">{quotation.notes}</Typography>
            </Box>
          )}
          {quotation.terms && (
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">
                TERMS &amp; CONDITIONS
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{quotation.terms}</Typography>
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          Our team will review and confirm this quotation shortly.
        </Typography>
        <Button
          variant="outlined"
          startIcon={downloadingAr ? <CircularProgress size={14} /> : <DownloadIcon />}
          disabled={downloadingAr || downloading}
          onClick={() => handleDownload('ar')}
          size="small"
        >
          AR PDF
        </Button>
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
          disabled={downloading || downloadingAr}
          onClick={() => handleDownload('en')}
        >
          Download PDF
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
