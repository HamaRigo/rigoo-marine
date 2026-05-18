import { Box, Container, Typography, Button, Slide, Fade, Grow, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import EngineRepairIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '../../context/AuthContext';
import { Reveal, Stagger } from '../../components/common/Motion';

const HERO_SERVICES = ['mechanical', 'structural', 'finishing'];

const HERO_SLIDES = [
  { type: 'video', src: '/videos/slides/slide-01.mp4' },
  { type: 'video', src: '/videos/slides/slide-02.mp4' },
  { type: 'video', src: '/videos/slides/slide-03.mp4' },
  { type: 'video', src: '/videos/slides/slide-04.mp4' },
  { type: 'video', src: '/videos/slides/slide-05.mp4' },
  { type: 'video', src: '/videos/slides/slide-06.mp4' },
  { type: 'video', src: '/videos/slides/slide-07.mp4' },
  { type: 'video', src: '/videos/slides/slide-08.mp4' },
  { type: 'video', src: '/videos/slides/slide-09.mp4' },
  { type: 'video', src: '/videos/slides/slide-10.mp4' },
  { type: 'image', src: '/videos/slides/slide-11.jpg' },
  { type: 'image', src: '/videos/slides/slide-12.jpg' },
  { type: 'image', src: '/videos/slides/slide-13.jpg' },
  { type: 'image', src: '/videos/slides/slide-14.jpg' },
  { type: 'image', src: '/videos/slides/slide-15.jpg' },
  { type: 'image', src: '/videos/slides/slide-16.jpg' },
  { type: 'image', src: '/videos/slides/slide-17.jpg' },
  { type: 'image', src: '/videos/slides/slide-18.jpg' },
  { type: 'image', src: '/videos/slides/slide-19.jpg' },
  { type: 'image', src: '/videos/slides/slide-20.jpg' },
  { type: 'image', src: '/videos/slides/slide-21.jpg' },
  { type: 'image', src: '/videos/slides/slide-22.jpg' },
  { type: 'image', src: '/videos/slides/slide-23.jpg' },
];
const SLIDE_INTERVAL = 6000;

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('home');
  const [heroIn, setHeroIn] = useState(false);
  const [slide, setSlide] = useState(0);
  const [serviceIdx, setServiceIdx] = useState(0);
  const [svcVisible, setSvcVisible] = useState(true);
  const timerRef = useRef(null);
  const videoRefs = useRef([]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setSlide((s) => (s + 1) % HERO_SLIDES.length),
      SLIDE_INTERVAL,
    );
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHeroIn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === slide) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [slide]);

  useEffect(() => {
    const id = setInterval(() => {
      setSvcVisible(false);
      setTimeout(() => {
        setServiceIdx((s) => (s + 1) % HERO_SERVICES.length);
        setSvcVisible(true);
      }, 380);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const handlePrev = () => {
    setSlide((s) => (HERO_SLIDES.length + s - 1) % HERO_SLIDES.length);
    resetTimer();
  };
  const handleNext = () => {
    setSlide((s) => (s + 1) % HERO_SLIDES.length);
    resetTimer();
  };

  const services = [
    { key: 'mechanical', icon: EngineRepairIcon, color: 'primary.main' },
    { key: 'structural', icon: DirectionsBoatIcon, color: 'secondary.main' },
    { key: 'finishing', icon: StarIcon, color: 'primary.light' },
  ];

  const reasons = ['experienced', 'quality', 'fast', 'transparent'];

  return (
    <Box>
      {/* Hero Slideshow */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          height: { xs: 280, sm: 420, md: 560 },
          bgcolor: '#004263',
        }}
      >
        {/* Slides */}
        {HERO_SLIDES.map((s, idx) => (
          <Box
            key={idx}
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: slide === idx ? 1 : 0,
              transition: 'opacity 700ms ease',
              zIndex: slide === idx ? 1 : 0,
            }}
          >
            {s.type === 'video' ? (
              <Box
                component="video"
                ref={(el) => { videoRefs.current[idx] = el; }}
                src={s.src}
                muted
                loop
                playsInline
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box
                component="img"
                src={s.src}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </Box>
        ))}

        {/* Bottom gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.62) 100%)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Text overlay */}
        <Fade in={heroIn} timeout={800} style={{ transitionDelay: '150ms' }}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-65%)',
              zIndex: 3,
              textAlign: 'center',
              px: { xs: 2, sm: 4 },
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1.9rem', sm: '2.8rem', md: '3.6rem' },
                letterSpacing: '0.1em',
                lineHeight: 1.1,
                textTransform: 'uppercase',
                color: 'white',
                textShadow: '0 2px 24px rgba(0,0,0,0.65)',
              }}
            >
              Rigoo{' '}
              <Box component="span" sx={{ color: 'rgba(180,148,75,1)' }}>
                Marine
              </Box>
            </Typography>

            <Box
              sx={{
                width: 56,
                height: 2,
                bgcolor: 'rgba(180,148,75,0.85)',
                mx: 'auto',
                mt: 1.5,
                mb: 1.5,
                borderRadius: 1,
              }}
            />

            <Typography
              sx={{
                fontSize: { xs: '0.72rem', sm: '0.9rem', md: '1rem' },
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'white',
                fontWeight: 500,
                textShadow: '0 1px 10px rgba(0,0,0,0.55)',
                opacity: svcVisible ? 1 : 0,
                transition: 'opacity 380ms ease',
              }}
            >
              {t(`services.${HERO_SERVICES[serviceIdx]}.title`)}
            </Typography>
          </Box>
        </Fade>

        {/* CTA buttons */}
        <Fade in={heroIn} timeout={900} style={{ transitionDelay: '300ms' }}>
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 44, sm: 52 },
              left: 0,
              right: 0,
              zIndex: 3,
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 1.5, sm: 2 },
              px: 2,
              flexWrap: 'wrap',
            }}
          >
            <Button
              component={Link}
              to="/services"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: 'secondary.main',
                px: { xs: 3, sm: 4 },
                py: 1.4,
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
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: 'white' },
                }}
              >
                {t('hero.getStarted')}
              </Button>
            )}
          </Box>
        </Fade>

        {/* Prev arrow */}
        <IconButton
          onClick={handlePrev}
          size="small"
          sx={{
            position: 'absolute',
            left: { xs: 8, sm: 16 },
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.38)',
            color: 'white',
            transition: 'background-color 200ms ease',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>

        {/* Next arrow */}
        <IconButton
          onClick={handleNext}
          size="small"
          sx={{
            position: 'absolute',
            right: { xs: 8, sm: 16 },
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.38)',
            color: 'white',
            transition: 'background-color 200ms ease',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          <ChevronRightIcon />
        </IconButton>

        {/* Dot indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 0.75,
            zIndex: 3,
          }}
        >
          {HERO_SLIDES.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => { setSlide(idx); resetTimer(); }}
              sx={{
                width: slide === idx ? 22 : 8,
                height: 8,
                borderRadius: 4,
                bgcolor: slide === idx ? 'secondary.main' : 'rgba(255,255,255,0.5)',
                transition: 'width 300ms ease, background-color 300ms ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>

        {/* Bottom fade into page background */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: 'linear-gradient(to bottom, transparent, rgba(244,247,250,1))',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />
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
