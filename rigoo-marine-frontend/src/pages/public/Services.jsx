import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, CardActions, Button, Chip, Slide, Fade } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal, Stagger } from '../../components/common/Motion';
import { SkeletonCardGrid } from '../../components/common/SkeletonCard';
import { formatPrice } from '../../utils/format';

const SERVICE_CATEGORIES = ['All', 'Mechanical', 'Structural', 'Finishing'];

const SERVICE_ITEMS = [
  { id: 1, key: 'engineDiagnostic', category: 'Mechanical', price: 150 },
  { id: 2, key: 'engineRepair',     category: 'Mechanical', price: null },
  { id: 3, key: 'oilChange',        category: 'Mechanical', price: 89 },
  { id: 4, key: 'hullRepair',       category: 'Structural', price: null },
  { id: 5, key: 'gelCoat',          category: 'Finishing',  price: 500 },
  { id: 6, key: 'bottomPaint',      category: 'Finishing',  price: 800 },
  { id: 7, key: 'propellerRepair',  category: 'Mechanical', price: 200 },
  { id: 8, key: 'transomRepair',    category: 'Structural', price: null },
];

export default function Services() {
  const { t } = useTranslation('public');
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setServices(SERVICE_ITEMS);
      setLoading(false);
    }, 200);
    return () => clearTimeout(id);
  }, []);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          color: 'white',
          py: { xs: 5, md: 8 },
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
          background: 'linear-gradient(125deg, #004263 0%, #006994 60%, #0a8fbf 100%)',
          backgroundSize: '200% 200%',
          animation: 'rmShimmer 16s ease infinite',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <Slide in direction="down" timeout={600}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
              {t('services.header.title')}
            </Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {t('services.header.subtitle')}
            </Typography>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        {/* Category Filters */}
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SERVICE_CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={t(`services.categories.${category === 'All' ? 'all' : category}`)}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ px: 2, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Reveal>

        {/* Services Grid */}
        {loading ? (
          <SkeletonCardGrid count={6} />
        ) : (
          <Stagger
            key={selectedCategory}
            variant="grow"
            step={70}
            timeout={520}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Chip
                    label={t(`services.categories.${service.category}`)}
                    size="small"
                    sx={{ mb: 1 }}
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="h6" gutterBottom>
                    {t(`services.items.${service.key}.name`)}
                  </Typography>
                  <Typography color="text.secondary" paragraph>
                    {t(`services.items.${service.key}.description`)}
                  </Typography>
                  {service.price != null && (
                    <Typography variant="h6" color="primary.main">
                      {t('services.fromPrice', { price: formatPrice(service.price) })}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button component={Link} to="/register" size="small">
                    {t('services.request')}
                  </Button>
                  <Button size="small">{t('services.learnMore')}</Button>
                </CardActions>
              </Card>
            ))}
          </Stagger>
        )}

        {/* CTA */}
        <Reveal variant="slide" direction="up" timeout={620}>
          <Box textAlign="center" sx={{ mt: 6 }}>
            <Typography variant="h6" paragraph>
              {t('services.cta.title')}
            </Typography>
            <Button component={Link} to="/register" variant="contained" size="large" sx={{ px: 4 }}>
              {t('services.cta.button')}
            </Button>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
