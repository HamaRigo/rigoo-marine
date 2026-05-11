/* eslint-disable react/prop-types */
import { Box, Card, CardActionArea, CardMedia, Chip, Grow, Stack, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/format';

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('shop');
  const isAr = i18n.language === 'ar';

  const name = (isAr ? product.nameAr : product.nameEn) || product.nameEn || product.nameAr;
  const primaryImage = product.mediaUrls?.[0];
  const isOut = (product.stockQty ?? 0) <= 0;
  const isLow = !isOut && (product.stockQty ?? 0) <= 3;

  const stockChip = isOut
    ? { label: t('card.outOfStock'), color: 'default' }
    : isLow
    ? { label: t('card.lowStock', { count: product.stockQty }), color: 'warning' }
    : { label: t('card.inStock'), color: 'success' };

  return (
    <Grow in timeout={400} style={{ transitionDelay: `${Math.min(index, 12) * 60}ms` }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          opacity: isOut ? 0.85 : 1,
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(`/shop/products/${product.slug}`)}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}
        >
          <Box sx={{ position: 'relative' }}>
            {primaryImage ? (
              <CardMedia
                component="img"
                height="200"
                image={primaryImage}
                alt={name}
                loading="lazy"
                sx={{ objectFit: 'cover' }}
              />
            ) : (
              <Box
                sx={{
                  height: 200,
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.disabled',
                }}
              >
                {product.category === 'TOOL' ? <BuildIcon sx={{ fontSize: 64 }} /> : <ShoppingBagIcon sx={{ fontSize: 64 }} />}
              </Box>
            )}
            <Chip
              label={stockChip.label}
              color={stockChip.color}
              size="small"
              sx={{ position: 'absolute', top: 12, [isAr ? 'left' : 'right']: 12, fontWeight: 600 }}
            />
            {product.category && (
              <Chip
                label={t(`categories.${product.category}`, product.category)}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  [isAr ? 'right' : 'left']: 12,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                }}
              />
            )}
          </Box>

          <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 0.5, lineHeight: 1.3 }} noWrap>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} noWrap>
              {[product.brand, product.sku].filter(Boolean).join(' · ') || '—'}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {!isOut && !isLow && (
                <Typography variant="caption" color="text.secondary">
                  {t('stock.available', { count: product.stockQty })}
                </Typography>
              )}
            </Stack>

            <Box sx={{ mt: 'auto' }}>
              <Typography variant="h6" color="primary.main" fontWeight={700}>
                {formatPrice(product.priceQar, { currency: product.currency || 'QAR', fallback: null }) ?? t('cta.contact')}
              </Typography>
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Grow>
  );
}
