/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Button, IconButton, Menu, MenuItem,
  ListItemIcon, ListItemText, Tooltip,
  Box, Stack, Typography, Divider,
} from '@mui/material';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useTranslation } from 'react-i18next';

/* ── URL builders ──────────────────────────────────────────────────────── */
function googleUrl(lat, lng, address) {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;
}

function wazeUrl(lat, lng, address) {
  if (lat && lng) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(address ?? '')}&navigate=yes`;
}

/* ── App definitions ────────────────────────────────────────────────────── */
const APPS = [
  {
    id: 'waze',
    labelKey: 'tasks.openWaze',
    buildUrl: wazeUrl,
    Icon: WazeIcon,
    accentColor: '#00B5CC',
  },
  {
    id: 'google',
    labelKey: 'tasks.openMaps',
    buildUrl: googleUrl,
    Icon: GoogleMapsIcon,
    accentColor: '#4285F4',
  },
];

const PREF_KEY = 'delivery_nav_app';

function getSavedApp() {
  try { return localStorage.getItem(PREF_KEY) ?? 'waze'; } catch { return 'waze'; }
}
function saveApp(id) {
  try { localStorage.setItem(PREF_KEY, id); } catch { /* ignore */ }
}

/* ── Brand icons (inline SVG — no extra deps) ───────────────────────────── */
function WazeIcon({ size = 22 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 56 60"
      xmlns="http://www.w3.org/2000/svg"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      {/* Body */}
      <path
        d="M28 2C14.8 2 4 11.6 4 23.5c0 7.2 3.9 13.6 10 17.4l-2.4 6.6 8.6-3.3c2.4.6 5 .8 7.8.8C41.2 45 52 35.4 52 23.5S41.2 2 28 2z"
        fill="#33CCFF"
      />
      {/* Left eye */}
      <ellipse cx="20" cy="22" rx="3.5" ry="4" fill="white" />
      <circle cx="21" cy="22.5" r="2" fill="#1A1A1A" />
      <circle cx="22" cy="21.5" r=".7" fill="white" />
      {/* Right eye */}
      <ellipse cx="36" cy="22" rx="3.5" ry="4" fill="white" />
      <circle cx="37" cy="22.5" r="2" fill="#1A1A1A" />
      <circle cx="38" cy="21.5" r=".7" fill="white" />
      {/* Smile */}
      <path
        d="M20 31 Q28 37 36 31"
        stroke="#1A1A1A"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </Box>
  );
}

function GoogleMapsIcon({ size = 22 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </Box>
  );
}

/* ── Shared logic hook ──────────────────────────────────────────────────── */
function useNavMenu({ lat, lng, address }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [prefId, setPrefId]     = useState(getSavedApp);
  const open = Boolean(anchorEl);

  const openMenu  = (e) => { e.preventDefault(); e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const closeMenu = () => setAnchorEl(null);

  const navigate = (appId) => {
    const app = APPS.find(a => a.id === appId);
    if (!app) return;
    saveApp(appId);
    setPrefId(appId);
    window.open(app.buildUrl(lat, lng, address), '_blank', 'noopener,noreferrer');
    closeMenu();
  };

  const preferred = APPS.find(a => a.id === prefId) ?? APPS[0];

  return { anchorEl, open, openMenu, closeMenu, navigate, preferred, prefId };
}

/* ── Shared Menu popover ────────────────────────────────────────────────── */
function AppMenu({ anchorEl, open, onClose, onSelect, prefId, t }) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 4,
        sx: { minWidth: 180, borderRadius: 2, overflow: 'hidden' },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: .5 }}>
          {t('tasks.navigate')}
        </Typography>
      </Box>
      <Divider sx={{ mb: .5 }} />
      {APPS.map(app => (
        <MenuItem
          key={app.id}
          onClick={() => onSelect(app.id)}
          selected={app.id === prefId}
          sx={{
            py: 1.25, px: 2,
            '&.Mui-selected': { bgcolor: `${app.accentColor}14` },
            '&:hover': { bgcolor: `${app.accentColor}10` },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>
            <app.Icon size={22} />
          </ListItemIcon>
          <ListItemText primary={t(app.labelKey)} primaryTypographyProps={{ fontWeight: app.id === prefId ? 700 : 400 }} />
          {app.id === prefId && (
            <CheckRoundedIcon sx={{ fontSize: 16, color: app.accentColor, ml: 1 }} />
          )}
        </MenuItem>
      ))}
      <Box sx={{ px: 2, py: .75 }}>
        <Typography variant="caption" color="text.disabled">{t('tasks.changeApp')}</Typography>
      </Box>
    </Menu>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NavigateIconMenu — compact icon variant for the task-list card
   ─────────────────────────────────────────────────────────────────────────*/
export function NavigateIconMenu({ lat, lng, address }) {
  const { t } = useTranslation('delivery');
  const { anchorEl, open, openMenu, closeMenu, navigate, preferred, prefId } = useNavMenu({ lat, lng, address });

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ ml: .25 }}>
        {/* Main icon — opens preferred app directly */}
        <Tooltip title={`${t('tasks.navigate')} (${t(preferred.labelKey)})`} placement="top">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              window.open(preferred.buildUrl(lat, lng, address), '_blank', 'noopener,noreferrer');
            }}
            sx={{
              p: '5px',
              '&:hover': { bgcolor: `${preferred.accentColor}18` },
            }}
          >
            <preferred.Icon size={20} />
          </IconButton>
        </Tooltip>

        {/* Arrow — opens app-picker menu */}
        <Tooltip title={t('tasks.changeApp')} placement="top">
          <IconButton
            size="small"
            onClick={openMenu}
            sx={{ p: '2px', ml: -.5, color: 'text.disabled' }}
          >
            <ArrowDropDownRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <AppMenu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onSelect={navigate}
        prefId={prefId}
        t={t}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   NavigateButton — labelled button variant for the task-detail page
   ─────────────────────────────────────────────────────────────────────────*/
export function NavigateButton({ lat, lng, address }) {
  const { t } = useTranslation('delivery');
  const { anchorEl, open, openMenu, closeMenu, navigate, preferred, prefId } = useNavMenu({ lat, lng, address });

  return (
    <>
      {/* Split button: [icon + label] | [▾] */}
      <Stack direction="row" alignItems="stretch" sx={{ display: 'inline-flex' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.open(preferred.buildUrl(lat, lng, address), '_blank', 'noopener,noreferrer')}
          sx={{
            borderRight: 0,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            gap: .75,
            pr: 1.5,
            color: preferred.accentColor,
            borderColor: `${preferred.accentColor}70`,
            '&:hover': {
              borderColor: preferred.accentColor,
              bgcolor: `${preferred.accentColor}10`,
              borderRight: 0,
            },
          }}
        >
          <preferred.Icon size={18} />
          {t('tasks.navigate')}
        </Button>

        <Button
          size="small"
          variant="outlined"
          onClick={openMenu}
          sx={{
            minWidth: 28,
            px: .5,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            color: preferred.accentColor,
            borderColor: `${preferred.accentColor}70`,
            '&:hover': {
              borderColor: preferred.accentColor,
              bgcolor: `${preferred.accentColor}10`,
            },
          }}
        >
          <ArrowDropDownRoundedIcon sx={{ fontSize: 20 }} />
        </Button>
      </Stack>

      <AppMenu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onSelect={navigate}
        prefId={prefId}
        t={t}
      />
    </>
  );
}
