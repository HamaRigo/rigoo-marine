import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, CardActions, CardMedia, Button, Chip, Slide, Fade, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal, Stagger } from '../../components/common/Motion';
import { SkeletonCardGrid } from '../../components/common/SkeletonCard';

const SERVICE_CATEGORIES = ['All', 'Mechanical', 'Structural', 'Finishing', 'Renovation', 'Specialized'];

const SERVICE_ITEMS = [
  { id: 1, key: 'overview',    category: 'Overview',    poster: '/marketing/posters/poster-overview.png' },
  { id: 2, key: 'mechanical',  category: 'Mechanical',  poster: '/marketing/posters/poster-mechanical.png' },
  { id: 3, key: 'structural',  category: 'Structural',  poster: '/marketing/posters/poster-structural.png' },
  { id: 4, key: 'cosmetic',    category: 'Finishing',   poster: '/marketing/posters/poster-cosmetic.png' },
  { id: 5, key: 'renovation',  category: 'Renovation',  poster: '/marketing/posters/poster-renovation.png' },
  { id: 6, key: 'specialized', category: 'Specialized', poster: '/marketing/posters/poster-specialized.png' },
];

export default function Services() {
  const { t } = useTranslation('public');
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  useEffect(() => {
    if (expandedId === null) return;
    const handler = () => setExpandedId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expandedId]);

  useEffect(() => {
    const id = setTimeout(() => {
      setServices(SERVICE_ITEMS);
      setLoading(false);
    }, 200);
    return () => clearTimeout(id);
  }, []);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter((s) => s.category === selectedCategory);

  return (
    <Box>
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
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 200ms ease, transform 200ms ease',
                  '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
                }}
              >
                <CardMedia
                  component="img"
                  image={service.poster}
                  alt={t(`services.items.${service.key}.name`)}
                  sx={{ height: 400, objectFit: 'contain', bgcolor: '#f0f4f8', p: 1 }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Chip
                    label={t(`services.categories.${service.category}`)}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1.5 }}
                  />
                  <Typography variant="h6" gutterBottom fontWeight={700}>
                    {t(`services.items.${service.key}.name`)}
                  </Typography>
                  <Collapse in={expandedId === service.id} timeout={300}>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {t(`services.items.${service.key}.description`)}
                    </Typography>
                  </Collapse>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button component={Link} to="/register" size="small" variant="contained">
                    {t('services.request')}
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(service.id); }}
                    endIcon={
                      <ExpandMoreIcon
                        fontSize="small"
                        sx={{
                          transform: expandedId === service.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 280ms cubic-bezier(0.2,0,0,1)',
                        }}
                      />
                    }
                  >
                    {expandedId === service.id ? t('services.showLess') : t('services.learnMore')}
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stagger>
        )}

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
