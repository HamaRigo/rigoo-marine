import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, TextField, InputAdornment, CircularProgress, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { technicianApi } from '../../services/api';

const PRIORITY_COLORS = { HIGH: 'error', NORMAL: 'info', LOW: 'default' };

export default function WorkOrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await technicianApi.getWorkHistory();
      setOrders(data || []);
    } catch {
      setError('Failed to load work history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || String(o.id).includes(q) || o.description?.toLowerCase().includes(q);
  });

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Work History</Typography>
        <TextField
          size="small"
          placeholder="Search by ID or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {!error && filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          {orders.length === 0 ? 'No completed orders yet.' : 'No results match your search.'}
        </Typography>
      )}

      <Grid container spacing={2}>
        {filtered.map((order) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={order.id} >
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column',
              opacity: 0.92, transition: 'opacity 200ms', '&:hover': { opacity: 1 } }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">#{order.id}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {order.priority && (
                      <Chip label={order.priority} color={PRIORITY_COLORS[order.priority] || 'default'} size="small" />
                    )}
                    <Chip label="COMPLETED" color="success" size="small" />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Vessel #{order.vesselId}
                </Typography>

                <Typography variant="body2" paragraph>
                  {order.description?.slice(0, 100)}{order.description?.length > 100 ? '…' : ''}
                </Typography>

                {order.completedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Completed {new Date(order.completedAt).toLocaleDateString()}
                  </Typography>
                )}
              </CardContent>

              <CardContent sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(`/technician/orders/${order.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
