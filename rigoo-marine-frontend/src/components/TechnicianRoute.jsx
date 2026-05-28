/* eslint-disable react/prop-types */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthWithRoles } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

/**
 * Protected route wrapper for technician-only pages
 * Redirects non-technician users to dashboard
 */
export default function TechnicianRoute({ children }) {
  const { user, loading, isTechnician } = useAuthWithRoles();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !isTechnician()) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}
