import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, CardActions, CardMedia,
  Button, Chip, Slide, Fade, Collapse, Dialog, DialogContent, IconButton, Zoom,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal, Stagger } from '../../components/common/Motion';
import { SkeletonCardGrid } from '../../components/common/SkeletonCard';
import { publicApi } from '../../services/api';

export default function Services() {
  const { t } = useTranslation('public');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [posterOpen, setPosterOpen] = useState(null);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  useEffect(() => {
    if (expandedId === null) return;
    const handler = () => setExpandedId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expandedId]);

  useEffect(() => {
    publicApi.getServices()
      .then((data) => {
        const list = (Array.isArray(data) ? data : data?.content ?? [])
          .filter((s) => s.active !== false);
        setServices(list);
        const uniqueCats = [...new Set(list.map((s) => s.category).filter(Boolean))];
        setCategories(['All', ...uniqueCats]);
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter((s) => s.category === selectedCategory);

  const categoryLabel = (cat) =>
    cat === 'All'
      ? t('services.categories.all')
      : t(`services.categories.${cat}`, { defaultValue: cat });

  return (
    <Box>
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
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
              {t('services.header.title')}
            </Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {t('services.header.subtitle')}
            </Typography>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((category) => (
              <Chip
                key={category}
                label={categoryLabel(category)}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ px: 2, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Reveal>

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
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 3,
            }}
          >
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 260ms ease, transform 260ms ease',
                  '&:hover': { boxShadow: '0 18px 44px rgba(15,23,42,0.14)', transform: 'translateY(-4px)' },
                }}
              >
                {/* Image / poster */}
                {service.imageUrl ? (
                  <Box
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      bgcolor: '#f0f4f8',
                      cursor: 'zoom-in',
                      '&:hover .poster-overlay': { opacity: 1 },
                      '&:hover .poster-img': { transform: 'scale(1.02)' },
                    }}
                    onClick={() => setPosterOpen(service)}
                  >
                    <CardMedia
                      component="img"
                      className="poster-img"
                      image={service.imageUrl}
                      alt={service.name}
                      sx={{
                        height: { xs: 340, sm: 460, md: 520 },
                        objectFit: 'contain',
                        p: 1.5,
                        transition: 'transform 400ms cubic-bezier(0.2,0,0,1)',
                      }}
                    />
                    <Box
                      className="poster-overlay"
                      sx={{
                        position: 'absolute', inset: 0,
                        bgcolor: 'rgba(0,66,99,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 260ms ease',
                      }}
                    >
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        bgcolor: 'white', color: 'primary.dark',
                        px: 2.5, py: 1, borderRadius: '20px',
                        fontWeight: 700, fontSize: '0.9rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                      }}>
                        <OpenInFullIcon sx={{ fontSize: 18 }} />
                        View Full Size
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BuildIcon sx={{ fontSize: 64, color: 'primary.light', opacity: 0.4 }} />
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  {service.category && (
                    <Chip
                      label={categoryLabel(service.category)}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 1.5 }}
                    />
                  )}
                  <Typography variant="h6" gutterBottom fontWeight={700}>
                    {service.name}
                  </Typography>
                  <Collapse in={expandedId === service.id} timeout={300}>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {service.description}
                    </Typography>
                  </Collapse>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button component={Link} to="/register" size="small" variant="contained">
                    {t('services.request')}
                  </Button>
                  {service.description && (
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(service.id); }}
                      endIcon={
                        <ExpandMoreIcon
                          fontSize="small"
                          sx={{
                            transform: expandedId === service.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 280ms cubic-bezier(0.2,0,0,1)',
                          }}
                        />
                      }
                    >
                      {expandedId === service.id ? t('services.showLess') : t('services.learnMore')}
                    </Button>
                  )}
                </CardActions>
              </Card>
            ))}
          </Stagger>
        )}

        {/* Poster lightbox */}
        <Dialog
          open={!!posterOpen}
          onClose={() => setPosterOpen(null)}
          maxWidth="lg"
          fullWidth
          TransitionComponent={Zoom}
          transitionDuration={{ enter: 300, exit: 200 }}
          PaperProps={{ sx: { bgcolor: '#f0f4f8' } }}
        >
          <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <IconButton
              onClick={() => setPosterOpen(null)}
              sx={{
                position: 'absolute', top: 10, right: 10, zIndex: 1,
                bgcolor: 'rgba(0,0,0,0.48)', color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.70)' },
              }}
            >
              <CloseIcon />
            </IconButton>
            {posterOpen && (
              <Box>
                <Box
                  component="img"
                  src={posterOpen.imageUrl}
                  alt={posterOpen.name}
                  sx={{ width: '100%', maxHeight: '88vh', objectFit: 'contain', display: 'block' }}
                />
                <Box sx={{ px: 3, py: 2, bgcolor: 'white' }}>
                  <Typography variant="h6" fontWeight={700}>{posterOpen.name}</Typography>
                  {posterOpen.description && (
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                      {posterOpen.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        <Reveal variant="slide" direction="up" timeout={620}>
          <Box textAlign="center" sx={{ mt: 6 }}>
            <Typography variant="h6" paragraph>
              {t('services.cta.title')}
            </Typography>
            <Button component={Link} to="/register" variant="contained" size="large" sx={{ px: 4 }}>
              {t('services.cta.button')}
            </Button>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
