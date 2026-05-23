import { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box } from '@mui/material';

const DOHA = [25.2854, 51.531];

function driverIcon(color, name) {
  const fill = { green: '#43a047', yellow: '#fb8c00', red: '#e53935', grey: '#90a4ae' }[color] ?? '#1565c0';
  const short = name ? name.split(' ')[0] : '';
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
        <div style="
          width:16px;height:16px;border-radius:50%;
          background:${fill};border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.45);
        "></div>
      </div>`,
    iconSize: [66, 30],
    iconAnchor: [33, 30],
  });
}

function stopIcon(n, done, selected) {
  const fill   = done ? '#9e9e9e' : selected ? '#e65100' : '#1565c0';
  const border = selected ? '3px solid #ff9800' : '2px solid #fff';
  const shadow = selected
    ? '0 0 0 3px rgba(255,152,0,0.4),0 2px 8px rgba(0,0,0,.4)'
    : '0 2px 6px rgba(0,0,0,.3)';
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${fill};border:${border};box-shadow:${shadow};
      color:#fff;font-weight:700;font-size:${selected ? 13 : 11}px;
      display:flex;align-items:center;justify-content:center;
      ${done ? 'opacity:0.65' : ''}
    ">${done ? '✓' : n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function DeliveryMap({
  positions = [],
  tasks = [],
  driverById = {},
  onDriverClick,
  height = '360px',
  showStops = false,
  selectedDriverId,
  selectedStopId,
  onStopSelect,
}) {
  const containerRef        = useRef(null);
  const mapRef              = useRef(null);
  const markersRef          = useRef([]);
  const stopMarkersByIdRef  = useRef({});

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(DOHA, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const tasksByTech = {};
    tasks.forEach(t => {
      if (t.assignedTo) (tasksByTech[t.assignedTo] ??= []).push(t);
    });

    // Driver markers
    positions.forEach(pos => {
      const techId = Number(pos.techId);
      const techTasks = tasksByTech[techId] ?? [];
      const hasFailed = techTasks.some(t => t.status === 'FAILED');
      const allDone = techTasks.length > 0 && techTasks.every(t => t.status === 'DELIVERED');
      const color = hasFailed ? 'red' : allDone ? 'grey' : 'green';
      const isSelected = selectedDriverId != null && techId === Number(selectedDriverId);
      const done = techTasks.filter(t => t.status === 'DELIVERED').length;
      const name = driverById[techId]?.name ?? `Driver #${pos.techId}`;

      const marker = L.marker(
        [parseFloat(pos.lat), parseFloat(pos.lng)],
        { icon: driverIcon(isSelected ? 'yellow' : color, name) }
      );

      const clickLink = onDriverClick
        ? `<div style="cursor:pointer;color:#1565c0;text-decoration:underline;font-size:12px;margin-top:4px" data-tech="${techId}">View details</div>`
        : '';

      marker.bindPopup(`
        <div style="font-family:inherit">
          <strong style="font-size:14px">${name}</strong><br/>
          <span style="font-size:12px">${done}/${techTasks.length} stops done</span>
          ${hasFailed ? '<br/><span style="font-size:12px;color:#e53935">⚠ Has failed stop</span>' : ''}
          ${clickLink}
        </div>
      `);

      if (onDriverClick) {
        marker.on('click', () => onDriverClick(techId));
        marker.on('popupopen', (e) => {
          const el = e.popup.getElement()?.querySelector(`[data-tech="${techId}"]`);
          if (el) el.addEventListener('click', () => onDriverClick(techId));
        });
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Stop markers
    if (showStops) {
      stopMarkersByIdRef.current = {};
      tasks
        .filter(t => t.deliveryLat && t.deliveryLng)
        .forEach((t, i) => {
          const done     = t.status === 'DELIVERED';
          const selected = t.id === selectedStopId;
          const marker   = L.marker(
            [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)],
            { icon: stopIcon(t.stopOrder ?? i + 1, done, selected) }
          );
          marker.bindPopup(`
            <div style="font-family:inherit;min-width:140px">
              <strong style="font-size:13px">Stop ${t.stopOrder ?? i + 1}</strong><br/>
              <span style="font-size:12px">${t.deliveryAddress ?? ''}</span><br/>
              <span style="display:inline-block;margin-top:4px;font-size:11px;
                padding:2px 6px;border-radius:3px;background:#e3f2fd;color:#1565c0">
                ${t.status}
              </span>
            </div>
          `);
          if (onStopSelect) {
            marker.on('click', () => onStopSelect(t.id === selectedStopId ? null : t.id));
          }
          marker.addTo(map);
          markersRef.current.push(marker);
          stopMarkersByIdRef.current[t.id] = marker;

          if (selected) {
            map.setView([parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)], 16);
            marker.openPopup();
          }
        });
    }

    // Re-center if we have positions
    if (positions.length > 0) {
      map.setView([parseFloat(positions[0].lat), parseFloat(positions[0].lng)], map.getZoom());
    }
  }, [positions, tasks, driverById, onDriverClick, showStops, selectedDriverId, selectedStopId, onStopSelect]);

  return <Box ref={containerRef} sx={{ height, borderRadius: 2, overflow: 'hidden' }} />;
}
