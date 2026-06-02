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
  Tooltip,
  Stack,
  Divider,
  Skeleton,
  Fade,
  Grow,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { marketplaceApi } from '../../../services/api';
import BoatPhotoCarousel from '../../../components/marketplace/BoatPhotoCarousel';
import InquiryDialog from '../../../components/marketplace/InquiryDialog';
import { formatPrice } from '../../../utils/format';
import PageSEO, { buildBoatSchema, buildBreadcrumbSchema } from '../../../components/common/PageSEO';

const STATUS_COLORS = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  SOLD: 'default',
  ARCHIVED: 'default',
  DRAFT: 'default',
};


function SpecRow({ label, value }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{String(value)}</Typography>
    </Stack>
  );
}

function EquipmentChip({ label, on }) {
  return (
    <Chip
      icon={on ? <CheckCircleIcon /> : <CancelIcon />}
      label={label}
      color={on ? 'success' : 'default'}
      variant={on ? 'filled' : 'outlined'}
      size="small"
      sx={{ opacity: on ? 1 : 0.6 }}
    />
  );
}

export default function BoatDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('marketplace');
  const isAr = i18n.language === 'ar';

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState('GENERAL');

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'listing-by-slug', slug],
    queryFn: () => marketplaceApi.getListingBySlug(slug),
    enabled: !!slug,
  });

  const openInquiry = (type) => {
    setInquiryType(type);
    setInquiryOpen(true);
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

  if (isError || !listing) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{t('inquiry.error')}</Alert>
      </Container>
    );
  }

  const title = (isAr ? listing.titleAr : listing.titleEn) || listing.titleEn || listing.titleAr;
  const description = (isAr ? listing.descriptionAr : listing.descriptionEn) || listing.descriptionEn;
  const knownIssues = (isAr ? listing.knownIssuesAr : listing.knownIssuesEn) || listing.knownIssuesEn;
  const inclusions = (isAr ? listing.inclusionsAr : listing.inclusionsEn) || listing.inclusionsEn;

  const seoTitle  = `${title} | Rigoo Marine`;
  const seoDesc   = description?.slice(0, 160) || t('boatDetail.fallbackDescription', { ns: 'seo' });
  const canonical = `https://rigoomarine.com/boats/${slug}`;

  return (
    <Box>
      <PageSEO
        title={seoTitle}
        description={seoDesc}
        ogImage={listing.mediaUrls?.[0]}
        ogType="product"
        canonical={canonical}
        jsonLd={[
          buildBoatSchema(listing, canonical),
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Boats', url: '/boats' },
            { name: title },
          ]),
        ]}
      />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Button
          startIcon={<ArrowBackIcon sx={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />}
          onClick={() => navigate('/boats')}
          sx={{ mb: 2 }}
        >
          {t('detail.backToGallery')}
        </Button>

        <Fade in timeout={500}>
          <Grid container spacing={4}>
            {/* Main column */}
            <Grid size={{ xs: 12, md: 8 }} >
              <BoatPhotoCarousel images={listing.mediaUrls || []} />

              <Grow in timeout={500} style={{ transitionDelay: '150ms' }}>
                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip
                      label={t(`status.${listing.status}`, listing.status)}
                      color={STATUS_COLORS[listing.status] || 'default'}
                      size="small"
                    />
                    {listing.sellerVerified && (
                      <Chip icon={<VerifiedIcon />} label={t('detail.verifiedSeller')} color="primary" size="small" />
                    )}
                    {listing.locationCity && (
                      <Typography variant="body2" color="text.secondary">
                        · {[listing.locationMarina, listing.locationCity].filter(Boolean).join(', ')}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>{title}</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {[listing.brand, listing.model, listing.yearBuilt].filter(Boolean).join(' · ')}
                  </Typography>

                  {description && (
                    <Typography variant="body1" sx={{ mt: 3, whiteSpace: 'pre-wrap' }}>
                      {description}
                    </Typography>
                  )}
                </Box>
              </Grow>

              {/* Specs */}
              <Grow in timeout={500} style={{ transitionDelay: '250ms' }}>
                <Card sx={{ mt: 4 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{t('detail.specs')}</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }} >
                        <SpecRow label={t('specs.boatType')} value={listing.boatType} />
                        <SpecRow label={t('specs.brand')} value={listing.brand} />
                        <SpecRow label={t('specs.model')} value={listing.model} />
                        <SpecRow label={t('specs.yearBuilt')} value={listing.yearBuilt} />
                        <SpecRow label={t('specs.lengthMeters')} value={listing.lengthMeters && `${listing.lengthMeters} m`} />
                        <SpecRow label={t('specs.beamMeters')} value={listing.beamMeters && `${listing.beamMeters} m`} />
                        <SpecRow label={t('specs.draftMeters')} value={listing.draftMeters && `${listing.draftMeters} m`} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }} >
                        <SpecRow label={t('specs.displacementKg')} value={listing.displacementKg && `${listing.displacementKg} kg`} />
                        <SpecRow label={t('specs.hullMaterial')} value={listing.hullMaterial} />
                        <SpecRow label={t('specs.fuelCapacityLiters')} value={listing.fuelCapacityLiters && `${listing.fuelCapacityLiters} L`} />
                        <SpecRow label={t('specs.waterCapacityLiters')} value={listing.waterCapacityLiters && `${listing.waterCapacityLiters} L`} />
                        <SpecRow label={t('specs.sleepingBerths')} value={listing.sleepingBerths} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grow>

              {/* Engine & systems */}
              <Grow in timeout={500} style={{ transitionDelay: '350ms' }}>
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{t('detail.engineSystems')}</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }} >
                        <SpecRow label={t('specs.engineMake')} value={listing.engineMake} />
                        <SpecRow label={t('specs.engineModel')} value={listing.engineModel} />
                        <SpecRow label={t('specs.engineHours')} value={listing.engineHours} />
                        <SpecRow label={t('specs.fuelType')} value={listing.fuelType} />
                        <SpecRow label={t('specs.batteryCount')} value={listing.batteryCount} />
                      </Grid>
                    </Grid>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{t('equipment.title')}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <EquipmentChip label={t('equipment.generator')} on={!!listing.hasGenerator} />
                      <EquipmentChip label={t('equipment.gps')} on={!!listing.hasGps} />
                      <EquipmentChip label={t('equipment.radar')} on={!!listing.hasRadar} />
                      <EquipmentChip label={t('equipment.autopilot')} on={!!listing.hasAutopilot} />
                      <EquipmentChip label={t('equipment.ais')} on={!!listing.hasAis} />
                      <EquipmentChip label={t('equipment.airConditioning')} on={!!listing.hasAirConditioning} />
                      <EquipmentChip label={t('equipment.heating')} on={!!listing.hasHeating} />
                      <EquipmentChip label={t('equipment.watermaker')} on={!!listing.hasWatermaker} />
                      <EquipmentChip label={t('equipment.solar')} on={!!listing.hasSolar} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grow>

              {/* Condition */}
              {(listing.lastSurveyDate || listing.lastAntifoulDate || listing.lastEngineServiceDate || knownIssues || inclusions) && (
                <Grow in timeout={500} style={{ transitionDelay: '450ms' }}>
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{t('detail.condition')}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <SpecRow label={t('detail.lastSurvey')} value={listing.lastSurveyDate} />
                      <SpecRow label={t('detail.lastAntifoul')} value={listing.lastAntifoulDate} />
                      <SpecRow label={t('detail.lastEngineService')} value={listing.lastEngineServiceDate} />
                      {inclusions && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>{t('detail.inclusions')}</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{inclusions}</Typography>
                        </Box>
                      )}
                      {knownIssues && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>{t('detail.knownIssues')}</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{knownIssues}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grow>
              )}

              {/* Documents */}
              {(listing.registrationCountry || listing.ownershipStatus || listing.vatStatus || listing.lienFree != null || listing.specSheetUrl || listing.videoUrl || listing.financingNotes) && (
                <Grow in timeout={500} style={{ transitionDelay: '550ms' }}>
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{t('detail.documents')}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <SpecRow label={t('detail.registrationCountry')} value={listing.registrationCountry} />
                      <SpecRow label={t('detail.ownershipStatus')} value={listing.ownershipStatus} />
                      <SpecRow label={t('detail.vatStatus')} value={listing.vatStatus} />
                      {listing.lienFree != null && (
                        <SpecRow label={t('detail.lienFree')} value={listing.lienFree ? t('yes') : t('no')} />
                      )}
                      {listing.specSheetUrl && (
                        <Box sx={{ mt: 1 }}>
                          <MuiLink href={listing.specSheetUrl} target="_blank" rel="noreferrer">{t('detail.specSheet')}</MuiLink>
                        </Box>
                      )}
                      {listing.videoUrl && (
                        <Box sx={{ mt: 1 }}>
                          <MuiLink href={listing.videoUrl} target="_blank" rel="noreferrer">{t('detail.video')}</MuiLink>
                        </Box>
                      )}
                      {listing.financingNotes && (
                        <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{listing.financingNotes}</Typography>
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
                  {listing.forSale && listing.salePrice != null && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" textTransform="uppercase">{t('detail.askingPrice')}</Typography>
                      <Typography variant="h4" color="primary.main" fontWeight={700}>
                        {formatPrice(listing.salePrice, { currency: listing.currency || 'QAR' })}
                      </Typography>
                    </Box>
                  )}

                  {listing.forRent && listing.dailyRate != null && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" textTransform="uppercase">{t('detail.dailyRate')}</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700}>
                        {t('detail.from')} {formatPrice(listing.dailyRate, { currency: listing.currency || 'QAR' })}
                      </Typography>
                      {listing.weeklyRate != null && (
                        <Typography variant="body2" color="text.secondary">
                          {formatPrice(listing.weeklyRate, { currency: listing.currency || 'QAR' })} / {t('detail.weeklyRate').toLowerCase()}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Live CTAs (Phase 1) */}
                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={() => openInquiry(listing.forSale ? 'BUY' : listing.forRent ? 'RENT' : 'GENERAL')}
                    >
                      {t('cta.contact')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => openInquiry('INSPECTION')}
                    >
                      {t('cta.requestInspection')}
                    </Button>

                    {/* Phase 2/3 CTAs — anchored but disabled */}
                    {listing.forSale && (
                      <>
                        <Tooltip title={t('cta.comingSoon')} placement="top">
                          <span>
                            <Button variant="outlined" size="large" fullWidth disabled>
                              {t('cta.reserve')}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('cta.comingSoon')} placement="top">
                          <span>
                            <Button variant="outlined" size="large" fullWidth disabled>
                              {t('cta.makeOffer')}
                            </Button>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    {listing.forRent && (
                      <Tooltip title={t('cta.comingSoon')} placement="top">
                        <span>
                          <Button variant="outlined" size="large" fullWidth disabled>
                            {t('cta.book')}
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>

                  {/* Rental quick facts */}
                  {listing.forRent && (
                    <Box sx={{ mt: 3 }}>
                      <Divider sx={{ mb: 1.5 }} />
                      <SpecRow label={t('detail.minNights')} value={listing.minRentalNights} />
                      <SpecRow label={t('detail.maxNights')} value={listing.maxRentalNights} />
                      <SpecRow label={t('detail.cleaningFee')} value={formatPrice(listing.cleaningFee, { currency: listing.currency || 'QAR' })} />
                      <SpecRow label={t('detail.rentalDeposit')} value={formatPrice(listing.rentalSecurityDeposit, { currency: listing.currency || 'QAR' })} />
                      <SpecRow
                        label={t('detail.captain')}
                        value={listing.captainRequired ? t(`captainOptions.${listing.captainRequired}`) : null}
                      />
                      <SpecRow label={t('detail.captainFee')} value={formatPrice(listing.captainDailyFee, { currency: listing.currency || 'QAR' })} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      </Container>

      <InquiryDialog
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        listingId={listing.id}
        defaultType={inquiryType}
      />
    </Box>
  );
}
