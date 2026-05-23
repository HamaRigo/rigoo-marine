/* eslint-disable react/prop-types */
import { useRef, useEffect, useState } from 'react';
import {
  Box, TextField, InputAdornment, IconButton, Collapse,
  CircularProgress, Chip, Typography,
} from '@mui/material';
import PinDropIcon from '@mui/icons-material/PinDrop';
import CloseIcon from '@mui/icons-material/Close';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DOHA = [25.2854, 51.531];

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name ?? '';
  } catch {
    return '';
  }
}

function pinIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50% 50% 50% 0;
      background:#1565c0;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.4);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

/**
 * A text field augmented with an inline Leaflet map picker.
 *
 * Props:
 *   label       – field label
 *   value       – address string
 *   lat / lng   – current coordinates (number|null)
 *   onChange({ address, lat, lng }) – called after click/drag
 *   required    – marks field required
 */
export default function LocationPickerField({ label, value, lat, lng, onChange, required }) {
  const [open, setOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Keep onChange in a ref so the Leaflet closure is never stale
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init/destroy map when panel toggles
  useEffect(() => {
    if (!open) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    if (!containerRef.current || mapRef.current) return;

    const initLat = lat ?? DOHA[0];
    const initLng = lng ?? DOHA[1];
    const zoom    = lat ? 15 : 12;

    const map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // Place existing pin if we already have coords
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
      markerRef.current.on('dragend', async (e) => {
        const pos = e.target.getLatLng();
        setGeocoding(true);
        const address = await reverseGeocode(pos.lat, pos.lng);
        setGeocoding(false);
        onChangeRef.current({ address, lat: pos.lat, lng: pos.lng });
      });
    }

    map.on('click', async (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        markerRef.current = L.marker([newLat, newLng], { icon: pinIcon(), draggable: true }).addTo(map);
        markerRef.current.on('dragend', async (ev) => {
          const pos = ev.target.getLatLng();
          setGeocoding(true);
          const address = await reverseGeocode(pos.lat, pos.lng);
          setGeocoding(false);
          onChangeRef.current({ address, lat: pos.lat, lng: pos.lng });
        });
      }

      setGeocoding(true);
      const address = await reverseGeocode(newLat, newLng);
      setGeocoding(false);
      onChangeRef.current({ address, lat: newLat, lng: newLng });
    });

    mapRef.current = map;
    // Let Collapse finish animating before leaflet measures the container
    setTimeout(() => map.invalidateSize(), 320);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChangeRef.current({ address: e.target.value, lat: lat ?? null, lng: lng ?? null })}
        fullWidth
        required={required}
        multiline
        minRows={2}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {geocoding
                ? <CircularProgress size={18} />
                : (
                  <IconButton
                    size="small"
                    title={open ? 'Close map' : 'Pick on map'}
                    onClick={() => setOpen(v => !v)}
                    color={open ? 'primary' : 'default'}
                  >
                    {open ? <CloseIcon fontSize="small" /> : <PinDropIcon fontSize="small" />}
                  </IconButton>
                )}
            </InputAdornment>
          ),
        }}
      />

      {lat && lng && !geocoding && (
        <Chip
          label={`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mt: 0.5, fontSize: 11 }}
        />
      )}

      <Collapse in={open} timeout={300}>
        <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', bgcolor: 'action.hover', color: 'text.secondary' }}>
            Click anywhere to drop a pin · drag to adjust
          </Typography>
          <Box ref={containerRef} sx={{ height: 240 }} />
        </Box>
      </Collapse>
    </Box>
  );
}
