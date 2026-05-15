import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, MenuItem, TextField, Skeleton,
  Alert, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Link as MuiLink,
} from '@mui/material';
import { Link } from 'react-router-dom';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import HandymanRoundedIcon from '@mui/icons-material/HandymanRounded';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import { useTranslation } from 'react-i18next';
import useMaintenanceCost from '../../hooks/maintenance/useMaintenanceCost';
import { Reveal, Stagger } from '../../components/common/Motion';

// Default year selector range — last 3 years plus current. Keeps the
// dropdown short; users with older history can still type a year manually
// if we surface a free-input version later.
const NOW = new Date();
const YEARS = [0, 1, 2].map((d) => NOW.getFullYear() - d);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** QAR currency formatter. Intl.NumberFormat is i18n-aware out of the box. */
function fmtQar(amount, locale = 'en') {
  if (amount == null) return '— QAR';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: 'QAR', maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(0)} QAR`;
  }
}

/**
 * Maintenance cost analytics — client-facing dashboard. Single backend
 * fetch returns the full year roll-up; the page slices it into:
 *   - 4 KPI tiles (total, records, top type, top vessel)
 *   - Monthly bar chart (pure SVG, no chart lib)
 *   - Service-type breakdown (horizontal bars)
 *   - Per-vessel table with drill-down link
 *
 * staleTime on the hook means revisiting the page within 5 minutes
 * shows cached data instantly — analytics doesn't need real-time.
 */
export default function MaintenanceAnalytics() {
  const { t, i18n } = useTranslation('maintenance');
  const [year, setYear] = useState(NOW.getFullYear());
  const { data, isLoading, error } = useMaintenanceCost(year);

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>{t('analytics.title')}</Typography>
        <Alert severity="error">{error.response?.data?.message || error.message}</Alert>
      </Box>
    );
  }

  // Loading sceleton — show titles + tile shapes so layout doesn't shift.
  const summary = data;
  const top = summary?.byServiceType?.[0];
  const topVessel = summary?.byVessel?.[0];

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <Typography variant="h4">{t('analytics.title')}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          select
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="year"
        >
          {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* KPI tiles */}
          <Stagger
            variant="grow"
            step={100}
            timeout={500}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <KpiTile
              icon={PaidRoundedIcon}
              label={t('analytics.totalSpent')}
              value={fmtQar(summary.totalQar, i18n.language)}
            />
            <KpiTile
              icon={ListAltRoundedIcon}
              label={t('analytics.recordCount')}
              value={summary.recordCount}
            />
            <KpiTile
              icon={HandymanRoundedIcon}
              label={t('analytics.topService')}
              value={top ? t(`types.${top.serviceType}`, { defaultValue: top.serviceType }) : '—'}
              subValue={top ? fmtQar(top.totalQar, i18n.language) : null}
            />
            <KpiTile
              icon={DirectionsBoatRoundedIcon}
              label={t('analytics.topVessel')}
              value={topVessel?.vesselName || '—'}
              subValue={topVessel ? fmtQar(topVessel.totalQar, i18n.language) : null}
            />
          </Stagger>

          {/* Monthly chart */}
          <Reveal variant="fade" timeout={500}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('analytics.monthlyTitle', { year })}
                </Typography>
                <MonthlyBarChart data={summary.byMonth} locale={i18n.language} />
              </CardContent>
            </Card>
          </Reveal>

          <Grid container spacing={2}>
            {/* By service type */}
            <Grid item xs={12} md={6}>
              <Reveal variant="slide" direction="up" timeout={500}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('analytics.byServiceTitle')}
                    </Typography>
                    <ServiceTypeBars data={summary.byServiceType} total={summary.totalQar} t={t} locale={i18n.language} />
                  </CardContent>
                </Card>
              </Reveal>
            </Grid>

            {/* By vessel — table with click-through */}
            <Grid item xs={12} md={6}>
              <Reveal variant="slide" direction="up" timeout={500}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('analytics.byVesselTitle')}
                    </Typography>
                    {summary.byVessel.length === 0 ? (
                      <Typography color="text.secondary">{t('analytics.empty')}</Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('analytics.vessel')}</TableCell>
                            <TableCell align="right">{t('analytics.records')}</TableCell>
                            <TableCell align="right">{t('analytics.total')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {summary.byVessel.map((v) => (
                            <TableRow key={v.vesselId} hover>
                              <TableCell>
                                <MuiLink
                                  component={Link}
                                  to={`/dashboard/vessels/${v.vesselId}`}
                                  underline="hover"
                                >
                                  {v.vesselName || `#${v.vesselId}`}
                                </MuiLink>
                              </TableCell>
                              <TableCell align="right">{v.recordCount}</TableCell>
                              <TableCell align="right">
                                <strong>{fmtQar(v.totalQar, i18n.language)}</strong>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </Reveal>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

