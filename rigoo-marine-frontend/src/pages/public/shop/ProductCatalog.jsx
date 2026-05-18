import { useEffect, useMemo, useState } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  TextField, ToggleButtonGroup, ToggleButton,
  Skeleton, Pagination, Fade, Alert, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
        <Skeleton width="80%" /><Skeleton width="60%" /><Skeleton width="40%" sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}

export default function ProductCatalog() {
  const { t } = useTranslation('shop');
  const [category, setCategory] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [category, q]);

  const params = useMemo(() => {
    const p = { page, size: PAGE_SIZE, sort: 'createdAt,desc' };
    if (category && category !== 'ALL') p.category = category;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [category, q, page]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop', 'products', params],
    queryFn: () => shopApi.searchProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const rows = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Box>
      <Fade in timeout={600}>
        <Box sx={{ background: 'linear-gradient(135deg, #00695c 0%, #26a69a 100%)', color: 'white', py: { xs: 5, md: 8 }, textAlign: 'center' }}>
          <Container maxWidth="md">
            <Typography variant="h3" gutterBottom fontWeight={700}>{t('title')}</Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>{t('tagline')}</Typography>
            <ToggleButtonGroup value={category} exclusive onChange={(_, val) => val && setCategory(val)}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiToggleButton-root': { color: 'white', borderColor: 'rgba(255,255,255,0.3)', px: 4, '&.Mui-selected': { bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'white' } } } }}
            >
              <ToggleButton value="ALL">{t('categories.ALL')}</ToggleButton>
              <ToggleButton value="PART">{t('categories.PART')}</ToggleButton>
              <ToggleButton value="TOOL">{t('categories.TOOL')}</ToggleButton>
            </ToggleButtonGroup>
          </Container>
        </Box>
      </Fade>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <TextField
          fullWidth
          placeholder={t('filters.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {isError ? <Alert severity="error">{t('inquiry.error')}</Alert> : (
          <>
            <Grid container spacing={3}>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <Grid item xs={12} sm={6} lg={4} key={`s-${i}`}><CardSkeleton /></Grid>)
                : rows.map((product, i) => <Grid item xs={12} sm={6} lg={4} key={product.id}><ProductCard product={product} index={i} /></Grid>)}
            </Grid>
            {!isLoading && rows.length === 0 && <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary">{t('empty')}</Typography></Box>}
            {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" /></Box>}
          </>
        )}
      </Container>
    </Box>
  );
}
