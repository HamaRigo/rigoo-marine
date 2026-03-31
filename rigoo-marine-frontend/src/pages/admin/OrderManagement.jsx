import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

const statusOptions = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/orders')
    setOrders([
      { id: 1, customer: 'John Doe', service: 'Engine Diagnostic', status: 'PENDING', date: '2026-03-27', technician: null },
      { id: 2, customer: 'Jane Smith', service: 'Bottom Paint', status: 'IN_PROGRESS', date: '2026-03-26', technician: 'Mike Davis' },
      { id: 3, customer: 'Bob Wilson', service: 'Hull Repair', status: 'COMPLETED', date: '2026-03-25', technician: 'Sarah Johnson' },
    ]);
    setLoading(false);
  }, []);

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const handleStatusUpdate = async (orderId, newStatus) => {
    // TODO: Call API to update status
    // PATCH /api/orders/:id/status
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setSelectedOrder(null);
  };

  const statusColors = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
  };

  if (loading) {
    return <Typography>Loading orders...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Order Management</Typography>
        <TextField
          select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">All Status</MenuItem>
          {statusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {status.replace('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Technician</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.service}</TableCell>
                    <TableCell>{order.technician || '-'}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status.replace('_', ' ')}
                        color={statusColors[order.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Manage Order Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Order #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" paragraph>
                <strong>Customer:</strong> {selectedOrder.customer}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Service:</strong> {selectedOrder.service}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Current Status:</strong> {selectedOrder.status}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Technician:</strong> {selectedOrder.technician || 'Unassigned'}
              </Typography>

              <Typography variant="subtitle2" sx={{ mt: 3 }}>Update Status</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    size="small"
                    variant={selectedOrder.status === status ? 'contained' : 'outlined'}
                    onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
