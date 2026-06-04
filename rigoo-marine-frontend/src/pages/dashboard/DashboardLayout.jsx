/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Box, AppBar, Toolbar, Button, IconButton, Avatar, Tabs, Tab,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Typography, Stack, useTheme, useMediaQuery, Tooltip, Fade,
  Container, Menu, MenuItem,
} from '@mui/material';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth }              from '../../context/AuthContext';
import { SUPPORTED_LANGUAGES }  from '../../i18n';

import LanguageRoundedIcon   from '@mui/icons-material/LanguageRounded';
import HomeRoundedIcon       from '@mui/icons-material/HomeRounded';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import AccountCircleRoundedIcon  from '@mui/icons-material/AccountCircleRounded';
import PersonRoundedIcon     from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon     from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon        from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon      from '@mui/icons-material/CloseRounded';
import SellRoundedIcon       from '@mui/icons-material/SellRounded';

import UnverifiedEmailBanner from '../../components/common/UnverifiedEmailBanner';
import NotificationBell      from '../../components/notifications/NotificationBell';

// ── Nav items ──────────────────────────────────────────────────────────────

const NAV_KEYS = [
  { key: 'fleet',     path: '/dashboard/vessels',      icon: DirectionsBoatRoundedIcon },
  { key: 'listings',  path: '/dashboard/my-listings',  icon: SellRoundedIcon           },
  { key: 'account',   path: '/dashboard/account',      icon: AccountCircleRoundedIcon  },
  { key: 'profile',   path: '/dashboard/profile',      icon: PersonRoundedIcon         },
];

function pathToTab(pathname) {
  if (pathname.startsWith('/dashboard/my-listings')) return 1;
  if (pathname.startsWith('/dashboard/account'))     return 2;
  if (pathname.startsWith('/dashboard/profile'))     return 3;
  return 0;
}

// ── Mobile drawer ──────────────────────────────────────────────────────────

