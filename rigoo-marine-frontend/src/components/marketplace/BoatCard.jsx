/* eslint-disable react/prop-types */
import { Box, Card, CardActionArea, CardMedia, Chip, Grow, Stack, Typography } from '@mui/material';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StraightenIcon from '@mui/icons-material/Straighten';
import EventIcon from '@mui/icons-material/Event';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  SOLD: 'default',
  ARCHIVED: 'default',
  DRAFT: 'default',
};

function formatPrice(value, currency = 'QAR') {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function BoatCard({ listing, mode, index = 0 }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('marketplace');
  const isAr = i18n.language === 'ar';

  const title = (isAr ? listing.titleAr : listing.titleEn) || listing.titleEn || listing.titleAr;
  const primaryImage = listing.mediaUrls?.[0];
  const isRent = mode === 'RENT';
  const priceLabel = isRent
    ? formatPrice(listing.dailyRate, listing.currency)
    : formatPrice(listing.salePrice, listing.currency);

  return (
    <Grow in timeout={400} style={{ transitionDelay: `${Math.min(index, 12) * 60}ms` }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(`/boats/${listing.slug}`)}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}
        >
          <Box sx={{ position: 'relative' }}>
            {primaryImage ? (
              <CardMedia
                component="img"
                height="200"
                image={primaryImage}
                alt={title}
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
                <DirectionsBoatIcon sx={{ fontSize: 64 }} />
              </Box>
            )}
            <Chip
              label={t(`status.${listing.status}`, listing.status)}
              color={STATUS_COLORS[listing.status] || 'default'}
              size="small"
              sx={{ position: 'absolute', top: 12, [isAr ? 'left' : 'right']: 12, fontWeight: 600 }}
            />
            {listing.forSale && listing.forRent && (
              <Chip
                label={t('modes.buy') + ' / ' + t('modes.rent')}
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
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} noWrap>
              {[listing.brand, listing.model].filter(Boolean).join(' · ') || '—'}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
              {listing.yearBuilt && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="caption">{listing.yearBuilt}</Typography>
                </Stack>
              )}
              {listing.lengthMeters && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <StraightenIcon fontSize="small" color="action" />
                  <Typography variant="caption">{listing.lengthMeters} m</Typography>
                </Stack>
              )}
              {listing.locationCity && (
                <Typography variant="caption" color="text.secondary">
                  {listing.locationCity}
                </Typography>
              )}
            </Stack>

            <Box sx={{ mt: 'auto' }}>
              {priceLabel ? (
                <Typography variant="h6" color="primary.main" fontWeight={700}>
                  {isRent ? `${t('detail.from')} ${priceLabel}` : priceLabel}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('cta.contact')}
                </Typography>
              )}
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Grow>
  );
}
