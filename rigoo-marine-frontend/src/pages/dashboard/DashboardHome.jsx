import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, Stack,
  Skeleton, Divider, Avatar, LinearProgress,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { useAuth } from '../../context/AuthContext';
import { vesselApi, workOrderApi, invoiceApi, shopApi, teamRequestApi } from '../../services/api';
import useMaintenanceCost from '../../hooks/maintenance/useMaintenanceCost';
import useUpcomingServices from '../../hooks/maintenance/useUpcomingServices';
import { Reveal, Stagger, HoverLift } from '../../components/common/Motion';
import UrgencyChip from '../../components/maintenance/UrgencyChip';

// ── Design tokens ──────────────────────────────────────────────────────────

const MARINE  = '#006994';
const GOLD    = '#B4944B';
const TEAL    = '#00BCD4';
const SUCCESS = '#2E7D32';
const WARN    = '#E65100';

const ORDER_STATUS_COLORS = {
  PENDING_APPROVAL: '#78909C',
  PENDING:          '#F57C00',
  IN_PROGRESS:      '#0288D1',
  WAITING_PARTS:    '#8E24AA',
  COMPLETED:        '#2E7D32',
  CANCELLED:        '#C62828',
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Greeting ───────────────────────────────────────────────────────────────

function greeting(name) {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salut}, ${name?.split(' ')[0] || 'Captain'}`;
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent, to, loading }) {
  return (
    <HoverLift lift={4}>
      <Card
        component={to ? Link : 'div'}
        to={to}
        sx={{
          textDecoration: 'none',
          borderRadius: 3,
          overflow: 'hidden',
          height: '100%',
          position: 'relative',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'border-color 200ms',
          '&:hover': to ? { borderColor: accent } : {},
        }}
      >
        {/* accent top strip */}
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <CardContent sx={{ pt: 2.5, pb: '20px !important' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${accent}18`,
              }}
            >
              <Icon sx={{ fontSize: 22, color: accent }} />
            </Box>
            {to && (
              <ArrowUpwardRoundedIcon
                sx={{ fontSize: 14, color: 'text.disabled', transform: 'rotate(45deg)', mt: 0.5 }}
              />
            )}
          </Stack>
          {loading ? (
            <>
              <Skeleton width={60} height={36} />
              <Skeleton width={90} height={18} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Typography variant="h3" fontWeight={800} lineHeight={1} sx={{ color: '#0B1A2E' }}>
                {value ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                {label}
              </Typography>
              {sub && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: 'block' }}>
                  {sub}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </HoverLift>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon sx={{ fontSize: 20, color: MARINE }} />
        <Typography variant="h6" fontWeight={700} color="#0B1A2E">
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
}

// ── Chart card wrapper ─────────────────────────────────────────────────────

function ChartCard({ title, icon: Icon, action, children, loading, skeletonH = 220 }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <SectionTitle icon={Icon} title={title} action={action} />
        {loading ? <Skeleton variant="rounded" height={skeletonH} /> : children}
      </CardContent>
    </Card>
  );
}

// ── Custom recharts tooltip ────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: '#0B1A2E', color: 'white', px: 1.75, py: 1.25,
      borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      fontSize: '0.78rem',
    }}>
      {label && <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>{label}</Typography>}
      {payload.map((p) => (
        <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <span>{formatter ? formatter(p.value, p.name) : `${p.value}`}</span>
        </Box>
      ))}
    </Box>
  );
}

// ── Monthly orders area chart ──────────────────────────────────────────────

