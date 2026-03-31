import { useState } from 'react';
import { Box, Container, Typography, Grid, Card, CardMedia, Chip, Dialog, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom>Gallery</Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            See our work - Before & After transformations
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Category Filters */}
        <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map((category) => (
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

        {/* Gallery Grid */}
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card
                sx={{ cursor: 'pointer' }}
                onClick={() => setSelectedImage(item)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={item.image}
                  alt={item.title}
                />
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
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Image Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="md"
        fullWidth
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
