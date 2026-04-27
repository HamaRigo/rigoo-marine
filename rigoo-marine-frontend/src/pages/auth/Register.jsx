import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Link as MuiLink, Alert, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { defaultPathForRole } from '../../utils/routes';

const userTypes = [
  { value: 'CLIENT', label: 'Boat Owner / Client' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'CLIENT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateEmailOpen, setDuplicateEmailOpen] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, userType, ...rest } = formData;
      const newUser = await register({ ...rest, role: userType });
      const target = location.state?.from?.pathname || defaultPathForRole(newUser?.role);
      navigate(target, { replace: true });
    } catch (err) {
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 400 && /already exists/i.test(backendMessage || '')) {
        setDuplicateEmailOpen(true);
      } else {
        setError(backendMessage || err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create Account
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Join Rigoo Marine to manage your vessel services
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="name"
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="tel"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Account Type</InputLabel>
              <Select
                name="userType"
                value={formData.userType}
                label="Account Type"
                onChange={handleChange}
              >
                {userTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <Typography align="center" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <MuiLink component={Link} to="/login" underline="hover">
              Sign In
            </MuiLink>
          </Typography>
        </Paper>
      </Container>

      <Dialog
        open={duplicateEmailOpen}
        onClose={() => setDuplicateEmailOpen(false)}
        aria-labelledby="duplicate-email-dialog-title"
      >
        <DialogTitle id="duplicate-email-dialog-title">Email already registered</DialogTitle>
        <DialogContent>
          <DialogContentText>
            An account with <strong>{formData.email}</strong> already exists. Sign in instead, or use a different email to register.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateEmailOpen(false)}>Use different email</Button>
          <Button
            component={Link}
            to="/login"
            state={{ email: formData.email }}
            variant="contained"
            autoFocus
          >
            Go to login
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
