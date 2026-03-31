import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { vesselApi } from '../../services/api';
import AddIcon from '@mui/icons-material/Add';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import toast from 'react-hot-toast';

export default function MyVessels() {
  const { user } = useAuth();
  const clientId = user?.id;
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    engineType: '',
    brand: '',
    model: '',
  });

  const { data: vessels, isLoading, error } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn: () => vesselApi.getMyVessels(clientId),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: vesselApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels', 'my'] });
      setOpenDialog(false);
      setFormData({ name: '', type: '', engineType: '', brand: '', model: '' });
      toast.success('Vessel added successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add vessel');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vesselApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels', 'my'] });
      toast.success('Vessel deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete vessel');
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({ ...formData, clientId });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vessel?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load vessels</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">My Vessels</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          Add Vessel
        </Button>
      </Box>

      {!vessels || vessels.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <DirectionsBoatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>No vessels added</Typography>
            <Typography color="text.secondary" paragraph>
              Add your first vessel to start requesting services
            </Typography>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              Add Vessel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {vessels.map((vessel) => (
            <Grid item xs={12} sm={6} md={4} key={vessel.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DirectionsBoatIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h6">{vessel.name}</Typography>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{vessel.type}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Engine</Typography>
                      <Typography variant="body2">{vessel.engineType || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Brand</Typography>
                      <Typography variant="body2">{vessel.brand || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Model Year</Typography>
                      <Typography variant="body2">{vessel.model || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" fullWidth>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      color="error"
                      onClick={() => handleDelete(vessel.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Vessel Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Vessel</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Vessel Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            margin="normal"
            placeholder="e.g., Cruiser, Sailboat, Yacht"
            required
          />
          <TextField
            fullWidth
            label="Engine Type"
            value={formData.engineType}
            onChange={(e) => setFormData({ ...formData, engineType: e.target.value })}
            margin="normal"
            placeholder="e.g., Gas, Diesel, Electric"
          />
          <TextField
            fullWidth
            label="Brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            margin="normal"
            placeholder="e.g., MerCruiser, Yamaha, Volvo Penta"
          />
          <TextField
            fullWidth
            label="Model Year"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || !formData.name || !formData.type}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Vessel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
