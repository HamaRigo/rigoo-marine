import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Skeleton,
  Pagination,
  Fade,
  Button,
  Alert,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '../../../services/api';
import BoatCard from '../../../components/marketplace/BoatCard';

const PAGE_SIZE = 12;

function CardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton width="80%" />
        <Skeleton width="60%" />
        <Skeleton width="40%" sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}

export default function BoatGallery() {
  const { t } = useTranslation('marketplace');
  const [mode, setMode] = useState('BUY');
  const [filters, setFilters] = useState({
    q: '',
    boatType: '',
    lengthMin: '',
    lengthMax: '',
    yearMin: '',
    yearMax: '',
    priceMin: '',
    priceMax: '',
    location: '',
  });
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever filters or mode change.
  useEffect(() => { setPage(0); }, [mode, JSON.stringify(filters)]);

  const params = useMemo(() => {
    const p = { page, size: PAGE_SIZE, sort: 'createdAt,desc' };
    if (mode === 'BUY' || mode === 'RENT') p.mode = mode;
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v != null) p[k] = v;
    });
    return p;
  }, [mode, filters, page]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'listings', params],
    queryFn: () => marketplaceApi.searchListings(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  const updateFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));
  const clearFilters = () => setFilters({
    q: '', boatType: '', lengthMin: '', lengthMax: '',
    yearMin: '', yearMax: '', priceMin: '', priceMax: '', location: '',
  });

  return (
    <Box>
      {/* Hero */}
      <Fade in timeout={600}>
        <Box sx={{
          background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
          color: 'white',
          py: { xs: 5, md: 8 },
          textAlign: 'center',
        }}>
          <Container maxWidth="md">
            <Typography variant="h3" gutterBottom fontWeight={700}>
              {t('title')}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
              {t('tagline')}
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, val) => val && setMode(val)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiToggleButton-root': {
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  px: 4,
                  '&.Mui-selected': {
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'white' },
                  },
                },
              }}
            >
              <ToggleButton value="BUY">{t('modes.buy')}</ToggleButton>
              <ToggleButton value="RENT">{t('modes.rent')}</ToggleButton>
              <ToggleButton value="ALL">{t('modes.all')}</ToggleButton>
            </ToggleButtonGroup>
          </Container>
        </Box>
      </Fade>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={3}>
          {/* Filter sidebar */}
          <Grid item xs={12} md={3}>
            <Fade in timeout={500}>
              <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t('filters.filtersHeading')}
                    </Typography>
                    <Button size="small" onClick={clearFilters} startIcon={<RestartAltIcon />}>
                      {t('filters.clear')}
                    </Button>
                  </Stack>
                  <Stack spacing={2}>
                    <TextField label={t('filters.search')} value={filters.q} onChange={updateFilter('q')} size="small" fullWidth />
                    <TextField label={t('filters.boatType')} value={filters.boatType} onChange={updateFilter('boatType')} size="small" fullWidth />
                    <Stack direction="row" spacing={1}>
                      <TextField type="number" label={t('filters.lengthMin')} value={filters.lengthMin} onChange={updateFilter('lengthMin')} size="small" fullWidth />
                      <TextField type="number" label={t('filters.lengthMax')} value={filters.lengthMax} onChange={updateFilter('lengthMax')} size="small" fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextField type="number" label={t('filters.yearMin')} value={filters.yearMin} onChange={updateFilter('yearMin')} size="small" fullWidth />
                      <TextField type="number" label={t('filters.yearMax')} value={filters.yearMax} onChange={updateFilter('yearMax')} size="small" fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextField type="number" label={t('filters.priceMin')} value={filters.priceMin} onChange={updateFilter('priceMin')} size="small" fullWidth />
                      <TextField type="number" label={t('filters.priceMax')} value={filters.priceMax} onChange={updateFilter('priceMax')} size="small" fullWidth />
                    </Stack>
                    <TextField label={t('filters.location')} value={filters.location} onChange={updateFilter('location')} size="small" fullWidth />
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Grid */}
          <Grid item xs={12} md={9}>
            {isError ? (
              <Alert severity="error">{t('inquiry.error')}</Alert>
            ) : (
              <>
                <Grid container spacing={3}>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <Grid item xs={12} sm={6} lg={4} key={`s-${i}`}>
                          <CardSkeleton />
                        </Grid>
                      ))
                    : rows.map((listing, i) => (
                        <Grid item xs={12} sm={6} lg={4} key={listing.id}>
                          <BoatCard listing={listing} mode={mode} index={i} />
                        </Grid>
                      ))}
                </Grid>

                {!isLoading && rows.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color="text.secondary">{t('empty')}</Typography>
                  </Box>
                )}

                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <Pagination
                      count={totalPages}
                      page={page + 1}
                      onChange={(_, p) => setPage(p - 1)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
