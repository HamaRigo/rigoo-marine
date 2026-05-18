import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CircularProgress, Slide, Fade, CardMedia, Chip, Dialog, DialogContent, IconButton, Zoom } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';
import { formatPhone } from '../../utils/format';

const VALUE_KEYS = ['quality', 'transparency', 'efficiency', 'trust'];
const VALUE_EMOJIS = { quality: '🎯', transparency: '💬', efficiency: '⏱️', trust: '🤝' };

const TEAM_KEYS = ['founder', 'manager', 'senior'];

const GALLERY_ITEMS = [
  { slug: 'engine-rebuild',      category: 'Mechanical' },
  { slug: 'hull-restoration',    category: 'Structural' },
  { slug: 'gel-coat-polish',     category: 'Finishing' },
  { slug: 'bottom-paint',        category: 'Finishing' },
  { slug: 'propeller-repair',    category: 'Mechanical' },
  { slug: 'transom-replacement', category: 'Structural' },
].map((item) => ({ ...item, image: `/gallery/${item.slug}.jpg` }));

const GALLERY_CATEGORIES = ['All', 'Mechanical', 'Structural', 'Finishing'];

export default function About() {
  const { t, i18n } = useTranslation('public');
  const [contactInfo, setContactInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [galleryCat, setGalleryCat] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

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

  const email = contactInfo.email_general || 'info@rigoomarine.com';
  const phoneRaw = contactInfo.phone_primary || '+97450123456';
  const phone = formatPhone(phoneRaw);

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
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
              {t('about.header.title')}
            </Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {t('about.header.subtitle')}
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
                <Typography variant="h4" gutterBottom>{t('about.story.title')}</Typography>
                <Typography paragraph>{t('about.story.p1')}</Typography>
                <Typography paragraph>{t('about.story.p2')}</Typography>
                <Typography paragraph>{t('about.story.p3')}</Typography>
              </Box>
            </Reveal>
          </Grid>
          <Grid item xs={12} md={6}>
            <Reveal variant="slide" direction="left" timeout={620}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {[0, 1].map((page) => (
                  <Box
                    key={page}
                    component="img"
                    src={`/flyers/rigoo-services-${i18n.language.startsWith('ar') ? 'ar' : 'en'}-${page}.jpg`}
                    alt={`${t('about.flyer.title')} ${page + 1}`}
                    loading="lazy"
                    sx={{
                      width: '50%',
                      borderRadius: 2,
                      boxShadow: '0 12px 36px rgba(15,23,42,0.18)',
                      transition: 'transform 360ms cubic-bezier(0.2,0,0,1)',
                      '&:hover': { transform: 'scale(1.03)' },
                    }}
                  />
                ))}
              </Box>
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
            <Typography variant="h4" textAlign="center" gutterBottom>{t('about.values.title')}</Typography>
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
            {VALUE_KEYS.map((key) => (
              <Card key={key} sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h3" sx={{ mb: 2 }}>{VALUE_EMOJIS[key]}</Typography>
                  <Typography variant="h6" gutterBottom>
                    {t(`about.values.items.${key}.title`)}
                  </Typography>
                  <Typography color="text.secondary">
                    {t(`about.values.items.${key}.description`)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* Gallery Section */}
      <Box sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Reveal variant="fade">
            <Typography variant="h4" textAlign="center" gutterBottom>
              {t('gallery.header.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              {t('gallery.header.subtitle')}
            </Typography>
          </Reveal>

          <Reveal variant="fade" delay={80}>
            <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {GALLERY_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={t(`gallery.categories.${cat === 'All' ? 'all' : cat}`)}
                  onClick={() => setGalleryCat(cat)}
                  color={galleryCat === cat ? 'primary' : 'default'}
                  variant={galleryCat === cat ? 'filled' : 'outlined'}
                  sx={{ px: 2, fontWeight: 600 }}
                />
              ))}
            </Box>
          </Reveal>

          <Stagger
            key={galleryCat}
            variant="grow"
            step={80}
            timeout={520}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {(galleryCat === 'All' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((i) => i.category === galleryCat)).map((item) => (
              <Card
                key={item.slug}
                sx={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  '& .gallery-img': { transition: 'transform 480ms cubic-bezier(0.2,0,0,1)' },
                  '&:hover .gallery-img': { transform: 'scale(1.06)' },
                }}
                onClick={() => setSelectedImage(item)}
              >
                <Box sx={{ overflow: 'hidden' }}>
                  <CardMedia
                    component="img"
                    className="gallery-img"
                    height="220"
                    image={item.image}
                    alt={t(`gallery.items.${item.slug}`)}
                    loading="lazy"
                  />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Chip
                    label={t(`gallery.categories.${item.category}`)}
                    size="small"
                    sx={{ mb: 1 }}
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="body1" fontWeight="600">
                    {t(`gallery.items.${item.slug}`)}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Stagger>
        </Container>
      </Box>

      {/* Team */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade">
          <Typography variant="h4" textAlign="center" gutterBottom>{t('about.team.title')}</Typography>
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
          {TEAM_KEYS.map((key) => (
            <Card key={key} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t(`about.team.members.${key}.name`)}
                </Typography>
                <Typography color="primary.main" gutterBottom>
                  {t(`about.team.members.${key}.role`)}
                </Typography>
                <Typography color="text.secondary">
                  {t(`about.team.members.${key}.bio`)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stagger>
      </Container>

      {/* Gallery lightbox */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Zoom}
        transitionDuration={{ enter: 320, exit: 220 }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: 'absolute', top: 8, right: 8,
              bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <Box>
              <img
                src={selectedImage.image}
                alt={t(`gallery.items.${selectedImage.slug}`)}
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'cover' }}
              />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">{t(`gallery.items.${selectedImage.slug}`)}</Typography>
                <Typography color="text.secondary">{t(`gallery.categories.${selectedImage.category}`)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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
            <Typography variant="h5" gutterBottom>{t('about.cta.title')}</Typography>
            <Typography variant="body1" paragraph sx={{ opacity: 0.9 }}>
              {t('about.cta.subtitle')}
            </Typography>
            <Typography variant="body1">
              📧 <bdi>{email}</bdi> &nbsp;|&nbsp; 📞 <bdi>{phone}</bdi>
            </Typography>
          </Container>
        </Box>
      </Reveal>
    </Box>
  );
}
