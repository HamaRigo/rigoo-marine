import { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, IconButton, Container, Fade } from '@mui/material';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MarkChatUnreadIcon from '@mui/icons-material/MarkChatUnread';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import HandymanRoundedIcon from '@mui/icons-material/HandymanRounded';
import HomeIcon from '@mui/icons-material/Home';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import VerifiedIcon from '@mui/icons-material/Verified';

const drawerWidth = 240;
const navItems = [
  { name: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { name: 'Orders', path: '/admin/orders', icon: <BuildIcon /> },
  { name: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { name: 'Invoices', path: '/admin/invoices', icon: <ReceiptIcon /> },
  { name: 'Quotations', path: '/admin/quotations', icon: <RequestQuoteIcon /> },
  { name: 'Services', path: '/admin/services', icon: <EngineeringIcon /> },
  { name: 'Maintenance',  path: '/admin/maintenance',  icon: <HandymanRoundedIcon /> },
  { name: 'Inspections', path: '/admin/inspections', icon: <VerifiedIcon /> },
  { name: 'Boats', path: '/admin/boats', icon: <DirectionsBoatIcon /> },
  { name: 'Inquiries', path: '/admin/inquiries', icon: <MarkChatUnreadIcon /> },
  { name: 'Products', path: '/admin/products', icon: <StorefrontIcon /> },
  { name: 'Shop orders', path: '/admin/shop-orders', icon: <ReceiptLongIcon /> },
  { name: 'Shop inquiries', path: '/admin/shop-inquiries', icon: <ContactSupportIcon /> },
  { name: 'Team Requests', path: '/admin/team-requests', icon: <GroupsIcon /> },
  { name: 'Deliveries',   path: '/admin/delivery',       icon: <LocalShippingIcon /> },
  { name: 'Analytics',   path: '/admin/analytics',      icon: <BarChartRoundedIcon /> },
  { name: 'Inventory',   path: '/admin/inventory',      icon: <InventoryRoundedIcon /> },
  { name: 'Audit log', path: '/admin/audit', icon: <HistoryIcon /> },
  { name: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

export default function AdminLayout() {
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
          Admin Panel
        </Typography>
      </Toolbar>
      <List sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.path;
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
            {user?.name || 'Admin'}
          </Typography>
          <IconButton
            component={Link}
            to="/"
            color="inherit"
            title="Go to Home"
            sx={{ ml: 1 }}
          >
            <HomeIcon />
          </IconButton>
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
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 0.5, sm: 1 } }}>
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
