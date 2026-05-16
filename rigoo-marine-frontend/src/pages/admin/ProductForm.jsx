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
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Fade,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { shopApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const CATEGORY_OPTIONS = ['PART', 'TOOL'];

const EMPTY = {
  slug: '',
  sku: '',
  status: 'DRAFT',
  category: 'PART',
  brand: '',
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  specsEn: '',
  specsAr: '',
  priceQar: '',
  currency: 'QAR',
  stockQty: '',
  mediaUrlsText: '',
};

function toPayload(form) {
  const payload = { ...form };
  ['priceQar', 'stockQty'].forEach((f) => {
    if (payload[f] === '' || payload[f] == null) payload[f] = undefined;
    else payload[f] = Number(payload[f]);
  });
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
    priceQar: dto.priceQar ?? '',
    stockQty: dto.stockQty ?? '',
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

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useTranslation('shop');
  const { success, error } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'shop-product', id],
    queryFn: () => shopApi.getProductById(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) setForm(fromDTO(existing));
  }, [existing]);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await shopApi.updateProduct(id, payload);
      } else {
        await shopApi.createProduct(payload);
      }
      success(t('admin.saved'));
      navigate('/admin/products');
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
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/products')}>
              {t('admin.back')}
            </Button>
            <Typography variant="h4">
              {isEdit ? t('admin.editProduct') : t('admin.newProduct')}
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
              <Grid item xs={12} sm={4}>
                <TextField select label={t('admin.fields.status')} value={form.status} onChange={update('status')} fullWidth>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select label={t('admin.fields.category')} value={form.category} onChange={update('category')} fullWidth>
                  {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{t(`categories.${c}`)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label={t('admin.fields.brand')} value={form.brand} onChange={update('brand')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.sku')} value={form.sku} onChange={update('sku')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.slug')} value={form.slug} onChange={update('slug')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.nameEn')} value={form.nameEn} onChange={update('nameEn')} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.nameAr')} value={form.nameAr} onChange={update('nameAr')} fullWidth dir="rtl" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.descriptionEn')} value={form.descriptionEn} onChange={update('descriptionEn')} fullWidth multiline minRows={4} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.descriptionAr')} value={form.descriptionAr} onChange={update('descriptionAr')} fullWidth multiline minRows={4} dir="rtl" />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.pricing')}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.priceQar')} type="number" value={form.priceQar} onChange={update('priceQar')} fullWidth required inputProps={{ min: 0, step: '0.01' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.stockQty')} type="number" value={form.stockQty} onChange={update('stockQty')} fullWidth inputProps={{ min: 0 }} />
              </Grid>
            </Grid>
          </Section>

          <Section title={t('admin.sections.specs')}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.specsEn')} value={form.specsEn} onChange={update('specsEn')} fullWidth multiline minRows={4} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('admin.fields.specsAr')} value={form.specsAr} onChange={update('specsAr')} fullWidth multiline minRows={4} dir="rtl" />
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
            <Button onClick={() => navigate('/admin/products')} disabled={saving}>{t('admin.cancel')}</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
              {t('admin.save')}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Fade>
  );
}
