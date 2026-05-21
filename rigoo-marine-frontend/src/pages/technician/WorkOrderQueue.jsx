import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  TextField, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import toast from 'react-hot-toast';
import { technicianApi } from '../../services/api';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'];

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

export default function WorkOrderQueue() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await technicianApi.getMyOrders();
      setOrders(data || []);
    } catch {
      setError('Failed to load work orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await technicianApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    );
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
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map(s => (
            <MenuItem key={s} value={s}>
              {s === 'ALL' ? 'All Status' : s.replace(/_/g, ' ')}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {filtered.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          No work orders found.
        </Typography>
      )}

      <Grid container spacing={3}>
        {filtered.map((order) => (
          <Grid item xs={12} md={6} lg={4} key={order.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography variant="h6">#{order.id}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                </Box>

                <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                  <strong>Vessel:</strong> #{order.vesselId}
                </Typography>

                <Typography color="text.secondary" variant="body2" paragraph>
                  {order.description?.slice(0, 120)}{order.description?.length > 120 ? '…' : ''}
                </Typography>

                {order.locationText && (
                  <Typography variant="caption" color="text.secondary">
                    📍 {order.locationText}
                  </Typography>
                )}
              </CardContent>

              <CardContent sx={{ pt: 1.5, borderTop: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(`/technician/orders/${order.id}`)}
                  >
                    Details
                  </Button>
                  {order.status === 'PENDING' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() => handleStatusUpdate(order.id, 'IN_PROGRESS')}
                    >
                      Start
                    </Button>
                  )}
                  {order.status === 'IN_PROGRESS' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                    >
                      Done
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
