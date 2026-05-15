/**
 * Pure helpers for EngineHoursChart. Extracted so they can be unit-tested
 * without rendering SVG. The chart itself is read-only SVG — these
 * functions do all the actual work.
 */

/**
 * Filter service-history records down to points the chart can draw:
 * those with both a {@code performedOn} date AND a non-null
 * {@code engineHoursAtService} reading. Returned points are sorted by
 * date ascending (chart left → right reads chronologically).
 *
 * @param {Array} records  service history rows from the dossier endpoint
 * @returns {Array<{date: Date, hours: number}>} chartable points
 */
export function buildPoints(records) {
  if (!Array.isArray(records)) return [];
  const out = [];
  for (const r of records) {
    if (!r || !r.performedOn) continue;
    if (r.engineHoursAtService == null) continue;
    const date = parseLocalDate(r.performedOn);
    const hours = Number(r.engineHoursAtService);
    if (!date || !Number.isFinite(hours)) continue;
    out.push({ date, hours });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** Parse a backend "YYYY-MM-DD" or ISO datetime into a local Date. */
function parseLocalDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  // Backend ships dates as "YYYY-MM-DD" for performedOn. Parse the
  // first 10 chars only so an accidentally-included timestamp doesn't
  // trip a UTC shift around midnight Asia/Qatar.
  const ymd = String(s).slice(0, 10);
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Compute the SVG path "d" attribute and tick positions for a set of
 * chart points. Returns the raw values; the SVG renderer applies them
 * straight to <path> + <line> elements.
 *
 * @param {Array<{date: Date, hours: number}>} points
 * @param {{width:number, height:number, padding:number}} dims
 * @returns {{
 *   line: string,                            // SVG path d attribute
 *   xTicks: Array<{x:number, label:string}>, // date labels along the x-axis
 *   yTicks: Array<{y:number, label:string}>, // hour labels along the y-axis
 *   plotted: Array<{x:number, y:number, raw:{date:Date, hours:number}}>,
 *   xRange: [Date, Date],
 *   yRange: [number, number],
 * }}
 */
export function computeChart(points, dims) {
  const { width, height, padding } = dims;
  if (!points || points.length === 0) {
    return { line: '', xTicks: [], yTicks: [], plotted: [], xRange: null, yRange: [0, 0] };
  }

  const xs = points.map((p) => p.date.getTime());
  const ys = points.map((p) => p.hours);
  const xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  // Guard against a single-point chart (xMin === xMax) — give it a
  // 1-day span so the line renders as a tiny dot at the centre.
  if (xMax === xMin) xMax = xMin + 24 * 60 * 60 * 1000;

  const yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax === yMin) yMax = yMin + 1; // single-value guard
  // Pad the y-axis by 5% so points don't sit flush against the edge.
  const yPadAmount = (yMax - yMin) * 0.05;
  const yLo = Math.max(0, yMin - yPadAmount);
  const yHi = yMax + yPadAmount;

  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const xOf = (t) => padding + ((t - xMin) / (xMax - xMin)) * plotW;
  const yOf = (h) => padding + plotH - ((h - yLo) / (yHi - yLo)) * plotH;

  const plotted = points.map((p) => ({
    x: xOf(p.date.getTime()),
    y: yOf(p.hours),
    raw: p,
  }));

  const line = plotted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Sparse axis ticks — only 3 each, otherwise a busy 10-point chart
  // becomes label spaghetti.
  const xTicks = pickTicks(xMin, xMax, 3).map((t) => ({
    x: xOf(t),
    label: new Date(t).toLocaleDateString(),
  }));
  const yTicks = pickTicks(yLo, yHi, 3).map((h) => ({
    y: yOf(h),
    label: `${Math.round(h)} h`,
  }));

  return {
    line,
    xTicks,
    yTicks,
    plotted,
    xRange: [new Date(xMin), new Date(xMax)],
    yRange: [yLo, yHi],
  };
}

/** Linearly pick {@code n} tick values across [min, max] inclusive. */
function pickTicks(min, max, n) {
  if (n <= 0) return [];
  if (n === 1) return [(min + max) / 2];
  const step = (max - min) / (n - 1);
  const out = [];
  for (let i = 0; i < n; i++) out.push(min + step * i);
  return out;
}
