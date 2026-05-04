import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import { SUPPORTED_LANGUAGES } from '../../i18n';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['navbar', 'common']);
  const isAdmin = user?.role === 'ADMIN';

  const navLinks = [
    { key: 'home', path: '/' },
    { key: 'services', path: '/services' },
    { key: 'marketplace', path: '/boats' },
    { key: 'gallery', path: '/gallery' },
    { key: 'about', path: '/about' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangAnchor(null);
  };

  const drawer = (
    <Box sx={{ p: 2 }}>
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.key} disablePadding>
            <ListItemButton component={Link} to={link.path} onClick={() => setMobileOpen(false)}>
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
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 700,
            }}
          >
            ⚓ {t('navbar:brand')}
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.key}
                  component={Link}
                  to={link.path}
                  sx={{ color: 'white' }}
                >
                  {t(`navbar:links.${link.key}`)}
                </Button>
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
                    sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                  >
                    {t('navbar:auth.register')}
                  </Button>
                </>
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
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