function OrdersAreaChart({ orders }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear(), label: MONTH_LABELS[d.getMonth()], count: 0 };
    });
    (orders || []).forEach((o) => {
      const d = new Date(o.createdAt);
      const slot = months.find(m => m.month === d.getMonth() + 1 && m.year === d.getFullYear());
      if (slot) slot.count += 1;
    });
    return months;
  }, [orders]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={MARINE} stopOpacity={0.25} />
            <stop offset="95%" stopColor={MARINE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78909C' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78909C' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v} orders`} />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={MARINE}
          strokeWidth={2.5}
          fill="url(#ordersGrad)"
          dot={{ fill: MARINE, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: MARINE, stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Order status donut ─────────────────────────────────────────────────────

function OrderStatusDonut({ orders }) {
  const data = useMemo(() => {
    const counts = {};
    (orders || []).forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, value]) => ({
        name: status.replace(/_/g, ' '),
        value,
        color: ORDER_STATUS_COLORS[status] || '#90A4AE',
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  if (!data.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.disabled">No orders yet</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <ResponsiveContainer width={160} height={160} minWidth={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        {data.map((d) => (
          <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
            <Typography variant="caption" noWrap sx={{ flex: 1, color: 'text.secondary', textTransform: 'capitalize' }}>
              {d.name}
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#0B1A2E' }}>
              {d.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ── Maintenance cost bar chart ─────────────────────────────────────────────

function MaintenanceBars({ data: summary, loading }) {
  const chartData = useMemo(() => {
    if (!summary?.byMonth) return [];
    return summary.byMonth
      .filter(m => m.totalQar > 0)
      .map(m => ({ month: MONTH_LABELS[m.month - 1], cost: Math.round(Number(m.totalQar)) }));
  }, [summary]);

  if (loading) return <Skeleton variant="rounded" height={200} />;
  if (!chartData.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.disabled">No maintenance data this year</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.9} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78909C' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#78909C' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v.toLocaleString()} QAR`} />} />
        <Bar dataKey="cost" fill="url(#costGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Invoice progress bars ──────────────────────────────────────────────────

function InvoiceBreakdown({ invoices, loading }) {
  const stats = useMemo(() => {
    if (!invoices?.length) return null;
    const paid    = invoices.filter(i => i.status === 'PAID').length;
    const pending = invoices.filter(i => i.status === 'PENDING' || i.status === 'ISSUED').length;
    const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
    const total   = invoices.length;
    return [
      { label: 'Paid',    count: paid,    pct: (paid / total) * 100,    color: SUCCESS },
      { label: 'Pending', count: pending, pct: (pending / total) * 100, color: WARN },
      { label: 'Overdue', count: overdue, pct: (overdue / total) * 100, color: '#C62828' },
    ];
  }, [invoices]);

  if (loading) return <Skeleton variant="rounded" height={120} />;
  if (!stats) {
    return <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>No invoices yet</Typography>;
  }

  return (
    <Stack spacing={2}>
      {stats.map(s => (
        <Box key={s.label}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">{s.label}</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.count}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={s.pct}
            sx={{
              height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: s.color },
            }}
          />
        </Box>
      ))}
    </Stack>
  );
}

// ── Recent activity feed ───────────────────────────────────────────────────

