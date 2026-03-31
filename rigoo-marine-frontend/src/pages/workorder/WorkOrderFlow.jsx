import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Container, Typography, Card, CardContent, TextField, Button, Grid, Chip, Stepper, Step, StepLabel, Alert, Paper, MenuItem, CircularProgress } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { publicApi, workOrderApi, vesselApi } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';

const steps = ['Select Services', 'Vessel Information', 'Describe Issue', 'Review & Submit'];

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
  });
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
    // Backend CreateWorkOrderRequest: clientId, vesselId, description, priority, preferredDate, serviceIds, notes
    const workOrderData = {
      clientId,
      vesselId: parseInt(formData.vesselId, 10),
      description: formData.issueDescription,
      priority: 'NORMAL',
      preferredDate: formData.preferredDate || null,
      serviceIds: selectedServiceIds,
      notes: formData.notes || null,
    };

    createOrderMutation.mutate(workOrderData);
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: { pathname: '/dashboard/new-order' } } });
  };

  const handleRegisterRedirect = () => {
    navigate('/register', { state: { from: { pathname: '/dashboard/new-order' } } });
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
                <Grid item xs={12} sm={6} md={4} key={service.id}>
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
                <Grid item xs={12}>
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
                <Grid item xs={12}>
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
            />
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

                <Typography variant="subtitle2" gutterBottom>Issue Description</Typography>
                <Typography paragraph>{formData.issueDescription}</Typography>

                {formData.preferredDate && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Preferred Date</Typography>
                    <Typography paragraph>{formData.preferredDate}</Typography>
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
                To submit your service request and track its progress, you'll need to create an account or sign in.
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
