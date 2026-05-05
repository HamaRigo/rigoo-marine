import { Box, Container, Typography, Button, Slide, Fade, Grow } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import EngineRepairIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../context/AuthContext';
import { Reveal, Stagger } from '../../components/common/Motion';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('home');
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHeroIn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const services = [
    { key: 'mechanical', icon: EngineRepairIcon, color: 'primary.main' },
    { key: 'structural', icon: DirectionsBoatIcon, color: 'secondary.main' },
    { key: 'finishing', icon: StarIcon, color: 'primary.light' },
  ];

  const reasons = ['experienced', 'quality', 'fast', 'transparent'];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          color: 'white',
          py: { xs: 7, sm: 10, md: 16 },
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
          overflow: 'hidden',
          background:
            'linear-gradient(125deg, #004263 0%, #006994 35%, #0a8fbf 65%, #006994 100%)',
          backgroundSize: '300% 300%',
          animation: 'rmShimmer 18s ease infinite',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,143,0,0.18), transparent 45%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, transparent 70%, rgba(244,247,250,1) 100%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Slide in={heroIn} direction="down" timeout={700}>
            <Typography variant="h2" gutterBottom sx={{ fontWeight: 800 }}>
              {t('hero.title')}
            </Typography>
          </Slide>
          <Fade in={heroIn} timeout={1100} style={{ transitionDelay: '180ms' }}>
            <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.92 }}>
              {t('hero.subtitle')}
            </Typography>
          </Fade>
          <Slide in={heroIn} direction="up" timeout={700} style={{ transitionDelay: '320ms' }}>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1.5, sm: 2 },
                justifyContent: 'center',
                flexWrap: 'wrap',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
              }}
            >
              <Button
                component={Link}
                to="/services"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                fullWidth={false}
                sx={{
                  bgcolor: 'secondary.main',
                  px: { xs: 3, sm: 4 },
                  py: 1.4,
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: { xs: 320, sm: 'none' },
                  animation: 'rmPulse 2.6s ease-in-out infinite',
                  '&:hover': { bgcolor: 'secondary.dark' },
                }}
              >
                {t('hero.browseServices')}
              </Button>
              {!isAuthenticated && (
                <Button
                  component={Link}
                  to="/register"
                  variant="outlined"
                  size="large"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.7)',
                    px: { xs: 3, sm: 4 },
                    py: 1.4,
                    width: { xs: '100%', sm: 'auto' },
                    maxWidth: { xs: 320, sm: 'none' },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      borderColor: 'white',
                    },
                  }}
                >
                  {t('hero.getStarted')}
                </Button>
              )}
            </Box>
          </Slide>
        </Container>
      </Box>

      {/* Services Preview */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade" timeout={700}>
          <Typography variant="h3" textAlign="center" gutterBottom>
            {t('services.title')}
          </Typography>
        </Reveal>
        <Reveal variant="fade" timeout={700} delay={120}>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
            {t('services.subtitle')}
          </Typography>
        </Reveal>

        <Stagger
          variant="slide"
          direction="up"
          step={120}
          timeout={620}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {services.map(({ key, icon: Icon, color }) => (
            <Box
              key={key}
              sx={{
                p: 4,
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition:
                  'transform 280ms cubic-bezier(0.2,0,0,1), box-shadow 280ms cubic-bezier(0.2,0,0,1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(135deg, rgba(0,105,148,0.06) 0%, rgba(255,143,0,0.04) 100%)',
                  opacity: 0,
                  transition: 'opacity 280ms ease',
                },
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 22px 44px rgba(15,23,42,0.14)',
                },
                '&:hover::before': { opacity: 1 },
                '&:hover .svc-icon': {
                  transform: 'scale(1.1) rotate(-4deg)',
                  color: 'secondary.main',
                },
              }}
            >
              <Icon
                className="svc-icon"
                sx={{
                  fontSize: 56,
                  color,
                  mb: 2,
                  transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), color 280ms ease',
                  position: 'relative',
                }}
              />
              <Typography variant="h6" gutterBottom sx={{ position: 'relative' }}>
                {t(`services.${key}.title`)}
              </Typography>
              <Typography color="text.secondary" sx={{ position: 'relative' }}>
                {t(`services.${key}.description`)}
              </Typography>
            </Box>
          ))}
        </Stagger>

        <Reveal variant="fade" delay={200}>
          <Box textAlign="center" sx={{ mt: 5 }}>
            <Button
              component={Link}
              to="/services"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4 }}
            >
              {t('services.viewAll')}
            </Button>
          </Box>
        </Reveal>
      </Container>

      {/* Why Choose Us */}
      <Box
        sx={{
          bgcolor: 'background.default',
          py: { xs: 6, md: 10 },
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(0,105,148,0.08), transparent 40%), radial-gradient(circle at 100% 100%, rgba(255,143,0,0.06), transparent 35%)',
        }}
      >
        <Container maxWidth="lg">
          <Reveal variant="slide" direction="up" timeout={620}>
            <Typography variant="h3" textAlign="center" gutterBottom>
              {t('whyChoose.title')}
            </Typography>
          </Reveal>
          <Stagger
            variant="slide"
            direction="up"
            step={110}
            timeout={620}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 4,
              mt: 4,
            }}
          >
            {reasons.map((key) => (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'transform 260ms cubic-bezier(0.2,0,0,1), box-shadow 260ms ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 14px 32px rgba(15,23,42,0.10)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 800,
                    boxShadow: '0 6px 18px rgba(0,105,148,0.35)',
                  }}
                >
                  ✓
                </Box>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t(`whyChoose.${key}.title`)}
                  </Typography>
                  <Typography color="text.secondary">
                    {t(`whyChoose.${key}.description`)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Reveal variant="slide" direction="up" timeout={680}>
          <Box
            sx={{
              bgcolor: 'primary.dark',
              color: 'white',
              py: { xs: 5, md: 8 },
              px: { xs: 2, sm: 3 },
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              backgroundImage:
                'linear-gradient(135deg, #004263 0%, #006994 100%)',
            }}
          >
            <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
              <Grow in timeout={700}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  {t('cta.title')}
                </Typography>
              </Grow>
              <Fade in timeout={900} style={{ transitionDelay: '120ms' }}>
                <Typography variant="h6" paragraph sx={{ mb: 3, opacity: 0.9 }}>
                  {t('cta.subtitle')}
                </Typography>
              </Fade>
              <Slide in direction="up" timeout={700} style={{ transitionDelay: '220ms' }}>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: 'secondary.main',
                    px: 4,
                    py: 1.4,
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  {t('cta.button')}
                </Button>
              </Slide>
            </Container>
          </Box>
        </Reveal>
      )}
    </Box>
  );
}
