import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField as MuiTextField
} from '@mui/material';

const statusOptions = ['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];
const priorityColors = {
  HIGH: 'error',
  NORMAL: 'info',
  LOW: 'default',
};

export default function WorkOrderQueue() {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/technician/orders')
    setOrders([
      { id: 1, customer: 'John Doe', vessel: 'Sea Ray 270', service: 'Engine Diagnostic', status: 'IN_PROGRESS', priority: 'HIGH', description: 'Engine making unusual noise', assignedDate: '2026-03-27' },
      { id: 2, customer: 'Jane Smith', vessel: 'Boston Whaler', service: 'Oil Change', status: 'PENDING', priority: 'NORMAL', description: 'Regular maintenance', assignedDate: '2026-03-27' },
      { id: 3, customer: 'Bob Wilson', vessel: 'Yamaha 242', service: 'Propeller Repair', status: 'PENDING', priority: 'LOW', description: 'Propeller damaged after hitting debris', assignedDate: '2026-03-26' },
    ]);
    setLoading(false);
  }, []);

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const handleStatusUpdate = async (orderId, newStatus) => {
    // TODO: Call API to update status
    // PATCH /api/technician/orders/:id/status
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleAddNote = async () => {
    // TODO: Call API to add note
    // POST /api/technician/orders/:id/notes
    console.log('Adding note:', noteText);
    setNoteText('');
  };

  const statusColors = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    PAUSED: 'default',
    COMPLETED: 'success',
  };

  if (loading) {
    return <Typography>Loading work orders...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Work Order Queue</Typography>
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

      <Grid container spacing={3}>
        {filteredOrders.map((order) => (
          <Grid item xs={12} md={6} lg={4} key={order.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6">#{order.id}</Typography>
                  <Chip
                    label={order.priority}
                    color={priorityColors[order.priority]}
                    size="small"
                  />
                </Box>

                <Typography variant="body1" fontWeight="600" gutterBottom>
                  {order.service}
                </Typography>

                <Typography color="text.secondary" paragraph>
                  <strong>Customer:</strong> {order.customer}<br />
                  <strong>Vessel:</strong> {order.vessel}
                </Typography>

                <Typography color="text.secondary" paragraph>
                  <strong>Description:</strong> {order.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Chip
                    label={order.status.replace('_', ' ')}
                    color={statusColors[order.status]}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Assigned: {order.assignedDate}
                  </Typography>
                </Box>
              </CardContent>

              <CardContent sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                  {order.status === 'PENDING' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleStatusUpdate(order.id, 'IN_PROGRESS')}
                      sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                    >
                      Start
                    </Button>
                  )}
                  {order.status === 'IN_PROGRESS' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                      sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                    >
                      Complete
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle>Work Order #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Customer</Typography>
                  <Typography paragraph>{selectedOrder.customer}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Vessel</Typography>
                  <Typography paragraph>{selectedOrder.vessel}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Service</Typography>
                  <Typography paragraph>{selectedOrder.service}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography paragraph>{selectedOrder.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Status</Typography>
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
                </Grid>

                {/* Add Note Section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>Add Note</Typography>
                  <MuiTextField
                    fullWidth
                    multiline
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add work notes or updates..."
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
          <Button onClick={handleAddNote} variant="contained" disabled={!noteText}>
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
