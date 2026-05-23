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

function stopIcon(n, done) {
  const fill = done ? '#9e9e9e' : '#1565c0';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${fill};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      color:#fff;font-weight:700;font-size:11px;
      display:flex;align-items:center;justify-content:center;
      ${done ? 'opacity:0.65' : ''}
    ">${done ? '✓' : n}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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
      tasks
        .filter(t => t.deliveryLat && t.deliveryLng)
        .forEach((t, i) => {
          const done = t.status === 'DELIVERED';
          const marker = L.marker(
            [parseFloat(t.deliveryLat), parseFloat(t.deliveryLng)],
            { icon: stopIcon(t.stopOrder ?? i + 1, done) }
          );
          marker.bindPopup(`
            <div style="font-family:inherit">
              <strong style="font-size:13px">Stop ${t.stopOrder ?? i + 1} — ${t.status}</strong><br/>
              <span style="font-size:12px">${t.deliveryAddress ?? ''}</span>
            </div>
          `);
          marker.addTo(map);
          markersRef.current.push(marker);
        });
    }

    // Re-center if we have positions
    if (positions.length > 0) {
      map.setView([parseFloat(positions[0].lat), parseFloat(positions[0].lng)], map.getZoom());
    }
  }, [positions, tasks, driverById, onDriverClick, showStops, selectedDriverId]);

  return <Box ref={containerRef} sx={{ height, borderRadius: 2, overflow: 'hidden' }} />;
}
