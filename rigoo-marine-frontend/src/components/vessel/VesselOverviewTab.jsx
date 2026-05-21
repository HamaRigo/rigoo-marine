import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Grid, Stack, Typography, Chip, Skeleton,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import SpeedIcon                  from '@mui/icons-material/Speed';
import BuildRoundedIcon            from '@mui/icons-material/BuildRounded';
import LocalGasStationRoundedIcon  from '@mui/icons-material/LocalGasStationRounded';
import EventBusyRoundedIcon        from '@mui/icons-material/EventBusyRounded';
import CheckCircleRoundedIcon      from '@mui/icons-material/CheckCircleRounded';
import BarChartRoundedIcon         from '@mui/icons-material/BarChartRounded';
import DonutLargeRoundedIcon       from '@mui/icons-material/DonutLargeRounded';
import WaterRoundedIcon            from '@mui/icons-material/WaterRounded';
import CalendarMonthRoundedIcon    from '@mui/icons-material/CalendarMonthRounded';
import TrendingUpRoundedIcon       from '@mui/icons-material/TrendingUpRounded';
import InfoOutlinedIcon            from '@mui/icons-material/InfoOutlined';
import { useTranslation }          from 'react-i18next';

import { vesselApi }        from '../../services/api';
import { Reveal }           from '../common/Motion';
import EngineHoursCard      from '../maintenance/EngineHoursCard';
import { buildPoints, computeChart } from '../maintenance/engineHoursChartMath';

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SVC_COLOR = {
  OIL_CHANGE:         '#f5a623',
  FILTER_CHANGE:      '#43a047',
  HULL_INSPECTION:    '#006994',
  ANTIFOULING:        '#00bcd4',
  ENGINE_SERVICE:     '#e53935',
  PROP_SHAFT_SERVICE: '#7b1fa2',
  RIGGING_CHECK:      '#ff7043',
  WINTERIZING:        '#546e7a',
  ELECTRICAL:         '#fdd835',
  PLUMBING:           '#26a69a',
  SAFETY_CHECK:       '#ef5350',
  ANNUAL_SURVEY:      '#5c6bc0',
  CUSTOM:             '#78909c',
  OTHER:              '#9e9e9e',
};

