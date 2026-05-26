/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Button,
  Divider,
  TextField,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../hooks/useCart';
import { shopApi, adminApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function CartDrawer({ open, onClose }) {
  const { t, i18n } = useTranslation('shop');
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [conflicts, setConflicts] = useState(null);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotalQar ?? 0;

  const handleCheckout = async () => {
    setConflicts(null);
    setCheckingOut(true);
    try {
      const resp = await shopApi.checkout();
      // Redirect the browser to Stripe-hosted checkout page.
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
      const payload = {
        status: 'DRAFT',
        billToEmail: user?.email || '',
        billToName: user?.name || '',
        notes: 'Quotation requested from cart',
        items: items.map((item) => ({
          description: (item.nameEn || item.sku || 'Product') + (item.sku ? ` (${item.sku})` : ''),
          quantity: item.quantity,
          unitPrice: Number(item.priceQar) || 0,
          taxRate: 5,
        })),
      };
      const result = await adminApi.requestCartQuotation(payload);
      toast.success(`Quotation ${result.quotationNumber} submitted — our team will review it shortly.`);
      onClose();
    } catch {
      toast.error('Failed to submit quotation request. Please try again.');
    } finally {
      setRequestingQuote(false);
    }
  };

  return (
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
              startIcon={requestingQuote && <CircularProgress size={16} color="inherit" />}
              sx={{ mt: 1 }}
            >
              Request a Quote
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
