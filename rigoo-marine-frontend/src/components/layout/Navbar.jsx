import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'About', path: '/about' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const drawer = (
    <Box sx={{ p: 2 }}>
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.name} disablePadding>
            <ListItemButton component={Link} to={link.path}>
              <ListItemText primary={link.name} />
            </ListItemButton>
          </ListItem>
        ))}
        {isAuthenticated ? (
          <>
            {isAdmin && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin">
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login">
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/register">
                <ListItemText primary="Register" />
              </ListItemButton>
            </ListItem>
          </>
        )}
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
            ⚓ Rigoo Marine
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.name}
                  component={Link}
                  to={link.path}
                  sx={{ color: 'white' }}
                >
                  {link.name}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Button component={Link} to="/admin" sx={{ color: 'white' }}>
                      Dashboard
                    </Button>
                  )}
                  <Button onClick={handleLogout} sx={{ color: 'white' }}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button component={Link} to="/login" sx={{ color: 'white' }}>
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/register"
                    variant="contained"
                    sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                  >
                    Register
                  </Button>
                </>
              )}
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
