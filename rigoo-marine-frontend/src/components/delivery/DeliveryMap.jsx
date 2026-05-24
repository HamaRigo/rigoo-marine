import { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Fab, Tooltip } from '@mui/material';
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded';

/* ── Centre on Doha ─────────────────────────────────────────────────────── */
const DOHA = [25.2854, 51.531];

/* ── Global CSS (injected once) ─────────────────────────────────────────── */
const CSS_ID = 'delivery-map-styles';
function ensureStyles() {
  if (document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    @keyframes dmPing {
      0%   { transform:scale(1);   opacity:.65; }
      80%  { transform:scale(2.8); opacity:0;   }
      100% { transform:scale(2.8); opacity:0;   }
    }
    .dm-wrap {
      display:flex; flex-direction:column; align-items:center;
      cursor:pointer; user-select:none;
    }
    .dm-ring-wrap { position:relative; display:flex; align-items:center; justify-content:center; }
    .dm-ping {
      position:absolute; inset:0; border-radius:50%;
      animation: dmPing 2s cubic-bezier(0,.2,.8,1) infinite;
    }
    .dm-dot {
      border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:800; letter-spacing:.5px; color:#fff; position:relative; z-index:1;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .dm-dot:hover { transform:scale(1.18) !important; }
    .dm-label {
      background:rgba(10,10,10,.78); backdrop-filter:blur(3px);
      color:#fff; font-size:10px; font-weight:600; line-height:1;
      padding:3px 7px; border-radius:5px; margin-top:5px;
      white-space:nowrap; max-width:88px;
      overflow:hidden; text-overflow:ellipsis;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    }
    .dm-stale .dm-ping { display:none; }
    .dm-stale .dm-dot  { filter:grayscale(.7) brightness(.8); opacity:.6; }
    .dm-stale .dm-label{ opacity:.5; }

    .dm-stop-dot {
      border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:800; color:#fff;
      border:2px solid #fff;
      box-shadow:0 2px 7px rgba(0,0,0,.3);
      transition:transform .15s ease, box-shadow .15s ease;
    }
    .dm-stop-dot:hover {
      transform:scale(1.22);
      box-shadow:0 5px 14px rgba(0,0,0,.38);
    }
    .dm-stop-sel {
      border:3px solid #ff9800 !important;
      box-shadow:0 0 0 4px rgba(255,152,0,.30), 0 5px 14px rgba(0,0,0,.38) !important;
    }
    .dm-stop-done { opacity:.5; filter:grayscale(.5); }
  `;
  document.head.appendChild(s);
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_FILL = { green:'#2e7d32', yellow:'#f57c00', red:'#c62828', grey:'#607d8b', blue:'#1565c0' };

function statusColor(tasks) {
  if (!tasks.length) return 'blue';
  if (tasks.some(t => t.status === 'FAILED'))                              return 'red';
  if (tasks.every(t => t.status === 'DELIVERED'))                          return 'grey';
  if (tasks.some(t => ['IN_TRANSIT','PICKED_UP'].includes(t.status)))      return 'green';
  return 'blue';
}

function positionAge(recordedAtEpochMs) {
  if (!recordedAtEpochMs) return 'unknown';
  const age = Date.now() - Number(recordedAtEpochMs);
  if (age < 90_000)  return 'fresh';
  if (age < 300_000) return 'recent';
  return 'stale';
}

function ageLabel(recordedAtEpochMs) {
  if (!recordedAtEpochMs) return '—';
  const sec = Math.round((Date.now() - Number(recordedAtEpochMs)) / 1000);
  if (sec < 60)   return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function computeBearing(lat1, lng1, lat2, lng2) {
  const toR = Math.PI / 180;
  const dL  = (lng2 - lng1) * toR;
  const r1  = lat1 * toR, r2 = lat2 * toR;
  const x   = Math.sin(dL) * Math.cos(r2);
  const y   = Math.cos(r1) * Math.sin(r2) - Math.sin(r1) * Math.cos(r2) * Math.cos(dL);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

/* ── Marker builders ────────────────────────────────────────────────────── */
function buildDriverIcon({ name, fill, age, isSelected, heading }) {
  const sz     = isSelected ? 50 : 42;
  const fs     = isSelected ? 15 : 13;
  const isStale = age === 'stale' || age === 'unknown';
  const shadow = isSelected
    ? `0 0 0 5px ${fill}50, 0 4px 14px rgba(0,0,0,.45)`
    : '0 3px 10px rgba(0,0,0,.38)';

  const arrowHtml = (heading != null && !isStale) ? `
    <div style="
      position:absolute; bottom:${sz + 9}px; left:50%;
      transform:translateX(-50%) rotate(${heading}deg);
      width:0; height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-bottom:11px solid ${fill};
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));
      opacity:.88;
    "></div>` : '';

  return L.divIcon({
    className: '',
    html: `
      <div class="dm-wrap${isStale ? ' dm-stale' : ''}" style="position:relative">
        ${arrowHtml}
        <div class="dm-ring-wrap" style="width:${sz}px;height:${sz}px">
          <div class="dm-ping" style="background:${fill}"></div>
          <div class="dm-dot" style="
            width:${sz}px; height:${sz}px; font-size:${fs}px;
            background:${fill};
            border:${isSelected ? '3px' : '2.5px'} solid rgba(255,255,255,.9);
            box-shadow:${shadow};
          ">${initials(name)}</div>
        </div>
        <div class="dm-label">${name?.split(' ')[0] ?? ''}</div>
      </div>`,
    iconSize:    [sz + 24, sz + 28],
    iconAnchor:  [(sz + 24) / 2, sz / 2 + 3],
    popupAnchor: [0, -(sz / 2 + 5)],
  });
}

