import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { publicApi, adminApi } from '../../services/api';

const team = [
  { name: 'John Smith', role: 'Founder & Master Technician', bio: '25+ years of marine engine experience' },
  { name: 'Sarah Johnson', role: 'Service Manager', bio: 'Certified in fiberglass and structural repair' },
  { name: 'Mike Davis', role: 'Senior Technician', bio: 'Specialist in electrical systems and diagnostics' },
];

export default function About() {
  const [contactInfo, setContactInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const data = await adminApi.getAllContactInfo();
        const info = {};
        data.forEach((item) => {
          if (item.active) {
            info[item.keyName] = item.value;
          }
        });
        setContactInfo(info);
      } catch (error) {
        console.error('Failed to fetch contact info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  const getContact = (key) => contactInfo[key] || {
    'phone_primary': '+1 (555) 123-4567',
    'email_general': 'info@rigoomarine.com',
  }[key] || '';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom>About Rigoo Marine</Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Your trusted partner for professional marine services
          </Typography>
        </Container>
      </Box>

      {/* Company Story */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>Our Story</Typography>
            <Typography paragraph>
              Founded in 1998, Rigoo Marine has been serving boat owners and marine
              businesses with professional repair, maintenance, and restoration services.
            </Typography>
            <Typography paragraph>
              What started as a small engine repair shop has grown into a full-service
              marine facility capable of handling projects of all sizes - from routine
              maintenance to complete vessel restorations.
            </Typography>
            <Typography paragraph>
              Our commitment to quality workmanship, transparent pricing, and excellent
              customer service has made us the go-to choice for marine services in the region.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src="https://images.unsplash.com/photo-1567890944229-2d6d1d4e6c61?w=800"
              alt="Marine workshop"
              sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}
            />
          </Grid>
        </Grid>
      </Container>

      {/* Values */}
      <Box sx={{ bgcolor: 'background.default', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" textAlign="center" gutterBottom>Our Values</Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" color="primary.main" sx={{ mb: 2 }}>🎯</Typography>
                  <Typography variant="h6" gutterBottom>Quality</Typography>
                  <Typography color="text.secondary">
                    We never cut corners - every job is done right the first time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" color="primary.main" sx={{ mb: 2 }}>💬</Typography>
                  <Typography variant="h6" gutterBottom>Transparency</Typography>
                  <Typography color="text.secondary">
                    Clear communication and honest pricing on every project
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" color="primary.main" sx={{ mb: 2 }}>⏱️</Typography>
                  <Typography variant="h6" gutterBottom>Efficiency</Typography>
                  <Typography color="text.secondary">
                    Fast turnaround times without compromising quality
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" color="primary.main" sx={{ mb: 2 }}>🤝</Typography>
                  <Typography variant="h6" gutterBottom>Trust</Typography>
                  <Typography color="text.secondary">
                    Building long-term relationships with our customers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Team */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" textAlign="center" gutterBottom>Meet Our Team</Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {team.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.name}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{member.name}</Typography>
                  <Typography color="primary.main" gutterBottom>{member.role}</Typography>
                  <Typography color="text.secondary">{member.bio}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Contact CTA */}
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h5" gutterBottom>Have Questions?</Typography>
          <Typography variant="body1" paragraph sx={{ opacity: 0.9 }}>
            Contact us today to discuss your marine service needs
          </Typography>
          <Typography variant="body1">
            📧 {getContact('email_general') || 'info@rigoomarine.com'} | 📞 {getContact('phone_primary') || '+1 (555) 123-4567'}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
