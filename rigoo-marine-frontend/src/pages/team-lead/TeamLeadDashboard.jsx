import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button,
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  CircularProgress, Alert, Stack,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { Reveal, Stagger } from '../../components/common/Motion';
import { adminApi, teamRequestApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

function StatCard({ label, value, color, icon, onClick }) {
  return (
    <Card
      variant="outlined"
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 200ms, transform 200ms',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ color: `${color}.main`, fontSize: 36, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="h4" fontWeight={700} color={`${color}.main`}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TeamLeadDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [teamReqs, setTeamReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersPage, reqsPage] = await Promise.all([
          adminApi.searchOrders({ size: 50, sort: 'createdAt,desc' }),
          teamRequestApi.list({ size: 20 }),
        ]);
        setOrders(ordersPage?.content || []);
        setTeamReqs(reqsPage?.content || []);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = new Date().toDateString();
  const active    = orders.filter(o => ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS'].includes(o.status));
  const approvals = orders.filter(o => o.status === 'PENDING_APPROVAL');
  const doneToday = orders.filter(o => o.status === 'COMPLETED' && o.completedAt && new Date(o.completedAt).toDateString() === today);
  const pendingReqs = teamReqs.filter(r => r.status === 'PENDING');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Dashboard</Typography>
      </Reveal>

      <Stagger>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Active Jobs"       value={active.length}    color="primary" icon={<BuildIcon fontSize="inherit" />}     onClick={() => navigate('/team-lead/orders')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Pending Approval"  value={approvals.length} color="warning" icon={<PendingIcon fontSize="inherit" />}   onClick={() => navigate('/team-lead/orders')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Completed Today"   value={doneToday.length} color="success" icon={<CheckCircleIcon fontSize="inherit" />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Pending Requests"  value={pendingReqs.length} color="error" icon={<GroupWorkIcon fontSize="inherit" />} onClick={() => navigate('/team-lead/team-requests')} />
          </Grid>
        </Grid>
      </Stagger>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Reveal variant="slideUp">
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>Active Jobs</Typography>
                  <Button size="small" onClick={() => navigate('/team-lead/orders')}>View all</Button>
                </Stack>
                {active.length === 0 && (
                  <Typography color="text.disabled" variant="body2">No active jobs right now.</Typography>
                )}
                <List dense disablePadding>
                  {active.slice(0, 8).map((o, i) => (
                    <Box key={o.id}>
                      {i > 0 && <Divider />}
                      <ListItem
                        disablePadding
                        sx={{ py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/team-lead/orders/${o.id}`)}
                      >
                        <ListItemText
                          primary={`#${o.id} — ${o.serviceType?.replace(/_/g, ' ') ?? 'Service'}`}
                          secondary={o.vesselName ?? `Vessel ${o.vesselId}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <Chip label={o.status} color={STATUS_COLORS[o.status] || 'default'} size="small" />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Reveal>
        </Grid>

        <Grid item xs={12} md={6}>
          <Reveal variant="slideUp">
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>Open Team Requests</Typography>
                  <Button size="small" onClick={() => navigate('/team-lead/team-requests')}>View all</Button>
                </Stack>
                {pendingReqs.length === 0 && (
                  <Typography color="text.disabled" variant="body2">No pending requests.</Typography>
                )}
                <List dense disablePadding>
                  {pendingReqs.slice(0, 8).map((r, i) => (
                    <Box key={r.id}>
                      {i > 0 && <Divider />}
                      <ListItem
                        disablePadding
                        sx={{ py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate('/team-lead/team-requests')}
                      >
                        <ListItemText
                          primary={`#${r.id} — ${r.category}`}
                          secondary={r.contactPhone}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500, textTransform: 'capitalize' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Reveal>
        </Grid>
      </Grid>
    </Box>
  );
}
