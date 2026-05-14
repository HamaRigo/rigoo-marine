import { Box, Typography, Grid, Card, CardContent, Button, Chip, Skeleton, Slide, Fade } from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, vesselApi, invoiceApi } from '../../services/api';
import BuildIcon from '@mui/icons-material/Build';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import { Reveal, Stagger } from '../../components/common/Motion';
import UpcomingServicesWidget from '../../components/maintenance/UpcomingServicesWidget';

function StatCard({ icon: Icon, value, label, bg, color = 'white', accent }) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: bg,
        color,
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -30,
          top: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          transition: 'transform 480ms cubic-bezier(0.2,0,0,1)',
        },
        '&:hover::after': { transform: 'scale(1.4)' },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Icon
            sx={{
              fontSize: 40,
              mr: 2,
              opacity: 0.85,
              color: accent,
              transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
              '.MuiCard-root:hover &': { transform: 'scale(1.15) rotate(-6deg)' },
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
        </Box>
        <Typography variant="body1">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const clientId = user?.id;

  const { data: orders } = useQuery({
    queryKey: ['workOrders', 'my'],
    queryFn: () => dashboardApi.getRecentOrders(clientId, 100),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: vessels } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn: () => vesselApi.getMyVessels(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices', 'my'],
    queryFn: () => invoiceApi.getMyInvoices(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = {
    activeOrders: orders?.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length || 0,
    vessels: vessels?.length || 0,
    pendingInvoices: invoices?.filter((i) => i.status === 'PENDING').length || 0,
    completedOrders: orders?.filter((o) => o.status === 'COMPLETED').length || 0,
  };

  const recentOrders = orders?.slice(0, 5) || [];
  const isLoading = !orders || !vessels || !invoices;

  if (isLoading || !clientId) {
    return (
      <Box>
        <Skeleton variant="text" width={220} height={48} sx={{ mb: 4 }} />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={260} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={180} />
      </Box>
    );
  }

  return (
    <Box>
      <Slide in direction="down" timeout={420}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4">Dashboard</Typography>
          <Button
            component={Link}
            to="/service-request"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: 'secondary.main',
              animation: 'rmPulse 2.6s ease-in-out infinite',
              '&:hover': { bgcolor: 'secondary.dark' },
            }}
          >
            New Service Request
          </Button>
        </Box>
      </Slide>

      {/* Stats Cards */}
      <Stagger
        variant="grow"
        step={120}
        timeout={520}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatCard
          icon={BuildIcon}
          value={stats.activeOrders}
          label="Active Orders"
          bg="linear-gradient(135deg, #006994 0%, #004263 100%)"
        />
        <StatCard
          icon={DirectionsBoatIcon}
          value={stats.vessels}
          label="My Vessels"
          bg="linear-gradient(135deg, #ff8f00 0%, #c76000 100%)"
        />
        <StatCard
          icon={ReceiptIcon}
          value={stats.pendingInvoices}
          label="Pending Invoices"
          bg="linear-gradient(135deg, #ffffff 0%, #f4f7fa 100%)"
          color="text.primary"
          accent="#006994"
        />
      </Stagger>

      {/* Upcoming maintenance (overdue + due-soon across all the client's vessels) */}
      <Box sx={{ mb: 4 }}>
        <UpcomingServicesWidget />
      </Box>

      {/* Recent Orders */}
      <Reveal variant="fade" timeout={500}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Orders</Typography>
            {recentOrders && recentOrders.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {recentOrders.map((order, idx) => (
                  <Fade in key={order.id} timeout={400} style={{ transitionDelay: `${idx * 60}ms` }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        px: 1,
                        borderRadius: 2,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        transition: 'background-color 200ms ease, padding-left 200ms ease',
                        '&:last-child': { borderBottom: 'none' },
                        '&:hover': {
                          bgcolor: 'rgba(0,105,148,0.04)',
                          paddingLeft: 16,
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight="600">Order #{order.id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.description?.substring(0, 50) || 'No description'} • {new Date(order.preferredDate || order.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={order.status.replace('_', ' ')}
                        color={order.status === 'COMPLETED' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Fade>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2 }}>No recent orders</Typography>
            )}
            <Button component={Link} to="/dashboard/orders" fullWidth sx={{ mt: 2 }}>
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      {/* Quick Actions */}
      <Reveal variant="slide" direction="up" timeout={520}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/service-request"
                  variant="outlined"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  New Service Request
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/dashboard/vessels"
                  variant="outlined"
                  fullWidth
                  startIcon={<DirectionsBoatIcon />}
                >
                  Add Vessel
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/dashboard/invoices"
                  variant="outlined"
                  fullWidth
                  startIcon={<ReceiptIcon />}
                >
                  View Invoices
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/dashboard/profile"
                  variant="outlined"
                  fullWidth
                  startIcon={<BuildIcon />}
                >
                  Edit Profile
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Reveal>
    </Box>
  );
}
