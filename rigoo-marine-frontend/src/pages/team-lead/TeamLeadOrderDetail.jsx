import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  TextField, List, ListItem, ListItemText, Divider,
  CircularProgress, Alert, FormControlLabel, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import toast from 'react-hot-toast';
import { adminApi, workOrderApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const ROLE_COLORS = { ADMIN: 'error', TEAM_LEAD: 'warning', TECHNICIAN: 'primary', CLIENT: 'default' };

export default function TeamLeadOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder]       = useState(null);
  const [updates, setUpdates]   = useState([]);
  const [techs, setTechs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [newMessage, setNewMessage]           = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [postingUpdate, setPostingUpdate]     = useState(false);

  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedTech, setSelectedTech] = useState('');
  const [assigning, setAssigning]       = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [orderData, updatesData, allUsers] = await Promise.all([
        adminApi.getOrderById(id),
        workOrderApi.getUpdates(id),
        adminApi.getAllUsers().catch(() => []),
      ]);
      setOrder(orderData);
      setUpdates(updatesData || []);
      setTechs((allUsers || []).filter(u => ['TECHNICIAN', 'TEAM_LEAD'].includes(u.role)));
    } catch {
      setError('Failed to load work order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const updated = await workOrderApi.updateStatus(id, newStatus);
      setOrder(updated);
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleApprove = async () => {
    try {
      const updated = await workOrderApi.approve(id, user?.id);
      setOrder(updated);
      toast.success('Order approved');
    } catch {
      toast.error('Failed to approve order');
    }
  };

  const handlePostUpdate = async () => {
    if (!newMessage.trim()) return;
    setPostingUpdate(true);
    try {
      const saved = await workOrderApi.postUpdate(id, newMessage.trim(), visibleToClient);
      setUpdates(prev => [...prev, saved]);
      setNewMessage('');
      toast.success('Update posted');
    } catch {
      toast.error('Failed to post update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) return;
    setAssigning(true);
    try {
      const updated = await workOrderApi.assignTechnician(id, selectedTech);
      setOrder(updated);
      setAssignDialog(false);
      toast.success('Technician assigned');
    } catch {
      toast.error('Failed to assign technician');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!order)  return null;

  const canApprove  = order.status === 'PENDING_APPROVAL';
  const canStart    = order.status === 'PENDING';
  const canComplete = order.status === 'IN_PROGRESS';

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/team-lead/orders')} sx={{ mb: 2 }}>
        Back to Orders
      </Button>

      <Grid container spacing={3}>
        {/* Order info */}
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>Order #{order.id}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.serviceType?.replace(/_/g, ' ')} — Vessel {order.vesselName ?? `#${order.vesselId}`}
                  </Typography>
                </Box>
                <Chip label={order.status} color={STATUS_COLORS[order.status] || 'default'} />
              </Stack>

              {order.description && (
                <Typography variant="body2" sx={{ mb: 2 }}>{order.description}</Typography>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                {canApprove  && <Button variant="contained" color="success" size="small" onClick={handleApprove}>Approve</Button>}
                {canStart    && <Button variant="contained" color="primary" size="small" onClick={() => handleStatusUpdate('IN_PROGRESS')}>Start Work</Button>}
                {canComplete && <Button variant="contained" color="success" size="small" onClick={() => handleStatusUpdate('COMPLETED')}>Mark Complete</Button>}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => { setSelectedTech(order.assignedTechnicianId?.toString() || ''); setAssignDialog(true); }}
                >
                  {order.assignedTechnicianId ? 'Reassign Tech' : 'Assign Tech'}
                </Button>
              </Stack>

              {order.assignedTechnicianId && (
                <Typography variant="body2" color="text.secondary">
                  Assigned to: Tech #{order.assignedTechnicianId}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Timeline</Typography>
              {updates.length === 0 && (
                <Typography variant="body2" color="text.disabled">No updates yet.</Typography>
              )}
              <List dense disablePadding>
                {updates.map((u, i) => (
                  <Box key={u.id}>
                    {i > 0 && <Divider />}
                    <ListItem disablePadding sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={u.message}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={u.authorRole} color={ROLE_COLORS[u.authorRole] || 'default'} size="small" sx={{ height: 16, fontSize: 10 }} />
                            {!u.visibleToClient && <Chip label="internal" size="small" sx={{ height: 16, fontSize: 10 }} />}
                            <Typography variant="caption" color="text.secondary">
                              {new Date(u.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                        }
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Post update */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Post Update</Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Update message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={<Checkbox size="small" checked={visibleToClient} onChange={e => setVisibleToClient(e.target.checked)} />}
                  label={<Typography variant="caption">Visible to client</Typography>}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handlePostUpdate}
                  disabled={!newMessage.trim() || postingUpdate}
                >
                  {postingUpdate ? <CircularProgress size={16} /> : 'Post'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assign dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Technician</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Technician</InputLabel>
            <Select
              value={selectedTech}
              label="Technician"
              onChange={e => setSelectedTech(e.target.value)}
            >
              {techs.map(t => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name} ({t.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={!selectedTech || assigning}>
            {assigning ? <CircularProgress size={18} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
