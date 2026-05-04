import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EngineRepairIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('home');

  const services = [
    { key: 'mechanical', icon: EngineRepairIcon },
    { key: 'structural', icon: DirectionsBoatIcon },
    { key: 'finishing', icon: StarIcon },
  ];

  const reasons = ['experienced', 'quality', 'fast', 'transparent'];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {t('hero.title')}
          </Typography>
          <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.9 }}>
            {t('hero.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              to="/services"
              variant="contained"
              size="large"
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              {t('hero.browseServices')}
            </Button>
            {!isAuthenticated && (
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                size="large"
                sx={{ color: 'white', borderColor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                {t('hero.getStarted')}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Services Preview */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          {t('services.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          {t('services.subtitle')}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {services.map(({ key, icon: Icon }) => (
            <Box
              key={key}
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 2,
                textAlign: 'center',
              }}
            >
              <Icon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t(`services.${key}.title`)}
              </Typography>
              <Typography color="text.secondary">
                {t(`services.${key}.description`)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box textAlign="center" sx={{ mt: 4 }}>
          <Button component={Link} to="/services" variant="contained" size="large">
            {t('services.viewAll')}
          </Button>
        </Box>
      </Container>

      {/* Why Choose Us */}
      <Box sx={{ bgcolor: 'background.default', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom>
            {t('whyChoose.title')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4, mt: 4 }}>
            {reasons.map((key) => (
              <Box key={key} sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>✓</Typography>
                <Box>
                  <Typography variant="h6" gutterBottom>{t(`whyChoose.${key}.title`)}</Typography>
                  <Typography color="text.secondary">
                    {t(`whyChoose.${key}.description`)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      {!isAuthenticated && (
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom>
            {t('cta.title')}
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 3, opacity: 0.9 }}>
            {t('cta.subtitle')}
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="large"
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            {t('cta.button')}
          </Button>
        </Container>
      </Box>
      )}
    </Box>
  );
}
