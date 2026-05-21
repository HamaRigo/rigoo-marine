import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Alert, Button, IconButton, Tooltip,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useTranslation } from 'react-i18next';
import { deliveryApi } from '../../services/api';

// Leaflet CSS must be loaded before MapContainer mounts
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';

// Fix Leaflet's default icon path broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
};

function numberedIcon(n, done) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${done ? '#9e9e9e' : '#1565c0'};
      color:white;font-weight:700;font-size:13px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ${done ? 'opacity:0.6' : ''}
    ">${done ? '✓' : n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function liveIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#e53935;border:3px solid white;
      box-shadow:0 0 0 4px rgba(229,57,53,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function RecenterButton({ position }) {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', bottom: 24, right: 12, zIndex: 1000 }}>
      <Tooltip title="Center on my location">
        <IconButton
          size="small"
          onClick={() => position && map.setView([position.lat, position.lng], 15)}
          sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}
        >
          <MyLocationIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export default function DeliveryRoute() {
  const { t } = useTranslation('delivery');
  const [tasks, setTasks] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    deliveryApi.getTodayTasks()
      .then(setTasks)
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  // Start GPS watch + broadcast every 30s
  const broadcast = useCallback(async (pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    setMyPos({ lat, lng });
    try { await deliveryApi.updatePosition(lat, lng, accuracy); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(broadcast, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
    });
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [broadcast]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;

  const stopsWithCoords = tasks.filter(t => t.deliveryLat && t.deliveryLng);
  const polyline = stopsWithCoords.map(t => [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)]);
  const center = myPos
    ? [myPos.lat, myPos.lng]
    : stopsWithCoords.length > 0
      ? [parseFloat(stopsWithCoords[0].deliveryLat), parseFloat(stopsWithCoords[0].deliveryLng)]
      : [25.2854, 51.5310]; // Doha default

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Route Map</Typography>

      <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 2, mb: 3, height: { xs: 340, sm: 480 } }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Numbered stop markers */}
          {stopsWithCoords.map((task, i) => {
            const done = ['DELIVERED', 'FAILED'].includes(task.status);
            return (
              <Marker
                key={task.id}
                position={[parseFloat(task.deliveryLat), parseFloat(task.deliveryLng)]}
                icon={numberedIcon(task.stopOrder ?? i + 1, done)}
              >
                <Popup>
                  <strong>Stop {task.stopOrder ?? i + 1}</strong><br />
                  {task.deliveryAddress}<br />
                  <Chip label={task.status} size="small" color={STATUS_COLORS[task.status] || 'default'} sx={{ mt: 0.5 }} /><br />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${task.deliveryLat},${task.deliveryLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, marginTop: 4, display: 'inline-block' }}
                  >
                    Open in Google Maps
                  </a>
                </Popup>
              </Marker>
            );
          })}

          {/* Route polyline */}
          {polyline.length > 1 && (
            <Polyline
              positions={polyline}
              pathOptions={{ color: '#1565c0', weight: 3, opacity: 0.6, dashArray: '8 4' }}
            />
          )}

          {/* Live position dot */}
          {myPos && (
            <Marker position={[myPos.lat, myPos.lng]} icon={liveIcon()}>
              <Popup>My location</Popup>
            </Marker>
          )}

          <RecenterButton position={myPos} />
        </MapContainer>
      </Box>

      {/* Stop list below map */}
      <Stack spacing={1}>
        {tasks.map((task, i) => {
          const done = ['DELIVERED', 'FAILED'].includes(task.status);
          return (
            <Card key={task.id} variant="outlined" sx={{ opacity: done ? 0.6 : 1 }}>
              <CardContent sx={{ py: '8px !important', px: 2 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 56 }}>
                    Stop {task.stopOrder ?? i + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{task.deliveryAddress}</Typography>
                  <Chip label={t(`status.${task.status}`)} color={STATUS_COLORS[task.status] || 'default'} size="small" />
                  {task.deliveryLat && task.deliveryLng && (
                    <Tooltip title={t('tasks.openMaps')}>
                      <IconButton
                        size="small"
                        component="a"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${task.deliveryLat},${task.deliveryLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
