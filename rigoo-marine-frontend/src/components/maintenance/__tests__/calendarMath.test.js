import { describe, it, expect } from 'vitest';
import {
  firstOfMonth, addMonths, sameDay, isInMonth, toISODate, parseISODate,
  bucketByDate, getFirstDayOfWeek, buildMonthGrid, buildWeekdayLabels,
} from '../calendarMath';

/**
 * Calendar date math is the hardest part of the visual schedule view —
 * timezones, locale first-day-of-week, month grid edges. These tests
 * cover the helpers extracted from ServiceScheduleCalendar so we can
 * exercise them deterministically without rendering MUI.
 */
describe('calendarMath', () => {
  describe('firstOfMonth', () => {
    it('returns local-midnight of the 1st', () => {
      const d = new Date(2026, 4, 14, 23, 59); // May 14 2026, late evening
      const first = firstOfMonth(d);
      expect(first.getFullYear()).toBe(2026);
      expect(first.getMonth()).toBe(4);
      expect(first.getDate()).toBe(1);
      expect(first.getHours()).toBe(0);
    });
  });

  describe('addMonths', () => {
    it('crosses year boundary correctly', () => {
      const dec = new Date(2026, 11, 15);
      expect(addMonths(dec, 1).getFullYear()).toBe(2027);
      expect(addMonths(dec, 1).getMonth()).toBe(0); // January

      const jan = new Date(2026, 0, 15);
      expect(addMonths(jan, -1).getFullYear()).toBe(2025);
      expect(addMonths(jan, -1).getMonth()).toBe(11); // December
    });
  });

  describe('toISODate / parseISODate', () => {
    it('round-trips a local-midnight date', () => {
      const d = new Date(2026, 4, 14); // May 14 local
      expect(toISODate(d)).toBe('2026-05-14');
      const back = parseISODate('2026-05-14');
      expect(sameDay(back, d)).toBe(true);
    });

    it('handles single-digit month + day with zero-pad', () => {
      const d = new Date(2026, 0, 3);
      expect(toISODate(d)).toBe('2026-01-03');
    });

    it('parseISODate returns null on bad input', () => {
      expect(parseISODate(null)).toBeNull();
      expect(parseISODate('')).toBeNull();
      expect(parseISODate('not-a-date')).toBeNull();
      expect(parseISODate('2026-05')).toBeNull();
    });
  });

  describe('bucketByDate', () => {
    it('groups schedule items by nextDueDate, skipping nullable rows', () => {
      const schedule = [
        { id: 1, nextDueDate: '2026-05-14', serviceType: 'OIL_CHANGE' },
        { id: 2, nextDueDate: '2026-05-14', serviceType: 'HULL_CLEANING' },
        { id: 3, nextDueDate: '2026-05-20', serviceType: 'IMPELLER' },
        { id: 4, nextDueDate: null,         serviceType: 'BATTERY' }, // hours-only schedule
      ];
      const map = bucketByDate(schedule);
      expect(map.size).toBe(2);
      expect(map.get('2026-05-14')).toHaveLength(2);
      expect(map.get('2026-05-20')).toHaveLength(1);
      expect(map.has('null')).toBe(false);
    });

    it('tolerates non-array input (transient null while loading)', () => {
      expect(bucketByDate(null).size).toBe(0);
      expect(bucketByDate(undefined).size).toBe(0);
    });
  });

  describe('getFirstDayOfWeek', () => {
    it('defaults to Sunday for English', () => {
      // Intl.Locale.getWeekInfo() returns the locale's CLDR-stated start,
      // which is Sunday for en-US. We accept either 0 (Sun) or 1 (Mon
      // for en-GB-style locales) — the matcher is permissive because
      // browser ICU data varies.
      const v = getFirstDayOfWeek('en');
      expect([0, 1]).toContain(v);
    });

    it('returns Saturday for Arabic in our default fallback', () => {
      // Browsers without getWeekInfo() fall through to our Arabic→Saturday
      // override. With browser support, CLDR also says Saturday for
      // ar-QA and most ar-* locales.
      expect(getFirstDayOfWeek('ar')).toBe(6);
    });
  });

  describe('buildMonthGrid', () => {
    it('produces exactly 42 cells starting from the first-of-week of the month', () => {
      // May 1 2026 is a Friday (day-of-week = 5). With firstDayOfWeek=0
      // (Sunday-first), the grid starts at Sunday April 26 2026.
      const may = firstOfMonth(new Date(2026, 4, 1));
      const grid = buildMonthGrid(may, 0);

      expect(grid).toHaveLength(42);
      expect(toISODate(grid[0])).toBe('2026-04-26');
      // Last cell is exactly 41 days later → Saturday June 6 2026.
      expect(toISODate(grid[41])).toBe('2026-06-06');
    });

    it('respects a non-Sunday firstDayOfWeek', () => {
      const may = firstOfMonth(new Date(2026, 4, 1));
      // Saturday-first (Arabic): grid starts Saturday April 25.
      const grid = buildMonthGrid(may, 6);
      expect(toISODate(grid[0])).toBe('2026-04-25');
    });

    it('contains the first of the month as a cell', () => {
      const may = firstOfMonth(new Date(2026, 4, 1));
      const grid = buildMonthGrid(may, 0);
      const hasMay1 = grid.some((d) => toISODate(d) === '2026-05-01');
      expect(hasMay1).toBe(true);
    });
  });

  describe('isInMonth', () => {
    it('compares year + month, ignores day', () => {
      const may = firstOfMonth(new Date(2026, 4, 1));
      expect(isInMonth(new Date(2026, 4, 31), may)).toBe(true);
      expect(isInMonth(new Date(2026, 5, 1), may)).toBe(false);  // June
      expect(isInMonth(new Date(2025, 4, 14), may)).toBe(false); // 2025
    });

    it('returns false for null date', () => {
      expect(isInMonth(null, new Date(2026, 4, 1))).toBe(false);
    });
  });

  describe('buildWeekdayLabels', () => {
    it('returns 7 strings rotated to firstDayOfWeek', () => {
      const labels = buildWeekdayLabels('en', 0);
      expect(labels).toHaveLength(7);
      // First label is Sunday's locale-short form (e.g. "Sun")
      // Last label is Saturday's
      expect(labels[0].toLowerCase()).toMatch(/sun/i);
    });

    it('Arabic rotation puts Saturday first', () => {
      const labels = buildWeekdayLabels('ar', 6);
      expect(labels).toHaveLength(7);
      // Just verify the rotation moved index 6 (Sat) to position 0
      // — we don't assert on the Arabic string itself because the
      // exact label depends on ICU data.
      const sundayFirst = buildWeekdayLabels('ar', 0);
      expect(labels[0]).toBe(sundayFirst[6]);
    });
  });
});
