import { Box, Container, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.dark',
        color: 'white',
        py: 4,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              ⚓ Rigoo Marine
            </Typography>
            <Typography variant="body2">
              Professional marine services for all your vessel needs.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <MuiLink component={Link} to="/services" color="inherit" underline="hover">
                Services
              </MuiLink>
              <MuiLink component={Link} to="/gallery" color="inherit" underline="hover">
                Gallery
              </MuiLink>
              <MuiLink component={Link} to="/about" color="inherit" underline="hover">
                About Us
              </MuiLink>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Contact
            </Typography>
            <Typography variant="body2">
              Email: info@rigoomarine.com
            </Typography>
            <Typography variant="body2">
              Phone: +1 (555) 123-4567
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2">
            &copy; {new Date().getFullYear()} Rigoo Marine. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
