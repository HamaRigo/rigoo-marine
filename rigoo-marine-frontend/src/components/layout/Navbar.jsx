import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Menu, MenuItem, Badge, Slide, Fade, useScrollTrigger } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { useCart } from '../../hooks/useCart';
import CartDrawer from '../shop/CartDrawer';

function NavLinkButton({ to, label, active }) {
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

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation(['navbar', 'common']);
  const isAdmin = user?.role === 'ADMIN';
  const { itemCount } = useCart();
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 12 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const navLinks = [
    { key: 'home', path: '/' },
    { key: 'services', path: '/services' },
    { key: 'marketplace', path: '/boats' },
    { key: 'shop', path: '/shop' },
    { key: 'gallery', path: '/gallery' },
    { key: 'about', path: '/about' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangAnchor(null);
  };

  const drawer = (
    <Box sx={{ p: 2, width: 280 }}>
      <Typography variant="h6" sx={{ px: 2, py: 1, color: 'primary.main', fontWeight: 700 }}>
        ⚓ {t('navbar:brand')}
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
            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary={t('navbar:auth.dashboard')} />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
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
        {SUPPORTED_LANGUAGES.map((lng) => (
          <ListItem key={lng} disablePadding>
            <ListItemButton selected={i18n.language === lng} onClick={() => changeLanguage(lng)}>
              <ListItemText primary={t(`common:language.${lng === 'ar' ? 'arabic' : 'english'}`)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Slide in={mounted} direction="down" timeout={420}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: elevated
            ? 'rgba(0,66,99,0.92)'
            : 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          backdropFilter: elevated ? 'saturate(180%) blur(10px)' : 'none',
          boxShadow: elevated ? '0 6px 22px rgba(0,40,60,0.25)' : 'none',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: 68 } }}>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                flexGrow: 1,
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                transition: 'transform 200ms cubic-bezier(0.2,0,0,1), letter-spacing 200ms',
                '&:hover': { transform: 'translateX(2px)', letterSpacing: '0.02em' },
              }}
            >
              <Box
                component="span"
                sx={{ display: 'inline-block', animation: 'rmFloat 4.5s ease-in-out infinite' }}
              >
                ⚓
              </Box>
              {t('navbar:brand')}
            </Typography>

            {/* Desktop Navigation */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
                {navLinks.map((link) => (
                  <NavLinkButton
                    key={link.key}
                    to={link.path}
                    label={t(`navbar:links.${link.key}`)}
                    active={isActive(link.path)}
                  />
                ))}
              </Box>

              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <Button component={Link} to="/admin" sx={{ color: 'white' }}>
                        {t('navbar:auth.dashboard')}
                      </Button>
                    )}
                    <Button onClick={handleLogout} sx={{ color: 'white' }}>
                      {t('navbar:auth.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button component={Link} to="/login" sx={{ color: 'white' }}>
                      {t('navbar:auth.login')}
                    </Button>
                    <Button
                      component={Link}
                      to="/register"
                      variant="contained"
                      sx={{
                        bgcolor: 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.dark' },
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

                <IconButton
                  aria-label={t('common:language.switchTo')}
                  sx={{ color: 'white' }}
                  onClick={(e) => setLangAnchor(e.currentTarget)}
                >
                  <LanguageIcon />
                </IconButton>
                <Menu
                  anchorEl={langAnchor}
                  open={Boolean(langAnchor)}
                  onClose={() => setLangAnchor(null)}
                  TransitionComponent={Fade}
                >
                  {SUPPORTED_LANGUAGES.map((lng) => (
                    <MenuItem
                      key={lng}
                      selected={i18n.language === lng}
                      onClick={() => changeLanguage(lng)}
                    >
                      {t(`common:language.${lng === 'ar' ? 'arabic' : 'english'}`)}
                    </MenuItem>
                  ))}
                </Menu>
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
