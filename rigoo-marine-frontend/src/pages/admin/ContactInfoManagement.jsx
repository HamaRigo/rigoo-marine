import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  ContactPhone as ContactIcon, Refresh as RefreshIcon
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'location', label: 'Location' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social Media' },
  { value: 'hours', label: 'Business Hours' },
];

const PRESET_KEYS = {
  general: [
    { key: 'company_name', label: 'Company Name' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'description', label: 'Description' },
  ],
  location: [
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State/Province' },
    { key: 'zip', label: 'ZIP/Postal Code' },
    { key: 'country', label: 'Country' },
    { key: 'google_maps_link', label: 'Google Maps Link' },
  ],
  phone: [
    { key: 'phone_primary', label: 'Primary Phone' },
    { key: 'phone_secondary', label: 'Secondary Phone' },
    { key: 'fax', label: 'Fax' },
  ],
  email: [
    { key: 'email_general', label: 'General Email' },
    { key: 'email_support', label: 'Support Email' },
    { key: 'email_sales', label: 'Sales Email' },
  ],
  social: [
    { key: 'facebook', label: 'Facebook URL' },
    { key: 'instagram', label: 'Instagram URL' },
    { key: 'twitter', label: 'Twitter URL' },
    { key: 'linkedin', label: 'LinkedIn URL' },
    { key: 'youtube', label: 'YouTube URL' },
  ],
  hours: [
    { key: 'hours_weekday', label: 'Weekday Hours (Mon-Fri)' },
    { key: 'hours_saturday', label: 'Saturday Hours' },
    { key: 'hours_sunday', label: 'Sunday Hours' },
  ],
};

export default function ContactInfoManagement() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    keyName: '',
    value: '',
    category: 'general',
    displayOrder: 0,
    active: true,
  });

  const { data: contactInfo, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-contact-info'],
    queryFn: adminApi.getAllContactInfo,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createContactInfo,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-contact-info']);
      toast.success('Contact info created successfully');
      handleCloseDialog();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create contact info');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateContactInfo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-contact-info']);
      toast.success('Contact info updated successfully');
      handleCloseDialog();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update contact info');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteContactInfo,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-contact-info']);
      toast.success('Contact info deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete contact info');
    },
  });

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedInfo(item);
      setFormData({
        keyName: item.keyName || '',
        value: item.value || '',
        category: item.category || 'general',
        displayOrder: item.displayOrder || 0,
        active: item.active !== false,
      });
    } else {
      setSelectedInfo(null);
      setFormData({
        keyName: '',
        value: '',
        category: 'general',
        displayOrder: 0,
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedInfo(null);
    setFormData({
      keyName: '',
      value: '',
      category: 'general',
      displayOrder: 0,
      active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.keyName || !formData.value) {
      toast.error('Key name and value are required');
      return;
    }

    if (selectedInfo) {
      updateMutation.mutate({ id: selectedInfo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this contact info?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData({ ...formData, category, keyName: '' });
  };

  const filteredInfo = (contactInfo || []).filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    return true;
  });

  const getKeyNameLabel = (keyName) => {
    return keyName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load contact info. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4">Contact Info Management</Typography>
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
            Add Contact Info
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }} >
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
            <Grid size={{ xs: 12, sm: 6 }} >
              <Typography variant="body2" color="text.secondary">
                Showing: {filteredInfo.length} of {contactInfo?.length || 0} items
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contact Info Table */}
      {filteredInfo.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ContactIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No contact info found</Typography>
            <Typography color="text.secondary">
              {filterCategory !== 'all'
                ? 'Try changing the filter'
                : 'Click "Add Contact Info" to get started'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInfo.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {getKeyNameLabel(item.keyName)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.keyName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {item.value}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.category} size="small" />
                  </TableCell>
                  <TableCell>{item.displayOrder || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.active ? 'Active' : 'Inactive'}
                      color={item.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedInfo ? 'Edit Contact Info' : 'Add Contact Info'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }} >
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={handleCategoryChange}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} >
              <FormControl fullWidth required>
                <InputLabel>Key Name</InputLabel>
                <Select
                  value={formData.keyName}
                  label="Key Name"
                  onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                  disabled={!formData.category}
                >
                  {formData.category &&
                    PRESET_KEYS[formData.category]?.map((preset) => (
                      <MenuItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12} >
              <TextField
                label="Value"
                fullWidth
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                helperText={`Enter the ${formData.keyName?.replace(/_/g, ' ') || 'value'}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} >
              <TextField
                label="Display Order"
                type="number"
                fullWidth
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} >
              <FormControl fullWidth>
                <InputLabel>Active</InputLabel>
                <Select
                  value={formData.active ? 'true' : 'false'}
                  label="Active"
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.value === 'true' })
                  }
                >
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedInfo ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
