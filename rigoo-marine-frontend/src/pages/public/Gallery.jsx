import { useState } from 'react';
import { Box, Container, Typography, Card, CardMedia, Chip, Dialog, DialogContent, IconButton, Slide, Fade, Zoom } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { Reveal, Stagger } from '../../components/common/Motion';

const GALLERY_ITEMS = [
  { slug: 'engine-rebuild',       category: 'Mechanical' },
  { slug: 'hull-restoration',     category: 'Structural' },
  { slug: 'gel-coat-polish',      category: 'Finishing' },
  { slug: 'bottom-paint',         category: 'Finishing' },
  { slug: 'propeller-repair',     category: 'Mechanical' },
  { slug: 'transom-replacement',  category: 'Structural' },
].map((item) => ({ ...item, image: `/gallery/${item.slug}.jpg` }));

const CATEGORIES = ['All', 'Mechanical', 'Structural', 'Finishing'];

export default function Gallery() {
  const { t } = useTranslation('public');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredItems = selectedCategory === 'All'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.category === selectedCategory);

  const itemTitle = (slug) => t(`gallery.items.${slug}`);
  const categoryLabel = (cat) => t(`gallery.categories.${cat === 'All' ? 'all' : cat}`);

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
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>{t('gallery.header.title')}</Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {t('gallery.header.subtitle')}
            </Typography>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        {/* Category Filters */}
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CATEGORIES.map((category) => (
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

        {/* Gallery Grid */}
        <Stagger
          key={selectedCategory}
          variant="grow"
          step={80}
          timeout={520}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {filteredItems.map((item) => (
            <Card
              key={item.slug}
              sx={{
                cursor: 'pointer',
                overflow: 'hidden',
                '& .gallery-img': {
                  transition: 'transform 480ms cubic-bezier(0.2,0,0,1)',
                },
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
                  alt={itemTitle(item.slug)}
                  loading="lazy"
                />
              </Box>
              <Box sx={{ p: 2 }}>
                <Chip
                  label={categoryLabel(item.category)}
                  size="small"
                  sx={{ mb: 1 }}
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body1" fontWeight="600">
                  {itemTitle(item.slug)}
                </Typography>
              </Box>
            </Card>
          ))}
        </Stagger>
      </Container>

      {/* Image Dialog */}
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
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <Box>
              <img
                src={selectedImage.image}
                alt={itemTitle(selectedImage.slug)}
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'cover' }}
              />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">{itemTitle(selectedImage.slug)}</Typography>
                <Typography color="text.secondary">{categoryLabel(selectedImage.category)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
