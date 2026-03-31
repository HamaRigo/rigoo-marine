import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Chip,
  IconButton, Switch, FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const categories = ['Mechanical', 'Structural', 'Finishing'];

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Mechanical',
    description: '',
    price: '',
    active: true,
  });

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/services')
    setServices([
      { id: 1, name: 'Engine Diagnostic', category: 'Mechanical', description: 'Complete engine analysis', price: 150, active: true },
      { id: 2, name: 'Oil Change', category: 'Mechanical', description: 'Oil and filter replacement', price: 89, active: true },
      { id: 3, name: 'Bottom Paint', category: 'Finishing', description: 'Anti-fouling paint', price: 800, active: true },
    ]);
    setLoading(false);
  }, []);

  const handleOpenDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price?.toString() || '',
        active: service.active,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        category: 'Mechanical',
        description: '',
        price: '',
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingService(null);
  };

  const handleSubmit = async () => {
    // TODO: Call API to create/update service
    // POST /api/admin/services or PUT /api/admin/services/:id
    const serviceData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
    };

    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...serviceData } : s));
    } else {
      setServices([...services, { ...serviceData, id: Date.now() }]);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    // TODO: Call API to delete service
    // DELETE /api/admin/services/:id
    setServices(services.filter(s => s.id !== id));
  };

  const handleToggleActive = async (id) => {
    // TODO: Call API to toggle active status
    setServices(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  if (loading) {
    return <Typography>Loading services...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Service Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          Add Service
        </Button>
      </Box>

      <Grid container spacing={3}>
        {services.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.id}>
            <Card sx={{ position: 'relative', opacity: service.active ? 1 : 0.6 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Chip label={service.category} size="small" color="primary" variant="outlined" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={service.active}
                        onChange={() => handleToggleActive(service.id)}
                        size="small"
                      />
                    }
                    label={service.active ? 'Active' : 'Inactive'}
                  />
                </Box>

                <Typography variant="h6" gutterBottom>{service.name}</Typography>
                <Typography color="text.secondary" paragraph>
                  {service.description}
                </Typography>

                {service.price && (
                  <Typography variant="h6" color="primary.main">
                    ${service.price}
                  </Typography>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(service)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(service.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingService ? 'Edit Service' : 'Add New Service'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Service Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            margin="normal"
            required
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            required
          />
          <TextField
            fullWidth
            label="Price (USD)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            margin="normal"
            placeholder="Leave empty for custom pricing"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingService ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
