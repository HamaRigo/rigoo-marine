/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Fade,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { marketplaceApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const STATUS_OPTIONS = ['PENDING_REVIEW', 'DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED'];
const SELLER_TYPES = ['DEALER', 'PRIVATE'];
const CAPTAIN_OPTIONS = ['NEVER', 'OPTIONAL', 'INCLUDED'];

const EMPTY = {
  slug: '',
  status: 'DRAFT',
  companyGainPct: '',
  sellerType: 'DEALER',
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  forSale: false,
  forRent: false,
  salePrice: '',
  dailyRate: '',
  weeklyRate: '',
  minRentalNights: '',
  maxRentalNights: '',
  cleaningFee: '',
  rentalSecurityDeposit: '',
  captainRequired: '',
  captainDailyFee: '',
  currency: 'QAR',
  boatType: '',
  brand: '',
  model: '',
  yearBuilt: '',
  lengthMeters: '',
  beamMeters: '',
  draftMeters: '',
  displacementKg: '',
  hullMaterial: '',
  fuelCapacityLiters: '',
  waterCapacityLiters: '',
  sleepingBerths: '',
  engineMake: '',
  engineModel: '',
  engineHours: '',
  fuelType: '',
  hasGenerator: false,
  hasGps: false,
  hasRadar: false,
  hasAutopilot: false,
  hasAis: false,
  hasAirConditioning: false,
  hasHeating: false,
  hasWatermaker: false,
  hasSolar: false,
  batteryCount: '',
  lastSurveyDate: '',
  lastAntifoulDate: '',
  lastEngineServiceDate: '',
  knownIssuesEn: '',
  knownIssuesAr: '',
  inclusionsEn: '',
  inclusionsAr: '',
  locationText: '',
  locationMarina: '',
  locationCity: '',
  locationCountry: 'Qatar',
  registrationCountry: '',
  ownershipStatus: '',
  lienFree: false,
  specSheetUrl: '',
  financingNotes: '',
  vatStatus: '',
  mediaUrlsText: '',
  videoUrl: '',
  sellerVerified: false,
};

function toPayload(form) {
  const payload = { ...form };
  // Numeric fields — leave empty string as undefined so the backend doesn't try to parse "".
  const numericFields = [
    'salePrice', 'dailyRate', 'weeklyRate', 'minRentalNights', 'maxRentalNights',
    'cleaningFee', 'rentalSecurityDeposit', 'captainDailyFee',
    'yearBuilt', 'lengthMeters', 'beamMeters', 'draftMeters', 'displacementKg',
    'fuelCapacityLiters', 'waterCapacityLiters', 'sleepingBerths',
    'engineHours', 'batteryCount',
  ];
  numericFields.forEach((f) => {
    if (payload[f] === '' || payload[f] == null) payload[f] = undefined;
    else payload[f] = Number(payload[f]);
  });
  // Empty date strings → undefined
  ['lastSurveyDate', 'lastAntifoulDate', 'lastEngineServiceDate'].forEach((f) => {
    if (!payload[f]) payload[f] = undefined;
  });
  // captainRequired empty → undefined
  if (!payload.captainRequired) payload.captainRequired = undefined;
  // companyGainPct
  if (payload.companyGainPct === '' || payload.companyGainPct == null) payload.companyGainPct = undefined;
  else payload.companyGainPct = parseFloat(payload.companyGainPct);

  // mediaUrlsText (newline-separated) → mediaUrls array
  payload.mediaUrls = (payload.mediaUrlsText || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  delete payload.mediaUrlsText;

  return payload;
}

function fromDTO(dto) {
  return {
    ...EMPTY,
    ...dto,
    salePrice: dto.salePrice ?? '',
    dailyRate: dto.dailyRate ?? '',
    weeklyRate: dto.weeklyRate ?? '',
    minRentalNights: dto.minRentalNights ?? '',
    maxRentalNights: dto.maxRentalNights ?? '',
    cleaningFee: dto.cleaningFee ?? '',
    rentalSecurityDeposit: dto.rentalSecurityDeposit ?? '',
    captainDailyFee: dto.captainDailyFee ?? '',
    yearBuilt: dto.yearBuilt ?? '',
    lengthMeters: dto.lengthMeters ?? '',
    beamMeters: dto.beamMeters ?? '',
    draftMeters: dto.draftMeters ?? '',
    displacementKg: dto.displacementKg ?? '',
    fuelCapacityLiters: dto.fuelCapacityLiters ?? '',
    waterCapacityLiters: dto.waterCapacityLiters ?? '',
    sleepingBerths: dto.sleepingBerths ?? '',
    engineHours: dto.engineHours ?? '',
    batteryCount: dto.batteryCount ?? '',
    captainRequired: dto.captainRequired ?? '',
    companyGainPct: dto.companyGainPct ?? '',
    lastSurveyDate: dto.lastSurveyDate ?? '',
    lastAntifoulDate: dto.lastAntifoulDate ?? '',
    lastEngineServiceDate: dto.lastEngineServiceDate ?? '',
    forSale: !!dto.forSale,
    forRent: !!dto.forRent,
    hasGenerator: !!dto.hasGenerator,
    hasGps: !!dto.hasGps,
    hasRadar: !!dto.hasRadar,
    hasAutopilot: !!dto.hasAutopilot,
    hasAis: !!dto.hasAis,
    hasAirConditioning: !!dto.hasAirConditioning,
    hasHeating: !!dto.hasHeating,
    hasWatermaker: !!dto.hasWatermaker,
    hasSolar: !!dto.hasSolar,
    lienFree: !!dto.lienFree,
    sellerVerified: !!dto.sellerVerified,
    mediaUrlsText: (dto.mediaUrls || []).join('\n'),
  };
}

function Section({ title, children }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function BoatListingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useTranslation('marketplace');
  const { success, error } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'boat-listing', id],
    queryFn: () => marketplaceApi.getListingById(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm(fromDTO(existing));
  }, [existing]);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const updateBool = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await marketplaceApi.updateListing(id, payload);
      } else {
        await marketplaceApi.createListing(payload);
      }
      success(t('admin.saved'));
      navigate('/admin/boats');
    } catch (err) {
      error(err?.response?.data?.message || t('admin.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={400}>
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/boats')}>
              {t('admin.back')}
            </Button>
            <Typography variant="h4">
              {isEdit ? t('admin.editListing') : t('admin.newListing')}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
          >
            {t('admin.save')}
          </Button>
        </Stack>

        <Box component="form" onSubmit={handleSubmit}>
          <Section title={t('admin.sections.basic')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField select label={t('admin.fields.status')} value={form.status} onChange={update('status')} fullWidth>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField select label={t('admin.fields.sellerType')} value={form.sellerType} onChange={update('sellerType')} fullWidth>
                  {SELLER_TYPES.map((s) => <MenuItem key={s} value={s}>{t(`admin.sellerType.${s}`)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={12} >
                <TextField label={t('admin.fields.slug')} value={form.slug} onChange={update('slug')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.titleEn')} value={form.titleEn} onChange={update('titleEn')} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.titleAr')} value={form.titleAr} onChange={update('titleAr')} fullWidth dir="rtl" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.descriptionEn')} value={form.descriptionEn} onChange={update('descriptionEn')} fullWidth multiline minRows={4} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.descriptionAr')} value={form.descriptionAr} onChange={update('descriptionAr')} fullWidth multiline minRows={4} dir="rtl" />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.pricing')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }} >
                <FormControlLabel control={<Checkbox checked={form.forSale} onChange={updateBool('forSale')} />} label={t('admin.fields.forSale')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }} >
                <FormControlLabel control={<Checkbox checked={form.forRent} onChange={updateBool('forRent')} />} label={t('admin.fields.forRent')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.salePrice')} type="number" value={form.salePrice} onChange={update('salePrice')} fullWidth disabled={!form.forSale} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.dailyRate')} type="number" value={form.dailyRate} onChange={update('dailyRate')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.weeklyRate')} type="number" value={form.weeklyRate} onChange={update('weeklyRate')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.cleaningFee')} type="number" value={form.cleaningFee} onChange={update('cleaningFee')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.minRentalNights')} type="number" value={form.minRentalNights} onChange={update('minRentalNights')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.maxRentalNights')} type="number" value={form.maxRentalNights} onChange={update('maxRentalNights')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField label={t('admin.fields.rentalSecurityDeposit')} type="number" value={form.rentalSecurityDeposit} onChange={update('rentalSecurityDeposit')} fullWidth disabled={!form.forRent} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField select label={t('admin.fields.captainRequired')} value={form.captainRequired} onChange={update('captainRequired')} fullWidth disabled={!form.forRent}>
                  <MenuItem value="">—</MenuItem>
                  {CAPTAIN_OPTIONS.map((c) => <MenuItem key={c} value={c}>{t(`captainOptions.${c}`)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.captainDailyFee')} type="number" value={form.captainDailyFee} onChange={update('captainDailyFee')} fullWidth disabled={!form.forRent} />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.commission')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField
                  label={t('admin.fields.companyGainPct')}
                  type="number"
                  value={form.companyGainPct}
                  onChange={update('companyGainPct')}
                  fullWidth
                  inputProps={{ min: 0, max: 100, step: 0.5 }}
                  InputProps={{ endAdornment: <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>%</Box> }}
                  helperText={t('admin.companyGainPctHelp')}
                />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.specs')}>
            <Grid container spacing={2}>
              {[
                ['boatType', 'specs.boatType', 'text'],
                ['brand', 'specs.brand', 'text'],
                ['model', 'specs.model', 'text'],
                ['yearBuilt', 'specs.yearBuilt', 'number'],
                ['lengthMeters', 'specs.lengthMeters', 'number'],
                ['beamMeters', 'specs.beamMeters', 'number'],
                ['draftMeters', 'specs.draftMeters', 'number'],
                ['displacementKg', 'specs.displacementKg', 'number'],
                ['hullMaterial', 'specs.hullMaterial', 'text'],
                ['fuelCapacityLiters', 'specs.fuelCapacityLiters', 'number'],
                ['waterCapacityLiters', 'specs.waterCapacityLiters', 'number'],
                ['sleepingBerths', 'specs.sleepingBerths', 'number'],
              ].map(([field, key, type]) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={field} >
                  <TextField label={t(key)} type={type} value={form[field]} onChange={update(field)} fullWidth size="small" />
                </Grid>
              ))}
            </Grid>
          </Section>

          <Section title={t('admin.sections.engine')}>
            <Grid container spacing={2}>
              {[
                ['engineMake', 'specs.engineMake', 'text'],
                ['engineModel', 'specs.engineModel', 'text'],
                ['engineHours', 'specs.engineHours', 'number'],
                ['fuelType', 'specs.fuelType', 'text'],
                ['batteryCount', 'specs.batteryCount', 'number'],
              ].map(([field, key, type]) => (
                <Grid size={{ xs: 6, sm: 4 }} key={field} >
                  <TextField label={t(key)} type={type} value={form[field]} onChange={update(field)} fullWidth size="small" />
                </Grid>
              ))}
            </Grid>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {[
                ['hasGenerator', 'equipment.generator'],
                ['hasGps', 'equipment.gps'],
                ['hasRadar', 'equipment.radar'],
                ['hasAutopilot', 'equipment.autopilot'],
                ['hasAis', 'equipment.ais'],
                ['hasAirConditioning', 'equipment.airConditioning'],
                ['hasHeating', 'equipment.heating'],
                ['hasWatermaker', 'equipment.watermaker'],
                ['hasSolar', 'equipment.solar'],
              ].map(([field, key]) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={field} >
                  <FormControlLabel control={<Checkbox checked={form[field]} onChange={updateBool(field)} />} label={t(key)} />
                </Grid>
              ))}
            </Grid>
          </Section>

          <Section title={t('admin.sections.condition')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField type="date" label={t('detail.lastSurvey')} value={form.lastSurveyDate} onChange={update('lastSurveyDate')} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField type="date" label={t('detail.lastAntifoul')} value={form.lastAntifoulDate} onChange={update('lastAntifoulDate')} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField type="date" label={t('detail.lastEngineService')} value={form.lastEngineServiceDate} onChange={update('lastEngineServiceDate')} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.knownIssuesEn')} value={form.knownIssuesEn} onChange={update('knownIssuesEn')} fullWidth multiline minRows={3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.knownIssuesAr')} value={form.knownIssuesAr} onChange={update('knownIssuesAr')} fullWidth multiline minRows={3} dir="rtl" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.inclusionsEn')} value={form.inclusionsEn} onChange={update('inclusionsEn')} fullWidth multiline minRows={3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('admin.fields.inclusionsAr')} value={form.inclusionsAr} onChange={update('inclusionsAr')} fullWidth multiline minRows={3} dir="rtl" />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.location')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('detail.location')} value={form.locationText} onChange={update('locationText')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label="Marina" value={form.locationMarina} onChange={update('locationMarina')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label="City" value={form.locationCity} onChange={update('locationCity')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label="Country" value={form.locationCountry} onChange={update('locationCountry')} fullWidth />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.documents')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('detail.registrationCountry')} value={form.registrationCountry} onChange={update('registrationCountry')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('detail.ownershipStatus')} value={form.ownershipStatus} onChange={update('ownershipStatus')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField label={t('detail.vatStatus')} value={form.vatStatus} onChange={update('vatStatus')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <FormControlLabel control={<Checkbox checked={form.lienFree} onChange={updateBool('lienFree')} />} label={t('detail.lienFree')} />
              </Grid>
              <Grid size={12} >
                <TextField label={t('admin.fields.specSheetUrl')} value={form.specSheetUrl} onChange={update('specSheetUrl')} fullWidth />
              </Grid>
              <Grid size={12} >
                <TextField label={t('admin.fields.videoUrl')} value={form.videoUrl} onChange={update('videoUrl')} fullWidth />
              </Grid>
              <Grid size={12} >
                <TextField label="Financing notes" value={form.financingNotes} onChange={update('financingNotes')} fullWidth multiline minRows={2} />
              </Grid>
              <Grid size={12} >
                <FormControlLabel control={<Checkbox checked={form.sellerVerified} onChange={updateBool('sellerVerified')} />} label={t('admin.fields.sellerVerified')} />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.media')}>
            <TextField
              label={t('admin.fields.mediaUrls')}
              value={form.mediaUrlsText}
              onChange={update('mediaUrlsText')}
              fullWidth
              multiline
              minRows={4}
              placeholder="https://example.com/image-1.jpg&#10;https://example.com/image-2.jpg"
            />
          </Section>

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 4 }}>
            <Button onClick={() => navigate('/admin/boats')} disabled={saving}>{t('admin.cancel')}</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
              {t('admin.save')}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Fade>
  );
}
