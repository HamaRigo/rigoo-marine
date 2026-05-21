/**
 * AnalyticsDashboard — Admin revenue & operations view.
 *
 * Architecture:
 * - Single query to GET /api/invoices/analytics?months=N (returns monthly
 *   revenue, status breakdown, top clients, summary KPIs in one round trip).
 * - All charts via Recharts (already installed). No extra dependencies.
 * - Month selector (6/12/24) re-fetches with the new window without
 *   touching client-side state — React Query handles caching per key.
 * - Error boundary: each section degrades independently if data is missing.
 *
 * Edge cases handled:
 * - months with zero revenue are absent from backend response → filled to 0
 *   client-side so the chart line doesn't gap.
 * - Empty top-clients list shows a placeholder row.
 * - All currency values formatted as "X,XXX.XX QAR".
 */
import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Alert, Avatar,
} from '@mui/material';
import TrendingUpRoundedIcon   from '@mui/icons-material/TrendingUpRounded';
import ReceiptRoundedIcon      from '@mui/icons-material/ReceiptRounded';
import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import SpeedRoundedIcon        from '@mui/icons-material/SpeedRounded';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useQuery }          from '@tanstack/react-query';
import { adminApi }          from '../../services/api';
import { Reveal, Stagger }   from '../../components/common/Motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qar = (v) =>
  v == null ? '—' : Number(v).toLocaleString('en-QA', { minimumFractionDigits: 2 }) + ' QAR';

const BRAND = '#006994';
const PALETTE = ['#006994','#00acc1','#4caf50','#ff9800','#e53935','#9c27b0'];

const STATUS_COLORS = {
  PAID:    '#4caf50',
  PENDING: '#ff9800',
  DRAFT:   '#9e9e9e',
  OVERDUE: '#e53935',
  SENT:    '#2196f3',
};

// Fill every month in the window with 0 revenue if backend omits it
function padMonths(data, months) {
  const filled = [];
  const now    = new Date();
  const map    = Object.fromEntries((data || []).map(d => [d.month, d]));
  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    filled.push(map[key] ?? { month: key, revenue: 0, invoiceCount: 0 });
  }
  return filled;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, color, bg, label, value, sub }) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      transition: 'transform 200ms', '&:hover': { transform: 'translateY(-3px)' } }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon sx={{ color, fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} lineHeight={1.1}>{value}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            {sub && <Typography variant="caption" color="text.disabled" display="block">{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Card sx={{ p: 1.5, borderRadius: 2, boxShadow: 4, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      <Typography variant="body2" fontWeight={700} color="primary.main">
        {qar(payload[0]?.value)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {payload[1]?.value ?? 0} invoices
      </Typography>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [months, setMonths] = useState(12);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'analytics', months],
    queryFn:  () => adminApi.getAnalytics(months),
    staleTime: 5 * 60 * 1000,
  });

  const summary  = data?.summary  ?? {};
  const topClients = data?.topClients ?? [];
  const statusBD = data?.invoiceStatusBreakdown ?? {};
  const monthly  = padMonths(data?.monthlyRevenue, months);

  // Pie chart data from status breakdown
  const pieData = Object.entries(statusBD).map(([name, value]) => ({ name, value }));

  return (
    <Box>
      {/* ── Header ───────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} gap={1}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Revenue and invoice statistics
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={months}
          onChange={(_, v) => v && setMonths(v)}
        >
          {[6, 12, 24].map(m => (
            <ToggleButton key={m} value={m} sx={{ px: 2, fontWeight: 700 }}>
              {m}M
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          Failed to load analytics data. Check that invoice-service is reachable.
        </Alert>
      )}

      {/* ── KPI cards ────────────────────────────── */}
      <Stagger variant="fade" step={80}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            {isLoading ? <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /> : (
              <KpiCard
                icon={TrendingUpRoundedIcon}
                color="#006994" bg="rgba(0,105,148,0.08)"
                label="Total Revenue" value={qar(summary.totalRevenueQar)}
                sub={`Last ${months} months`}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {isLoading ? <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /> : (
              <KpiCard
                icon={ReceiptRoundedIcon}
                color="#4caf50" bg="rgba(76,175,80,0.08)"
                label="Paid Invoices" value={summary.paidInvoices ?? 0}
                sub={`of ${summary.totalInvoices ?? 0} total`}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {isLoading ? <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /> : (
              <KpiCard
                icon={SpeedRoundedIcon}
                color="#ff9800" bg="rgba(255,152,0,0.08)"
                label="Avg Invoice Value" value={qar(summary.avgInvoiceValue)}
                sub="Paid invoices only"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {isLoading ? <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /> : (
              <KpiCard
                icon={PeopleRoundedIcon}
                color="#9c27b0" bg="rgba(156,39,176,0.08)"
                label="Pending / Overdue"
                value={`${summary.pendingInvoices ?? 0} / ${summary.overdueInvoices ?? 0}`}
                sub="Invoices needing action"
              />
            )}
          </Grid>
        </Grid>
      </Stagger>

      {/* ── Revenue chart ─────────────────────────── */}
      <Reveal variant="fade" timeout={500}>
        <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', p: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Monthly Revenue (QAR)</Typography>
          {isLoading ? (
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="rmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={BRAND} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  tick={{ fontSize: 11 }} />
                <RTooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke={BRAND}
                  fill="url(#rmGrad)" strokeWidth={2.5} dot={false} />
                <Bar dataKey="invoiceCount" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Reveal>

      {/* ── Status breakdown + top clients ─────────── */}
      <Grid container spacing={2}>
        {/* Pie chart */}
        <Grid item xs={12} md={5}>
          <Reveal variant="fade" timeout={560}>
            <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', p: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Invoice Status</Typography>
              {isLoading ? (
                <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
              ) : pieData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled">No invoices yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60}
                      outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i}
                          fill={STATUS_COLORS[entry.name] || PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Reveal>
        </Grid>

        {/* Top clients */}
        <Grid item xs={12} md={7}>
          <Reveal variant="fade" timeout={600}>
            <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', p: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={1.5}>Top Clients by Revenue</Typography>
              {isLoading ? (
                [0,1,2,3,4].map(i => (
                  <Skeleton key={i} variant="rounded" height={40} sx={{ mb: 1, borderRadius: 2 }} />
                ))
              ) : topClients.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled">No paid invoices yet</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Invoices</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Spend</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topClients.map((c, i) => (
                      <TableRow key={c.clientId} hover>
                        <TableCell>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem',
                            bgcolor: PALETTE[i % PALETTE.length] }}>
                            {i + 1}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {c.clientName || `Client #${c.clientId}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.clientEmail || ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={c.invoiceCount} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            {qar(c.totalSpend)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Reveal>
        </Grid>
      </Grid>
    </Box>
  );
}
