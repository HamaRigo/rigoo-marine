import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, List, ListItem, ListItemText,
  ListItemSecondaryAction, Divider, LinearProgress,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { deliveryApi } from '../../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Green = has recent position, yellow = task assigned but no GPS, red = has failed stop
function techDotIcon(color) {
  const colors = { green: '#43a047', yellow: '#fb8c00', red: '#e53935' };
  const bg = colors[color] || '#1565c0';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;background:${bg};
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const POLL_MS = 30_000;
const DOHA = [25.2854, 51.5310];

export default function DeliveryTracking() {
  const { techId } = useParams(); // present when viewing a single tech
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      if (techId) {
        // Single-tech view: fetch their tasks + position
        const [tasksPage, pos] = await Promise.all([
          deliveryApi.adminListTasks({ assignedTo: Number(techId), size: 50 }),
          deliveryApi.getTechPosition(Number(techId)).catch(() => null),
        ]);
        setTasks(tasksPage?.content || []);
        setPositions(pos ? [pos] : []);
      } else {
        // All-techs view
        const [posAll, tasksPage] = await Promise.all([
          deliveryApi.adminListPositions(),
          deliveryApi.adminListTasks({ size: 100 }),
        ]);
        setPositions(posAll || []);
        setTasks(tasksPage?.content || []);
      }
    } catch {
      setError('Failed to load delivery tracking data.');
    } finally {
      setLoading(false);
    }
  }, [techId]);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchData]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;

  // Group tasks by tech
  const techIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
  const tasksByTech = {};
  techIds.forEach(id => { tasksByTech[id] = tasks.filter(t => t.assignedTo === id); });

  const mapCenter = positions.length > 0
    ? [parseFloat(positions[0].lat), parseFloat(positions[0].lng)]
    : DOHA;

  const title = techId ? `Delivery Tech #${techId}` : 'Delivery Tracking';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>{title}</Typography>

      {/* Map */}
      <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 2, mb: 3, height: { xs: 300, sm: 420 } }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positions.map(pos => {
            const techTasks = tasksByTech[Number(pos.techId)] || [];
            const hasFailed = techTasks.some(t => t.status === 'FAILED');
            const color = hasFailed ? 'red' : 'green';
            const done = techTasks.filter(t => t.status === 'DELIVERED').length;
            const total = techTasks.length;
            return (
              <Marker
                key={pos.techId}
                position={[parseFloat(pos.lat), parseFloat(pos.lng)]}
                icon={techDotIcon(color)}
                eventHandlers={{ click: () => !techId && navigate(`/admin/delivery/${pos.techId}`) }}
              >
                <Popup>
                  <strong>Tech #{pos.techId}</strong><br />
                  {done} / {total} stops done<br />
                  {!techId && (
                    <a onClick={() => navigate(`/admin/delivery/${pos.techId}`)} style={{ cursor: 'pointer', fontSize: 12 }}>
                      View details
                    </a>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Box>

      {/* Tech progress list */}
      {techId ? (
        // Single tech — show their stop list
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Stop List</Typography>
            <List dense disablePadding>
              {tasks.map((task, i) => (
                <Box key={task.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 0.75 }}>
                    <ListItemText
                      primary={`Stop ${task.stopOrder ?? i + 1} — ${task.deliveryAddress}`}
                      secondary={task.clientPhone}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={task.status} size="small"
                        color={task.status === 'DELIVERED' ? 'success' : task.status === 'FAILED' ? 'error' : 'default'} />
                    </ListItemSecondaryAction>
                  </ListItem>
                </Box>
              ))}
              {tasks.length === 0 && (
                <Typography color="text.disabled" variant="body2">No stops assigned.</Typography>
              )}
            </List>
          </CardContent>
        </Card>
      ) : (
        // All techs — progress cards
        <Grid container spacing={2}>
          {techIds.map(id => {
            const techTasks = tasksByTech[id] || [];
            const done = techTasks.filter(t => t.status === 'DELIVERED').length;
            const total = techTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const hasFailed = techTasks.some(t => t.status === 'FAILED');
            return (
              <Grid item xs={12} sm={6} md={4} key={id}>
                <Card
                  variant="outlined"
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => navigate(`/admin/delivery/${id}`)}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <LocalShippingIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={700}>Tech #{id}</Typography>
                      {hasFailed && <Chip label="Failed stop" size="small" color="error" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {done} of {total} stops completed
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={hasFailed ? 'error' : 'success'}
                      sx={{ borderRadius: 1, height: 6 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {techIds.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.disabled">No active delivery techs today.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
