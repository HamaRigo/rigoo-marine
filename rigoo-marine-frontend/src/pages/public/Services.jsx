import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CardActions, Button, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/api';

const serviceCategories = ['All', 'Mechanical', 'Structural', 'Finishing'];

export default function Services() {
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load services - using mock data for now
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
    setServices(mockServices);
    setLoading(false);
  }, []);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom>Our Services</Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Professional marine services for all vessel types
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Category Filters */}
        <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {serviceCategories.map((category) => (
            <Chip
              key={category}
              label={category}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              sx={{ px: 2 }}
            />
          ))}
        </Box>

        {/* Services Grid */}
        {loading ? (
          <Typography textAlign="center">Loading services...</Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredServices.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              </Grid>
            ))}
          </Grid>
        )}

        {/* CTA */}
        <Box textAlign="center" sx={{ mt: 6 }}>
          <Typography variant="h6" paragraph>
            Don't see what you need?
          </Typography>
          <Button component={Link} to="/register" variant="contained" size="large">
            Request a Custom Quote
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
