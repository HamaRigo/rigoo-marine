import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import EngineRepairIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();
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
            Professional Marine Services
          </Typography>
          <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.9 }}>
            Expert repair, maintenance, and restoration for all types of vessels
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              to="/services"
              variant="contained"
              size="large"
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              Browse Services
            </Button>
            {!isAuthenticated && (
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                size="large"
                sx={{ color: 'white', borderColor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Get Started
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Services Preview */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          Our Services
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          Comprehensive solutions for all your marine needs
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {/* Mechanical Services */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 2,
              textAlign: 'center',
            }}
          >
            <EngineRepairIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Mechanical Services
            </Typography>
            <Typography color="text.secondary">
              Engine repair, maintenance, and diagnostics for all major brands
            </Typography>
          </Box>

          {/* Structural Services */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 2,
              textAlign: 'center',
            }}
          >
            <DirectionsBoatIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Structural Services
            </Typography>
            <Typography color="text.secondary">
              Hull repair, fiberglass work, and structural modifications
            </Typography>
          </Box>

          {/* Finishing Services */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 2,
              textAlign: 'center',
            }}
          >
            <StarIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Finishing Services
            </Typography>
            <Typography color="text.secondary">
              Gel coat restoration, painting, and interior refinishing
            </Typography>
          </Box>
        </Box>

        <Box textAlign="center" sx={{ mt: 4 }}>
          <Button component={Link} to="/services" variant="contained" size="large">
            View All Services
          </Button>
        </Box>
      </Container>

      {/* Why Choose Us */}
      <Box sx={{ bgcolor: 'background.default', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom>
            Why Choose Rigoo Marine
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4, mt: 4 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>✓</Typography>
              <Box>
                <Typography variant="h6" gutterBottom>Experienced Technicians</Typography>
                <Typography color="text.secondary">
                  Certified professionals with years of marine industry experience
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>✓</Typography>
              <Box>
                <Typography variant="h6" gutterBottom>Quality Parts</Typography>
                <Typography color="text.secondary">
                  We use only OEM and high-quality aftermarket parts
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>✓</Typography>
              <Box>
                <Typography variant="h6" gutterBottom>Fast Turnaround</Typography>
                <Typography color="text.secondary">
                  Quick service without compromising on quality
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>✓</Typography>
              <Box>
                <Typography variant="h6" gutterBottom>Transparent Pricing</Typography>
                <Typography color="text.secondary">
                  No hidden fees - clear quotes before any work begins
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      {!isAuthenticated && (
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 3, opacity: 0.9 }}>
            Create an account and request service for your vessel today
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="large"
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            Create Account
          </Button>
        </Container>
      </Box>
      )}
    </Box>
  );
}