function MobileDrawer({ open, onClose, user, onLogout }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { i18n }      = useTranslation('common');
  const { t }         = useTranslation('dashboard');

  const go = (path) => { navigate(path); onClose(); };

  const LANG_LABEL = { en: 'English', ar: 'العربية' };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 260,
          background: 'linear-gradient(180deg, #0B1A2E 0%, #060C18 100%)',
          color: 'white',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box component="img" src="/brand/logo.PNG" alt="Rigoo Marine"
          onError={e => { e.target.style.display = 'none'; }}
          sx={{ height: 34, width: 'auto', objectFit: 'contain' }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
            Rigoo
          </Typography>
          <Typography sx={{ color: 'rgba(180,148,75,0.9)', fontSize: '0.5rem', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            Marine
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nav */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton onClick={() => { navigate('/'); onClose(); }}
            sx={{ borderRadius: 2, py: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255,255,255,0.5)' }}>
              <HomeRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('nav.returnHome')}
              primaryTypographyProps={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }} />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />
        {NAV_KEYS.map(item => {
          const active = location.pathname.startsWith(item.path);
          const Icon   = item.icon;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton onClick={() => go(item.path)}
                sx={{
                  borderRadius: 2, py: 1,
                  background: active ? 'linear-gradient(90deg,rgba(0,150,200,0.2) 0%,rgba(0,105,148,0.1) 100%)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}>
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#00bcd4' : 'rgba(255,255,255,0.5)' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t(`nav.${item.key}`)}
                  primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: active ? 700 : 400, color: active ? 'white' : 'rgba(255,255,255,0.7)' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Language switcher */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 1 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', px: 1, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('nav.language')}
        </Typography>
        <Stack direction="row" gap={0.75} sx={{ mt: 0.75, px: 1 }}>
          {SUPPORTED_LANGUAGES.map(lng => (
            <Button
              key={lng}
              size="small"
              variant={i18n.language === lng ? 'contained' : 'outlined'}
              onClick={() => { i18n.changeLanguage(lng); onClose(); }}
              sx={{
                flex: 1, py: 0.6, fontSize: '0.75rem', textTransform: 'none', fontWeight: 600,
                ...(i18n.language === lng
                  ? { bgcolor: '#006994', color: 'white', '&:hover': { bgcolor: '#005577' } }
                  : { borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' } }
                ),
              }}
            >
              {LANG_LABEL[lng]}
            </Button>
          ))}
        </Stack>
      </Box>

      {/* User */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', p: 2 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'rgba(0,188,212,0.2)', border: '1px solid rgba(0,188,212,0.35)', color: '#00bcd4', fontSize: '0.75rem', fontWeight: 700 }}>
            {(user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: 'white', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Account'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </Typography>
          </Box>
          <Tooltip title={t('nav.signOut')}>
            <IconButton size="small" onClick={onLogout} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'error.light' } }}>
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langAnchor,  setLangAnchor]  = useState(null);
  const { user, logout } = useAuth();
  const { i18n }      = useTranslation('common');
  const { t }         = useTranslation('dashboard');
  const location  = useLocation();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));

  const tabValue  = pathToTab(location.pathname);
  const initials  = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const LANG_LABEL = { en: 'English', ar: 'العربية' };

  // Close the mobile drawer whenever the route changes so users don't have to
  // manually dismiss it after tapping a nav item.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); };
  const handleTab    = (_, idx) => navigate(NAV_KEYS[idx].path);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F4F7FA' }}>

      {/* ── Top AppBar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#0B1A2E',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ gap: 1.5, px: { xs: 1.5, md: 3 }, minHeight: { xs: 56, md: 64 } }}>

          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <MenuRoundedIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: { xs: 'auto', md: 0 } }}>
            <Box component="img" src="/brand/logo.PNG" alt="Rigoo Marine"
              onError={e => { e.target.style.display = 'none'; }}
              sx={{ height: { xs: 30, md: 36 }, width: 'auto', objectFit: 'contain' }} />
            {!isMobile && (
              <Box>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>
                  Rigoo
                </Typography>
                <Typography sx={{ color: 'rgba(180,148,75,0.9)', fontSize: '0.48rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                  Marine
                </Typography>
              </Box>
            )}
          </Box>

          {/* Return Home — desktop */}
          {!isMobile && (
            <Button
              component={Link}
              to="/"
              startIcon={<HomeRoundedIcon sx={{ fontSize: '1rem !important' }} />}
              size="small"
              sx={{
                ml: 2, mr: 1,
                color: 'rgba(255,255,255,0.65)',
                borderColor: 'rgba(255,255,255,0.18)',
                border: '1px solid',
                borderRadius: 2,
                fontSize: '0.75rem',
                px: 1.5, py: 0.6,
                textTransform: 'none',
                '&:hover': { color: 'white', borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              {t('nav.returnHome')}
            </Button>
          )}

          {/* Center nav tabs — desktop */}
          {!isMobile && (
            <Tabs
              value={tabValue}
              onChange={handleTab}
              sx={{
                flex: 1,
                '& .MuiTabs-indicator': {
                  backgroundColor: '#00bcd4',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                  fontSize: '0.82rem',
                  textTransform: 'none',
                  letterSpacing: 0,
                  minHeight: 64,
                  px: 2.5,
                  '&.Mui-selected': { color: 'white', fontWeight: 700 },
                },
              }}
            >
              {NAV_KEYS.map(item => (
                <Tab key={item.path} label={t(`nav.${item.key}`)}
                  icon={<item.icon sx={{ fontSize: '1rem !important' }} />}
                  iconPosition="start" sx={{ gap: 0.75 }} />
              ))}
            </Tabs>
          )}

          {/* Right cluster */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 0, md: 'auto' } }}>
            <NotificationBell />

            {!isMobile && (
              <>
                {/* Language switcher */}
                <Tooltip title={t('language.switchTo', { defaultValue: 'Switch language' })}>
                  <IconButton
                    size="small"
                    onClick={e => setLangAnchor(e.currentTarget)}
                    sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}
                  >
                    <LanguageRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={langAnchor}
                  open={Boolean(langAnchor)}
                  onClose={() => setLangAnchor(null)}
                  TransitionComponent={Fade}
                  PaperProps={{ sx: { mt: 1, minWidth: 130, borderRadius: 2 } }}
                >
                  {SUPPORTED_LANGUAGES.map(lng => (
                    <MenuItem
                      key={lng}
                      selected={i18n.language === lng}
                      onClick={() => { i18n.changeLanguage(lng); setLangAnchor(null); }}
                      sx={{
                        fontSize: '0.85rem', fontWeight: i18n.language === lng ? 700 : 400,
                        '&.Mui-selected': { bgcolor: 'rgba(0,105,148,0.1)', color: 'primary.main' },
                      }}
                    >
                      {LANG_LABEL[lng]}
                    </MenuItem>
                  ))}
                </Menu>

                <Tooltip title={t('nav.signedInAs', { email: user?.email })}>
                  <Avatar
                    sx={{
                      width: 33, height: 33, ml: 0.5,
                      bgcolor: 'rgba(0,188,212,0.2)',
                      border: '1.5px solid rgba(0,188,212,0.4)',
                      color: '#00bcd4', fontSize: '0.75rem', fontWeight: 700,
                      cursor: 'default',
                    }}
                  >
                    {initials}
                  </Avatar>
                </Tooltip>
                <Tooltip title={t('nav.signOut')}>
                  <IconButton size="small" onClick={handleLogout}
                    sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'error.light', bgcolor: 'rgba(244,67,54,0.08)' } }}>
                    <LogoutRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} user={user} onLogout={handleLogout} />

      {/* ── Page content ── */}
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Container maxWidth="xl" disableGutters sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, md: 2.5 } }}>
          <UnverifiedEmailBanner />
          <Fade in key={location.pathname} timeout={260}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Outlet />
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
}
