import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack,
  CircularProgress, Alert, List, ListItem, ListItemText, Divider,
  LinearProgress, IconButton, Tooltip, TextField, MenuItem, Select,
  FormControl, InputLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { deliveryApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING: 'default',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  FAILED: 'error',
};

export default function TeamLeadDelivery() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const page = await deliveryApi.adminListTasks({ size: 200, status: statusFilter || undefined });
      setTasks(page?.content || []);
      setError(null);
    } catch {
      setError('Failed to load delivery tasks.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group tasks by assigned technician
  const grouped = {};
  tasks.forEach(t => {
    const key = t.assignedTo ?? 'unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  const techIds = Object.keys(grouped);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Delivery Overview</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(STATUS_COLORS).map(s => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {!loading && techIds.length === 0 && (
        <Typography color="text.disabled">No delivery tasks found.</Typography>
      )}

      <Grid container spacing={2}>
        {techIds.map(techId => {
          const techTasks = grouped[techId];
          const done = techTasks.filter(t => t.status === 'DELIVERED').length;
          const total = techTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const hasFailed = techTasks.some(t => t.status === 'FAILED');
          const label = techId === 'unassigned' ? 'Unassigned' : `Tech #${techId}`;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={techId}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <LocalShippingIcon color={hasFailed ? 'error' : 'primary'} fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      label={`${done}/${total} done`}
                      size="small"
                      color={hasFailed ? 'error' : done === total && total > 0 ? 'success' : 'default'}
                    />
                  </Stack>

                  {total > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={hasFailed ? 'error' : 'success'}
                      sx={{ borderRadius: 1, height: 6, mb: 1.5 }}
                    />
                  )}

                  <List dense disablePadding>
                    {techTasks.map((task, i) => (
                      <Box key={task.id}>
                        {i > 0 && <Divider />}
                        <ListItem disablePadding sx={{ py: 0.75 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500} noWrap>
                                Stop {task.stopOrder ?? i + 1} — {task.deliveryAddress}
                              </Typography>
                            }
                            secondary={task.clientPhone || `Order #${task.workOrderId ?? task.id}`}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          <Chip
                            label={task.status?.replace(/_/g, ' ')}
                            size="small"
                            color={STATUS_COLORS[task.status] || 'default'}
                            sx={{ ml: 1, flexShrink: 0 }}
                          />
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
