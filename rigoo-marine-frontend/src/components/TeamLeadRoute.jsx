/* eslint-disable react/prop-types */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthWithRoles } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

export default function TeamLeadRoute({ children }) {
  const { user, loading, isTeamLead, isAdmin } = useAuthWithRoles();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || (!isTeamLead() && !isAdmin())) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}
