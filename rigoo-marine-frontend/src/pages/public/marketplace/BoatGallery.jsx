/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  TextField, ToggleButtonGroup, ToggleButton, Slider,
  Skeleton, Pagination, Fade, Button, Alert, Paper, Collapse, Divider, Chip, Stack,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '../../../services/api';
import BoatCard from '../../../components/marketplace/BoatCard';
import PageSEO, { buildBoatListSchema } from '../../../components/common/PageSEO';

const PAGE_SIZE = 12;
const YEAR_NOW = new Date().getFullYear();
const LENGTH_MIN = 7;
const LENGTH_MAX = 100;
const YEAR_MIN   = 2000;
const PRICE_MIN  = 1;
const PRICE_MAX  = 500_000;
const DEF_LENGTH = [LENGTH_MIN, LENGTH_MAX];
const DEF_YEAR   = [YEAR_MIN, YEAR_NOW];
const DEF_PRICE  = [PRICE_MIN, PRICE_MAX];

const fmtLength = (v) => `${v}m`;
const fmtYear   = (v) => `${v}`;
const fmtPrice  = (v) =>
  v >= 1_000_000 ? `QR ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `QR ${(v / 1_000).toFixed(0)}K` : `QR ${v}`;

function CardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton width="80%" /><Skeleton width="60%" /><Skeleton width="40%" sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}

function RangeSlider({ label, value, min, max, step, format, onChange, onCommit }) {
  const atDefault = value[0] === min && value[1] === max;
  return (
    <Box sx={{ minWidth: 200, px: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        <Typography variant="caption" color={atDefault ? 'text.disabled' : 'primary.main'} fontWeight={500}>
          {format(value[0])} – {format(value[1])}
        </Typography>
      </Box>
      <Slider
        value={value}
        min={min} max={max} step={step}
        onChange={(_, v) => onChange(v)}
        onChangeCommitted={(_, v) => onCommit(v)}
        size="small"
        valueLabelDisplay="auto"
        valueLabelFormat={format}
        sx={{ py: 0.5 }}
      />
    </Box>
  );
}

export default function BoatGallery() {
  const { t } = useTranslation('marketplace');
  const [mode, setMode] = useState('BUY');
  const [filters, setFilters] = useState({ q: '', boatType: '', location: '' });
  const [boatTypes, setBoatTypes] = useState([]);
  const [lengthSlider, setLengthSlider] = useState(DEF_LENGTH);
  const [yearSlider,   setYearSlider]   = useState(DEF_YEAR);
  const [priceSlider,  setPriceSlider]  = useState(DEF_PRICE);
  // committed values used for API params
  const [lengthCommit, setLengthCommit] = useState(DEF_LENGTH);
  const [yearCommit,   setYearCommit]   = useState(DEF_YEAR);
  const [priceCommit,  setPriceCommit]  = useState(DEF_PRICE);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    marketplaceApi.getBoatTypes().then(setBoatTypes).catch(() => {});
  }, []);

  const filtersKey     = JSON.stringify(filters);
  const lengthKey      = JSON.stringify(lengthCommit);
  const yearKey        = JSON.stringify(yearCommit);
  const priceKey       = JSON.stringify(priceCommit);
   
  useEffect(() => { setPage(0); }, [mode, filtersKey, lengthKey, yearKey, priceKey]);

  const activeCount = useMemo(() => {
    const text = Object.values(filters).filter((v) => v !== '').length;
    const sliders = [
      lengthCommit[0] > DEF_LENGTH[0] || lengthCommit[1] < DEF_LENGTH[1],
      yearCommit[0]   > DEF_YEAR[0]   || yearCommit[1]   < DEF_YEAR[1],
      priceCommit[0]  > PRICE_MIN  || priceCommit[1]  < PRICE_MAX,
    ].filter(Boolean).length;
    return text + sliders;
  }, [filters, lengthCommit, yearCommit, priceCommit]);

  const params = useMemo(() => {
    const p = { page, size: PAGE_SIZE, sort: 'createdAt,desc' };
    if (mode === 'BUY' || mode === 'RENT') p.mode = mode;
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    if (lengthCommit[0] > DEF_LENGTH[0]) p.lengthMin = lengthCommit[0];
    if (lengthCommit[1] < DEF_LENGTH[1]) p.lengthMax = lengthCommit[1];
    if (yearCommit[0]   > DEF_YEAR[0])   p.yearMin   = yearCommit[0];
    if (yearCommit[1]   < DEF_YEAR[1])   p.yearMax   = yearCommit[1];
    if (priceCommit[0]  > PRICE_MIN)  p.priceMin  = priceCommit[0];
    if (priceCommit[1]  < PRICE_MAX)  p.priceMax  = priceCommit[1];
    return p;
  }, [mode, filters, lengthCommit, yearCommit, priceCommit, page]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'listings', params],
    queryFn: () => marketplaceApi.searchListings(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  const updateFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  const clearFilters = () => {
    setFilters({ q: '', boatType: '', location: '' });
    setLengthSlider(DEF_LENGTH); setLengthCommit(DEF_LENGTH);
    setYearSlider(DEF_YEAR);     setYearCommit(DEF_YEAR);
    setPriceSlider(DEF_PRICE);   setPriceCommit(DEF_PRICE);
  };

  return (
    <Box>
      <PageSEO
        titleKey="boats.title"
        descriptionKey="boats.description"
        jsonLd={buildBoatListSchema()}
      />
      <Fade in timeout={600}>
        <Box sx={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)', color: 'white', py: { xs: 5, md: 8 }, textAlign: 'center' }}>
          <Container maxWidth="md">
            <Typography variant="h3" gutterBottom fontWeight={700}>{t('title')}</Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>{t('tagline')}</Typography>
            <ToggleButtonGroup value={mode} exclusive onChange={(_, val) => val && setMode(val)}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiToggleButton-root': { color: 'white', borderColor: 'rgba(255,255,255,0.3)', px: 4, '&.Mui-selected': { bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'white' } } } }}
            >
              <ToggleButton value="BUY">{t('modes.buy')}</ToggleButton>
              <ToggleButton value="RENT">{t('modes.rent')}</ToggleButton>
              <ToggleButton value="ALL">{t('modes.all')}</ToggleButton>
            </ToggleButtonGroup>
          </Container>
        </Box>
      </Fade>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          {/* Toggle bar */}
          <Box
            onClick={() => setFiltersOpen((v) => !v)}
            sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 200ms ease' }}
          >
            <TuneIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>{t('filters.filtersHeading')}</Typography>
            {activeCount > 0 && <Chip label={activeCount} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />}
            <Box sx={{ flex: 1 }} />
            {activeCount > 0 && (
              <Button size="small" startIcon={<RestartAltIcon />} onClick={(e) => { e.stopPropagation(); clearFilters(); }} sx={{ mr: 1 }}>
                {t('filters.clear')}
              </Button>
            )}
            <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 280ms cubic-bezier(0.2,0,0,1)' }} />
          </Box>

          <Collapse in={filtersOpen} timeout={300}>
            <Divider />
            <Box sx={{ px: 2.5, py: 2.5, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end' }}>
              <TextField label={t('filters.search')} value={filters.q} onChange={updateFilter('q')} size="small" sx={{ minWidth: 180 }} />
              <TextField label={t('filters.location')} value={filters.location} onChange={updateFilter('location')} size="small" sx={{ minWidth: 140 }} />
              {boatTypes.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                    {t('filters.boatType')}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {boatTypes.map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        size="small"
                        onClick={() => setFilters((f) => ({ ...f, boatType: f.boatType === type ? '' : type }))}
                        color={filters.boatType === type ? 'primary' : 'default'}
                        variant={filters.boatType === type ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
              <RangeSlider label={t('filters.length')} value={lengthSlider} min={LENGTH_MIN} max={LENGTH_MAX} step={1} format={fmtLength}
                onChange={setLengthSlider} onCommit={(v) => { setLengthSlider(v); setLengthCommit(v); }} />
              <RangeSlider label={t('filters.year')} value={yearSlider} min={YEAR_MIN} max={YEAR_NOW} step={1} format={fmtYear}
                onChange={setYearSlider} onCommit={(v) => { setYearSlider(v); setYearCommit(v); }} />
              <RangeSlider label={t('filters.price')} value={priceSlider} min={0} max={PRICE_MAX} step={10_000} format={fmtPrice}
                onChange={setPriceSlider} onCommit={(v) => { setPriceSlider(v); setPriceCommit(v); }} />
            </Box>
          </Collapse>
        </Paper>

        {isError ? <Alert severity="error">{t('inquiry.error')}</Alert> : (
          <>
            <Grid container spacing={3}>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`s-${i}`} ><CardSkeleton /></Grid>)
                : rows.map((listing, i) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={listing.id} ><BoatCard listing={listing} mode={mode} index={i} /></Grid>)}
            </Grid>
            {!isLoading && rows.length === 0 && <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary">{t('empty')}</Typography></Box>}
            {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" /></Box>}
          </>
        )}
      </Container>
    </Box>
  );
}
