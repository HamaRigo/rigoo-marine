import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  LinearProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { deliveryApi } from '../../services/api';
import { useAuth } from '../../hooks';

const STATUS_COLORS = {
  PENDING:    'default',
  ASSIGNED:   'warning',
  PICKED_UP:  'info',
  IN_TRANSIT: 'primary',
  DELIVERED:  'success',
  FAILED:     'error',
};

const DOHA = [25.2854, 51.531];

function numberedIcon(n, done, selected) {
  const bg = done ? '#9e9e9e' : selected ? '#e65100' : '#1565c0';
  const border = selected ? '3px solid #ff9800' : '2px solid white';
  const shadow = selected
    ? '0 0 0 3px rgba(255,152,0,0.4), 0 2px 8px rgba(0,0,0,0.4)'
    : '0 2px 6px rgba(0,0,0,0.3)';
  const size = selected ? 32 : 28;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};color:white;font-weight:700;font-size:${selected ? 14 : 13}px;
      display:flex;align-items:center;justify-content:center;
      border:${border};box-shadow:${shadow};
      ${done ? 'opacity:0.6' : ''}
      transition:all .2s;
    ">${done ? '✓' : n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function liveIcon(name) {
  const short = name ? name.split(' ')[0] : 'You';
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="
          background:rgba(0,0,0,0.55);color:#fff;
          font-size:9px;font-weight:600;line-height:1;
          padding:1px 4px;border-radius:3px;
          white-space:nowrap;max-width:64px;
          overflow:hidden;text-overflow:ellipsis;
        ">${short}</div>
        <div style="position:relative;width:28px;height:28px">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:rgba(229,57,53,0.25);
            animation:pulse 1.8s ease-out infinite;
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:14px;height:14px;border-radius:50%;
            background:#e53935;border:3px solid white;
            box-shadow:0 2px 6px rgba(229,57,53,0.6);
          "></div>
        </div>
      </div>
      <style>@keyframes pulse{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>
    `,
    iconSize: [66, 44],
    iconAnchor: [33, 44],
  });
}

export default function DeliveryRoute() {
  const { t } = useTranslation('delivery');
  const { user } = useAuth();
  const [tasks, setTasks]               = useState([]);
  const [myPos, setMyPos]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [gpsError, setGpsError]         = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const watchRef = useRef(null);

  const mapContainerRef  = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const markersByIdRef   = useRef({});
  const polylineRef      = useRef(null);
  const liveDotRef       = useRef(null);
  const myPosRef         = useRef(null);
  const centeredOnGpsRef = useRef(false);

  // Fetch today's tasks
  useEffect(() => {
    deliveryApi.getTodayTasks()
      .then(setTasks)
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  // GPS watch → broadcast position every update
  const broadcast = useCallback(async (pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const next = { lat, lng };
    setMyPos(next);
    setGpsError(false);
    myPosRef.current = next;
    try { await deliveryApi.updatePosition(lat, lng, accuracy); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(broadcast, () => setGpsError(true), {
      enableHighAccuracy: true,
      maximumAge: 5000,
    });
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [broadcast]);

  // Init Leaflet map — runs once after first render.
  // The map container is ALWAYS in the DOM (no early return), so this is safe.
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(DOHA, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // "Center on me" control
    const RecenterControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button');
        btn.title = 'Center on my location';
        btn.innerHTML = '⊕';
        btn.style.cssText = [
          'width:32px;height:32px;background:white',
          'border:none;border-radius:4px',
          'box-shadow:0 1px 5px rgba(0,0,0,.4)',
          'font-size:18px;cursor:pointer',
          'display:flex;align-items:center;justify-content:center',
        ].join(';');
        L.DomEvent.on(btn, 'click', () => {
          const p = myPosRef.current;
          if (p) map.setView([p.lat, p.lng], 15);
        });
        return btn;
      },
      onRemove() {},
    });
    new RecenterControl({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-render stop markers + polyline when tasks or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    markersByIdRef.current = {};
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    const stops = tasks.filter(t => t.deliveryLat && t.deliveryLng);

    stops.forEach((task, i) => {
      const done = ['DELIVERED', 'FAILED'].includes(task.status);
      const selected = task.id === selectedStopId;
      const marker = L.marker(
        [parseFloat(task.deliveryLat), parseFloat(task.deliveryLng)],
        { icon: numberedIcon(task.stopOrder ?? i + 1, done, selected) }
      );
      marker.bindPopup(`
        <div style="font-family:inherit;min-width:160px">
          <strong>Stop ${task.stopOrder ?? i + 1}</strong><br/>
          <span style="font-size:12px">${task.deliveryAddress ?? ''}</span><br/>
          <span style="display:inline-block;margin-top:4px;font-size:12px;
            padding:2px 6px;border-radius:3px;background:#e3f2fd;color:#1565c0">
            ${task.status}
          </span><br/>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${task.deliveryLat},${task.deliveryLng}"
             target="_blank" rel="noopener noreferrer"
             style="font-size:12px;margin-top:4px;display:inline-block;color:#1565c0">
            Open in Google Maps ↗
          </a>
        </div>
      `);
      marker.addTo(map);
      markersRef.current.push(marker);
      markersByIdRef.current[task.id] = marker;

      if (selected) marker.openPopup();
    });

    if (stops.length > 1) {
      polylineRef.current = L.polyline(
        stops.map(t => [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)]),
        { color: '#1565c0', weight: 3, opacity: 0.55, dashArray: '8 4' }
      ).addTo(map);
    }

    if (stops.length > 0 && !myPosRef.current) {
      map.setView([parseFloat(stops[0].deliveryLat), parseFloat(stops[0].deliveryLng)], 13);
    }
  }, [tasks, selectedStopId]);  

  // Update live GPS dot and auto-center on first fix
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !myPos) return;

    if (liveDotRef.current) {
      liveDotRef.current.setLatLng([myPos.lat, myPos.lng]);
    } else {
      liveDotRef.current = L.marker([myPos.lat, myPos.lng], { icon: liveIcon(user?.name) })
        .bindPopup(`<strong>${user?.name ?? 'You'} — here</strong>`)
        .addTo(map);
    }

    // Auto-center on the first GPS fix
    if (!centeredOnGpsRef.current) {
      centeredOnGpsRef.current = true;
      map.setView([myPos.lat, myPos.lng], 15);
    }
  }, [myPos, user?.name]);  

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Route Map</Typography>

      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {gpsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          GPS unavailable — enable location access so your position is shown on the map.
        </Alert>
      )}

      {/* Map container is ALWAYS rendered so Leaflet can initialize on mount */}
      <Box
        ref={mapContainerRef}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 2,
          mb: 3,
          height: { xs: 340, sm: 480 },
          position: 'relative',
          bgcolor: 'action.hover',
        }}
      />

      <Stack spacing={1}>
        {tasks.map((task, i) => {
          const done = ['DELIVERED', 'FAILED'].includes(task.status);
          const selected = task.id === selectedStopId;
          const hasCoords = task.deliveryLat && task.deliveryLng;

          const handleCardClick = () => {
            const map = mapInstanceRef.current;
            if (!hasCoords || !map) return;
            const isAlreadySelected = task.id === selectedStopId;
            setSelectedStopId(isAlreadySelected ? null : task.id);
            if (!isAlreadySelected) {
              map.setView([parseFloat(task.deliveryLat), parseFloat(task.deliveryLng)], 16);
            }
          };

          return (
            <Card
              key={task.id}
              variant="outlined"
              onClick={handleCardClick}
              sx={{
                opacity: done ? 0.7 : 1,
                cursor: hasCoords ? 'pointer' : 'default',
                borderColor: selected ? 'warning.main' : 'divider',
                borderWidth: selected ? 2 : 1,
                bgcolor: selected ? 'warning.50' : 'background.paper',
                transition: 'border-color .2s, background-color .2s',
                '&:hover': hasCoords ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
              }}
            >
              <CardContent sx={{ py: '8px !important', px: 2 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    bgcolor: selected ? 'warning.main' : done ? 'grey.400' : 'primary.main',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {done ? '✓' : task.stopOrder ?? i + 1}
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{task.deliveryAddress}</Typography>
                  <Chip
                    label={t(`status.${task.status}`)}
                    color={STATUS_COLORS[task.status] || 'default'}
                    size="small"
                  />
                  {hasCoords && (
                    <Tooltip title={t('tasks.openMaps')}>
                      <IconButton
                        size="small"
                        component="a"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${task.deliveryLat},${task.deliveryLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
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
