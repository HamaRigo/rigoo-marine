/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Skeleton,
  Fade,
  Grow,
  Alert,
  TextField,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import { shopApi, adminApi } from '../../../services/api';
import ProductPhotoCarousel from '../../../components/shop/ProductPhotoCarousel';
import ProductInquiryDialog from '../../../components/shop/ProductInquiryDialog';
import QuotationPreviewDialog from '../../../components/shop/QuotationPreviewDialog';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../hooks/useCart';
import { useToast } from '../../../hooks/useToast';
import { formatPrice } from '../../../utils/format';
import PageSEO, { buildProductSchema, buildBreadcrumbSchema } from '../../../components/common/PageSEO';
import toast from 'react-hot-toast';


function SpecRow({ label, value }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{String(value)}</Typography>
    </Stack>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('shop');
  const isAr = i18n.language === 'ar';
  const { isAuthenticated, user } = useAuth();
  const { addItem } = useCart();
  const { success: toastSuccess, error: toastError } = useToast();

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState('STOCK_CHECK');
  const [qty, setQty] = useState(1);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [quotationPreview, setQuotationPreview] = useState(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['shop', 'product-by-slug', slug],
    queryFn: () => shopApi.getProductBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

  const openInquiry = (type) => {
    setInquiryType(type);
    setInquiryOpen(true);
  };

  const handleRequestQuote = async () => {
    if (!isAuthenticated) {
      navigate(`/login?next=/shop/products/${product?.slug}`);
      return;
    }
    setRequestingQuote(true);
    try {
      const fullUser = user ?? {};

      const name = (i18n.language === 'ar' ? product.nameAr : product.nameEn) || product.nameEn || 'Product';
      const sku = product.sku ? ` [${product.sku}]` : '';
      const hasConflict = product.stockQty != null && qty > product.stockQty;
      const stockNote = hasConflict
        ? ` — in stock: ${product.stockQty}, requested: ${qty}`
        : product.stockQty != null ? ` — in stock: ${product.stockQty}` : '';

      const stockConflicts = hasConflict
        ? [{ description: `${name}${sku}`, requested: qty, available: product.stockQty }]
        : [];

      const noteLines = [`Quotation requested for product: ${name}.`];
      if (hasConflict) {
        noteLines.push('');
        noteLines.push('⚠ Limited stock:');
        noteLines.push(`  • ${name}${sku}: requested ${qty}, available ${product.stockQty}`);
      }

      const payload = {
        status: 'DRAFT',
        clientId: fullUser.id || user?.id || null,
        billToName:    fullUser.name    || user?.name    || '',
        billToEmail:   fullUser.email   || user?.email   || '',
        billToPhone:   fullUser.phone   || user?.phone   || '',
        billToAddress: fullUser.address || user?.address || '',
        billToCompany: fullUser.company || user?.company || '',
        notes: noteLines.join('\n'),
        items: [{
          description: `${name}${sku}${stockNote}`,
          quantity: qty,
          unitPrice: Number(product.priceQar) || 0,
          taxRate: 5,
        }],
      };

      const result = await adminApi.requestCartQuotation(payload);
      setQuotationPreview({ quotation: result, stockConflicts });
    } catch {
      toast.error('Failed to generate quotation. Please try again.');
    } finally {
      setRequestingQuote(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={480} sx={{ borderRadius: 2 }} />
        <Skeleton width="60%" height={48} sx={{ mt: 3 }} />
        <Skeleton width="40%" />
        <Skeleton width="100%" height={120} sx={{ mt: 3 }} />
      </Container>
    );
  }

  if (isError || !product) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{t('inquiry.error')}</Alert>
      </Container>
    );
  }

  const name = (isAr ? product.nameAr : product.nameEn) || product.nameEn || product.nameAr;
  const description = (isAr ? product.descriptionAr : product.descriptionEn) || product.descriptionEn;
  const specs = (isAr ? product.specsAr : product.specsEn) || product.specsEn;

  const stock = product.stockQty ?? 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= 3;
  const stockChip = isOut
    ? { label: t('stock.out'), color: 'default' }
    : isLow
    ? { label: t('stock.low', { count: stock }), color: 'warning' }
    : { label: t('stock.available', { count: stock }), color: 'success' };

  const seoTitle  = `${name} | Rigoo Marine Shop`;
  const seoDesc   = description?.slice(0, 160) || t('productDetail.fallbackDescription', { ns: 'seo' });
  const canonical = `https://rigoomarine.com/shop/products/${slug}`;

  return (
    <Box>
      <PageSEO
        title={seoTitle}
        description={seoDesc}
        ogImage={product.mediaUrls?.[0]}
        ogType="product"
        canonical={canonical}
        jsonLd={[
          buildProductSchema(product, canonical),
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: name },
          ]),
        ]}
      />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Button
          startIcon={<ArrowBackIcon sx={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />}
          onClick={() => navigate('/shop')}
          sx={{ mb: 2 }}
        >
          {t('detail.backToCatalog')}
        </Button>

        <Fade in timeout={500}>
          <Grid container spacing={4}>
            {/* Main column */}
            <Grid size={{ xs: 12, md: 8 }} >
              <ProductPhotoCarousel images={product.mediaUrls || []} />

              <Grow in timeout={500} style={{ transitionDelay: '150ms' }}>
                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    {product.category && (
                      <Chip
                        label={t(`categories.${product.category}`, product.category)}
                        size="small"
                        color="primary"
                      />
                    )}
                    <Chip label={stockChip.label} color={stockChip.color} size="small" />
                    {product.sku && (
                      <Typography variant="body2" color="text.secondary">
                        · {product.sku}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="h4" fontWeight={700} gutterBottom>{name}</Typography>
                  {product.brand && (
                    <Typography variant="body1" color="text.secondary">
                      {product.brand}
                    </Typography>
                  )}

                  {description && (
                    <Typography variant="body1" sx={{ mt: 3, whiteSpace: 'pre-wrap' }}>
                      {description}
                    </Typography>
                  )}
                </Box>
              </Grow>

              {/* Specs */}
              {(specs || product.brand || product.sku) && (
                <Grow in timeout={500} style={{ transitionDelay: '250ms' }}>
                  <Card sx={{ mt: 4 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{t('detail.specs')}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <SpecRow label={t('detail.brand')} value={product.brand} />
                      <SpecRow label={t('detail.sku')} value={product.sku} />
                      <SpecRow
                        label={t('detail.category')}
                        value={product.category ? t(`categories.${product.category}`) : null}
                      />
                      {specs && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{specs}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grow>
              )}
            </Grid>

            {/* Sticky CTA panel */}
            <Grid size={{ xs: 12, md: 4 }} >
              <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                      {t('detail.price')}
                    </Typography>
                    <Typography variant="h4" color="primary.main" fontWeight={700}>
                      {formatPrice(product.priceQar, { currency: product.currency || 'QAR' })}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Live CTAs (Phase 1) */}
                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={requestingQuote}
                      startIcon={requestingQuote
                        ? <CircularProgress size={16} color="inherit" />
                        : <RequestQuoteRoundedIcon />}
                      onClick={handleRequestQuote}
                    >
                      {requestingQuote ? t('cta.generatingQuote', 'Generating…') : t('cta.requestQuote')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => openInquiry('STOCK_CHECK')}
                    >
                      {t('cta.checkStock')}
                    </Button>

                    {/* Add to cart (Phase 2) — login-gated. */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        type="number"
                        size="small"
                        value={qty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v) && v >= 1) setQty(v);
                        }}
                        inputProps={{ min: 1, max: stock || 99 }}
                        disabled={isOut}
                        sx={{ width: 90 }}
                        label={t('detail.quantity')}
                      />
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<ShoppingCartIcon />}
                        disabled={isOut || addItem.isPending}
                        sx={{ flexGrow: 1 }}
                        onClick={async () => {
                          if (!isAuthenticated) {
                            navigate(`/login?next=/shop/products/${product.slug}`);
                            return;
                          }
                          try {
                            await addItem.mutateAsync({ productId: product.id, quantity: qty });
                            toastSuccess(t('cart.added'));
                          } catch (err) {
                            toastError(err?.response?.data?.message || t('cart.addError'));
                          }
                        }}
                      >
                        {t('cta.addToCart')}
                      </Button>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <SpecRow label={t('detail.stock')} value={stockChip.label} />
                    <SpecRow label={t('detail.brand')} value={product.brand} />
                    <SpecRow label={t('detail.sku')} value={product.sku} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      </Container>

      <ProductInquiryDialog
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        productId={product.id}
        defaultType={inquiryType}
      />

      <QuotationPreviewDialog
        open={!!quotationPreview}
        quotation={quotationPreview?.quotation ?? null}
        stockConflicts={quotationPreview?.stockConflicts ?? []}
        onClose={() => setQuotationPreview(null)}
      />
    </Box>
  );
}