/** ─── KPI tile ─────────────────────────────────────────────────────────── */

function KpiTile({ icon: Icon, label, value, subValue }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={1}>
          <Icon color="primary" fontSize="small" />
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {subValue && (
          <Typography variant="caption" color="text.secondary">{subValue}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

/** ─── Monthly bar chart (pure SVG) ─────────────────────────────────────── */

function MonthlyBarChart({ data, locale }) {
  const dims = { width: 640, height: 200, padding: 28 };
  const maxVal = Math.max(...data.map((m) => Number(m.totalQar) || 0), 1);
  const plotW = dims.width - dims.padding * 2;
  const plotH = dims.height - dims.padding * 2;
  const barW = plotW / data.length - 6;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        role="img"
        aria-label="monthly cost"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Y-axis baseline */}
        <line
          x1={dims.padding}
          y1={dims.height - dims.padding}
          x2={dims.width - dims.padding}
          y2={dims.height - dims.padding}
          stroke="rgba(0,0,0,0.12)"
        />
        {data.map((m, i) => {
          const v = Number(m.totalQar) || 0;
          const h = (v / maxVal) * plotH;
          const x = dims.padding + (plotW / data.length) * i + 3;
          const y = dims.height - dims.padding - h;
          return (
            <g key={m.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill="#006994"
                rx="2"
              >
                <title>{MONTH_LABELS[m.month - 1]} · {fmtQar(v, locale)}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={dims.height - dims.padding + 14}
                fontSize="10"
                fill="rgba(0,0,0,0.55)"
                textAnchor="middle"
              >
                {MONTH_LABELS[m.month - 1]}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

/** ─── By-service-type horizontal bars ──────────────────────────────────── */

function ServiceTypeBars({ data, total, t, locale }) {
  if (!data || data.length === 0) {
    return <Typography color="text.secondary">{t('analytics.empty')}</Typography>;
  }
  const totalNum = Number(total) || 1; // guard against div-by-zero
  return (
    <Stack gap={1.5}>
      {data.map((row) => {
        const pct = ((Number(row.totalQar) || 0) / totalNum) * 100;
        return (
          <Box key={row.serviceType}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
                {t(`types.${row.serviceType}`, { defaultValue: row.serviceType })}
              </Typography>
              <Chip size="small" label={`${row.recordCount}`} />
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                {fmtQar(row.totalQar, locale)}
              </Typography>
            </Stack>
            <Box sx={{
              height: 6, borderRadius: 3, bgcolor: 'action.hover', mt: 0.5,
              overflow: 'hidden', position: 'relative',
            }}>
              <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct.toFixed(1)}%`,
                bgcolor: 'primary.main',
                transition: 'width 320ms ease',
              }} />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

/** ─── Skeleton ─────────────────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <Box>
      <Stack direction="row" gap={2} mb={3}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={96} sx={{ flexGrow: 1 }} />
        ))}
      </Stack>
      <Skeleton variant="rounded" height={240} sx={{ mb: 3 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} /></Grid>
        <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} /></Grid>
      </Grid>
    </Box>
  );
}
