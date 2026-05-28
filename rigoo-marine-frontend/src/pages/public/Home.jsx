/* eslint-disable react/prop-types */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Container, Typography, Button, Card, CardContent,
  Chip, Dialog, DialogContent, IconButton, Zoom, Fade, Grid,
  Avatar,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BuildIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import VerifiedIcon from '@mui/icons-material/Verified';
import SpeedIcon from '@mui/icons-material/Speed';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useAuth } from '../../context/AuthContext';
import { publicApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';
import RequestTeamDialog from '../../components/public/RequestTeamDialog';
import { formatPhone } from '../../utils/format';

/* ─── Data ─────────────────────────────────────────────────────────────── */

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
const HERO_SERVICES = ['mechanical', 'structural', 'finishing'];

const STATS = [
  { value: 500, suffix: '+',  key: 'vessels',      delay: 0   },
  { value: 10,  suffix: '+',  key: 'technicians',  delay: 140 },
  { value: 100, suffix: '%',  key: 'satisfaction', delay: 280 },
  { value: 24,  suffix: '/7', key: 'support',      delay: 420 },
];

const SERVICES = [
  { key: 'mechanical', Icon: BuildIcon,         color: 'primary.main'  },
  { key: 'structural', Icon: DirectionsBoatIcon, color: 'secondary.main' },
  { key: 'finishing',  Icon: StarIcon,           color: 'primary.light' },
];

const GALLERY_CATEGORY_LABELS = {
  en: {
    detailing:     'Boat Detailing',
    hull_cleaning: 'Hull Cleaning',
    engine_repair: 'Engine Repair',
    painting:      'Painting',
    restoration:   'Restoration',
    other:         'Other',
  },
  ar: {
    detailing:     'تنظيف وتلميع',
    hull_cleaning: 'تنظيف الهيكل',
    engine_repair: 'إصلاح المحرك',
    painting:      'الطلاء',
    restoration:   'ترميم',
    other:         'أخرى',
  },
};

const VALUE_ITEMS = [
  { key: 'quality',      Icon: WorkspacePremiumIcon, color: '#ff8f00' },
  { key: 'transparency', Icon: HandshakeIcon,         color: '#4c97c2' },
  { key: 'efficiency',   Icon: SpeedIcon,             color: '#ffc04d' },
  { key: 'trust',        Icon: VerifiedIcon,           color: '#006994' },
];

const TEAM_KEYS = ['founder', 'manager', 'senior'];

/* ─── Hooks ─────────────────────────────────────────────────────────────── */

function useInView(threshold = 0.18) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCountUp(target, duration = 1600, delay = 0, enabled = false) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const tid = setTimeout(() => {
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setCount(Math.round((1 - (1 - p) ** 3) * target));
        if (p < 1) frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(tid); cancelAnimationFrame(frameRef.current); };
  }, [enabled, target, duration, delay]);
  return count;
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function StatCard({ value, suffix, label, delay, inView }) {
  const count = useCountUp(value, 1600, delay, inView);
  return (
    <Box sx={{ textAlign: 'center', py: { xs: 1, md: 0 } }}>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: '2.4rem', md: '3.2rem' },
          color: 'secondary.main',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {count}{suffix}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.68)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          mt: 1,
          display: 'block',
          fontSize: '0.72rem',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel, height = 240 }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    setPosition(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)));
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) moveTo(e.clientX); };
    const onTouchMove = (e) => { if (dragging.current) moveTo(e.touches[0].clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [moveTo]);

  useEffect(() => {
    let raf;
    const start = Date.now();
    const sweep = () => {
      const elapsed = Date.now() - start - 500;
      if (elapsed < 0) { raf = requestAnimationFrame(sweep); return; }
      const t = Math.min(1, elapsed / 900);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setPosition(50 - 20 * Math.sin(eased * Math.PI));
      if (t < 1) raf = requestAnimationFrame(sweep);
    };
    raf = requestAnimationFrame(sweep);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative', overflow: 'hidden', height,
        cursor: 'ew-resize', userSelect: 'none', touchAction: 'none',
      }}
    >
      <Box component="img" src={beforeSrc} alt={beforeLabel} loading="lazy"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Box sx={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${position}%)` }}>
        <Box component="img" src={afterSrc} alt={afterLabel} loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
      <Box sx={{
        position: 'absolute', top: 0, bottom: 0, left: `${position}%`,
        transform: 'translateX(-50%)', width: 2, bgcolor: 'white',
        boxShadow: '0 0 8px rgba(0,0,0,0.4)', pointerEvents: 'none',
      }} />
      <Box
        onMouseDown={() => { dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
        sx={{
          position: 'absolute', top: '50%', left: `${position}%`,
          transform: 'translate(-50%, -50%)',
          width: 38, height: 38, borderRadius: '50%', bgcolor: 'white',
          boxShadow: '0 2px 14px rgba(0,0,0,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'ew-resize', zIndex: 2,
          animation: 'rmPulse 2.4s ease-in-out 1.8s 2',
        }}
      >
        <SwapHorizIcon sx={{ fontSize: 18, color: 'primary.main' }} />
      </Box>
      <Box sx={{
        position: 'absolute', top: 10, left: 10,
        bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
        px: 1, py: 0.25, borderRadius: 0.75,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        pointerEvents: 'none', opacity: position > 12 ? 1 : 0, transition: 'opacity 180ms',
      }}>{beforeLabel}</Box>
      <Box sx={{
        position: 'absolute', top: 10, right: 10,
        bgcolor: 'rgba(0,105,148,0.82)', color: 'white',
        px: 1, py: 0.25, borderRadius: 0.75,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        pointerEvents: 'none', opacity: position < 88 ? 1 : 0, transition: 'opacity 180ms',
      }}>{afterLabel}</Box>
    </Box>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation('home');

  const { data: apiTeam = [] } = useQuery({
    queryKey: ['public-team'],
    queryFn: publicApi.getTeamMembers,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawGallery = [] } = useQuery({
    queryKey: ['public-gallery'],
    queryFn: publicApi.getGallery,
    staleTime: 5 * 60 * 1000,
  });

  const apiGallery = rawGallery.map((g) => ({
    ...g,
    before: g.beforeUrl,
    after:  g.afterUrl,
  }));

  const getCatLabel = (cat) => {
    const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
    return GALLERY_CATEGORY_LABELS[lang]?.[cat] ?? cat;
  };

  const galleryCategories = [...new Set(apiGallery.map((i) => i.category))];

  const [heroIn, setHeroIn]           = useState(false);
  const [slide, setSlide]             = useState(0);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [brochureOpen, setBrochureOpen]   = useState(false);
  const [brochurePage, setBrochurePage]   = useState(0);
  const [serviceIdx, setServiceIdx]   = useState(0);
  const [svcVisible, setSvcVisible]   = useState(true);
  const [galleryCat, setGalleryCat]   = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [contact, setContact]         = useState({ email: 'rigoomarine@gmail.com', phone: '+974 709 709 17' });

  const timerRef   = useRef(null);
  const videoRefs  = useRef([]);
  const [statsRef, statsInView] = useInView(0.25);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), SLIDE_INTERVAL);
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHeroIn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current); }, []);  

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === slide) { vid.currentTime = 0; vid.play().catch(() => {}); }
      else vid.pause();
    });
  }, [slide]);

  useEffect(() => {
    const id = setInterval(() => {
      setSvcVisible(false);
      setTimeout(() => { setServiceIdx((s) => (s + 1) % HERO_SERVICES.length); setSvcVisible(true); }, 380);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    publicApi.getContactInfo().then((data) => {
      if (!Array.isArray(data)) return;
      const map = Object.fromEntries(data.map((d) => [d.keyName, d.value]));
      setContact({
        email: map.email_general || 'rigoomarine@gmail.com',
        phone: map.phone_primary || '+974 709 709 17',
      });
    }).catch(() => {});
  }, []);

  const handlePrev = () => { setSlide((s) => (HERO_SLIDES.length + s - 1) % HERO_SLIDES.length); resetTimer(); };
  const handleNext = () => { setSlide((s) => (s + 1) % HERO_SLIDES.length); resetTimer(); };

  const visibleGallery = galleryCat === 'all'
    ? apiGallery
    : apiGallery.filter((i) => i.category === galleryCat);

  return (
    <Box>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Box sx={{ position: 'relative', overflow: 'hidden', height: { xs: 320, sm: 460, md: 640 }, bgcolor: '#004263' }}>
        {HERO_SLIDES.map((s, idx) => (
          <Box key={idx} sx={{
            position: 'absolute', inset: 0,
            opacity: slide === idx ? 1 : 0,
            transition: 'opacity 700ms ease',
            zIndex: slide === idx ? 1 : 0,
          }}>
            {s.type === 'video' ? (
              <Box component="video"
                ref={(el) => { videoRefs.current[idx] = el; }}
                src={s.src} muted loop playsInline
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box component="img" src={s.src} alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </Box>
        ))}

        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.65) 100%)', zIndex: 2, pointerEvents: 'none' }} />

        <Fade in={heroIn} timeout={800} style={{ transitionDelay: '150ms' }}>
          <Box sx={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            transform: 'translateY(-65%)', zIndex: 3,
            textAlign: 'center', px: { xs: 2, sm: 4 }, pointerEvents: 'none',
          }}>
            <Typography sx={{
              fontWeight: 900,
              fontSize: { xs: '1.9rem', sm: '2.8rem', md: '3.8rem' },
              letterSpacing: '0.1em', lineHeight: 1.1, textTransform: 'uppercase',
              color: 'white', textShadow: '0 2px 24px rgba(0,0,0,0.65)',
            }}>
              Rigoo{' '}
              <Box component="span" sx={{ color: 'rgba(180,148,75,1)' }}>Marine</Box>
            </Typography>
            <Box sx={{ width: 56, height: 2, bgcolor: 'rgba(180,148,75,0.85)', mx: 'auto', mt: 1.5, mb: 1.5, borderRadius: 1 }} />
            <Typography sx={{
              fontSize: { xs: '0.72rem', sm: '0.9rem', md: '1rem' },
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'white', fontWeight: 500,
              textShadow: '0 1px 10px rgba(0,0,0,0.55)',
              opacity: svcVisible ? 1 : 0, transition: 'opacity 380ms ease',
            }}>
              {t(`services.${HERO_SERVICES[serviceIdx]}.title`)}
            </Typography>
          </Box>
        </Fade>

        <Fade in={heroIn} timeout={900} style={{ transitionDelay: '300ms' }}>
          <Box sx={{
            position: 'absolute', bottom: { xs: 44, sm: 52 }, left: 0, right: 0,
            zIndex: 3, display: 'flex', justifyContent: 'center',
            gap: { xs: 1.5, sm: 2 }, px: 2, flexWrap: 'wrap',
          }}>
            <Button
              component={Link} to="/services" variant="contained" size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: 'secondary.main', px: { xs: 3, sm: 4 }, py: 1.4, animation: 'rmPulse 2.6s ease-in-out infinite', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              {t('hero.browseServices')}
            </Button>
            <Button
              variant="outlined" size="large" startIcon={<GroupsIcon />}
              onClick={() => setTeamDialogOpen(true)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', px: { xs: 3, sm: 4 }, py: 1.4, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'white' } }}
            >
              {t('hero.requestTeam')}
            </Button>
          </Box>
        </Fade>

        <IconButton onClick={handlePrev} size="small" sx={{ position: 'absolute', left: { xs: 8, sm: 16 }, top: '50%', transform: 'translateY(-50%)', zIndex: 3, bgcolor: 'rgba(0,0,0,0.38)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton onClick={handleNext} size="small" sx={{ position: 'absolute', right: { xs: 8, sm: 16 }, top: '50%', transform: 'translateY(-50%)', zIndex: 3, bgcolor: 'rgba(0,0,0,0.38)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}>
          <ChevronRightIcon />
        </IconButton>

        <Box sx={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.75, zIndex: 3 }}>
          {HERO_SLIDES.map((_, idx) => (
            <Box key={idx} onClick={() => { setSlide(idx); resetTimer(); }}
              sx={{ width: slide === idx ? 22 : 8, height: 8, borderRadius: 4, bgcolor: slide === idx ? 'secondary.main' : 'rgba(255,255,255,0.5)', transition: 'width 300ms ease, background-color 300ms ease', cursor: 'pointer' }}
            />
          ))}
        </Box>

        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to bottom, transparent, #f4f7fa)', zIndex: 4, pointerEvents: 'none' }} />
      </Box>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #002a44 0%, #004263 55%, #005a80 100%)',
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(255,143,0,0.12), transparent 38%), radial-gradient(circle at 85% 50%, rgba(76,151,194,0.14), transparent 38%)',
          pointerEvents: 'none',
        },
      }}>
        <Container maxWidth="lg">
          <Box
            ref={statsRef}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 3, md: 2 },
              position: 'relative', zIndex: 1,
            }}
          >
            {STATS.map(({ value, suffix, key, delay }) => (
              <StatCard key={key} value={value} suffix={suffix} label={t(`stats.${key}`)} delay={delay} inView={statsInView} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── Services preview ─────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade" timeout={700}>
          <Typography variant="h3" textAlign="center" gutterBottom>{t('services.title')}</Typography>
        </Reveal>
        <Reveal variant="fade" timeout={700} delay={120}>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 7 }}>
            {t('services.subtitle')}
          </Typography>
        </Reveal>

        <Stagger variant="slide" direction="up" step={120} timeout={620}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}
        >
          {SERVICES.map(({ key, Icon, color }) => (
            <Box key={key} sx={{
              p: 4, bgcolor: 'background.paper', borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
              transition: 'transform 280ms cubic-bezier(0.2,0,0,1), box-shadow 280ms',
              '&::before': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,105,148,0.06) 0%, rgba(255,143,0,0.04) 100%)', opacity: 0, transition: 'opacity 280ms ease' },
              '&::after': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #006994, #ff8f00)', opacity: 0, transition: 'opacity 300ms ease' },
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 22px 44px rgba(15,23,42,0.14)' },
              '&:hover::before': { opacity: 1 },
              '&:hover::after': { opacity: 1 },
              '&:hover .svc-icon': { transform: 'scale(1.1) rotate(-4deg)', color: 'secondary.main' },
            }}>
              <Icon className="svc-icon" sx={{ fontSize: 56, color, mb: 2, transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), color 280ms ease', position: 'relative' }} />
              <Typography variant="h6" gutterBottom sx={{ position: 'relative' }}>{t(`services.${key}.title`)}</Typography>
              <Typography color="text.secondary" sx={{ position: 'relative' }}>{t(`services.${key}.description`)}</Typography>
            </Box>
          ))}
        </Stagger>

        <Reveal variant="fade" delay={200}>
          <Box textAlign="center" sx={{ mt: 5 }}>
            <Button component={Link} to="/services" variant="contained" size="large" endIcon={<ArrowForwardIcon />} sx={{ px: 4 }}>
              {t('services.viewAll')}
            </Button>
          </Box>
        </Reveal>
      </Container>

      {/* ── Our Story ────────────────────────────────────────────────────── */}
      <Box id="story" sx={{
        py: { xs: 7, md: 11 }, px: { xs: 2, sm: 3 },
        background: 'linear-gradient(160deg, #f0f6fb 0%, #f4f7fa 60%, #e8f2f8 100%)',
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }} >
              <Reveal variant="slide" direction="right" timeout={640}>
                <Box>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 28, height: 3, bgcolor: 'secondary.main', borderRadius: 2 }} />
                    <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: '0.16em' }}>
                      Our Story
                    </Typography>
                  </Box>

                  <Typography variant="h3" sx={{ lineHeight: 1.15, mb: 3 }}>
                    {t('story.title')}
                  </Typography>

                  {/* Lead paragraph */}
                  <Typography sx={{ fontSize: '1.05rem', color: 'text.primary', lineHeight: 1.85, mb: 3, fontWeight: 400 }}>
                    {t('story.lead')}
                  </Typography>

                  {/* Highlighted paragraph */}
                  <Box sx={{
                    borderLeft: '3px solid',
                    borderColor: 'secondary.main',
                    pl: 2.5, py: 1, mb: 3,
                    bgcolor: 'rgba(255,143,0,0.05)',
                    borderRadius: '0 10px 10px 0',
                  }}>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.85 }}>
                      {t('story.highlight')}
                    </Typography>
                  </Box>

                  {/* Closing paragraph */}
                  <Typography color="text.secondary" sx={{ lineHeight: 1.85, fontStyle: 'italic' }}>
                    {t('story.close')}
                  </Typography>

                  <Button
                    variant="contained" color="secondary" sx={{ mt: 4, px: 3.5, borderRadius: '20px', fontWeight: 700 }}
                    onClick={() => setTeamDialogOpen(true)}
                    startIcon={<GroupsIcon />}
                  >
                    {t('hero.requestTeam')}
                  </Button>
                </Box>
              </Reveal>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Reveal variant="slide" direction="left" timeout={640}>
                {/* Brochure booklet — click either page to open full-size */}
                <Box sx={{
                  display: 'flex',
                  gap: { xs: 2, sm: 3 },
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  px: { xs: 2, sm: 4, md: 2 },
                  pt: 1,
                  pb: 4,
                }}>
                  {[0, 1].map((page) => (
                    <Box
                      key={page}
                      onClick={() => { setBrochurePage(page); setBrochureOpen(true); }}
                      sx={{
                        flex: 1,
                        maxWidth: 240,
                        position: 'relative',
                        cursor: 'zoom-in',
                        // slight tilt gives the two pages a booklet feel
                        transform: page === 0
                          ? 'rotate(-2.5deg) translateY(0px)'
                          : 'rotate(1.8deg)  translateY(14px)',
                        transition: 'transform 340ms cubic-bezier(0.2,0,0,1), filter 340ms',
                        '&:hover': {
                          transform: 'rotate(0deg) translateY(-10px) scale(1.05)',
                          zIndex: 2,
                          filter: 'drop-shadow(0 24px 40px rgba(15,23,42,0.28))',
                        },
                        '&:hover .brochure-overlay': { opacity: 1 },
                        '&:hover .page-badge': { opacity: 0 },
                      }}
                    >
                      <Box
                        component="img"
                        src={`/flyers/rigoo-services-${i18n.language.startsWith('ar') ? 'ar' : 'en'}-${page}.jpg`}
                        alt={`Rigoo Marine brochure page ${page + 1}`}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          display: 'block',
                          borderRadius: 2.5,
                          boxShadow: '0 8px 32px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.10)',
                          border: '1px solid rgba(255,255,255,0.6)',
                        }}
                      />

                      {/* Hover gradient + zoom hint */}
                      <Box
                        className="brochure-overlay"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 2.5,
                          background: 'linear-gradient(to bottom, transparent 45%, rgba(0,42,68,0.78) 100%)',
                          opacity: 0,
                          transition: 'opacity 280ms',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          pb: 2.5,
                          gap: 0.5,
                        }}
                      >
                        <OpenInFullRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
                        <Typography sx={{
                          color: 'white', fontWeight: 700,
                          fontSize: '0.72rem', letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}>
                          View full size
                        </Typography>
                      </Box>

                      {/* Page badge — hides on hover */}
                      <Box
                        className="page-badge"
                        sx={{
                          position: 'absolute',
                          bottom: -14,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'background.paper',
                          border: '1.5px solid',
                          borderColor: 'divider',
                          borderRadius: 10,
                          px: 1.5,
                          py: 0.3,
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          transition: 'opacity 200ms',
                        }}
                      >
                        Page {page + 1} / 2
                      </Box>
                    </Box>
                  ))}
                </Box>

                {/* Hint below */}
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="caption" color="text.disabled" sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  }}>
                    <OpenInFullRoundedIcon sx={{ fontSize: 13 }} />
                    Click a page to view full-size
                  </Typography>
                </Box>
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Before & After Gallery ───────────────────────────────────────── */}
      <Box sx={{ py: { xs: 7, md: 11 }, px: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Reveal variant="fade">
            <Typography variant="h3" textAlign="center" gutterBottom>{t('gallery.title')}</Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              {t('gallery.subtitle')}
            </Typography>
          </Reveal>

          {galleryCategories.length > 0 && (
            <Reveal variant="fade" delay={80}>
              <Box sx={{ display: 'flex', gap: 1, mb: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  key="all"
                  label={t('gallery.categories.all')}
                  onClick={() => setGalleryCat('all')}
                  color={galleryCat === 'all' ? 'primary' : 'default'}
                  variant={galleryCat === 'all' ? 'filled' : 'outlined'}
                  sx={{ px: 2, fontWeight: 600 }}
                />
                {galleryCategories.map((cat) => (
                  <Chip
                    key={cat}
                    label={getCatLabel(cat)}
                    onClick={() => setGalleryCat(cat)}
                    color={galleryCat === cat ? 'primary' : 'default'}
                    variant={galleryCat === cat ? 'filled' : 'outlined'}
                    sx={{ px: 2, fontWeight: 600 }}
                  />
                ))}
              </Box>
            </Reveal>
          )}

          <Stagger key={galleryCat} variant="grow" step={80} timeout={520}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}
          >
            {visibleGallery.map((item) => (
              <Card
                key={item.id}
                sx={{
                  overflow: 'hidden', cursor: 'pointer',
                  transition: 'box-shadow 280ms, transform 280ms',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 18px 44px rgba(15,23,42,0.16)' },
                }}
                onClick={() => setSelectedImage(item)}
              >
                <BeforeAfterSlider
                  beforeSrc={item.before} afterSrc={item.after}
                  beforeLabel={t('gallery.before')} afterLabel={t('gallery.after')}
                  height={230}
                />
                <Box sx={{ p: 2 }}>
                  <Chip label={getCatLabel(item.category)} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                  <Typography variant="body1" fontWeight="600" gutterBottom>
                    {i18n.language.startsWith('ar') && item.titleAr ? item.titleAr : item.title}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SwapHorizIcon sx={{ fontSize: 14 }} />
                    {t('gallery.dragHint')}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* ── Why Choose / Values ──────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 7, md: 11 },
        backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(0,105,148,0.09), transparent 40%), radial-gradient(circle at 100% 100%, rgba(255,143,0,0.07), transparent 38%)',
        bgcolor: 'background.default',
      }}>
        <Container maxWidth="lg">
          <Reveal variant="fade">
            <Typography variant="h3" textAlign="center" gutterBottom>{t('values.title')}</Typography>
          </Reveal>
          <Stagger variant="slide" direction="up" step={100} timeout={540}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mt: 4 }}
          >
            {VALUE_ITEMS.map(({ key, Icon, color }) => (
              <Card key={key} sx={{ height: '100%', textAlign: 'center', p: 1 }}>
                <CardContent>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
                    border: `1.5px solid ${color}55`,
                  }}>
                    <Icon sx={{ fontSize: 28, color }} />
                  </Box>
                  <Typography variant="h6" gutterBottom>{t(`values.items.${key}.title`)}</Typography>
                  <Typography color="text.secondary" variant="body2">{t(`values.items.${key}.description`)}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade">
          <Typography variant="h3" textAlign="center" gutterBottom>{t('team.title')}</Typography>
        </Reveal>
        <Stagger variant="grow" step={120} timeout={520}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3, mt: 3 }}
        >
          {apiTeam.length > 0
            ? apiTeam.map((member) => (
                <Card key={member.id} sx={{ height: '100%' }}>
                  <CardContent>
                    <Avatar
                      src={member.photoUrl || undefined}
                      alt={member.name}
                      sx={{
                        width: 64, height: 64, mb: 2,
                        background: 'linear-gradient(135deg, #004263, #006994)',
                        fontSize: '1.4rem', fontWeight: 700,
                      }}
                    >
                      {!member.photoUrl && member.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      {i18n.language === 'ar' && member.nameAr ? member.nameAr : member.name}
                    </Typography>
                    <Typography color="primary.main" variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                      {i18n.language === 'ar' && member.roleAr ? member.roleAr : member.role}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {i18n.language === 'ar' && member.bioAr ? member.bioAr : member.bio}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            : TEAM_KEYS.map((key) => (
                <Card key={key} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{
                      width: 52, height: 52, borderRadius: '50%', mb: 2,
                      background: 'linear-gradient(135deg, #004263, #006994)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      fontSize: '1.4rem', fontWeight: 700,
                    }}>
                      {t(`team.members.${key}.name`).charAt(0)}
                    </Box>
                    <Typography variant="h6" gutterBottom>{t(`team.members.${key}.name`)}</Typography>
                    <Typography color="primary.main" variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                      {t(`team.members.${key}.role`)}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">{t(`team.members.${key}.bio`)}</Typography>
                  </CardContent>
                </Card>
              ))
          }
        </Stagger>
      </Container>

      {/* ── CTA / Contact ────────────────────────────────────────────────── */}
      <Reveal variant="slide" direction="up" timeout={640}>
        <Box sx={{
          color: 'white', py: { xs: 6, md: 9 }, px: { xs: 2, sm: 3 },
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(125deg, #004263 0%, #006994 60%, #0a8fbf 100%)',
          backgroundSize: '200% 200%', animation: 'rmShimmer 16s ease infinite',
        }}>
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,143,0,0.12), transparent 40%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.06), transparent 35%)',
          }} />
          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>{t('contact.title')}</Typography>
            <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>{t('contact.subtitle')}</Typography>
            <Typography variant="body1" sx={{ mb: 4, opacity: 0.85 }}>
              📧 <bdi>{contact.email}</bdi> &nbsp;|&nbsp; 📞 <bdi>{formatPhone(contact.phone)}</bdi>
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained" size="large"
                startIcon={<GroupsIcon />}
                onClick={() => setTeamDialogOpen(true)}
                sx={{ bgcolor: 'secondary.main', px: 4, py: 1.4, '&:hover': { bgcolor: 'secondary.dark' } }}
              >
                {t('hero.requestTeam')}
              </Button>
              {!isAuthenticated && (
                <Button
                  component={Link} to="/register" variant="outlined" size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', px: 4, py: 1.4, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: 'white' } }}
                >
                  {t('cta.button')}
                </Button>
              )}
            </Box>
          </Container>
        </Box>
      </Reveal>

      {/* ── Brochure lightbox ────────────────────────────────────────────── */}
      <Dialog
        open={brochureOpen}
        onClose={() => setBrochureOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Zoom}
        transitionDuration={{ enter: 320, exit: 200 }}
        PaperProps={{ sx: { bgcolor: '#0a0e14', borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setBrochureOpen(false)}
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
          >
            <CloseIcon />
          </IconButton>

          {/* Brochure image */}
          <Box
            component="img"
            key={brochurePage}
            src={`/flyers/rigoo-services-${i18n.language.startsWith('ar') ? 'ar' : 'en'}-${brochurePage}.jpg`}
            alt={`Rigoo Marine brochure page ${brochurePage + 1}`}
            sx={{ width: '100%', display: 'block' }}
          />

          {/* Page navigation bar */}
          <Box sx={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            py: 1.5,
            px: 3,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}>
            <IconButton
              onClick={() => setBrochurePage(0)}
              disabled={brochurePage === 0}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, '&.Mui-disabled': { opacity: 0.3 } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', userSelect: 'none' }}>
              Page {brochurePage + 1} / 2
            </Typography>
            <IconButton
              onClick={() => setBrochurePage(1)}
              disabled={brochurePage === 1}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, '&.Mui-disabled': { opacity: 0.3 } }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Gallery lightbox ─────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedImage} onClose={() => setSelectedImage(null)}
        maxWidth="md" fullWidth TransitionComponent={Zoom}
        transitionDuration={{ enter: 320, exit: 220 }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <Box>
              <BeforeAfterSlider
                beforeSrc={selectedImage.before} afterSrc={selectedImage.after}
                beforeLabel={t('gallery.before')} afterLabel={t('gallery.after')}
                height={480}
              />
              <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6">
                    {i18n.language.startsWith('ar') && selectedImage.titleAr ? selectedImage.titleAr : selectedImage.title}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">{getCatLabel(selectedImage.category)}</Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SwapHorizIcon sx={{ fontSize: 15 }} />
                  {t('gallery.dragHint')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <RequestTeamDialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} />
    </Box>
  );
}