function ActivityFeed({ orders, shopOrders, loading }) {
  const items = useMemo(() => {
    const wo = (orders || []).slice(0, 4).map(o => ({
      id:    `wo-${o.id}`,
      icon:  BuildRoundedIcon,
      color: MARINE,
      label: `Service #${o.id}`,
      sub:   (o.issueCategory || 'Service').replace(/_/g, ' '),
      status: o.status,
      statusColor: ORDER_STATUS_COLORS[o.status] || '#90A4AE',
      date:  o.createdAt,
      to:    '/dashboard/orders',
    }));
    const so = (shopOrders?.content || []).slice(0, 3).map(o => ({
      id:    `so-${o.id}`,
      icon:  ShoppingBagOutlinedIcon,
      color: GOLD,
      label: o.orderNumber,
      sub:   `${o.items?.length ?? 0} item${o.items?.length !== 1 ? 's' : ''}`,
      status: o.status?.replace(/_/g, ' '),
      statusColor: o.status === 'PAID' ? SUCCESS : WARN,
      date:  o.createdAt,
      to:    '/dashboard/shop-orders',
    }));
    return [...wo, ...so]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [orders, shopOrders]);

  if (loading) {
    return (
      <Stack spacing={1.5}>
        {[1, 2, 3, 4].map(i => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={38} height={38} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="55%" height={16} />
              <Skeleton width="35%" height={13} />
            </Box>
            <Skeleton variant="rounded" width={72} height={22} />
          </Stack>
        ))}
      </Stack>
    );
  }

  if (!items.length) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>
        No recent activity
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Box
            key={item.id}
            component={Link}
            to={item.to}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 1, py: 1, borderRadius: 2,
              textDecoration: 'none', color: 'inherit',
              transition: 'background 180ms',
              '&:hover': { bgcolor: 'rgba(0,105,148,0.05)' },
            }}
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${item.color}18` }}>
              <Icon sx={{ fontSize: 17, color: item.color }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{item.label}</Typography>
              <Typography variant="caption" color="text.disabled" noWrap sx={{ textTransform: 'capitalize' }}>
                {item.sub} · {item.date ? new Date(item.date).toLocaleDateString() : ''}
              </Typography>
            </Box>
            <Chip
              label={item.status?.replace(/_/g, ' ')}
              size="small"
              sx={{
                height: 20, fontSize: '0.62rem', fontWeight: 700,
                bgcolor: `${item.statusColor}18`, color: item.statusColor,
                textTransform: 'capitalize',
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

// ── Upcoming services ──────────────────────────────────────────────────────

function UpcomingPanel({ loading }) {
  const { data, isLoading } = useUpcomingServices();
  const items = data || [];
  const busy = loading || isLoading;

  if (busy) return <Skeleton variant="rounded" height={200} />;
  if (!items.length) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>
        No upcoming service due
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {items.slice(0, 5).map((u, i) => (
        <Box
          key={`${u.vesselId}-${u.serviceType}-${i}`}
          component={Link}
          to={`/dashboard/vessels/${u.vesselId}`}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1, py: 0.85, borderRadius: 2,
            textDecoration: 'none', color: 'inherit',
            transition: 'background 180ms',
            '&:hover': { bgcolor: 'rgba(0,105,148,0.05)' },
          }}
        >
          <UrgencyChip urgency={u.urgency} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {u.serviceType?.replace(/_/g, ' ')}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap>
              {u.vesselName || `Vessel #${u.vesselId}`}
              {u.daysUntilDue != null ? ` · ${u.daysUntilDue}d` : ''}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled">
            {u.nextDueDate ? new Date(u.nextDueDate).toLocaleDateString() : ''}
          </Typography>
        </Box>
      ))}
      {items.length > 5 && (
        <Button component={Link} to="/dashboard/vessels" fullWidth size="small" sx={{ mt: 0.5, color: MARINE }}>
          +{items.length - 5} more
        </Button>
      )}
    </Stack>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const { data: vessels,    isLoading: loadV } = useQuery({ queryKey: ['vessels', 'my'],      queryFn: vesselApi.getMyVessels,       staleTime: 5 * 60_000 });
  const { data: orders,     isLoading: loadO } = useQuery({ queryKey: ['workOrders', 'my'],   queryFn: workOrderApi.getMyWorkOrders, staleTime: 2 * 60_000 });
  const { data: invoices,   isLoading: loadI } = useQuery({ queryKey: ['invoices', 'my'],     queryFn: () => invoiceApi.getMyInvoices(user?.id), enabled: !!user?.id, staleTime: 5 * 60_000 });
  const { data: shopOrders, isLoading: loadS } = useQuery({ queryKey: ['shop', 'my-orders', 1], queryFn: () => shopApi.getMyOrders(0, 5), staleTime: 2 * 60_000 });
  const { data: mainCost,   isLoading: loadM } = useMaintenanceCost(year);

  const kpi = useMemo(() => ({
    vessels:       (vessels || []).length,
    activeOrders:  (orders  || []).filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).length,
    pendingInvoices: (invoices || []).filter(i => ['PENDING','ISSUED'].includes(i.status)).length,
    shopTotal:     shopOrders?.totalElements ?? 0,
  }), [vessels, orders, invoices, shopOrders]);

  const anyLoading = loadV || loadO;

  return (
    <Box>
      {/* ── Hero greeting ── */}
      <Reveal variant="fade" timeout={400}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0B1A2E 0%, #006994 60%, #00838F 100%)',
            borderRadius: 4,
            px: { xs: 2.5, md: 4 },
            py: { xs: 3, md: 4 },
            mb: 3.5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* decorative wave */}
          <Box sx={{
            position: 'absolute', right: -80, top: -80,
            width: 320, height: 320, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          <Box sx={{
            position: 'absolute', right: 40, bottom: -100,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(0,188,212,0.08)',
          }} />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            gap={2}
            sx={{ position: 'relative', zIndex: 1 }}
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight={800}
                color="white"
                sx={{ mb: 0.5, fontSize: { xs: '1.4rem', md: '1.75rem' } }}
              >
                {greeting(user?.name)} 👋
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', maxWidth: 420 }}>
                Here's an overview of your fleet and service activity today.
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/service-request"
              variant="contained"
              size="large"
              startIcon={<AddRoundedIcon />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'white',
                fontWeight: 700,
                flexShrink: 0,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              Request Service
            </Button>
          </Stack>
        </Box>
      </Reveal>

      {/* ── KPI strip ── */}
      <Stagger variant="grow" step={80} timeout={420} sx={{ mb: 3.5 }}>
        <Grid container spacing={2}>
          {[
            { icon: DirectionsBoatRoundedIcon, label: 'Registered Vessels',   value: kpi.vessels,        accent: MARINE, to: '/dashboard/vessels',     sub: 'Total fleet' },
            { icon: BuildRoundedIcon,          label: 'Active Service Orders', value: kpi.activeOrders,   accent: TEAL,   to: '/dashboard/orders',      sub: 'In progress' },
            { icon: ReceiptRoundedIcon,        label: 'Pending Invoices',      value: kpi.pendingInvoices, accent: GOLD,  to: '/dashboard/invoices',    sub: 'Awaiting payment' },
            { icon: ShoppingBagOutlinedIcon,   label: 'Shop Orders',           value: kpi.shopTotal,      accent: '#7B1FA2', to: '/dashboard/shop-orders', sub: 'All time' },
          ].map((card) => (
            <Grid size={{ xs: 6, md: 3 }} key={card.label} >
              <KpiCard {...card} loading={anyLoading} />
            </Grid>
          ))}
        </Grid>
      </Stagger>

      {/* ── Charts row 1: area + donut ── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 7 }} >
          <Reveal variant="fade" timeout={500}>
            <ChartCard
              title="Service Orders — Last 6 Months"
              icon={TrendingUpRoundedIcon}
              loading={loadO}
              action={
                <Button component={Link} to="/dashboard/orders" size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>
                  View all
                </Button>
              }
            >
              <OrdersAreaChart orders={orders} />
            </ChartCard>
          </Reveal>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} >
          <Reveal variant="fade" timeout={550}>
            <ChartCard
              title="Order Status Breakdown"
              icon={BuildRoundedIcon}
              loading={loadO}
            >
              <OrderStatusDonut orders={orders} />
            </ChartCard>
          </Reveal>
        </Grid>
      </Grid>

      {/* ── Charts row 2: maintenance cost + invoices + upcoming ── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 5 }} >
          <Reveal variant="fade" timeout={560}>
            <ChartCard
              title={`Maintenance Cost ${year}`}
              icon={BuildRoundedIcon}
              loading={loadM}
              action={
                <Button component={Link} to="/dashboard/analytics" size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>
                  Full analytics
                </Button>
              }
            >
              <MaintenanceBars data={mainCost} loading={loadM} />
              {mainCost?.totalQar > 0 && (
                <Stack direction="row" spacing={2} mt={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Total spent</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={GOLD}>
                      {Math.round(Number(mainCost.totalQar)).toLocaleString()} QAR
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Records</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>{mainCost.recordCount}</Typography>
                  </Box>
                </Stack>
              )}
            </ChartCard>
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }} >
          <Reveal variant="fade" timeout={600}>
            <ChartCard
              title="Invoice Status"
              icon={ReceiptRoundedIcon}
              loading={loadI}
              action={
                <Button component={Link} to="/dashboard/invoices" size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>
                  View all
                </Button>
              }
            >
              <InvoiceBreakdown invoices={invoices} loading={loadI} />
            </ChartCard>
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }} >
          <Reveal variant="fade" timeout={620}>
            <ChartCard
              title="Upcoming Maintenance"
              icon={EventAvailableRoundedIcon}
              loading={false}
              action={
                <Button component={Link} to="/dashboard/vessels" size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>
                  All vessels
                </Button>
              }
            >
              <UpcomingPanel loading={anyLoading} />
            </ChartCard>
          </Reveal>
        </Grid>
      </Grid>

      {/* ── Recent activity ── */}
      <Reveal variant="fade" timeout={640}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <SectionTitle
              icon={GroupsIcon}
              title="Recent Activity"
              action={
                <Stack direction="row" spacing={1}>
                  <Button component={Link} to="/dashboard/orders"     size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>Orders</Button>
                  <Button component={Link} to="/dashboard/shop-orders" size="small" sx={{ color: MARINE, fontSize: '0.75rem' }}>Shop</Button>
                </Stack>
              }
            />
            <ActivityFeed orders={orders} shopOrders={shopOrders} loading={loadO || loadS} />
          </CardContent>
        </Card>
      </Reveal>
    </Box>
  );
}
