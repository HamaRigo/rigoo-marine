import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { defaultPathForRole } from '../utils/routes';

/**
 * Route wrapper for guest-only pages (login, register)
 * Redirects authenticated users to the landing page appropriate for their role.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={defaultPathForRole(user?.role)} replace />;
  }

  return children;
}
