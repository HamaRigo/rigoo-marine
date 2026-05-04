import { Box, Typography, Grid, Card, CardContent, Button, Chip, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, vesselApi, invoiceApi } from '../../services/api';
import BuildIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';

export default function DashboardHome() {
  const { user } = useAuth();
  const clientId = user?.id;

  const { data: orders } = useQuery({
    queryKey: ['workOrders', 'my'],
    queryFn: () => dashboardApi.getRecentOrders(clientId, 100),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: vessels } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn: () => vesselApi.getMyVessels(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices', 'my'],
    queryFn: () => invoiceApi.getMyInvoices(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate stats from fetched data
  const stats = {
    activeOrders: orders?.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length || 0,
    vessels: vessels?.length || 0,
    pendingInvoices: invoices?.filter((i) => i.status === 'PENDING').length || 0,
    completedOrders: orders?.filter((o) => o.status === 'COMPLETED').length || 0,
  };

  const recentOrders = orders?.slice(0, 5) || [];
  const isLoading = !orders || !vessels || !invoices;

  const error = null; // Error handling done via react-query

  if (isLoading || !clientId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          component={Link}
          to="/service-request"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          New Service Request
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats?.activeOrders ?? 0}</Typography>
              </Box>
              <Typography variant="body1">Active Orders</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DirectionsBoatIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats?.vessels ?? 0}</Typography>
              </Box>
              <Typography variant="body1">My Vessels</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReceiptIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Typography variant="h4" color="primary.main">{stats?.pendingInvoices ?? 0}</Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">Pending Invoices</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recent Orders</Typography>
          {recentOrders && recentOrders.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              {recentOrders.map((order) => (
                <Box
                  key={order.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: '1px solid #eee',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight="600">Order #{order.id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.description?.substring(0, 50) || 'No description'} • {new Date(order.preferredDate || order.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={order.status.replace('_', ' ')}
                    color={order.status === 'COMPLETED' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 2 }}>No recent orders</Typography>
          )}
          <Button component={Link} to="/dashboard/orders" fullWidth sx={{ mt: 2 }}>
            View All Orders
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Quick Actions</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                component={Link}
                to="/service-request"
                variant="outlined"
                fullWidth
                startIcon={<AddIcon />}
              >
                New Service Request
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                component={Link}
                to="/dashboard/vessels"
                variant="outlined"
                fullWidth
                startIcon={<DirectionsBoatIcon />}
              >
                Add Vessel
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                component={Link}
                to="/dashboard/invoices"
                variant="outlined"
                fullWidth
                startIcon={<ReceiptIcon />}
              >
                View Invoices
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                component={Link}
                to="/dashboard/profile"
                variant="outlined"
                fullWidth
                startIcon={<BuildIcon />}
              >
                Edit Profile
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