function buildStopIcon(n, done, selected) {
  const sz   = selected ? 34 : 26;
  const fill = done ? '#78909c' : selected ? '#e65100' : '#1565c0';
  const cls  = `dm-stop-dot${done ? ' dm-stop-done' : ''}${selected ? ' dm-stop-sel' : ''}`;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="width:${sz}px;height:${sz}px;font-size:${selected ? 14 : 11}px;background:${fill}">
             ${done ? '✓' : n}
           </div>`,
    iconSize:    [sz, sz],
    iconAnchor:  [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

/* ── Smooth marker animation ────────────────────────────────────────────── */
function animateMarker(marker, toLat, toLng, durationMs = 1200) {
  const from  = marker.getLatLng();
  const start = performance.now();
  let rafId;
  function step(now) {
    const t    = Math.min((now - start) / durationMs, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    marker.setLatLng([from.lat + (toLat - from.lat) * ease, from.lng + (toLng - from.lng) * ease]);
    if (t < 1) rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function DeliveryMap({
  positions      = [],
  tasks          = [],
  trail          = [],        // [{lat,lng}] breadcrumb for selected driver
  driverById     = {},
  onDriverClick,
  height         = '420px',
  showStops      = false,
  selectedDriverId,
  selectedStopId,
  onStopSelect,
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const driverMarkersRef= useRef({});   // techId → { marker, cancelAnim, prevLat, prevLng, heading }
  const accuracyCircles = useRef({});   // techId → L.circle
  const stopLayerRef    = useRef([]);   // disposable: stop markers + polylines
  const trailLayerRef   = useRef(null); // breadcrumb polyline
  const positionsRef    = useRef([]);   // mirror of positions prop for cross-effect reads
  const hasFittedRef    = useRef(false);// auto-fit fires once per mount / driver change

  /* ── Init map once ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureStyles();

    const map = L.map(containerRef.current, { zoomControl: false }).setView(DOHA, 12);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Carto Voyager — clean, modern, fast
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Reset auto-fit flag whenever the viewed driver changes ── */
  useEffect(() => { hasFittedRef.current = false; }, [selectedDriverId, showStops]);

  /* ── Driver markers — persistent, animated on update ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    positionsRef.current = positions; // keep ref in sync for stop-layer effect

    const tasksByTech = {};
    tasks.forEach(t => { if (t.assignedTo) (tasksByTech[t.assignedTo] ??= []).push(t); });

    const seenIds = new Set();

    positions.forEach(pos => {
      const techId     = Number(pos.techId);
      const lat        = parseFloat(pos.lat);
      const lng        = parseFloat(pos.lng);
      const acc        = parseFloat(pos.accuracy) || 0;
      const age        = positionAge(pos.recordedAt);
      const isSelected = selectedDriverId != null && techId === Number(selectedDriverId);
      const techTasks  = tasksByTech[techId] ?? [];
      const color      = statusColor(techTasks);
      const fill       = isSelected ? '#e65100' : STATUS_FILL[color];
      const name       = driverById[techId]?.name ?? `Driver #${pos.techId}`;
      const done       = techTasks.filter(t => t.status === 'DELIVERED').length;

      seenIds.add(techId);

      const existing = driverMarkersRef.current[techId];

      if (existing) {
        // Animate to new position
        existing.cancelAnim?.();
        let heading = existing.heading;
        const dLat = lat - existing.prevLat, dLng = lng - existing.prevLng;
        if (Math.abs(dLat) > 0.00005 || Math.abs(dLng) > 0.00005) {
          heading = computeBearing(existing.prevLat, existing.prevLng, lat, lng);
        }
        const cancel = animateMarker(existing.marker, lat, lng);
        existing.marker.setIcon(buildDriverIcon({ name, fill, age, isSelected, heading }));
        if (isSelected) existing.marker.setZIndexOffset(1000);
        existing.cancelAnim = cancel;
        existing.prevLat    = lat;
        existing.prevLng    = lng;
        existing.heading    = heading;

        // Update accuracy circle
        if (acc > 0) {
          if (accuracyCircles.current[techId]) {
            accuracyCircles.current[techId].setLatLng([lat, lng]).setRadius(acc);
          } else {
            accuracyCircles.current[techId] = L.circle([lat, lng], {
              radius: acc, color: '#1565c0', fillColor: '#90caf9',
              fillOpacity: .12, weight: 1, opacity: .35, interactive: false,
            }).addTo(map);
          }
        }
      } else {
        // First appearance — create marker
        const marker = L.marker([lat, lng], {
          icon: buildDriverIcon({ name, fill, age, isSelected, heading: null }),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.bindPopup(() => {
          const lastSeen = pos.recordedAt ? ageLabel(pos.recordedAt) : '—';
          const isStale  = age === 'stale';
          return `
            <div style="font-family:system-ui,sans-serif;min-width:165px">
              <div style="font-size:14px;font-weight:700;margin-bottom:4px">${name}</div>
              <div style="font-size:11px;color:#555;margin-bottom:6px">
                ${done}/${techTasks.length} stops
                &nbsp;·&nbsp;
                <span style="color:${isStale ? '#c62828' : '#43a047'}">${isStale ? '⚠ Stale · ' : ''}${lastSeen}</span>
              </div>
              ${techTasks.some(t => t.status === 'FAILED')
                ? '<div style="font-size:11px;color:#c62828;margin-bottom:4px">⚠ Has a failed stop</div>' : ''}
              ${onDriverClick
                ? `<div style="font-size:12px;color:#1565c0;cursor:pointer;text-decoration:underline" data-tech="${techId}">View full detail →</div>`
                : ''}
            </div>`;
        });

        if (onDriverClick) {
          marker.on('click', () => onDriverClick(techId));
          marker.on('popupopen', e => {
            e.popup.getElement()?.querySelector(`[data-tech="${techId}"]`)
              ?.addEventListener('click', () => onDriverClick(techId));
          });
        }

        marker.addTo(map);

        if (acc > 0) {
          accuracyCircles.current[techId] = L.circle([lat, lng], {
            radius: acc, color: '#1565c0', fillColor: '#90caf9',
            fillOpacity: .12, weight: 1, opacity: .35, interactive: false,
          }).addTo(map);
        }

        driverMarkersRef.current[techId] = {
          marker, cancelAnim: null, prevLat: lat, prevLng: lng, heading: null,
        };
      }
    });

    // Remove drivers no longer reporting
    Object.keys(driverMarkersRef.current).forEach(id => {
      if (!seenIds.has(Number(id))) {
        driverMarkersRef.current[id].marker.remove();
        driverMarkersRef.current[id].cancelAnim?.();
        accuracyCircles.current[id]?.remove();
        delete driverMarkersRef.current[id];
        delete accuracyCircles.current[id];
      }
    });

    // Auto-fit all drivers on the overview (no stops shown).
    // Single-driver view is fitted later in the stop-layer effect once stops are also rendered.
    if (!showStops && !hasFittedRef.current && positions.length > 0) {
      hasFittedRef.current = true;
      const pts = positions.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
      if (pts.length === 1) {
        map.setView(pts[0], 15);
      } else {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, tasks, driverById, selectedDriverId, onDriverClick]);

  /* ── Stop markers + route polylines (redrawn on task/stop change) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stopLayerRef.current.forEach(l => l.remove());
    stopLayerRef.current = [];

    if (!showStops) return;

    const geoTasks = tasks.filter(t => t.deliveryLat && t.deliveryLng);
    if (!geoTasks.length) return;

    const sorted = [...geoTasks].sort((a, b) => (a.stopOrder ?? 999) - (b.stopOrder ?? 999));

    // Dashed route line through all stops
    if (sorted.length > 1) {
      const coords = sorted.map(t => [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)]);
      stopLayerRef.current.push(
        L.polyline(coords, {
          color: '#90a4ae', weight: 2.5, opacity: .6,
          dashArray: '8 10', interactive: false,
        }).addTo(map)
      );
    }

    // Solid green connector: driver current position → next pending stop
    const nextStop = sorted.find(t => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(t.status));
    if (nextStop) {
      const driverPos = positions.find(
        p => selectedDriverId != null && Number(p.techId) === Number(selectedDriverId)
      );
      if (driverPos) {
        stopLayerRef.current.push(
          L.polyline(
            [
              [parseFloat(driverPos.lat), parseFloat(driverPos.lng)],
              [parseFloat(nextStop.deliveryLat), parseFloat(nextStop.deliveryLng)],
            ],
            { color: '#2e7d32', weight: 3, opacity: .7, dashArray: '12 7', interactive: false }
          ).addTo(map)
        );
      }
    }

    // Stop markers
    sorted.forEach((t, i) => {
      const done     = t.status === 'DELIVERED';
      const selected = t.id === selectedStopId;
      const marker   = L.marker(
        [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)],
        { icon: buildStopIcon(t.stopOrder ?? i + 1, done, selected) }
      );

      const statusColor = {
        PENDING: '#90a4ae', ASSIGNED: '#42a5f5', PICKED_UP: '#26a69a',
        IN_TRANSIT: '#fb8c00', DELIVERED: '#43a047', FAILED: '#e53935', CANCELLED: '#bdbdbd',
      }[t.status] ?? '#90a4ae';

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:155px">
          <div style="font-size:13px;font-weight:700;margin-bottom:3px">Stop ${t.stopOrder ?? i + 1}</div>
          <div style="font-size:11px;color:#555;margin-bottom:6px">${t.deliveryAddress ?? ''}</div>
          <span style="font-size:10px;font-weight:700;color:#fff;background:${statusColor};
            padding:2px 9px;border-radius:10px">${t.status}</span>
          ${t.invoiceAmount
            ? `<div style="font-size:11px;color:#1565c0;margin-top:5px;font-weight:600">${t.invoiceAmount} ${t.currency ?? ''}</div>`
            : ''}
          ${t.failedReason
            ? `<div style="font-size:11px;color:#c62828;margin-top:3px">✗ ${t.failedReason}</div>`
            : ''}
        </div>`);

      if (onStopSelect) {
        marker.on('click', () => onStopSelect(t.id === selectedStopId ? null : t.id));
      }

      marker.addTo(map);
      stopLayerRef.current.push(marker);

      if (selected) {
        map.setView([parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)], 16);
        marker.openPopup();
      }
    });

    // Auto-fit: show driver + all stops together on first render of this driver view.
    // Skip if a specific stop is selected (user is focused on that stop).
    if (!hasFittedRef.current && !selectedStopId) {
      hasFittedRef.current = true;

      const pts = [
        ...positionsRef.current.map(p => [parseFloat(p.lat), parseFloat(p.lng)]),
        ...sorted.map(t => [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)]),
      ].filter(([a, b]) => !isNaN(a) && !isNaN(b));

      if (pts.length === 1) {
        map.setView(pts[0], 15);
      } else if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, selectedStopId, showStops, onStopSelect]);

  /* ── Breadcrumb trail ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    trailLayerRef.current?.remove();
    trailLayerRef.current = null;

    if (trail.length < 2) return;

    const coords = trail
      .map(p => [parseFloat(p.lat), parseFloat(p.lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    if (coords.length < 2) return;

    trailLayerRef.current = L.polyline(coords, {
      color: '#e65100', weight: 2, opacity: .42,
      dashArray: '4 7', interactive: false,
    }).addTo(map);
  }, [trail]);

  /* ── Fit-all helper ── */
  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = [
      ...positions.map(p => [parseFloat(p.lat), parseFloat(p.lng)]),
      ...(showStops
        ? tasks.filter(t => t.deliveryLat && t.deliveryLng)
            .map(t => [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)])
        : []),
    ].filter(([a, b]) => !isNaN(a) && !isNaN(b));

    if (!pts.length) return;
    if (pts.length === 1) { map.setView(pts[0], 16); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 17 });
  }, [positions, tasks, showStops]);

  return (
    <Box sx={{
      position: 'relative', height, borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,.12)',
    }}>
      <Box ref={containerRef} sx={{ height: '100%', width: '100%' }} />
      <Tooltip title="Fit all" placement="left">
        <Fab
          size="small"
          onClick={fitAll}
          sx={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 999,
            bgcolor: 'background.paper', color: 'primary.main',
            boxShadow: '0 2px 8px rgba(0,0,0,.22)',
            '&:hover': { bgcolor: 'primary.main', color: '#fff' },
          }}
        >
          <FitScreenRoundedIcon fontSize="small" />
        </Fab>
      </Tooltip>
    </Box>
  );
}
