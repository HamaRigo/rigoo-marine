import { useMemo } from 'react';
import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../common/Motion';
import { buildPoints, computeChart } from './engineHoursChartMath';

const DIMS = { width: 640, height: 200, padding: 28 };

/**
 * Line chart of engine-hours-at-service over time. Pure SVG — no chart
 * library, no extra dep. The math lives in {@code engineHoursChartMath}
 * so it's unit-testable without rendering.
 *
 * <p>Renders nothing when there are fewer than 2 plottable points —
 * a single point isn't a trend and an empty chart is just visual noise.
 *
 * <p>Each point is a tooltip-ready circle; the line connecting them
 * uses theme primary colour. Inline SVG means the chart scales with the
 * card width (viewBox) and stays crisp on retina.
 */
export default function EngineHoursChart({ records }) {
  const { t } = useTranslation('maintenance');

  // Defer the math behind useMemo — recomputes only when records change,
  // not on every parent rerender. Chart math is ~O(n) on the history
  // list which is paged to 20 server-side, so the work is bounded.
  const { points, chart } = useMemo(() => {
    const pts = buildPoints(records);
    return { points: pts, chart: computeChart(pts, DIMS) };
  }, [records]);

  // < 2 points: the line would be a dot or nothing. Skip the card.
  if (points.length < 2) return null;

  return (
    <Reveal variant="fade" timeout={420}>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
            <TrendingUpRoundedIcon color="primary" />
            <Typography variant="h6">{t('chart.title')}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {t('chart.subtitle', { count: points.length })}
          </Typography>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${DIMS.width} ${DIMS.height}`}
              role="img"
              aria-label={t('chart.title')}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              {/* Y-axis grid lines + labels */}
              {chart.yTicks.map((t, i) => (
                <g key={`y-${i}`}>
                  <line
                    x1={DIMS.padding}
                    y1={t.y}
                    x2={DIMS.width - DIMS.padding}
                    y2={t.y}
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth="1"
                  />
                  <text
                    x={DIMS.padding - 6}
                    y={t.y}
                    fontSize="10"
                    fill="rgba(0,0,0,0.55)"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {t.label}
                  </text>
                </g>
              ))}

              {/* X-axis labels (no vertical grid lines — keeps it clean) */}
              {chart.xTicks.map((t, i) => (
                <text
                  key={`x-${i}`}
                  x={t.x}
                  y={DIMS.height - 8}
                  fontSize="10"
                  fill="rgba(0,0,0,0.55)"
                  textAnchor="middle"
                >
                  {t.label}
                </text>
              ))}

              {/* The line itself + plotted points */}
              <path
                d={chart.line}
                fill="none"
                stroke="#006994"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {chart.plotted.map((p, i) => (
                <circle
                  key={`pt-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#006994"
                  stroke="white"
                  strokeWidth="1.5"
                >
                  <title>
                    {p.raw.date.toLocaleDateString()} — {p.raw.hours} h
                  </title>
                </circle>
              ))}
            </svg>
          </Box>
        </CardContent>
      </Card>
    </Reveal>
  );
}
