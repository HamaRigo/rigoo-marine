/* eslint-disable react/prop-types */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  TextField, List, ListItem, ListItemText, Divider,
  CircularProgress, Alert, FormControlLabel, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Tooltip, Stack, LinearProgress,
} from '@mui/material';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import AddIcon              from '@mui/icons-material/Add';
import AttachFileIcon       from '@mui/icons-material/AttachFile';
import HourglassEmptyIcon   from '@mui/icons-material/HourglassEmpty';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon      from '@mui/icons-material/StopRounded';
import TimerRoundedIcon     from '@mui/icons-material/TimerRounded';
import toast from 'react-hot-toast';
import { technicianApi, workOrderApi } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Time Tracker sidebar card ────────────────────────────────────────────────

function TimeTracker({ workOrderId }) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0); // seconds since clock-in

  const { data, isLoading } = useQuery({
    queryKey: ['time-logs', workOrderId],
    queryFn:  () => workOrderApi.getTimeLogs(workOrderId),
    refetchInterval: 30_000,
  });

  const logs       = data?.logs ?? [];
  const totalMin   = data?.totalMinutes ?? 0;
  const openLog    = logs.find(l => l.open);
  const isRunning  = !!openLog;

  // Live elapsed counter while a session is open
  useEffect(() => {
    if (!isRunning || !openLog?.clockIn) { setElapsed(0); return; }
    const start = new Date(openLog.clockIn).getTime();
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning, openLog?.clockIn]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['time-logs', workOrderId] });

  const clockIn = useMutation({
    mutationFn: () => workOrderApi.clockIn(workOrderId),
    onSuccess: () => { toast.success('Clocked in'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Clock-in failed'),
  });

  const clockOut = useMutation({
    mutationFn: () => workOrderApi.clockOut(workOrderId),
    onSuccess: () => { toast.success('Clocked out'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Clock-out failed'),
  });

  const fmt = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${h}h ${String(m).padStart(2,'0')}m`
      : `${m}m ${String(s).padStart(2,'0')}s`;
  };

  const fmtMin = (min) => {
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <TimerRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="h6">Time Tracking</Typography>
        </Stack>

        {isLoading ? <LinearProgress sx={{ borderRadius: 1 }} /> : (
          <>
            {/* Live timer */}
            <Box sx={{
              textAlign: 'center', py: 2, mb: 1.5,
              borderRadius: 2, bgcolor: isRunning ? 'rgba(76,175,80,0.08)' : 'action.hover',
              border: '1px solid', borderColor: isRunning ? 'success.light' : 'divider',
            }}>
              <Typography variant="h4" fontWeight={800}
                color={isRunning ? 'success.main' : 'text.secondary'}>
                {isRunning ? fmt(elapsed) : fmtMin(totalMin)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isRunning ? 'Session running' : `Total logged`}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              color={isRunning ? 'error' : 'success'}
              startIcon={isRunning ? <StopRoundedIcon /> : <PlayArrowRoundedIcon />}
              disabled={clockIn.isPending || clockOut.isPending}
              onClick={() => isRunning ? clockOut.mutate() : clockIn.mutate()}
              sx={{ mb: 1.5, borderRadius: 2 }}
            >
              {isRunning ? 'Clock Out' : 'Clock In'}
            </Button>

            {/* Recent logs */}
            {logs.slice(0, 4).map(l => (
              <Box key={l.id} sx={{
                display: 'flex', justifyContent: 'space-between',
                py: 0.5, borderBottom: '1px solid', borderColor: 'divider',
              }}>
                <Typography variant="caption" color="text.secondary">
                  {l.clockIn ? new Date(l.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {l.clockOut ? ` → ${new Date(l.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' → now'}
                </Typography>
                <Typography variant="caption" fontWeight={700}
                  color={l.open ? 'success.main' : 'text.primary'}>
                  {l.open ? 'open' : fmtMin(l.durationMin ?? 0)}
                </Typography>
              </Box>
            ))}

            {totalMin > 0 && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '2px solid', borderColor: 'divider',
                display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight={700}>Total</Typography>
                <Typography variant="caption" fontWeight={800} color="primary.main">
                  {fmtMin(totalMin)}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const ROLE_COLORS = {
  ADMIN: 'error',
  TEAM_LEAD: 'warning',
  TECHNICIAN: 'primary',
  CLIENT: 'default',
};

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newMessage, setNewMessage] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [postingUpdate, setPostingUpdate] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef();

  const [waitingPartsDialog, setWaitingPartsDialog] = useState(false);
  const [waitingPartsReason, setWaitingPartsReason] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderData, updatesData, attachmentsData] = await Promise.all([
        technicianApi.getOrderById(id),
        technicianApi.getUpdates(id),
        technicianApi.getAttachments(id),
      ]);
      setOrder(orderData);
      setUpdates(updatesData || []);
      setAttachments(attachmentsData || []);
    } catch {
      setError('Failed to load work order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const updated = await technicianApi.updateStatus(id, newStatus);
      setOrder(updated);
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePostUpdate = async () => {
    if (!newMessage.trim()) return;
    setPostingUpdate(true);
    try {
      const update = await technicianApi.postUpdate(id, newMessage, visibleToClient);
      setUpdates(prev => [...prev, update]);
      setNewMessage('');
      toast.success('Update posted');
    } catch {
      toast.error('Failed to post update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large (max 20 MB)');
      return;
    }
    setUploadingFile(true);
    try {
      const attachment = await technicianApi.uploadAttachment(id, file);
      setAttachments(prev => [...prev, attachment]);
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleWaitingParts = async () => {
    try {
      const updated = await technicianApi.updateStatus(id, 'WAITING_PARTS');
      setOrder(updated);
      if (waitingPartsReason.trim()) {
        const note = await technicianApi.postUpdate(id, `Waiting for parts: ${waitingPartsReason}`, false);
        setUpdates(prev => [...prev, note]);
      }
      setWaitingPartsDialog(false);
      setWaitingPartsReason('');
      toast.success('Status set to Waiting Parts');
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/technician/orders')} sx={{ mb: 2 }}>
          Back to Queue
        </Button>
        <Alert severity="error">{error || 'Order not found'}</Alert>
      </Box>
    );
  }

  const canMarkWaiting = ['PENDING', 'IN_PROGRESS'].includes(order.status);
  const canStart = order.status === 'PENDING';
  const canComplete = order.status === 'IN_PROGRESS' || order.status === 'WAITING_PARTS';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/technician/orders')}
        sx={{ mb: 2 }}
      >
        Back to Queue
      </Button>

      <Grid container spacing={3}>
        {/* Main content */}
        <Grid size={{ xs: 12, md: 8 }} >
          {/* Order Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4">Work Order #{order.id}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {order.priority && (
                    <Chip
                      label={order.priority}
                      color={order.priority === 'HIGH' ? 'error' : order.priority === 'NORMAL' ? 'info' : 'default'}
                      size="small"
                    />
                  )}
                  <Chip
                    label={order.status.replace(/_/g, ' ')}
                    color={STATUS_COLORS[order.status] || 'default'}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Description</Typography>
              <Typography paragraph>{order.description}</Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Typography variant="subtitle2">Vessel ID</Typography>
                  <Typography>#{order.vesselId}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} >
                  <Typography variant="subtitle2">Client ID</Typography>
                  <Typography>#{order.clientId}</Typography>
                </Grid>
                {order.locationText && (
                  <Grid size={12} >
                    <Typography variant="subtitle2">Location</Typography>
                    <Typography>{order.locationText}</Typography>
                  </Grid>
                )}
                {order.phone && (
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <Typography variant="subtitle2">Contact Phone</Typography>
                    <Typography>{order.phone}</Typography>
                  </Grid>
                )}
                {order.createdAt && (
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <Typography variant="subtitle2">Created</Typography>
                    <Typography>{new Date(order.createdAt).toLocaleDateString()}</Typography>
                  </Grid>
                )}
              </Grid>

              {/* Status actions */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Actions</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {canStart && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  >
                    Start Work
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleStatusUpdate('COMPLETED')}
                  >
                    Mark Complete
                  </Button>
                )}
                {canMarkWaiting && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<HourglassEmptyIcon />}
                    onClick={() => setWaitingPartsDialog(true)}
                  >
                    Waiting for Parts
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Update Timeline */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Update Timeline</Typography>

              {updates.length === 0 && (
                <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                  No updates yet.
                </Typography>
              )}

              <List disablePadding>
                {updates.map((u, i) => (
                  <Box key={u.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip
                                label={u.authorRole}
                                color={ROLE_COLORS[u.authorRole] || 'default'}
                                size="small"
                                variant="outlined"
                              />
                              {!u.visibleToClient && (
                                <Chip label="Internal" size="small" color="default" />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {u.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {i < updates.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add an update or note…"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={visibleToClient}
                        onChange={(e) => setVisibleToClient(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Visible to client</Typography>}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handlePostUpdate}
                    disabled={!newMessage.trim() || postingUpdate}
                  >
                    {postingUpdate ? 'Posting…' : 'Post Update'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Attachments</Typography>
                <Tooltip title="Upload photo or file (max 20 MB)">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={uploadingFile ? <CircularProgress size={16} /> : <AttachFileIcon />}
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingFile ? 'Uploading…' : 'Upload File'}
                    </Button>
                  </span>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </Box>

              {attachments.length === 0 && (
                <Typography color="text.secondary" variant="body2">No attachments yet.</Typography>
              )}

              <List disablePadding>
                {attachments.map(a => (
                  <ListItem
                    key={a.id}
                    sx={{ px: 0 }}
                    secondaryAction={
                      <Button
                        size="small"
                        href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${a.downloadUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={a.originalName}
                      secondary={
                        <>
                          {a.contentType} · {a.fileSize ? `${Math.round(a.fileSize / 1024)} KB` : ''}
                          {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleDateString()}` : ''}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }} >
          <TimeTracker workOrderId={id} />
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Order Details</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={order.status.replace(/_/g, ' ')}
                      color={STATUS_COLORS[order.status] || 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
                {order.issueCategory && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Category</Typography>
                    <Typography variant="body2">{order.issueCategory.replace(/_/g, ' ')}</Typography>
                  </Box>
                )}
                {order.severity && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Severity</Typography>
                    <Typography variant="body2">{order.severity}</Typography>
                  </Box>
                )}
                {order.symptoms && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Symptoms</Typography>
                    <Typography variant="body2">{order.symptoms}</Typography>
                  </Box>
                )}
                {order.notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{order.notes}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Waiting Parts Dialog */}
      <Dialog open={waitingPartsDialog} onClose={() => setWaitingPartsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flag as Waiting for Parts</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will change the order status to WAITING_PARTS. Optionally add a note about what parts are needed.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Parts needed (optional)"
            value={waitingPartsReason}
            onChange={(e) => setWaitingPartsReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaitingPartsDialog(false)}>Cancel</Button>
          <Button onClick={handleWaitingParts} variant="contained" color="warning">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
