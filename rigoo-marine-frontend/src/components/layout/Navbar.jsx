import {
  AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Drawer,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  Badge, Slide, Divider, Avatar, Chip, useScrollTrigger,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { useCart } from '../../hooks/useCart';
import CartDrawer from '../shop/CartDrawer';
import { WAVE_DELAY } from '../../utils/waveSync';

function BrandMark({ size = 44, animated = false }) {
  const [broken, setBroken] = useState(false);
  const animationSx = animated ? { animation: `rmWave 5s ease-in-out ${WAVE_DELAY} infinite` } : {};
  if (broken) {
    return (
      <Box
        component="span"
        sx={{
          fontSize: size * 0.7,
          lineHeight: 1,
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          ...animationSx,
        }}
      >
        ⚓
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src="/brand/logo.PNG"
      alt="Rigoo Marine"
      onError={() => setBroken(true)}
      sx={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        ...animationSx,
      }}
    />
  );
}

BrandMark.propTypes = {
  size:     PropTypes.number,
  animated: PropTypes.bool,
};

function NavLinkButton({ to, label, active = false }) {
  return (
    <Button
      component={Link}
      to={to}
      disableRipple
      sx={{
        color: 'white',
        position: 'relative',
        px: 1.5,
        py: 1,
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 6,
          height: 2,
          borderRadius: 2,
          bgcolor: 'secondary.main',
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left center',
          transition: 'transform 280ms cubic-bezier(0.2,0,0,1)',
        },
        '&:hover::after': { transform: 'scaleX(1)' },
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
      }}
    >
      {label}
    </Button>
  );
}

NavLinkButton.propTypes = {
  to:     PropTypes.string.isRequired,
  label:  PropTypes.string.isRequired,
  active: PropTypes.bool,
};

// ── User avatar dropdown (desktop) ────────────────────────────────────────

function UserMenu({ user = null, isAdmin = false, isTeamLead = false, isDelivery = false, isTechnician = false }) {
  const navigate = useNavigate();

  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const dest = isAdmin ? '/admin'
    : isTeamLead ? '/team-lead'
    : isDelivery ? '/delivery'
    : isTechnician ? '/technician'
    : '/dashboard/vessels';

  return (
    <Chip
      avatar={<Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 700, fontSize: '0.75rem' }}>{initials}</Avatar>}
      label={user?.name?.split(' ')[0] || 'Account'}
      onClick={() => navigate(dest)}
      sx={{
        color: 'white', bgcolor: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
        transition: 'background 200ms',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
        '& .MuiChip-avatar': { ml: 0.5 },
      }}
    />
  );
}

UserMenu.propTypes = {
  user:        PropTypes.shape({ name: PropTypes.string }),
  isAdmin:     PropTypes.bool,
  isTeamLead:  PropTypes.bool,
  isDelivery:  PropTypes.bool,
  isTechnician: PropTypes.bool,
};

