/* eslint-disable react/prop-types */
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Autocomplete, Box, Chip, CircularProgress,
  Collapse, IconButton, InputAdornment, ListItem,
  ListItemText, TextField, Typography,
} from '@mui/material';
import PinDropIcon from '@mui/icons-material/PinDrop';
import CloseIcon from '@mui/icons-material/Close';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DOHA = [25.2854, 51.531];
// Qatar-biased but not restricted (handles "Doha" correctly even without countrycodes)
const SEARCH_URL = (q) =>
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=qa&addressdetails=0`;
const REVERSE_URL = (lat, lng) =>
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

async function searchPlaces(query) {
  try {
    const res = await fetch(SEARCH_URL(query), { headers: { 'Accept-Language': 'en' } });
    return await res.json(); // [{place_id, display_name, lat, lon}, ...]
  } catch {
    return [];
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(REVERSE_URL(lat, lng), { headers: { 'Accept-Language': 'en' } });
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
 * Address search field with inline Leaflet map picker.
 *
 * User can:
 *   1. Type to search → select a suggestion → pin placed automatically
 *   2. Click on the map to drop / move the pin (reverse geocodes into the field)
 *   3. Drag the pin to fine-tune (also reverse geocodes)
 *
 * Props:
 *   label      – field label
 *   value      – current address string (controlled)
 *   lat / lng  – current coordinates (number | null)
 *   onChange({ address, lat, lng }) – called on any change
 *   required   – marks field required
 */
export default function LocationPickerField({ label, value, lat, lng, onChange, required }) {
  const [inputValue, setInputValue]   = useState(value ?? '');
  const [options, setOptions]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [geocoding, setGeocoding]     = useState(false);
  const [mapOpen, setMapOpen]         = useState(false);

  const searchTimer   = useRef(null);
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markerRef     = useRef(null);
  const onChangeRef   = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep input display in sync when parent resets the form
  useEffect(() => { setInputValue(value ?? ''); }, [value]);

  // ── forward geocode search ────────────────────────────────────────────────

  const handleInputChange = useCallback((_, newInput, reason) => {
    setInputValue(newInput);
    if (reason !== 'input') return; // skip on 'reset' (after selection) and 'clear'

    clearTimeout(searchTimer.current);
    if (!newInput || newInput.length < 3) { setOptions([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(newInput);
      setSearching(false);
      setOptions(results);
    }, 350);
  }, []);

  const handleSelect = useCallback((_, selected) => {
    if (!selected || typeof selected === 'string') return;
    const newLat = parseFloat(selected.lat);
    const newLng = parseFloat(selected.lon);
    onChangeRef.current({ address: selected.display_name, lat: newLat, lng: newLng });
    setOptions([]);
    // Move / create pin and re-center map
    placePin(newLat, newLng);
    if (mapRef.current) mapRef.current.setView([newLat, newLng], 15);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── map helpers ───────────────────────────────────────────────────────────

  const placePin = (newLat, newLng) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    } else {
      markerRef.current = L.marker([newLat, newLng], { icon: pinIcon(), draggable: true }).addTo(map);
      markerRef.current.on('dragend', onDragEnd);
    }
  };

  const onMapClick = async (e) => {
    const { lat: newLat, lng: newLng } = e.latlng;
    placePin(newLat, newLng);
    setGeocoding(true);
    const address = await reverseGeocode(newLat, newLng);
    setGeocoding(false);
    setInputValue(address);
    onChangeRef.current({ address, lat: newLat, lng: newLng });
  };

  const onDragEnd = async (e) => {
    const { lat: newLat, lng: newLng } = e.target.getLatLng();
    setGeocoding(true);
    const address = await reverseGeocode(newLat, newLng);
    setGeocoding(false);
    setInputValue(address);
    onChangeRef.current({ address, lat: newLat, lng: newLng });
  };

  // ── map lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapOpen) {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    const initLat = lat ?? DOHA[0];
    const initLng = lng ?? DOHA[1];

    const map = L.map(containerRef.current).setView([initLat, initLng], lat ? 15 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
      markerRef.current.on('dragend', onDragEnd);
    }

    map.on('click', onMapClick);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 320);
  }, [mapOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-center map if coordinates change while map is open (e.g. after search select)
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    placePin(lat, lng);
    mapRef.current.setView([lat, lng], 15);
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Autocomplete
        freeSolo
        disablePortal={false}
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.display_name)}
        filterOptions={(x) => x}   // all filtering is server-side
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleSelect}
        loading={searching}
        noOptionsText="No results"
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <InputAdornment position="end" sx={{ gap: 0.5 }}>
                  {(searching || geocoding) && <CircularProgress size={16} />}
                  <IconButton
                    size="small"
                    title={mapOpen ? 'Hide map' : 'Show map'}
                    onClick={() => setMapOpen(v => !v)}
                    color={mapOpen ? 'primary' : 'default'}
                  >
                    {mapOpen ? <CloseIcon fontSize="small" /> : <PinDropIcon fontSize="small" />}
                  </IconButton>
                  {params.InputProps.endAdornment}
                </InputAdornment>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <ListItem {...props} key={option.place_id} dense>
            <ListItemText
              primary={option.display_name.split(',')[0]}
              secondary={option.display_name.split(',').slice(1).join(',').trim()}
              secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
            />
          </ListItem>
        )}
      />

      {lat && lng && (
        <Chip
          label={`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mt: 0.5, fontSize: 11 }}
        />
      )}

      <Collapse in={mapOpen} timeout={300}>
        <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', bgcolor: 'action.hover', color: 'text.secondary' }}>
            Click to drop a pin · drag to adjust · or search above
          </Typography>
          <Box ref={containerRef} sx={{ height: 260 }} />
        </Box>
      </Collapse>
    </Box>
  );
}
