import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Link as MuiLink, Alert } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { defaultPathForRole } from '../../utils/routes';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(formData.email, formData.password);
      const target = location.state?.from?.pathname || defaultPathForRole(userData?.role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
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
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Sign in to access your dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
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
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <MuiLink component={Link} to="/forgot-password" underline="hover">
                Forgot password?
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <Typography align="center" sx={{ mt: 3 }}>
            Don't have an account?{' '}
            <MuiLink component={Link} to="/register" underline="hover">
              Register
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
