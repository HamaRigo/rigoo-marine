import { useState, useEffect } from 'react';
import { Box, Container, Typography, Link as MuiLink, Divider } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../common/Motion';
import { WAVE_DELAY } from '../../utils/waveSync';
import { publicApi } from '../../services/api';

function FooterBrandMark({ size = 48 }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: size * 0.7,
        lineHeight: 1,
        color: 'white',
        animation: `rmWave 5s ease-in-out ${WAVE_DELAY} infinite`,
      }}
    >
      ⚓
    </Box>
  );
}

export default function Footer() {
  const { t, i18n } = useTranslation(['public', 'navbar']);
  const navigate = useNavigate();
  const location = useLocation();
  const flyerHref = i18n.language === 'ar' ? '/flyers/rigoo-services-ar.pdf' : '/flyers/rigoo-services-en.pdf';
  const [contact, setContact] = useState({ email: 'rigoomarine@gmail.com', phone: '+974 709 709 17' });

  const handleStoryClick = (e) => {
    e.preventDefault();
    const scroll = () => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      setTimeout(scroll, 420);
    }
  };

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
  return (
    <Box
      component="footer"
      sx={{
        color: 'white',
        py: 5,
        mt: 'auto',
        background: 'linear-gradient(135deg, #002a44 0%, #004263 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(255,143,0,0.10), transparent 35%), radial-gradient(circle at 90% 100%, rgba(76,151,194,0.18), transparent 40%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Reveal variant="fade" timeout={600}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <Box sx={{ maxWidth: 320 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <FooterBrandMark size={48} />
                <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                  <Typography
                    sx={{
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      letterSpacing: '0.12em',
                      lineHeight: 1.15,
                      textTransform: 'uppercase',
                    }}
                  >
                    Rigoo
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(180,148,75,0.92)',
                      fontWeight: 400,
                      fontSize: '0.58rem',
                      letterSpacing: '0.32em',
                      lineHeight: 1.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    Marine
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {t('public:footer.tagline')}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <MuiLink
                  href={flyerHref}
                  target="_blank"
                  rel="noopener"
                  color="inherit"
                  underline="hover"
                  sx={{ fontSize: '0.875rem', opacity: 0.9, '&:hover': { color: 'secondary.light' } }}
                >
                  {t('public:footer.downloads.brochure')}
                </MuiLink>
                <MuiLink
                  href="/flyers/business-card.pdf"
                  target="_blank"
                  rel="noopener"
                  color="inherit"
                  underline="hover"
                  sx={{ fontSize: '0.875rem', opacity: 0.9, '&:hover': { color: 'secondary.light' } }}
                >
                  {t('public:footer.downloads.businessCard')}
                </MuiLink>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ letterSpacing: 1, opacity: 0.85 }}>
                {t('public:footer.quickLinks')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <MuiLink component={Link} to="/services" color="inherit" underline="hover" sx={{ '&:hover': { color: 'secondary.light' } }}>
                  {t('public:footer.links.services')}
                </MuiLink>
                <MuiLink onClick={handleStoryClick} color="inherit" underline="hover" sx={{ cursor: 'pointer', '&:hover': { color: 'secondary.light' } }}>
                  {t('public:footer.links.about')}
                </MuiLink>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ letterSpacing: 1, opacity: 0.85 }}>
                {t('public:footer.contact.title')}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {t('public:footer.contact.emailLabel')}: <bdi>{contact.email}</bdi>
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {t('public:footer.contact.phoneLabel')}: <bdi>{contact.phone}</bdi>
              </Typography>
            </Box>
          </Box>
        </Reveal>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.12)' }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            &copy; {new Date().getFullYear()} {t('navbar:brand')}. {t('public:footer.rights')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
