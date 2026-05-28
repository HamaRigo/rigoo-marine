import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Container, Typography, Card, CardContent, TextField, Button, Grid, Chip, Stepper, Step, StepLabel, Alert, Paper, MenuItem, CircularProgress, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { publicApi, workOrderApi, vesselApi, fileApi } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import toast from 'react-hot-toast';

const steps = ['Select Services', 'Vessel Information', 'Describe Issue', 'Review & Submit'];

const ISSUE_CATEGORIES = [
  'Engine',
  'Electrical',
  'Hull',
  'Propulsion',
  'Fuel System',
  'Cooling System',
  'Navigation',
  'Safety Equipment',
  'Other'
];

const SEVERITY_LEVELS = [
  { value: 'LOW', label: 'Low - Minor issue, can wait' },
  { value: 'MEDIUM', label: 'Medium - Needs attention soon' },
  { value: 'HIGH', label: 'High - Urgent, affects operation' },
  { value: 'CRITICAL', label: 'Critical - Vessel out of service' }
];

export default function WorkOrderFlow() {
  const { user, isAuthenticated } = useAuth();
  const clientId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [formData, setFormData] = useState({
    vesselId: '',
    issueDescription: '',
    preferredDate: '',
    notes: '',
    issueCategory: '',
    severity: 'MEDIUM',
    symptoms: '',
  });
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [isUploading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Fetch services from API
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: publicApi.getServices,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's vessels for selection
  const { data: vesselsData } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn: () => vesselApi.getMyVessels(clientId),
    enabled: isAuthenticated && !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file) => fileApi.upload(file, 'work-order'),
    onSuccess: (data) => {
      setUploadedMedia((prev) => [...prev, data]);
      toast.success('File uploaded successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload file');
    },
  });

  // Create work order mutation
  const createOrderMutation = useMutation({
    mutationFn: workOrderApi.create,
    onSuccess: () => {
      toast.success('Work order submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['workOrders', 'my'] });
      navigate('/dashboard/orders');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit work order');
    },
  });

  const services = servicesData || [];

  const handleServiceToggle = (serviceId) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]
    );
  };

  const handleNext = () => {
    if (activeStep === 2) {
      // Before submitting, check auth
      if (!isAuthenticated) {
        setShowAuthPrompt(true);
        return;
      }
      // Submit work order
      handleSubmit();
    } else if (activeStep === 1 && !formData.vesselId) {
      toast.error('Please select a vessel');
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    // Backend CreateWorkOrderRequest includes: clientId, vesselId, description, priority, preferredDate, serviceIds, notes, issueCategory, severity, symptoms, mediaUrls
    const workOrderData = {
      clientId,
      vesselId: parseInt(formData.vesselId, 10),
      description: formData.issueDescription,
      priority: 'NORMAL',
      preferredDate: formData.preferredDate || null,
      serviceIds: selectedServiceIds,
      notes: formData.notes || null,
      issueCategory: formData.issueCategory || null,
      severity: formData.severity || 'MEDIUM',
      symptoms: formData.symptoms || null,
      mediaUrls: uploadedMedia.map(m => m.url),
    };

    createOrderMutation.mutate(workOrderData);
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: { pathname: '/dashboard/new-order' } } });
  };

  const handleRegisterRedirect = () => {
    navigate('/register', { state: { from: { pathname: '/dashboard/new-order' } } });
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];

    files.forEach((file) => {
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Please upload images or videos only.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max size is 50MB.`);
        return;
      }
      uploadMutation.mutate(file);
    });

    // Reset input
    event.target.value = '';
  };

  const handleRemoveMedia = (index) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        if (servicesLoading) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          );
        }

        if (!services || services.length === 0) {
          return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No services available at the moment.</Typography>
            </Box>
          );
        }

        return (
          <Box>
            <Typography variant="h6" gutterBottom>Select Services Needed</Typography>
            <Typography color="text.secondary" paragraph>
              Choose all services that apply to your request
            </Typography>
            <Grid container spacing={2}>
              {services.map((service) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id} >
                  <Card
                    onClick={() => handleServiceToggle(service.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedServiceIds.includes(service.id) ? 'primary.light' : 'background.paper',
                      color: selectedServiceIds.includes(service.id) ? 'primary.contrastText' : 'inherit',
                      '&:hover': { bgcolor: 'primary.light' },
                    }}
                  >
                    <CardContent>
                      <Typography variant="body1">{service.name}</Typography>
                      <Chip label={service.category} size="small" sx={{ mt: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Select Vessel</Typography>
            <Typography color="text.secondary" paragraph>
              Choose the vessel for this service request
            </Typography>
            <Grid container spacing={2}>
              {isAuthenticated && vesselsData && vesselsData.length > 0 ? (
                <Grid size={12} >
                  <TextField
                    fullWidth
                    select
                    label="Your Vessels"
                    value={formData.vesselId}
                    onChange={(e) => {
                      const selected = vesselsData.find((v) => v.id === parseInt(e.target.value, 10));
                      if (selected) {
                        setFormData({
                          ...formData,
                          vesselId: String(selected.id),
                        });
                      }
                    }}
                    helperText="Select from your existing vessels"
                    required
                  >
                    <MenuItem value="">
                      <em>Select a vessel</em>
                    </MenuItem>
                    {vesselsData.map((vessel) => (
                      <MenuItem key={vessel.id} value={String(vessel.id)}>
                        {vessel.name} ({vessel.type})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ) : (
                <Grid size={12} >
                  <Alert severity="info">
                    No vessels found. Please add a vessel from your dashboard first.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Describe the Issue</Typography>
            <Typography color="text.secondary" paragraph>
              Provide details about what service you need
            </Typography>

            {/* Diagnostic Fields */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField
                  fullWidth
                  select
                  label="Issue Category"
                  value={formData.issueCategory}
                  onChange={(e) => setFormData({ ...formData, issueCategory: e.target.value })}
                  helperText="Select the system affected"
                >
                  {ISSUE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField
                  fullWidth
                  select
                  label="Severity Level"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  helperText="How urgent is this issue?"
                >
                  {SEVERITY_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Symptoms Checklist"
              multiline
              rows={2}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="List any symptoms (e.g., strange noises, leaks, warning lights...)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Issue Description"
              multiline
              rows={4}
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              placeholder="Describe the problem or service needed..."
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Preferred Service Date"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              sx={{ mb: 2 }}
            />

            {/* File Upload Section */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Attach Photos or Videos
              </Typography>
              <Typography color="text.secondary" variant="body2" paragraph>
                Upload images or videos to help illustrate the issue (max 50MB per file)
              </Typography>

              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                disabled={isUploading || uploadMutation.isPending}
                sx={{ mb: 2 }}
              >
                {isUploading || uploadMutation.isPending ? 'Uploading...' : 'Select Files'}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>

              {uploadedMedia.length > 0 && (
                <List dense>
                  {uploadedMedia.map((media, index) => (
                    <ListItem
                      key={media.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveMedia(index)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={media.title}
                        secondary={`${media.type} - ${media.url}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review Your Request</Typography>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Selected Services</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {selectedServiceIds.map((serviceId) => {
                    const service = services.find((s) => s.id === serviceId);
                    return service ? (
                      <Chip key={serviceId} label={service.name} color="primary" />
                    ) : null;
                  })}
                </Box>

                <Typography variant="subtitle2" gutterBottom>Vessel</Typography>
                <Typography paragraph>
                  {vesselsData?.find((v) => v.id === parseInt(formData.vesselId, 10))?.name || 'N/A'}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <Typography variant="subtitle2">Issue Category</Typography>
                    <Typography paragraph>{formData.issueCategory || 'Not specified'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <Typography variant="subtitle2">Severity</Typography>
                    <Typography paragraph>
                      <Chip
                        label={formData.severity || 'MEDIUM'}
                        color={
                          formData.severity === 'CRITICAL' ? 'error' :
                          formData.severity === 'HIGH' ? 'warning' : 'info'
                        }
                        size="small"
                      />
                    </Typography>
                  </Grid>
                </Grid>

                {formData.symptoms && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Symptoms</Typography>
                    <Typography paragraph>{formData.symptoms}</Typography>
                  </>
                )}

                <Typography variant="subtitle2" gutterBottom>Issue Description</Typography>
                <Typography paragraph>{formData.issueDescription}</Typography>

                {formData.preferredDate && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Preferred Date</Typography>
                    <Typography paragraph>{formData.preferredDate}</Typography>
                  </>
                )}

                {formData.notes && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Additional Notes</Typography>
                    <Typography paragraph>{formData.notes}</Typography>
                  </>
                )}

                {uploadedMedia.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Attachments ({uploadedMedia.length})</Typography>
                    <List dense>
                      {uploadedMedia.map((media) => (
                        <ListItem key={media.id}>
                          <ListItemText
                            primary={media.title}
                            secondary={`${media.type}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Button
          component={Link}
          to="/services"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Services
        </Button>

        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
          <Typography variant="h4" gutterBottom align="center">
            Request Service
          </Typography>
          <Typography color="text.secondary" align="center" paragraph>
            Follow the steps below to submit your service request
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && selectedServiceIds.length === 0) ||
                (activeStep === 1 && !formData.vesselId) ||
                (activeStep === 2 && !formData.issueDescription) ||
                createOrderMutation.isPending
              }
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              {createOrderMutation.isPending ? 'Submitting...' : (activeStep === steps.length - 1 ? 'Submit Request' : 'Continue')}
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Auth Prompt Dialog */}
      {showAuthPrompt && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setShowAuthPrompt(false)}
        >
          <Card
            sx={{ maxWidth: 400, mx: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent sx={{ p: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mx: 'auto', mb: 2 }} />
              <Typography variant="h5" align="center" gutterBottom>
                Almost Done!
              </Typography>
              <Typography align="center" paragraph>
                To submit your service request and track its progress, you&apos;ll need to create an account or sign in.
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Your information will be saved when you register.
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleRegisterRedirect}
                  sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                >
                  Create Account & Submit
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleLoginRedirect}
                >
                  Sign In & Submit
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
