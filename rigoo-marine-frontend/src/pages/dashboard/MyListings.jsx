/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Stack, Button, Chip, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox,
  FormControlLabel, Grid, CircularProgress, InputAdornment, Alert,
  Skeleton, Divider,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';
import { formatPrice } from '../../utils/format';

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_COLOR = {
  PENDING_REVIEW: 'warning',
  AVAILABLE: 'success',
  DRAFT: 'info',
  ARCHIVED: 'default',
  REJECTED: 'error',
  RESERVED: 'warning',
  SOLD: 'default',
};

const STATUS_ICON = {
  PENDING_REVIEW: HourglassTopRoundedIcon,
  AVAILABLE: CheckCircleRoundedIcon,
  REJECTED: CancelRoundedIcon,
  ARCHIVED: CancelRoundedIcon,
};

function StatusNote({ status, t }) {
  const map = {
    PENDING_REVIEW: t('client.status.pending'),
    AVAILABLE: t('client.status.published'),
    REJECTED: t('client.status.rejected'),
    ARCHIVED: t('client.status.rejected'),
  };
  const note = map[status];
  if (!note) return null;
  const severity = status === 'AVAILABLE' ? 'success' : status === 'PENDING_REVIEW' ? 'warning' : 'error';
  return <Alert severity={severity} sx={{ mt: 1.5, py: 0.5 }}>{note}</Alert>;
}

// ── Submit listing dialog ──────────────────────────────────────────────────

const EMPTY_FORM = {
  titleEn: '', titleAr: '',
  descriptionEn: '', descriptionAr: '',
  forSale: false, forRent: false,
  salePrice: '', dailyRate: '', weeklyRate: '',
  boatType: '', brand: '', model: '', yearBuilt: '',
  lengthMeters: '',
  locationCity: 'Qatar', locationMarina: '',
  mediaUrlsText: '',
};

