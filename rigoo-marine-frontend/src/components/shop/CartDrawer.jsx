/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer, Box, Typography, IconButton, Stack, Button, Divider,
  TextField, Avatar, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../hooks/useCart';
import { shopApi, adminApi, authApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Quotation preview dialog ──────────────────────────────────────────────────

// stockConflicts: [{ description, requested, available }]
function QuotationPreviewDialog({ quotation, open, onClose, stockConflicts = [] }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingAr, setDownloadingAr] = useState(false);

  if (!quotation) return null;

  // Build a lookup so we can flag individual rows
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

// ─── Main cart drawer ──────────────────────────────────────────────────────────

export default function CartDrawer({ open, onClose }) {
  const { t, i18n } = useTranslation('shop');
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [quotationPreview, setQuotationPreview] = useState(null);   // { quotation, stockConflicts }
  const [conflicts, setConflicts] = useState(null);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotalQar ?? 0;

  const handleCheckout = async () => {
    setConflicts(null);
    setCheckingOut(true);
    try {
      const resp = await shopApi.checkout();
      window.location.href = resp.checkoutUrl;
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && Array.isArray(data?.conflicts)) {
        setConflicts(data.conflicts);
      } else if (status === 503) {
        toastError(t('checkout.notConfigured'));
      } else {
        toastError(data?.error || t('checkout.error'));
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRequestQuote = async () => {
    setRequestingQuote(true);
    try {
      // Fetch full profile to get phone, address, company — fields not always in JWT
      // /auth/profile returns { user: ClientDTO }
      const profileResp = await authApi.getProfile().catch(() => null);
      const fullUser = profileResp?.user ?? profileResp ?? user ?? {};

      // Stock conflicts: items where requested qty > available stock
      const stockConflicts = items
        .filter((item) => item.stockQty != null && item.quantity > item.stockQty)
        .map((item) => ({
          description: (isAr ? item.nameAr : item.nameEn) || item.nameEn || item.sku || 'Product',
          requested: item.quantity,
          available: item.stockQty,
        }));

      // Build rich item descriptions: name + SKU + availability note if needed
      const quotationItems = items.map((item) => {
        const name = (isAr ? item.nameAr : item.nameEn) || item.nameEn || 'Product';
        const sku = item.sku ? ` [${item.sku}]` : '';
        const hasConflict = item.stockQty != null && item.quantity > item.stockQty;
        const stockNote = hasConflict
          ? ` — in stock: ${item.stockQty}, requested: ${item.quantity}`
          : item.stockQty != null ? ` — in stock: ${item.stockQty}` : '';
        return {
          description: `${name}${sku}${stockNote}`,
          quantity: item.quantity,
          unitPrice: Number(item.priceQar) || 0,
          taxRate: 5,
        };
      });

      const noteLines = ['Quotation requested from cart.'];
      if (stockConflicts.length > 0) {
        noteLines.push('');
        noteLines.push('⚠ Limited stock items:');
        stockConflicts.forEach((c) =>
          noteLines.push(`  • ${c.description}: requested ${c.requested}, available ${c.available}`)
        );
      }

      const payload = {
        status: 'DRAFT',
        // Link to registered client so admin can look them up
        clientId: fullUser.id || user?.id || null,
        billToName:    fullUser.name    || user?.name    || '',
        billToEmail:   fullUser.email   || user?.email   || '',
        billToPhone:   fullUser.phone   || user?.phone   || '',
        billToAddress: fullUser.address || user?.address || '',
        billToCompany: fullUser.company || user?.company || '',
        notes: noteLines.join('\n'),
        items: quotationItems,
      };

      const result = await adminApi.requestCartQuotation(payload);
      setQuotationPreview({ quotation: result, stockConflicts });
    } catch {
      toast.error('Failed to generate quotation. Please try again.');
    } finally {
      setRequestingQuote(false);
    }
  };

  return (
    <>
      <Drawer
        anchor={isAr ? 'left' : 'right'}
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <ShoppingCartOutlinedIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {t('cart.title')}
              {items.length > 0 && (
                <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                  ({cart?.itemCount ?? 0})
                </Typography>
              )}
            </Typography>
            <IconButton onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Items */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ShoppingCartOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">{t('cart.empty')}</Typography>
                <Button
                  variant="text"
                  onClick={() => { onClose(); navigate('/shop'); }}
                  sx={{ mt: 2 }}
                >
                  {t('cart.browseProducts')}
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {conflicts && (
                  <Alert severity="warning" onClose={() => setConflicts(null)}>
                    <Typography variant="subtitle2">{t('checkout.stockConflict')}</Typography>
                    {conflicts.map((c) => (
                      <Typography key={c.productId} variant="caption" display="block">
                        {c.nameEn}: {t('checkout.requestedAvailable', { requested: c.requested, available: c.available })}
                      </Typography>
                    ))}
                  </Alert>
                )}

                {items.map((item) => {
                  const name = (isAr ? item.nameAr : item.nameEn) || item.nameEn;
                  const lineTotal = Number(item.priceQar) * item.quantity;
                  const overStock = item.stockQty != null && item.quantity > item.stockQty;
                  return (
                    <Box key={item.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Avatar
                        variant="rounded"
                        src={item.imageUrl}
                        alt={name}
                        sx={{ width: 64, height: 64, bgcolor: 'grey.100' }}
                      >
                        <ShoppingCartOutlinedIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.sku}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => {
                              const q = parseInt(e.target.value, 10);
                              if (!Number.isNaN(q) && q >= 1) {
                                updateItem.mutate({ itemId: item.id, quantity: q });
                              }
                            }}
                            inputProps={{ min: 1, max: item.stockQty || 99, style: { width: 56 } }}
                            sx={{ width: 80 }}
                          />
                          <Typography variant="caption" color={overStock ? 'error' : 'text.secondary'}>
                            {item.stockQty != null && t('cart.stockLeft', { count: item.stockQty })}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box sx={{ textAlign: isAr ? 'left' : 'right', minWidth: 80 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {formatPrice(lineTotal)}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItem.mutate(item.id)}
                          aria-label="remove"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Footer */}
          {items.length > 0 && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">{t('cart.subtotal')}</Typography>
                <Typography variant="h6">{formatPrice(subtotal)}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {t('cart.taxNote')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={checkingOut}
                onClick={handleCheckout}
                startIcon={checkingOut && <CircularProgress size={16} color="inherit" />}
              >
                {t('cta.checkout')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                disabled={requestingQuote}
                onClick={handleRequestQuote}
                startIcon={requestingQuote
                  ? <CircularProgress size={16} color="inherit" />
                  : <RequestQuoteRoundedIcon />}
                sx={{ mt: 1 }}
              >
                {requestingQuote ? 'Generating…' : 'Request a Quote'}
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      <QuotationPreviewDialog
        open={!!quotationPreview}
        quotation={quotationPreview?.quotation ?? null}
        stockConflicts={quotationPreview?.stockConflicts ?? []}
        onClose={() => setQuotationPreview(null)}
      />
    </>
  );
}