const URGENCY_CHIP = { OVERDUE: 'error', DUE_SOON: 'warning', NORMAL: 'success' };

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent = '#006994', badge, badgeColor = 'default' }) {
  return (
    <Card
      variant="outlined"
      sx={{
        flex: 1, minWidth: 0, borderRadius: 2.5, overflow: 'hidden', position: 'relative',
        transition: 'box-shadow 180ms',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent, borderRadius: '4px 0 0 4px' }} />
      <CardContent sx={{ pl: 2.5, py: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            bgcolor: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ lineHeight: 1.3 }}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.15, fontSize: '1.05rem' }}>
              {value ?? '—'}
            </Typography>
            {badge && (
              <Chip label={badge} color={badgeColor} size="small"
                sx={{ mt: 0.5, height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Empty chart placeholder ────────────────────────────────────────────────

function EmptyChart({ message, height = 176 }) {
  return (
    <Box sx={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1,
      border: '1.5px dashed', borderColor: 'divider', borderRadius: 2,
      bgcolor: 'rgba(0,0,0,0.01)',
    }}>
      <InfoOutlinedIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
      <Typography variant="caption" color="text.disabled">{message}</Typography>
    </Box>
  );
}

// ── Chart card wrapper ─────────────────────────────────────────────────────

function ChartCard({ icon, title, children, titleRight }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack direction="row" alignItems="center" gap={1} mb={1.75}>
          {icon}
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>
          {titleRight}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

// ── Maintenance cost bar chart ─────────────────────────────────────────────

function CostBarChart({ records }) {
  const { t } = useTranslation('dashboard');
  const year = new Date().getFullYear();

  const chartData = useMemo(() => {
    const byMonth = Array(12).fill(0);
    (records || []).forEach(r => {
      if (r.cost && r.performedOn) {
        const d = new Date(r.performedOn + 'T00:00:00');
        if (d.getFullYear() === year) byMonth[d.getMonth()] += Number(r.cost);
      }
    });
    return MONTHS_SHORT.map((m, i) => ({ month: m, cost: Math.round(byMonth[i]) }));
  }, [records, year]);

  const hasData = chartData.some(d => d.cost > 0);

  return (
    <ChartCard
      icon={<BarChartRoundedIcon sx={{ color: '#006994', fontSize: 18 }} />}
      title={t('vessels.overview.costChart', { year })}
    >
      {hasData ? (
        <Box sx={{ width: '100%', height: 176 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v || ''}
              />
              <RTooltip
                formatter={v => [`${v.toLocaleString()} QAR`, 'Cost']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12 }}
              />
              <Bar dataKey="cost" fill="#006994" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <EmptyChart message={t('vessels.overview.noData')} />
      )}
    </ChartCard>
  );
}

// ── Service type donut ─────────────────────────────────────────────────────

function ServiceDonutChart({ records }) {
  const { t } = useTranslation('dashboard');

  const { pieData, total } = useMemo(() => {
    const counts = {};
    (records || []).forEach(r => {
      const k = r.serviceType || 'OTHER';
      counts[k] = (counts[k] || 0) + 1;
    });
    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([raw, value]) => ({ name: raw.replace(/_/g, ' '), value, raw }));
    return { pieData: entries, total: entries.reduce((s, e) => s + e.value, 0) };
  }, [records]);

  return (
    <ChartCard
      icon={<DonutLargeRoundedIcon sx={{ color: '#7b1fa2', fontSize: 18 }} />}
      title={t('vessels.overview.serviceChart')}
    >
      {pieData.length > 0 ? (
        <Stack direction="row" alignItems="center" sx={{ minHeight: 176 }}>
          {/* Donut */}
          <Box sx={{ flexShrink: 0, width: 130, height: 130, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius={40} outerRadius={58}
                  paddingAngle={2} dataKey="value"
                  startAngle={90} endAngle={-270}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={SVC_COLOR[entry.raw] ?? '#9e9e9e'} stroke="none" />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(v, n) => [v, n]}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>{total}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                {t('vessels.overview.services')}
              </Typography>
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ flex: 1, pl: 1.5, overflow: 'auto', maxHeight: 176 }}>
            {pieData.slice(0, 8).map((d, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={0.75} mb={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SVC_COLOR[d.raw] ?? '#9e9e9e', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, fontSize: '0.68rem' }}>
                  {d.name}
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', flexShrink: 0 }}>
                  {d.value}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
      ) : (
        <EmptyChart message={t('vessels.overview.noData')} />
      )}
    </ChartCard>
  );
}

// ── Fuel overview chart ────────────────────────────────────────────────────

function FuelOverviewChart({ analytics, isLoading }) {
  const { t } = useTranslation('dashboard');
  const year = new Date().getFullYear();

  if (isLoading) {
    return (
      <ChartCard
        icon={<WaterRoundedIcon sx={{ color: '#006994', fontSize: 18 }} />}
        title={t('vessels.overview.fuelChart', { year })}
      >
        <Skeleton variant="rounded" height={176} />
      </ChartCard>
    );
  }

  const chartData = (analytics?.byMonth || []).map((m, i) => ({
    month: MONTHS_SHORT[i],
    liters: Number(m.liters ?? 0),
    cost: Number(m.cost ?? 0),
  }));
  const hasData = chartData.some(d => d.liters > 0 || d.cost > 0);

  const legend = [{ color: '#006994', label: 'L' }, { color: '#f5a623', label: 'QAR' }];

  return (
    <ChartCard
      icon={<WaterRoundedIcon sx={{ color: '#006994', fontSize: 18 }} />}
      title={t('vessels.overview.fuelChart', { year })}
      titleRight={
        <Stack direction="row" spacing={1.5}>
          {legend.map(({ color, label }) => (
            <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{label}</Typography>
            </Stack>
          ))}
        </Stack>
      }
    >
      {hasData ? (
        <Box sx={{ width: '100%', height: 176 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="ovFuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#006994" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#006994" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="ovCostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f5a623" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <RTooltip
                formatter={(v, name) => [
                  name === 'liters' ? `${v.toLocaleString()} L` : `${v.toLocaleString()} QAR`,
                  name === 'liters' ? 'Liters' : 'Cost',
                ]}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="liters" stroke="#006994" fill="url(#ovFuelGrad)"
                strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Area type="monotone" dataKey="cost" stroke="#f5a623" fill="url(#ovCostGrad)"
                strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <EmptyChart message={t('vessels.overview.noFuelData')} />
      )}
    </ChartCard>
  );
}

// ── Engine hours trend wrapper ─────────────────────────────────────────────

function EngineHoursTrendCard({ records }) {
  const { t } = useTranslation('dashboard');
  const hasData = (records || []).filter(r => r.engineHoursAtService != null).length >= 2;

  return (
    <ChartCard
      icon={<TrendingUpRoundedIcon sx={{ color: '#006994', fontSize: 18 }} />}
      title={t('vessels.overview.hoursChart')}
    >
      {hasData ? (
        /* EngineHoursChart renders its own Card — pull just the SVG out */
        <Box sx={{ mx: -2 }}>
          <EngineHoursChartInline records={records} />
        </Box>
      ) : (
        <EmptyChart message={t('vessels.overview.noData')} />
      )}
    </ChartCard>
  );
}

const DIMS = { width: 480, height: 180, padding: 28 };

function EngineHoursChartInline({ records }) {
  const { points, chart } = useMemo(() => {
    const pts = buildPoints(records);
    return { points: pts, chart: computeChart(pts, DIMS) };
  }, [records]);

  if (points.length < 2) return null;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${DIMS.width} ${DIMS.height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-hidden
      >
        {chart.yTicks.map((tk, i) => (
          <g key={`y${i}`}>
            <line x1={DIMS.padding} y1={tk.y} x2={DIMS.width - DIMS.padding} y2={tk.y}
              stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <text x={DIMS.padding - 6} y={tk.y} fontSize="10" fill="rgba(0,0,0,0.5)"
              textAnchor="end" dominantBaseline="middle">{tk.label}</text>
          </g>
        ))}
        {chart.xTicks.map((tk, i) => (
          <text key={`x${i}`} x={tk.x} y={DIMS.height - 8} fontSize="10"
            fill="rgba(0,0,0,0.5)" textAnchor="middle">{tk.label}</text>
        ))}
        <path d={chart.line} fill="none" stroke="#006994" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        {chart.plotted.map((p, i) => (
          <circle key={`pt${i}`} cx={p.x} cy={p.y} r="3.5"
            fill="#006994" stroke="white" strokeWidth="1.5">
            <title>{p.raw.date.toLocaleDateString()} — {p.raw.hours} h</title>
          </circle>
        ))}
      </svg>
    </Box>
  );
}

// ── Upcoming services ──────────────────────────────────────────────────────

function UpcomingServicesPanel({ schedule }) {
  const { t } = useTranslation('dashboard');

  const sorted = useMemo(() => {
    const order = { OVERDUE: 0, DUE_SOON: 1, NORMAL: 2 };
    return [...(schedule || [])]
      .filter(s => s.status === 'ACTIVE')
      .sort((a, b) => (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3))
      .slice(0, 5);
  }, [schedule]);

  const hasOverdue = sorted.some(s => s.urgency === 'OVERDUE');

  return (
    <ChartCard
      icon={<CalendarMonthRoundedIcon sx={{ color: hasOverdue ? '#e53935' : '#006994', fontSize: 18 }} />}
      title={t('vessels.overview.upcomingTitle')}
      titleRight={
        hasOverdue
          ? <Chip label={t('vessels.overview.overdue')} color="error" size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
          : null
      }
    >
      {sorted.length === 0 ? (
        <Stack direction="row" alignItems="center" gap={1} sx={{ py: 1.5 }}>
          <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">{t('vessels.overview.allOnSchedule')}</Typography>
        </Stack>
      ) : (
        <Stack spacing={0.75}>
          {sorted.map(s => (
            <Stack key={s.id} direction="row" alignItems="center" gap={1.25}
              sx={{
                p: 1, borderRadius: 2,
                bgcolor: s.urgency === 'OVERDUE' ? 'rgba(229,57,53,0.06)' : 'action.hover',
                border: '1px solid',
                borderColor: s.urgency === 'OVERDUE' ? 'error.light' : 'divider',
              }}>
              <Chip
                label={
                  s.urgency === 'OVERDUE'  ? t('vessels.overview.overdue') :
                  s.urgency === 'DUE_SOON' ? t('vessels.overview.dueSoon') :
                  t('vessels.overview.onSchedule')
                }
                color={URGENCY_CHIP[s.urgency] || 'default'}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.6rem', height: 18, flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} noWrap display="block">
                  {(s.serviceType || 'Service').replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : '—'}
                  {s.nextDueHours ? ` · ${s.nextDueHours.toLocaleString()} h` : ''}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </ChartCard>
  );
}

// ── Vessel specs ───────────────────────────────────────────────────────────

function VesselSpecsCard({ vessel }) {
  const { t } = useTranslation('dashboard');

  const fields = [
    { key: 'type',   label: t('vessels.infoLabels.type'),   value: vessel?.type },
    { key: 'brand',  label: t('vessels.infoLabels.brand'),  value: vessel?.brand },
    { key: 'model',  label: t('vessels.infoLabels.model'),  value: vessel?.model },
    { key: 'year',   label: t('vessels.infoLabels.year'),   value: vessel?.year },
    { key: 'length', label: t('vessels.infoLabels.length'), value: vessel?.length ? `${vessel.length} ${t('vessels.infoLabels.ft')}` : null },
    { key: 'engine', label: t('vessels.infoLabels.engine'), value: vessel?.engineType },
    { key: 'hull',   label: t('vessels.infoLabels.hull'),   value: vessel?.hullMaterial },
    { key: 'reg',    label: t('vessels.infoLabels.reg'),    value: vessel?.registrationNumber },
  ].filter(f => f.value);

  if (!fields.length) return null;

  return (
    <ChartCard
      icon={<InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />}
      title={t('vessels.overview.specsTitle')}
    >
      <Grid container spacing={2}>
        {fields.map(({ key, label, value }) => (
          <Grid item xs={6} sm={4} md={3} key={key}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>{label}</Typography>
            <Typography variant="body2" fontWeight={600}>{value}</Typography>
          </Grid>
        ))}
      </Grid>
    </ChartCard>
  );
}

// ── VesselOverviewTab (main export) ───────────────────────────────────────

export default function VesselOverviewTab({ vessel, vesselId, dossier }) {
  const { t } = useTranslation('dashboard');
  const year = new Date().getFullYear();
  const d = dossier || {};
  const records  = d.recentHistory || [];
  const schedule = d.schedule || [];

  // Per-vessel fuel analytics
  const { data: fuelAnalytics, isLoading: fuelLoading } = useQuery({
    queryKey: ['fuel-analytics', vesselId],
    queryFn:  () => vesselApi.getFuelAnalytics(vesselId),
    enabled:  !!vesselId,
    staleTime: 5 * 60_000,
  });

  // Compute derived KPI values
  const ytdCost = useMemo(() => {
    return records
      .filter(r => r.cost && r.performedOn && new Date(r.performedOn + 'T00:00:00').getFullYear() === year)
      .reduce((s, r) => s + Number(r.cost), 0);
  }, [records, year]);

  const { nextUrgency, nextLabel } = useMemo(() => {
    const active = schedule.filter(s => s.status === 'ACTIVE');
    if (active.some(s => s.urgency === 'OVERDUE'))  return { nextUrgency: 'OVERDUE',   nextLabel: t('vessels.overview.overdue') };
    if (active.some(s => s.urgency === 'DUE_SOON')) return { nextUrgency: 'DUE_SOON',  nextLabel: t('vessels.overview.dueSoon') };
    const next = active
      .filter(s => s.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))[0];
    const label = next ? new Date(next.nextDueDate).toLocaleDateString() : '—';
    return { nextUrgency: next ? 'NORMAL' : null, nextLabel: label };
  }, [schedule, t]);

  const nextAccent  = nextUrgency === 'OVERDUE' ? '#e53935' : nextUrgency === 'DUE_SOON' ? '#f5a623' : '#43a047';
  const totalRecords = records.length;

  return (
    <Stack spacing={2.5}>

      {/* ── KPI row ── */}
      <Reveal variant="fade" timeout={280}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <StatCard
            icon={<SpeedIcon sx={{ color: '#006994', fontSize: 20 }} />}
            label={t('vessels.overview.engineHours')}
            value={d.currentEngineHours != null ? `${d.currentEngineHours.toLocaleString()} h` : '—'}
            accent="#006994"
          />
          <StatCard
            icon={<BuildRoundedIcon sx={{ color: '#f5a623', fontSize: 20 }} />}
            label={t('vessels.overview.maintCost')}
            value={ytdCost > 0 ? `${ytdCost.toLocaleString()} QAR` : '—'}
            accent="#f5a623"
          />
          <StatCard
            icon={<LocalGasStationRoundedIcon sx={{ color: '#43a047', fontSize: 20 }} />}
            label={t('vessels.overview.fuelYtd')}
            value={fuelLoading ? '…' : fuelAnalytics?.totalLiters ? `${Number(fuelAnalytics.totalLiters).toLocaleString()} L` : '—'}
            accent="#43a047"
          />
          <StatCard
            icon={<EventBusyRoundedIcon sx={{ color: nextAccent, fontSize: 20 }} />}
            label={t('vessels.overview.nextService')}
            value={nextLabel}
            accent={nextAccent}
            badge={nextUrgency === 'OVERDUE' ? t('vessels.overview.overdue') : nextUrgency === 'DUE_SOON' ? t('vessels.overview.dueSoon') : undefined}
            badgeColor={nextUrgency === 'OVERDUE' ? 'error' : 'warning'}
          />
        </Stack>
      </Reveal>

      {/* ── Engine hours (editable) ── */}
      <Reveal variant="fade" timeout={340}>
        <EngineHoursCard
          vesselId={vesselId}
          currentEngineHours={d.currentEngineHours}
          engineHoursUpdatedAt={d.engineHoursUpdatedAt}
          unavailable={d.engineHoursUnavailable}
        />
      </Reveal>

      {/* ── Row: Cost bar + Service donut ── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Reveal variant="fade" timeout={400}>
            <CostBarChart records={records} />
          </Reveal>
        </Grid>
        <Grid item xs={12} md={5}>
          <Reveal variant="fade" timeout={440}>
            <ServiceDonutChart records={records} />
          </Reveal>
        </Grid>
      </Grid>

      {/* ── Row: Engine hours trend + Upcoming ── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Reveal variant="fade" timeout={480}>
            <EngineHoursTrendCard records={records} />
          </Reveal>
        </Grid>
        <Grid item xs={12} md={5}>
          <Reveal variant="fade" timeout={520}>
            <UpcomingServicesPanel schedule={schedule} />
          </Reveal>
        </Grid>
      </Grid>

      {/* ── Fuel consumption area chart ── */}
      <Reveal variant="fade" timeout={560}>
        <FuelOverviewChart analytics={fuelAnalytics} isLoading={fuelLoading} />
      </Reveal>

      {/* ── Vessel specs ── */}
      <Reveal variant="fade" timeout={600}>
        <VesselSpecsCard vessel={vessel} />
      </Reveal>

    </Stack>
  );
}
