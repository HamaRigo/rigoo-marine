import { Box, Container, Typography, Link as MuiLink, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import { Reveal } from '../common/Motion';

export default function Footer() {
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
                <Box component="span" sx={{ animation: 'rmFloat 4.5s ease-in-out infinite', display: 'inline-block' }}>⚓</Box>
                Rigoo Marine
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Professional marine services for all your vessel needs.
              </Typography>
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