function SubmitListingDialog({ open, onClose }) {
  const { t } = useTranslation('marketplace');
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        salePrice: form.salePrice !== '' ? Number(form.salePrice) : undefined,
        dailyRate: form.dailyRate !== '' ? Number(form.dailyRate) : undefined,
        weeklyRate: form.weeklyRate !== '' ? Number(form.weeklyRate) : undefined,
        yearBuilt: form.yearBuilt !== '' ? Number(form.yearBuilt) : undefined,
        lengthMeters: form.lengthMeters !== '' ? Number(form.lengthMeters) : undefined,
        mediaUrls: form.mediaUrlsText.split('\n').map(s => s.trim()).filter(Boolean),
        currency: 'QAR',
        sellerType: 'PRIVATE',
      };
      delete payload.mediaUrlsText;
      return marketplaceApi.submitClientListing(payload);
    },
    onSuccess: () => {
      toast.success(t('client.submitDialog.success'));
      qc.invalidateQueries({ queryKey: ['my-listings'] });
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: () => toast.error(t('client.submitDialog.error')),
  });

  const canSubmit = form.titleEn.trim() && (form.forSale || form.forRent) && !mutation.isPending;

  const handleClose = () => { if (!mutation.isPending) { setForm(EMPTY_FORM); onClose(); } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      <Box sx={{
        background: 'linear-gradient(135deg, #0B1A2E 0%, #1a3050 100%)',
        px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2, flexShrink: 0,
          bgcolor: 'rgba(0,188,212,0.18)', border: '1.5px solid rgba(0,188,212,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SellRoundedIcon sx={{ color: '#00bcd4', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="white" lineHeight={1.2}>
            {t('client.submitDialog.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            {t('client.submitDialog.subtitle')}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>

          {/* Mode */}
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              {t('client.submitDialog.sectionMode')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={form.forSale} onChange={setBool('forSale')} color="primary" />}
                label={t('admin.fields.forSale')}
              />
              <FormControlLabel
                control={<Checkbox checked={form.forRent} onChange={setBool('forRent')} color="secondary" />}
                label={t('admin.fields.forRent')}
              />
            </Stack>
            {!form.forSale && !form.forRent && (
              <Typography variant="caption" color="error.main">Select at least one listing type</Typography>
            )}
          </Box>

          <Divider />

          {/* Basic */}
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              {t('client.submitDialog.sectionBasic')}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={t('admin.fields.titleEn')} value={form.titleEn} onChange={set('titleEn')} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={t('admin.fields.titleAr')} value={form.titleAr} onChange={set('titleAr')} fullWidth dir="rtl" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={t('admin.fields.descriptionEn')} value={form.descriptionEn} onChange={set('descriptionEn')} fullWidth multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={t('admin.fields.descriptionAr')} value={form.descriptionAr} onChange={set('descriptionAr')} fullWidth multiline rows={3} dir="rtl" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('specs.boatType')} value={form.boatType} onChange={set('boatType')} fullWidth size="small" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('specs.brand')} value={form.brand} onChange={set('brand')} fullWidth size="small" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('specs.model')} value={form.model} onChange={set('model')} fullWidth size="small" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('specs.yearBuilt')} type="number" value={form.yearBuilt} onChange={set('yearBuilt')} fullWidth size="small"
                  inputProps={{ min: 1950, max: new Date().getFullYear() + 1 }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('specs.lengthMeters')} type="number" value={form.lengthMeters} onChange={set('lengthMeters')} fullWidth size="small"
                  InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label={t('detail.location')} value={form.locationCity} onChange={set('locationCity')} fullWidth size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Marina" value={form.locationMarina} onChange={set('locationMarina')} fullWidth size="small" />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Pricing */}
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              {t('client.submitDialog.sectionPricing')}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {form.forSale && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label={t('admin.fields.salePrice')} type="number" value={form.salePrice} onChange={set('salePrice')} fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start">QAR</InputAdornment> }} />
                </Grid>
              )}
              {form.forRent && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label={t('admin.fields.dailyRate')} type="number" value={form.dailyRate} onChange={set('dailyRate')} fullWidth
                      InputProps={{ startAdornment: <InputAdornment position="start">QAR</InputAdornment> }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label={t('admin.fields.weeklyRate')} type="number" value={form.weeklyRate} onChange={set('weeklyRate')} fullWidth
                      InputProps={{ startAdornment: <InputAdornment position="start">QAR</InputAdornment> }} />
                  </Grid>
                </>
              )}
              {!form.forSale && !form.forRent && (
                <Grid size={12}>
                  <Typography variant="body2" color="text.disabled">Select a listing type above to enter pricing.</Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Media */}
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              {t('client.submitDialog.sectionMedia')}
            </Typography>
            <TextField
              sx={{ mt: 1 }}
              label={t('admin.fields.mediaUrls')}
              value={form.mediaUrlsText}
              onChange={set('mediaUrlsText')}
              fullWidth multiline rows={3}
              placeholder="https://example.com/photo-1.jpg&#10;https://example.com/photo-2.jpg"
              helperText="One URL per line"
            />
          </Box>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" disabled={mutation.isPending}>
          {t('admin.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          startIcon={mutation.isPending ? <CircularProgress size={14} /> : <SellRoundedIcon />}
          sx={{ px: 3 }}
        >
          {mutation.isPending ? t('client.submitDialog.submitting') : t('client.submitDialog.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Listing card ───────────────────────────────────────────────────────────

function ListingCard({ listing }) {
  const { t, i18n } = useTranslation('marketplace');
  const isAr = i18n.language === 'ar';
  const title = (isAr ? listing.titleAr : listing.titleEn) || listing.titleEn || `Listing #${listing.id}`;
  const photo = listing.mediaUrls?.[0] || null;

  const StatusIcon = STATUS_ICON[listing.status];

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 220ms ease, transform 220ms ease',
      '&:hover': { boxShadow: '0 12px 36px rgba(0,0,0,0.10)', transform: 'translateY(-3px)' },
    }}>
      {/* Photo */}
      <Box sx={{
        height: 160, bgcolor: 'action.hover', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {photo ? (
          <Box component="img" src={photo} alt={title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <DirectionsBoatRoundedIcon sx={{ fontSize: 56, color: 'primary.light', opacity: 0.3 }} />
        )}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Chip
            size="small"
            icon={StatusIcon ? <StatusIcon sx={{ fontSize: '14px !important' }} /> : undefined}
            label={t(`status.${listing.status}`, { defaultValue: listing.status })}
            color={STATUS_COLOR[listing.status] || 'default'}
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Box>
        <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
          {listing.forSale && <Chip size="small" label={t('modes.buy')} color="primary" sx={{ fontSize: '0.65rem', height: 20 }} />}
          {listing.forRent && <Chip size="small" label={t('modes.rent')} color="secondary" sx={{ fontSize: '0.65rem', height: 20 }} />}
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap gutterBottom>{title}</Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
          {listing.boatType && (
            <Typography variant="caption" color="text.secondary">{listing.boatType}</Typography>
          )}
          {listing.yearBuilt && (
            <Typography variant="caption" color="text.secondary">{listing.yearBuilt}</Typography>
          )}
        </Stack>

        {listing.salePrice && (
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {formatPrice(listing.salePrice, { maximumFractionDigits: 0 })}
          </Typography>
        )}
        {listing.dailyRate && (
          <Typography variant="body2" fontWeight={600} color="secondary.main">
            {formatPrice(listing.dailyRate, { maximumFractionDigits: 0 })} / day
          </Typography>
        )}

        <StatusNote status={listing.status} t={t} />
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Typography variant="caption" color="text.disabled">
          #{listing.id} · {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : ''}
        </Typography>
      </CardActions>
    </Card>
  );
}

// ── MyListings page ────────────────────────────────────────────────────────

export default function MyListings() {
  const { t } = useTranslation('marketplace');
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: marketplaceApi.getMyListings,
    staleTime: 2 * 60_000,
  });

  const listings = Array.isArray(data) ? data : data?.content ?? [];

  const counts = listings.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{t('client.myListings')}</Typography>
            {listings.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {listings.length} listing{listings.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setSubmitOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            {t('client.submitNew')}
          </Button>
        </Stack>
      </Reveal>

      {/* Summary chips */}
      {!isLoading && listings.length > 0 && (
        <Reveal variant="fade" timeout={400}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(counts).map(([status, count]) => (
              <Chip
                key={status}
                label={`${t(`status.${status}`, { defaultValue: status })} · ${count}`}
                color={STATUS_COLOR[status] || 'default'}
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Reveal>
      )}

      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array(3).fill(0).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : listings.length === 0 ? (
        <Reveal variant="fade">
          <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
                bgcolor: 'rgba(0,105,148,0.07)', border: '2px dashed rgba(0,105,148,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SellRoundedIcon sx={{ fontSize: 32, color: 'primary.light', opacity: 0.6 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
                {t('client.noListings')}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
                {t('client.noListingsHint')}
              </Typography>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSubmitOpen(true)}>
                {t('client.submitNew')}
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Stagger variant="grow" step={60} timeout={480}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: 2.5 }}>
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Stagger>
      )}

      <SubmitListingDialog open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </Box>
  );
}
