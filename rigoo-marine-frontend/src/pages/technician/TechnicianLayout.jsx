import { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, IconButton, Container, Fade } from '@mui/material';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import UnverifiedEmailBanner from '../../components/common/UnverifiedEmailBanner';

const drawerWidth = 240;
const navItems = [
  { name: 'Dashboard',      path: '/technician',               icon: <DashboardIcon /> },
  { name: 'Work Orders',    path: '/technician/orders',        icon: <BuildIcon /> },
  { name: 'History',        path: '/technician/history',       icon: <HistoryIcon /> },
  { name: 'Parts & Inventory', path: '/technician/inventory',  icon: <InventoryIcon /> },
  { name: 'Team Requests',  path: '/technician/team-requests', icon: <GroupsIcon /> },
];

export default function TechnicianLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          color: 'white',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ animation: 'rmFloat 4.5s ease-in-out infinite', display: 'inline-block' }}>⚓</Box>
          Technician Portal
        </Typography>
      </Toolbar>
      <List sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => {
          const selected = item.path === '/technician'
            ? location.pathname === '/technician'
            : location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={selected}
                onClick={() => setMobileOpen(false)}
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    transform: selected ? 'scaleY(1)' : 'scaleY(0)',
                    transition: 'transform 240ms cubic-bezier(0.34,1.56,0.64,1)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
        <ListItem disablePadding sx={{ mt: 1 }}>
          <ListItemButton component={Link} to="/" onClick={() => setMobileOpen(false)}>
            <ListItemIcon sx={{ minWidth: 36 }}><HomeIcon /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={logout}>
            <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          boxShadow: '0 4px 20px rgba(0,40,60,0.18)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            {user?.name || 'Technician'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          transitionDuration={{ enter: 320, exit: 240 }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0,0,0,0.06)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2.5, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          minWidth: 0,
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 0.5, sm: 1 } }}>
          <UnverifiedEmailBanner />
          <Fade in key={location.pathname} timeout={320}>
            <Box>
              <Outlet />
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
}
