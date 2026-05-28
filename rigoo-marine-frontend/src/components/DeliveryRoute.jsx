/* eslint-disable react/prop-types */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthWithRoles } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

export default function DeliveryRoute({ children }) {
  const { user, loading, isDelivery, isAdmin } = useAuthWithRoles();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || (!isDelivery() && !isAdmin())) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}
