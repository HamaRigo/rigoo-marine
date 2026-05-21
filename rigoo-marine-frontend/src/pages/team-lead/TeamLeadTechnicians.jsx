import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
  Alert, Avatar, Stack, Divider,
} from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { Reveal, Stagger } from '../../components/common/Motion';
import { adminApi } from '../../services/api';

const ROLE_COLORS = { TECHNICIAN: 'primary', TEAM_LEAD: 'warning' };

export default function TeamLeadTechnicians() {
  const [techs, setTechs]     = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [users, ordersPage] = await Promise.all([
          adminApi.getAllUsers(),
          adminApi.searchOrders({ size: 200, status: 'IN_PROGRESS' }),
        ]);
        setTechs((users || []).filter(u => ['TECHNICIAN', 'TEAM_LEAD'].includes(u.role)));
        setOrders(ordersPage?.content || []);
      } catch {
        setError('Failed to load technician roster.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Technician Roster</Typography>
      </Reveal>

      {techs.length === 0 && (
        <Typography color="text.disabled">No technicians found.</Typography>
      )}

      <Stagger>
        <Grid container spacing={2}>
          {techs.map(tech => {
            const active = orders.filter(o => o.assignedTechnicianId === tech.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={tech.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 44, height: 44 }}>
                        <EngineeringIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>{tech.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{tech.email}</Typography>
                      </Box>
                      <Chip label={tech.role} color={ROLE_COLORS[tech.role] || 'default'} size="small" />
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={active.length > 0 ? `${active.length} active job${active.length > 1 ? 's' : ''}` : 'Available'}
                        color={active.length > 0 ? 'warning' : 'success'}
                        size="small"
                      />
                      {tech.phone && (
                        <Typography variant="caption" color="text.secondary">{tech.phone}</Typography>
                      )}
                    </Stack>
                    {active.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {active.slice(0, 3).map(o => (
                          <Typography key={o.id} variant="caption" color="text.secondary" display="block" noWrap>
                            #{o.id} — {o.serviceType?.replace(/_/g, ' ') ?? 'Service'}
                          </Typography>
                        ))}
                        {active.length > 3 && (
                          <Typography variant="caption" color="text.disabled">+{active.length - 3} more</Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Stagger>
    </Box>
  );
}
