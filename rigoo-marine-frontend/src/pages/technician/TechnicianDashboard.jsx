import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Chip, List, ListItem, ListItemText, ListItemSecondaryAction, Button } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';

export default function TechnicianDashboard() {
  const [stats, setStats] = useState({
    assignedOrders: 0,
    inProgress: 0,
    completedToday: 0,
    pendingApproval: 0,
  });
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/technician/dashboard')
    setStats({
      assignedOrders: 8,
      inProgress: 3,
      completedToday: 2,
      pendingApproval: 1,
    });
    setMyOrders([
      { id: 1, customer: 'John Doe', vessel: 'Sea Ray 270', service: 'Engine Diagnostic', status: 'IN_PROGRESS', priority: 'HIGH' },
      { id: 2, customer: 'Jane Smith', vessel: 'Boston Whaler', service: 'Oil Change', status: 'PENDING', priority: 'NORMAL' },
      { id: 3, customer: 'Bob Wilson', vessel: 'Yamaha 242', service: 'Propeller Repair', status: 'PENDING', priority: 'LOW' },
    ]);
    setLoading(false);
  }, []);

  const priorityColors = {
    HIGH: 'error',
    NORMAL: 'info',
    LOW: 'default',
  };

  if (loading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Technician Dashboard</Typography>
        <Button
          component={RouterLink}
          to="/service-request"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New Service Request
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats.assignedOrders}</Typography>
              </Box>
              <Typography variant="body1">Assigned Orders</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTimeIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats.inProgress}</Typography>
              </Box>
              <Typography variant="body1">In Progress</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats.completedToday}</Typography>
              </Box>
              <Typography variant="body1">Completed Today</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon sx={{ fontSize: 40, mr: 2, opacity: 0.8 }} />
                <Typography variant="h4">{stats.pendingApproval}</Typography>
              </Box>
              <Typography variant="body1">Pending Approval</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* My Orders */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>My Work Orders</Typography>
          <List>
            {myOrders.map((order) => (
              <ListItem
                key={order.id}
                sx={{
                  borderBottom: '1px solid #eee',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="600">
                        #{order.id} - {order.service}
                      </Typography>
                      <Chip
                        label={order.priority}
                        color={priorityColors[order.priority]}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        Customer: {order.customer} | Vessel: {order.vessel}
                      </Typography>
                      <br />
                      <Chip
                        label={order.status.replace('_', ' ')}
                        color={
                          order.status === 'COMPLETED' ? 'success' :
                          order.status === 'IN_PROGRESS' ? 'info' : 'warning'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    href={`/technician/orders/${order.id}`}
                  >
                    View
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Button fullWidth sx={{ mt: 2 }} href="/technician/orders">
            View All Orders
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
