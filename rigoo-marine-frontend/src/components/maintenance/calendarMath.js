/**
 * Pure date helpers used by ServiceScheduleCalendar. Extracted into a
 * sibling module so they can be unit-tested without rendering the React
 * component — the date math is by far the trickiest part of the
 * calendar (timezones, locale first-day-of-week, month grid edges).
 *
 * No external date lib by design (see calendar javadoc): keeps the
 * bundle lean and these helpers small enough to read in one screen.
 */

/** First-of-month at local-midnight. Avoids the UTC trap by passing y/m. */
export function firstOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

export function isInMonth(date, monthStart) {
  if (!date) return false;
  return date.getFullYear() === monthStart.getFullYear()
      && date.getMonth()    === monthStart.getMonth();
}

/**
 * Format a Date as YYYY-MM-DD in the local timezone. Bucket-by-local-date
 * because the backend's nextDueDate is a calendar date with no zone;
 * converting via toISOString() would shift around midnight Asia/Qatar.
 */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" into a local-midnight Date. Returns null on bad input. */
export function parseISODate(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Index schedule items by their nextDueDate. Items without a date are skipped. */
export function bucketByDate(schedule) {
  const map = new Map();
  if (!Array.isArray(schedule)) return map;
  for (const item of schedule) {
    if (!item.nextDueDate) continue;
    const arr = map.get(item.nextDueDate) || [];
    arr.push(item);
    map.set(item.nextDueDate, arr);
  }
  return map;
}

/**
 * Locale's first day of week as 0–6 (0=Sunday). Uses Intl.Locale.getWeekInfo
 * when supported; falls back to Saturday for Arabic, Sunday otherwise.
 */
export function getFirstDayOfWeek(locale) {
  try {
    const info = new Intl.Locale(locale).getWeekInfo?.();
    if (info && typeof info.firstDay === 'number') {
      return info.firstDay % 7; // Intl: 1=Mon..7=Sun → 0=Sun..6=Sat
    }
  } catch { /* fall through */ }
  return locale && locale.toLowerCase().startsWith('ar') ? 6 : 0;
}

/**
 * 42 Date cells (6 rows × 7 cols) starting from the first-of-week
 * preceding monthStart. Trailing/leading days fill the grid edges so
 * the layout never jumps between months.
 */
export function buildMonthGrid(monthStart, firstDayOfWeek) {
  const offset = (monthStart.getDay() - firstDayOfWeek + 7) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - offset);

  const out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    out.push(d);
  }
  return out;
}

/** Locale's short weekday names rotated to match firstDayOfWeek. */
export function buildWeekdayLabels(locale, firstDayOfWeek) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const sundayRef = new Date(2024, 0, 7); // Jan 7 2024 = a known Sunday
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayRef);
    d.setDate(sundayRef.getDate() + i);
    labels.push(fmt.format(d));
  }
  return labels.slice(firstDayOfWeek).concat(labels.slice(0, firstDayOfWeek));
}
