import { useState } from 'react';
import { Box, Container, Typography, Card, CardMedia, Chip, Dialog, DialogContent, IconButton, Slide, Fade, Zoom } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Reveal, Stagger } from '../../components/common/Motion';

const galleryItems = [
  { id: 1, title: 'Engine Rebuild', category: 'Mechanical', image: 'https://images.unsplash.com/photo-1569263979104-565b634a6e79?w=800', beforeAfter: true },
  { id: 2, title: 'Hull Restoration', category: 'Structural', image: 'https://images.unsplash.com/photo-1544551763-46a8723ba3f9?w=800', beforeAfter: true },
  { id: 3, title: 'Gel Coat Polish', category: 'Finishing', image: 'https://images.unsplash.com/photo-1567890944229-2d6d1d4e6c61?w=800', beforeAfter: true },
  { id: 4, title: 'Bottom Paint Job', category: 'Finishing', image: 'https://images.unsplash.com/photo-1566808996799-011a7d8f0a56?w=800', beforeAfter: true },
  { id: 5, title: 'Propeller Repair', category: 'Mechanical', image: 'https://images.unsplash.com/photo-1598460662955-43f54f3c784b?w=800', beforeAfter: true },
  { id: 6, title: 'Transom Replacement', category: 'Structural', image: 'https://images.unsplash.com/photo-1540946485062-a6264be0b608?w=800', beforeAfter: true },
];

const categories = ['All', 'Mechanical', 'Structural', 'Finishing'];

export default function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredItems = selectedCategory === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedCategory);

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
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>Gallery</Typography>
          </Slide>
          <Fade in timeout={900} style={{ transitionDelay: '160ms' }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              See our work - Before &amp; After transformations
            </Typography>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        {/* Category Filters */}
        <Reveal variant="fade" timeout={500}>
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((category) => (
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
              key={item.id}
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
                  alt={item.title}
                />
              </Box>
              <Box sx={{ p: 2 }}>
                <Chip
                  label={item.category}
                  size="small"
                  sx={{ mb: 1 }}
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body1" fontWeight="600">
                  {item.title}
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
                alt={selectedImage.title}
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'cover' }}
              />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">{selectedImage.title}</Typography>
                <Typography color="text.secondary">{selectedImage.category}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
