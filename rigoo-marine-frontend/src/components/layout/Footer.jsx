import { useState } from 'react';
import { Box, Container, Typography, Link as MuiLink, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../common/Motion';

function FooterBrandMark({ size = 40 }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <Box
        component="span"
        sx={{
          fontSize: size * 0.7,
          lineHeight: 1,
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'white',
          color: 'primary.main',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          animation: 'rmFloat 4.5s ease-in-out infinite',
        }}
      >
        ⚓
      </Box>
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        bgcolor: 'white',
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        flexShrink: 0,
        animation: 'rmFloat 4.5s ease-in-out infinite',
      }}
    >
      <Box
        component="img"
        src="/brand/logo.png"
        alt="Rigoo Marine"
        onError={() => setBroken(true)}
        sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </Box>
  );
}

export default function Footer() {
  const { i18n } = useTranslation();
  const flyerHref = i18n.language === 'ar' ? '/flyers/rigoo-services-ar.pdf' : '/flyers/rigoo-services-en.pdf';
  const flyerLabel = i18n.language === 'ar' ? 'تنزيل الكتيب (PDF)' : 'Download brochure (PDF)';
  const cardLabel = i18n.language === 'ar' ? 'بطاقة العمل (PDF)' : 'Business card (PDF)';
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
              <Typography variant="h6" gutterBottom sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <FooterBrandMark size={40} />
                Rigoo Marine
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Professional marine services for all your vessel needs.
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
                  {flyerLabel}
                </MuiLink>
                <MuiLink
                  href="/flyers/business-card.pdf"
                  target="_blank"
                  rel="noopener"
                  color="inherit"
                  underline="hover"
                  sx={{ fontSize: '0.875rem', opacity: 0.9, '&:hover': { color: 'secondary.light' } }}
                >
                  {cardLabel}
                </MuiLink>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ letterSpacing: 1, opacity: 0.85 }}>
                QUICK LINKS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <MuiLink component={Link} to="/services" color="inherit" underline="hover" sx={{ '&:hover': { color: 'secondary.light' } }}>
                  Services
                </MuiLink>
                <MuiLink component={Link} to="/gallery" color="inherit" underline="hover" sx={{ '&:hover': { color: 'secondary.light' } }}>
                  Gallery
                </MuiLink>
                <MuiLink component={Link} to="/about" color="inherit" underline="hover" sx={{ '&:hover': { color: 'secondary.light' } }}>
                  About Us
                </MuiLink>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ letterSpacing: 1, opacity: 0.85 }}>
                CONTACT
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Email: info@rigoomarine.com
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Phone: +1 (555) 123-4567
              </Typography>
            </Box>
          </Box>
        </Reveal>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.12)' }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            &copy; {new Date().getFullYear()} Rigoo Marine. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
