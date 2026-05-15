import { describe, it, expect } from 'vitest';
import { buildPoints, computeChart } from '../engineHoursChartMath';

describe('buildPoints', () => {
  it('keeps rows with date + hours, drops the rest, sorts ascending', () => {
    const records = [
      { performedOn: '2026-05-14', engineHoursAtService: 250 },
      { performedOn: '2026-04-01', engineHoursAtService: 180 },
      { performedOn: '2026-03-15', engineHoursAtService: null },   // hours missing
      { performedOn: null,         engineHoursAtService: 200 },    // date missing
      { performedOn: '2026-02-01', engineHoursAtService: '120' },  // string number ok
    ];

    const out = buildPoints(records);

    expect(out).toHaveLength(3);
    // Sorted ascending by date.
    expect(out[0].hours).toBe(120);
    expect(out[1].hours).toBe(180);
    expect(out[2].hours).toBe(250);
  });

  it('returns [] for non-array input (loading state)', () => {
    expect(buildPoints(null)).toEqual([]);
    expect(buildPoints(undefined)).toEqual([]);
  });

  it('parses dates as local midnight (no UTC shift)', () => {
    const out = buildPoints([{ performedOn: '2026-05-14', engineHoursAtService: 100 }]);
    expect(out).toHaveLength(1);
    expect(out[0].date.getFullYear()).toBe(2026);
    expect(out[0].date.getMonth()).toBe(4);
    expect(out[0].date.getDate()).toBe(14);
  });

  it('drops non-numeric hours', () => {
    const out = buildPoints([{ performedOn: '2026-05-14', engineHoursAtService: 'abc' }]);
    expect(out).toEqual([]);
  });
});

describe('computeChart', () => {
  const dims = { width: 600, height: 200, padding: 30 };

  it('returns empty chart artefacts for empty input', () => {
    const c = computeChart([], dims);
    expect(c.line).toBe('');
    expect(c.plotted).toEqual([]);
    expect(c.xTicks).toEqual([]);
    expect(c.yTicks).toEqual([]);
  });

  it('produces an SVG path string and plotted points for 3 data points', () => {
    const points = [
      { date: new Date(2026, 0, 1), hours: 100 },
      { date: new Date(2026, 3, 1), hours: 150 },
      { date: new Date(2026, 6, 1), hours: 200 },
    ];
    const c = computeChart(points, dims);

    expect(c.plotted).toHaveLength(3);
    // First point is at left padding, last at right padding (plus the plotW).
    expect(c.plotted[0].x).toBeCloseTo(dims.padding, 0);
    expect(c.plotted[2].x).toBeCloseTo(dims.width - dims.padding, 0);
    // Path starts with M and contains 2 L segments.
    expect(c.line.startsWith('M')).toBe(true);
    expect(c.line.match(/L/g)).toHaveLength(2);
  });

  it('inverts the y axis — higher hours render at lower y pixels', () => {
    const points = [
      { date: new Date(2026, 0, 1), hours: 100 },
      { date: new Date(2026, 1, 1), hours: 200 },
    ];
    const c = computeChart(points, dims);
    // SVG y grows downward; 200 hours should be ABOVE 100 hours visually
    // → smaller y coordinate.
    expect(c.plotted[1].y).toBeLessThan(c.plotted[0].y);
  });

  it('handles a single point gracefully (no NaN / Infinity)', () => {
    const c = computeChart([{ date: new Date(2026, 0, 1), hours: 100 }], dims);
    expect(c.plotted).toHaveLength(1);
    expect(Number.isFinite(c.plotted[0].x)).toBe(true);
    expect(Number.isFinite(c.plotted[0].y)).toBe(true);
  });

  it('generates 3 x-axis ticks and 3 y-axis ticks for non-empty input', () => {
    const points = [
      { date: new Date(2026, 0, 1), hours: 100 },
      { date: new Date(2026, 6, 1), hours: 200 },
    ];
    const c = computeChart(points, dims);
    expect(c.xTicks).toHaveLength(3);
    expect(c.yTicks).toHaveLength(3);
  });
});
