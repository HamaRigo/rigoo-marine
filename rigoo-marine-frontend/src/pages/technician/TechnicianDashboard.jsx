import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Button, CircularProgress, Alert,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AddIcon from '@mui/icons-material/Add';
import { technicianApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const PRIORITY_COLORS = {
  HIGH: 'error',
  NORMAL: 'info',
  LOW: 'default',
};

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    technicianApi.getMyOrders()
      .then(data => setOrders(data || []))
      .catch(() => setError('Failed to load your orders.'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const stats = {
    assigned: orders.length,
    inProgress: orders.filter(o => o.status === 'IN_PROGRESS').length,
    completedToday: orders.filter(
      o => o.status === 'COMPLETED' && o.completedAt && new Date(o.completedAt).toDateString() === today
    ).length,
    waitingParts: orders.filter(o => o.status === 'WAITING_PARTS').length,
  };

  const activeOrders = orders.filter(o =>
    o.status === 'PENDING' || o.status === 'IN_PROGRESS' || o.status === 'WAITING_PARTS'
  ).slice(0, 5);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Technician Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/service-request')}
        >
          New Service Request
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} >
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BuildIcon sx={{ fontSize: 36, mr: 1.5, opacity: 0.8 }} />
                <Typography variant="h4">{stats.assigned}</Typography>
              </Box>
              <Typography variant="body2">Assigned Orders</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} >
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 36, mr: 1.5, opacity: 0.8 }} />
                <Typography variant="h4">{stats.inProgress}</Typography>
              </Box>
              <Typography variant="body2">In Progress</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} >
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 36, mr: 1.5, opacity: 0.8 }} />
                <Typography variant="h4">{stats.completedToday}</Typography>
              </Box>
              <Typography variant="body2">Completed Today</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} >
          <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HourglassEmptyIcon sx={{ fontSize: 36, mr: 1.5, opacity: 0.8 }} />
                <Typography variant="h4">{stats.waitingParts}</Typography>
              </Box>
              <Typography variant="body2">Waiting Parts</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Orders */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Active Orders</Typography>

          {activeOrders.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              No active orders. All caught up!
            </Typography>
          )}

          <List disablePadding>
            {activeOrders.map((order) => (
              <ListItem
                key={order.id}
                sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        #{order.id}
                      </Typography>
                      {order.priority && (
                        <Chip
                          label={order.priority}
                          color={PRIORITY_COLORS[order.priority] || 'default'}
                          size="small"
                        />
                      )}
                      <Chip
                        label={order.status.replace(/_/g, ' ')}
                        color={STATUS_COLORS[order.status] || 'default'}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      Vessel #{order.vesselId}
                      {order.locationText ? ` · ${order.locationText}` : ''}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/technician/orders/${order.id}`)}
                  >
                    View
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {orders.length > 5 && (
            <Button fullWidth sx={{ mt: 2 }} onClick={() => navigate('/technician/orders')}>
              View All {orders.length} Orders
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
