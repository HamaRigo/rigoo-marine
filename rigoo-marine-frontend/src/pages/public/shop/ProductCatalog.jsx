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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { shopApi } from '../../../services/api';
import ProductCard from '../../../components/shop/ProductCard';

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

export default function ProductCatalog() {
  const { t } = useTranslation('shop');
  const [category, setCategory] = useState('ALL');
  const [filters, setFilters] = useState({
    q: '',
    brand: '',
    priceMin: '',
    priceMax: '',
    inStock: false,
  });
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever filters or category change.
  useEffect(() => { setPage(0); }, [category, JSON.stringify(filters)]);

  const params = useMemo(() => {
    const p = { page, size: PAGE_SIZE, sort: 'createdAt,desc' };
    if (category && category !== 'ALL') p.category = category;
    Object.entries(filters).forEach(([k, v]) => {
      if (v === '' || v == null || v === false) return;
      p[k] = v;
    });
    return p;
  }, [category, filters, page]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop', 'products', params],
    queryFn: () => shopApi.searchProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const rows = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  const updateFilter = (field) => (e) => {
    const value = field === 'inStock' ? e.target.checked : e.target.value;
    setFilters((f) => ({ ...f, [field]: value }));
  };
  const clearFilters = () => setFilters({
    q: '', brand: '', priceMin: '', priceMax: '', inStock: false,
  });

  return (
    <Box>
      {/* Hero */}
      <Fade in timeout={600}>
        <Box sx={{
          background: 'linear-gradient(135deg, #00695c 0%, #26a69a 100%)',
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
              value={category}
              exclusive
              onChange={(_, val) => val && setCategory(val)}
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
              <ToggleButton value="ALL">{t('categories.ALL')}</ToggleButton>
              <ToggleButton value="PART">{t('categories.PART')}</ToggleButton>
              <ToggleButton value="TOOL">{t('categories.TOOL')}</ToggleButton>
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
                    <TextField label={t('filters.brand')} value={filters.brand} onChange={updateFilter('brand')} size="small" fullWidth />
                    <Stack direction="row" spacing={1}>
                      <TextField type="number" label={t('filters.priceMin')} value={filters.priceMin} onChange={updateFilter('priceMin')} size="small" fullWidth />
                      <TextField type="number" label={t('filters.priceMax')} value={filters.priceMax} onChange={updateFilter('priceMax')} size="small" fullWidth />
                    </Stack>
                    <FormControlLabel
                      control={<Checkbox checked={filters.inStock} onChange={updateFilter('inStock')} />}
                      label={t('filters.inStock')}
                    />
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
                    : rows.map((product, i) => (
                        <Grid item xs={12} sm={6} lg={4} key={product.id}>
                          <ProductCard product={product} index={i} />
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
