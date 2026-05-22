import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Chip, MenuItem,
  ImageList, ImageListItem, ImageListItemBar, CircularProgress, Alert,
  FormControl, InputLabel, Select, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  PhotoLibrary as PhotoIcon, Videocam as VideoIcon, Description as DocumentIcon,
  FilterList as FilterIcon, Refresh as RefreshIcon
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const MEDIA_TYPES = [
  { value: 'IMAGE', label: 'Image', icon: PhotoIcon },
  { value: 'VIDEO', label: 'Video', icon: VideoIcon },
  { value: 'DOCUMENT', label: 'Document', icon: DocumentIcon },
];

const CATEGORIES = [
  { value: 'gallery', label: 'Gallery' },
  { value: 'about', label: 'About Us' },
  { value: 'services', label: 'Services' },
  { value: 'team', label: 'Team' },
  { value: 'projects', label: 'Projects' },
];

export default function MediaManagement() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'IMAGE',
    description: '',
    category: 'gallery',
  });

  const { data: media, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-media'],
    queryFn: adminApi.getAllMedia,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createMedia,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-media']);
      toast.success('Media created successfully');
      handleCloseDialog();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create media');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateMedia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-media']);
      toast.success('Media updated successfully');
      handleCloseDialog();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update media');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteMedia,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-media']);
      toast.success('Media deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete media');
    },
  });

  const handleOpenDialog = (mediaItem = null) => {
    if (mediaItem) {
      setSelectedMedia(mediaItem);
      setFormData({
        title: mediaItem.title || '',
        url: mediaItem.url || '',
        type: mediaItem.type || 'IMAGE',
        description: mediaItem.description || '',
        category: mediaItem.category || 'gallery',
      });
    } else {
      setSelectedMedia(null);
      setFormData({
        title: '',
        url: '',
        type: 'IMAGE',
        description: '',
        category: 'gallery',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMedia(null);
    setFormData({
      title: '',
      url: '',
      type: 'IMAGE',
      description: '',
      category: 'gallery',
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.url) {
      toast.error('Title and URL are required');
      return;
    }

    if (selectedMedia) {
      updateMutation.mutate({ id: selectedMedia.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this media?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredMedia = (media || []).filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load media. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Media Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Media
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }} >
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={filterType}
                  label="Filter by Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {MEDIA_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} >
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Filter by Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} >
              <Typography variant="body2" color="text.secondary">
                Showing: {filteredMedia.length} of {media?.length || 0} items
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <PhotoIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No media found</Typography>
            <Typography color="text.secondary">
              {filterType !== 'all' || filterCategory !== 'all'
                ? 'Try changing the filters'
                : 'Click "Add Media" to get started'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <ImageList variant="masonry" cols={3} gap={16}>
          {filteredMedia.map((item) => (
            <ImageListItem key={item.id}>
              {item.type === 'IMAGE' ? (
                <img
                  src={item.url}
                  alt={item.title}
                  loading="lazy"
                  style={{ borderRadius: 8 }}
                />
              ) : item.type === 'VIDEO' ? (
                <Box
                  sx={{
                    bgcolor: 'grey.800',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                  }}
                >
                  <VideoIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    bgcolor: 'grey.100',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                  }}
                >
                  <DocumentIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                </Box>
              )}
              <ImageListItemBar
                title={item.title}
                subtitle={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={item.type} size="small" />
                    <Chip label={item.category} size="small" variant="outlined" />
                  </Box>
                }
                actionIcon={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(item)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMedia ? 'Edit Media' : 'Add New Media'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12} >
              <TextField
                label="Title"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid size={12} >
              <TextField
                label="URL"
                fullWidth
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                helperText="Direct URL to the media file"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} >
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {MEDIA_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} >
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12} >
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedMedia ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
