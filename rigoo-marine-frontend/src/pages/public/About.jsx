import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CircularProgress, Slide, Fade } from '@mui/material';
import { adminApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';

const team = [
  { name: 'John Smith', role: 'Founder & Master Technician', bio: '25+ years of marine engine experience' },
  { name: 'Sarah Johnson', role: 'Service Manager', bio: 'Certified in fiberglass and structural repair' },
  { name: 'Mike Davis', role: 'Senior Technician', bio: 'Specialist in electrical systems and diagnostics' },
];

const values = [
  { emoji: '🎯', title: 'Quality', desc: 'We never cut corners - every job is done right the first time' },
  { emoji: '💬', title: 'Transparency', desc: 'Clear communication and honest pricing on every project' },
  { emoji: '⏱️', title: 'Efficiency', desc: 'Fast turnaround times without compromising quality' },
  { emoji: '🤝', title: 'Trust', desc: 'Building long-term relationships with our customers' },
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
      <Box
        sx={{
          color: 'white',
          py: { xs: 5, md: 8 },
          px: { xs: 2, sm: 3 },
          textAlign: 'center',
          background: 'linear-gradient(125deg, #004263 0%, #006994 60%, #0a8fbf 100%)',
          backgroundSize: '200% 200%',
          animation: 'rmShimmer 16s ease infinite',
        }}
      >
        <Container maxWidth="md">
          <Slide in direction="down" timeout={600}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>About Rigoo Marine</Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Your trusted partner for professional marine services
            </Typography>
          </Fade>
        </Container>
      </Box>

      {/* Company Story */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Reveal variant="slide" direction="right" timeout={620}>
              <Box>
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
              </Box>
            </Reveal>
          </Grid>
          <Grid item xs={12} md={6}>
            <Reveal variant="slide" direction="left" timeout={620}>
              <Box
                component="img"
                src="/gallery/about-workshop.jpg"
                alt="Marine workshop"
                loading="lazy"
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  boxShadow: '0 16px 40px rgba(15,23,42,0.15)',
                  transition: 'transform 360ms cubic-bezier(0.2,0,0,1)',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
              />
            </Reveal>
          </Grid>
        </Grid>
      </Container>

      {/* Values */}
      <Box
        sx={{
          bgcolor: 'background.default',
          py: { xs: 5, md: 8 },
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(0,105,148,0.08), transparent 40%), radial-gradient(circle at 100% 100%, rgba(255,143,0,0.06), transparent 35%)',
        }}
      >
        <Container maxWidth="lg">
          <Reveal variant="fade">
            <Typography variant="h4" textAlign="center" gutterBottom>Our Values</Typography>
          </Reveal>
          <Stagger
            variant="slide"
            direction="up"
            step={100}
            timeout={520}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3,
              mt: 3,
            }}
          >
            {values.map((v) => (
              <Card key={v.title} sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" sx={{ mb: 2 }}>{v.emoji}</Typography>
                  <Typography variant="h6" gutterBottom>{v.title}</Typography>
                  <Typography color="text.secondary">{v.desc}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* Team */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade">
          <Typography variant="h4" textAlign="center" gutterBottom>Meet Our Team</Typography>
        </Reveal>
        <Stagger
          variant="grow"
          step={120}
          timeout={520}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
            mt: 3,
          }}
        >
          {team.map((member) => (
            <Card key={member.name} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>{member.name}</Typography>
                <Typography color="primary.main" gutterBottom>{member.role}</Typography>
                <Typography color="text.secondary">{member.bio}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stagger>
      </Container>

      {/* Contact CTA */}
      <Reveal variant="slide" direction="up" timeout={620}>
        <Box
          sx={{
            color: 'white',
            py: { xs: 4, md: 6 },
            px: { xs: 2, sm: 3 },
            textAlign: 'center',
            background: 'linear-gradient(135deg, #004263 0%, #006994 100%)',
          }}
        >
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
      </Reveal>
    </Box>
  );
}
