import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button, Grid, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { workOrderApi } from '../../services/api';

const statusColors = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const statusLabels = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function MyOrders() {
  const { user } = useAuth();
  const clientId = user?.id;
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['workOrders', 'my'],
    queryFn: () => workOrderApi.getMyWorkOrders(clientId),
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load orders</Typography>
      </Box>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>My Orders</Typography>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>No orders yet</Typography>
            <Typography color="text.secondary" paragraph>
              Create your first service request to get started
            </Typography>
            <Button
              variant="contained"
              href="/dashboard/new-order"
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
            >
              Create Order
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Orders</Typography>

      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid item xs={12} key={order.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6">Order #{order.id}</Typography>
                    <Typography color="text.secondary">
                      Vessel ID: {order.vesselId} • {new Date(order.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={statusLabels[order.status] || order.status}
                    color={statusColors[order.status] || 'default'}
                  />
                </Box>

                <Typography sx={{ mt: 2 }}>{order.description}</Typography>

                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {order.services?.map((service, index) => (
                    <Chip key={index} label={service} size="small" variant="outlined" />
                  ))}
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                  {order.status === 'COMPLETED' && (
                    <Button variant="outlined" size="small" href="/dashboard/invoices">
                      View Invoice
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>Order #{selectedOrder.id}</DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>{selectedOrder.description}</Typography>
              <Typography variant="subtitle2" gutterBottom>Vessel</Typography>
              <Typography color="text.secondary" paragraph>
                {selectedOrder.vessel?.name} ({selectedOrder.vessel?.type})
              </Typography>
              <Typography variant="subtitle2" gutterBottom>Services</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {selectedOrder.services?.map((service, index) => (
                  <Chip key={index} label={service} size="small" />
                ))}
              </Box>
              <Typography variant="subtitle2" gutterBottom>Status</Typography>
              <Chip
                label={statusLabels[selectedOrder.status]}
                color={statusColors[selectedOrder.status]}
              />
              {selectedOrder.preferredDate && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Preferred Date</Typography>
                  <Typography color="text.secondary">{selectedOrder.preferredDate}</Typography>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedOrder(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
