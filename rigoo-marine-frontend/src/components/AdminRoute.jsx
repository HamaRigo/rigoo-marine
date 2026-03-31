import { Navigate, useLocation } from 'react-router-dom';
import { useAuthWithRoles } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

/**
 * Protected route wrapper for admin-only pages
 * Redirects non-admin users to dashboard
 */
export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuthWithRoles();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !isAdmin()) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}
