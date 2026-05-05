import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, CardActions, Button, Chip, Slide, Fade } from '@mui/material';
import { Link } from 'react-router-dom';
import { Reveal, Stagger } from '../../components/common/Motion';
import { SkeletonCardGrid } from '../../components/common/SkeletonCard';

const serviceCategories = ['All', 'Mechanical', 'Structural', 'Finishing'];

export default function Services() {
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockServices = [
      { id: 1, name: 'Engine Diagnostic', category: 'Mechanical', description: 'Complete engine analysis and troubleshooting', price: 150 },
      { id: 2, name: 'Engine Repair', category: 'Mechanical', description: 'Full engine repair and rebuild services', price: null },
      { id: 3, name: 'Oil Change', category: 'Mechanical', description: 'Regular oil change and filter replacement', price: 89 },
      { id: 4, name: 'Hull Repair', category: 'Structural', description: 'Fiberglass repair and hull restoration', price: null },
      { id: 5, name: 'Gel Coat Restoration', category: 'Finishing', description: 'Professional gel coat polishing and restoration', price: 500 },
      { id: 6, name: 'Bottom Paint', category: 'Finishing', description: 'Anti-fouling bottom paint application', price: 800 },
      { id: 7, name: 'Propeller Repair', category: 'Mechanical', description: 'Propeller straightening and repair', price: 200 },
      { id: 8, name: 'Transom Repair', category: 'Structural', description: 'Transom reinforcement and replacement', price: null },
    ];
    const t = setTimeout(() => {
      setServices(mockServices);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          color: 'white',
          py: { xs: 5, md: 8 },
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
          background: 'linear-gradient(125deg, #004263 0%, #006994 60%, #0a8fbf 100%)',
          backgroundSize: '200% 200%',
          animation: 'rmShimmer 16s ease infinite',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <Slide in direction="down" timeout={600}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>Our Services</Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Professional marine services for all vessel types
            </Typography>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        {/* Category Filters */}
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {serviceCategories.map((category) => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ px: 2, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Reveal>

        {/* Services Grid */}
        {loading ? (
          <SkeletonCardGrid count={6} />
        ) : (
          <Stagger
            key={selectedCategory}
            variant="grow"
            step={70}
            timeout={520}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Chip
                    label={service.category}
                    size="small"
                    sx={{ mb: 1 }}
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="h6" gutterBottom>
                    {service.name}
                  </Typography>
                  <Typography color="text.secondary" paragraph>
                    {service.description}
                  </Typography>
                  {service.price && (
                    <Typography variant="h6" color="primary.main">
                      From ${service.price}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button component={Link} to="/register" size="small">
                    Request Service
                  </Button>
                  <Button size="small">Learn More</Button>
                </CardActions>
              </Card>
            ))}
          </Stagger>
        )}

        {/* CTA */}
        <Reveal variant="slide" direction="up" timeout={620}>
          <Box textAlign="center" sx={{ mt: 6 }}>
            <Typography variant="h6" paragraph>
              Don't see what you need?
            </Typography>
            <Button component={Link} to="/register" variant="contained" size="large" sx={{ px: 4 }}>
              Request a Custom Quote
            </Button>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
