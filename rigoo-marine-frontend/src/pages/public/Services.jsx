import {
  Box, Container, Typography, Card, CardContent, CardActions,
  Button, Chip, Grid, Skeleton, Slide, Fade,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Reveal, Stagger } from '../../components/common/Motion';
import { publicApi } from '../../services/api';
import PageSEO, { buildServiceListSchema } from '../../components/common/PageSEO';

const CATEGORY_IMAGE = {
  Mechanical:  '/services_img/posters/poster-mechanical.png',
  Structural:  '/services_img/posters/poster-structural.png',
  Cosmetic:    '/services_img/posters/poster-cosmetic.png',
  Renovation:  '/services_img/posters/poster-renovation.png',
  Specialized: '/services_img/posters/poster-specialized.png',
};

// name-based lookup so services without a stored imageUrl still get the right photo
const PRESET_BY_NAME = {
  'engine diagnostics':                    '/services_img/posters/Engine Diagnostics.jpeg',
  'oil change':                            '/services_img/posters/Oil Change.jpg',
  'generator service':                     '/services_img/posters/Generator Service.jpg',
  'transmission service':                  '/services_img/posters/Transmission.jpg',
  'hull cleaning':                         '/services_img/posters/Hull Cleaning.jpg',
  'propeller repair':                      '/services_img/posters/Propeller Repair.jpeg',
  'bottom paint':                          '/services_img/posters/bottom-paint.jpeg',
  'complete electrical system inspection': '/services_img/posters/complete-electrical-inspection.jpeg',
  'de-winterization':                      '/services_img/posters/De-winterization.jpeg',
};

const resolveImage = (svc) =>
  svc.imageUrl
  || PRESET_BY_NAME[svc.name?.toLowerCase()]
  || CATEGORY_IMAGE[svc.category]
  || '/services_img/posters/poster-overview.png';

export default function Services() {
  const { t, i18n } = useTranslation('public');
  const isAr = i18n.language.startsWith('ar');

  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['public-services'],
    queryFn: publicApi.getServices,
    staleTime: 5 * 60 * 1000,
  });

  const services = (Array.isArray(rawData) ? rawData : rawData?.content ?? [])
    .filter(s => s.active !== false);

  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];

  const filtered = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const categoryLabel = (cat) =>
    cat === 'All'
      ? t('services.categories.all', { defaultValue: 'All' })
      : t(`services.categories.${cat}`, { defaultValue: cat });

  return (
    <Box>
      <PageSEO
        titleKey="services.title"
        descriptionKey="services.description"
        jsonLd={buildServiceListSchema(rawData)}
      />
      {/* ── Header banner ── */}
      <Box sx={{
        color: 'white',
        py: { xs: 5, md: 8 },
        px: { xs: 2, sm: 3 },
        textAlign: 'center',
        background: 'linear-gradient(125deg, #004263 0%, #006994 60%, #0a8fbf 100%)',
        backgroundSize: '200% 200%',
        animation: 'rmShimmer 16s ease infinite',
        position: 'relative',
        overflow: 'hidden',
      }}>
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

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>

        {/* ── Category filter chips ── */}
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={categoryLabel(cat)}
                onClick={() => setSelectedCategory(cat)}
                color={selectedCategory === cat ? 'primary' : 'default'}
                variant={selectedCategory === cat ? 'filled' : 'outlined'}
                sx={{ px: 2, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Reveal>

        {/* ── Grid ── */}
        {isLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={n}>
                <Skeleton variant="rounded" height={340} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              {t('services.empty', { defaultValue: 'No services available yet.' })}
            </Typography>
          </Box>
        ) : (
          <Stagger key={selectedCategory} variant="slide" direction="up" step={80} timeout={540}>
            <Grid container spacing={3}>
              {filtered.map((svc) => {
                const imgSrc = resolveImage(svc);
                const name = (isAr && svc.nameAr) ? svc.nameAr : svc.name;
                const desc = (isAr && svc.descriptionAr) ? svc.descriptionAr : svc.description;

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={svc.id}>
                    <Card sx={{
                      height: '100%', display: 'flex', flexDirection: 'column',
                      borderRadius: 3, overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
                      position: 'relative',
                      transition: 'transform 280ms cubic-bezier(0.2,0,0,1), box-shadow 280ms',
                      '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 22px 44px rgba(15,23,42,0.13)' },
                      '&:hover .svc-img': { transform: 'scale(1.06)' },
                      '&::after': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: 'linear-gradient(90deg, #006994, #ff8f00)',
                        opacity: 0, transition: 'opacity 300ms ease',
                      },
                      '&:hover::after': { opacity: 1 },
                    }}>
                      {/* Photo */}
                      <Box sx={{ height: 220, overflow: 'hidden', flexShrink: 0 }}>
                        <Box
                          className="svc-img"
                          component="img"
                          src={imgSrc}
                          alt={svc.name}
                          sx={{
                            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                            transition: 'transform 480ms cubic-bezier(0.2,0,0,1)',
                          }}
                        />
                      </Box>

                      <CardContent sx={{ flex: 1, p: 2.5 }}>
                        {svc.category && (
                          <Chip
                            label={categoryLabel(svc.category)}
                            size="small"
                            sx={{ mb: 1.5, fontWeight: 700, fontSize: 11, bgcolor: 'rgba(0,105,148,0.09)', color: '#005a80' }}
                          />
                        )}
                        <Typography variant="h6" fontWeight={700} gutterBottom dir={isAr ? 'rtl' : 'ltr'}>
                          {name}
                        </Typography>
                        {desc && (
                          <Typography variant="body2" color="text.secondary"
                            dir={isAr ? 'rtl' : 'ltr'}
                            sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {desc}
                          </Typography>
                        )}
                      </CardContent>

                      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                        <Button component={Link} to="/register" size="small" variant="contained" sx={{ borderRadius: 2 }}>
                          {t('services.request', { defaultValue: 'Request Service' })}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Stagger>
        )}

        {/* ── CTA ── */}
        <Reveal variant="slide" direction="up" timeout={620}>
          <Box textAlign="center" sx={{ mt: 8 }}>
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