// ── Navbar ─────────────────────────────────────────────────────────────────

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation(['navbar', 'common']);
  const role = user?.role;
  const isAdmin      = role === 'ADMIN';
  const isTeamLead   = role === 'TEAM_LEAD';
  const isDelivery   = role === 'DELIVERY';
  const isTechnician = role === 'TECHNICIAN';
  const { itemCount } = useCart();
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 12 });

  // Static — never changes, hoist out of render cycle via useMemo.
  const navLinks = useMemo(() => [
    { key: 'home', path: '/' },
    { key: 'services', path: '/services' },
    { key: 'marketplace', path: '/boats' },
    { key: 'shop', path: '/shop' },
  ], []);

  const isActive = useCallback(
    (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  const handleLogout = useCallback(() => { logout(); navigate('/'); }, [logout, navigate]);

  const toggleLanguage = useCallback(
    () => i18n.changeLanguage(i18n.language.startsWith('ar') ? 'en' : 'ar'),
    [i18n],
  );

  const drawer = (
    <Box sx={{ p: 2, width: 280 }}>
      <Typography
        variant="h6"
        sx={{ px: 2, py: 1, color: 'primary.main', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 1 }}
      >
        <BrandMark size={36} />
        {t('navbar:brand')}
      </Typography>
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.key} disablePadding>
            <ListItemButton
              component={Link}
              to={link.path}
              selected={isActive(link.path)}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemText primary={t(`navbar:links.${link.key}`)} />
            </ListItemButton>
          </ListItem>
        ))}
        {isAuthenticated ? (
          <>
            <Divider sx={{ my: 1 }} />
            {user?.name && (
              <Box sx={{ px: 2, py: 0.75 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {user.name}
                </Typography>
              </Box>
            )}
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/dashboard/vessels" onClick={() => setMobileOpen(false)}>
                <ListItemIcon sx={{ minWidth: 36 }}><DirectionsBoatIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="My Vessels" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/dashboard/orders" onClick={() => setMobileOpen(false)}>
                <ListItemIcon sx={{ minWidth: 36 }}><BuildIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="My Orders" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/dashboard/shop-orders" onClick={() => setMobileOpen(false)}>
                <ListItemIcon sx={{ minWidth: 36 }}><ShoppingBagOutlinedIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Shop Orders" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/dashboard" onClick={() => setMobileOpen(false)}>
                <ListItemIcon sx={{ minWidth: 36 }}><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="My Dashboard" />
              </ListItemButton>
            </ListItem>
            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin Panel" />
                </ListItemButton>
              </ListItem>
            )}
            {isTeamLead && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/team-lead" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Team Lead Portal" />
                </ListItemButton>
              </ListItem>
            )}
            {isTechnician && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/technician" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Technician Portal" />
                </ListItemButton>
              </ListItem>
            )}
            {isDelivery && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/delivery" onClick={() => setMobileOpen(false)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Delivery Portal" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText primary={t('navbar:auth.logout')} />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login" onClick={() => setMobileOpen(false)}>
                <ListItemText primary={t('navbar:auth.login')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/register" onClick={() => setMobileOpen(false)}>
                <ListItemText primary={t('navbar:auth.register')} />
              </ListItemButton>
            </ListItem>
          </>
        )}
        <ListItem disablePadding>
          <ListItemButton onClick={() => { toggleLanguage(); setMobileOpen(false); }}>
            <ListItemText
              primary={i18n.language.startsWith('ar') ? 'English — EN' : 'العربية — ع'}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Slide in direction="down" timeout={420}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: elevated
            ? 'rgba(6, 12, 24, 0.96)'
            : 'linear-gradient(135deg, #0A1628 0%, #060C18 100%)',
          backdropFilter: elevated ? 'saturate(180%) blur(12px)' : 'none',
          boxShadow: elevated ? '0 4px 24px rgba(0,0,0,0.45)' : 'none',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 72, md: 84 }, position: 'relative' }}>
            <Box
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'opacity 200ms ease',
                '&:hover': { opacity: 0.88 },
              }}
            >
              <BrandMark size={58} animated />
              <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <Typography
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '0.12em',
                    lineHeight: 1.15,
                    textTransform: 'uppercase',
                  }}
                >
                  Rigoo
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(180,148,75,0.92)',
                    fontWeight: 400,
                    fontSize: '0.58rem',
                    letterSpacing: '0.32em',
                    lineHeight: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Marine
                </Typography>
              </Box>
            </Box>

            {/* Nav links — absolutely centred in the toolbar */}
            <Box sx={{
              display: { xs: 'none', md: 'flex' },
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              gap: 0.5,
            }}>
              {navLinks.map((link) => (
                <NavLinkButton
                  key={link.key}
                  to={link.path}
                  label={t(`navbar:links.${link.key}`)}
                  active={isActive(link.path)}
                />
              ))}
            </Box>

            {/* Right side: auth + icons */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 'auto' }}>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.5, alignItems: 'center' }}>
                {isAuthenticated ? (
                  <UserMenu user={user} isAdmin={isAdmin} isTeamLead={isTeamLead} isDelivery={isDelivery} isTechnician={isTechnician} />
                ) : (
                  <>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      size="small"
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.38)',
                        borderRadius: '20px',
                        px: 2.5, py: 0.7,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        letterSpacing: '0.02em',
                        '&:hover': {
                          borderColor: 'rgba(255,255,255,0.72)',
                          bgcolor: 'rgba(255,255,255,0.08)',
                        },
                      }}
                    >
                      {t('navbar:auth.login')}
                    </Button>

                    <Button
                      component={Link}
                      to="/register"
                      variant="contained"
                      size="small"
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'white',
                        borderRadius: '20px',
                        px: 2.5, py: 0.7,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        letterSpacing: '0.03em',
                        boxShadow: '0 2px 14px rgba(255,143,0,0.38)',
                        '&:hover': {
                          bgcolor: 'secondary.dark',
                          boxShadow: '0 4px 22px rgba(255,143,0,0.55)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      {t('navbar:auth.register')}
                    </Button>
                  </>
                )}

                {isAuthenticated && (
                  <IconButton
                    aria-label="cart"
                    sx={{ color: 'white' }}
                    onClick={() => setCartOpen(true)}
                  >
                    <Badge
                      badgeContent={itemCount}
                      color="secondary"
                      sx={{
                        '& .MuiBadge-badge': {
                          transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)',
                          transform: itemCount > 0 ? 'scale(1)' : 'scale(0)',
                        },
                      }}
                    >
                      <ShoppingCartOutlinedIcon />
                    </Badge>
                  </IconButton>
                )}

                <Button
                  aria-label={t('common:language.switchTo')}
                  onClick={toggleLanguage}
                  sx={{
                    color: 'white',
                    minWidth: 0,
                    px: 1.5, py: 0.6,
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.28)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    '&:hover': { borderColor: 'rgba(255,255,255,0.65)', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  {i18n.language.startsWith('ar') ? 'EN' : 'ع'}
                </Button>
              </Box>

              {/* Mobile menu button */}
              <IconButton
                sx={{ display: { xs: 'block', md: 'none' }, color: 'white' }}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>

        {/* Mobile Drawer */}
        <Drawer
          anchor="right"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
          transitionDuration={{ enter: 320, exit: 240 }}
        >
          {drawer}
        </Drawer>

        {/* Cart Drawer (auth-only, login-gated checkout per locked decision) */}
        {isAuthenticated && (
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        )}
      </AppBar>
    </Slide>
  );
}
