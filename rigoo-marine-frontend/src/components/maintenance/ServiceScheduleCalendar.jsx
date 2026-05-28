/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Stack, Tooltip, Chip, useTheme,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { useTranslation } from 'react-i18next';
import EditScheduleDialog from './EditScheduleDialog';
import { Reveal } from '../common/Motion';
import {
  firstOfMonth, addMonths, sameDay, isInMonth, toISODate, parseISODate,
  bucketByDate, getFirstDayOfWeek, buildMonthGrid, buildWeekdayLabels,
} from './calendarMath';

/**
 * Month-grid view of the vessel's service schedule. Renders a fixed 6 × 7 cell
 * grid so the layout doesn't jump when navigating between months. Schedule
 * items without a {@code nextDueDate} (hours-only schedules) are skipped —
 * those live in the list view, which we link to from the empty-state hint.
 *
 * Locale-aware:
 *  - Month label + weekday header pulled from {@code Intl.DateTimeFormat}
 *    using the i18next current language.
 *  - First day of week derived from {@code Intl.Locale#getWeekInfo()} when
 *    available; defaults to Sunday, except Arabic falls back to Saturday
 *    (matches the Qatar civic week).
 *  - RTL switch via {@code direction: rtl} on the grid container — CSS Grid
 *    reverses column flow automatically.
 *
 * Read-only on empty cells; clicking a chip opens {@code EditScheduleDialog}
 * for the underlying schedule item.
 */
export default function ServiceScheduleCalendar({ vesselId, schedule }) {
  const { t, i18n } = useTranslation('maintenance');
  const theme = useTheme();
  const locale = i18n.language || 'en';
  const isRtl = (locale || '').toLowerCase().startsWith('ar');

  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [editDialog, setEditDialog] = useState({ open: false, initial: null });

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);
  const itemsByDate = useMemo(() => bucketByDate(schedule), [schedule]);

  const today = useMemo(() => new Date(), []);
  const monthDays = useMemo(
    () => buildMonthGrid(month, firstDayOfWeek),
    [month, firstDayOfWeek],
  );

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month),
    [locale, month],
  );
  const weekdayLabels = useMemo(
    () => buildWeekdayLabels(locale, firstDayOfWeek),
    [locale, firstDayOfWeek],
  );

  const itemsThisMonth = useMemo(
    () => schedule.filter((s) => isInMonth(parseISODate(s.nextDueDate), month)),
    [schedule, month],
  );

  const hoursOnlyCount = useMemo(
    () => schedule.filter((s) => !s.nextDueDate && s.nextDueHours != null).length,
    [schedule],
  );

  return (
    <Reveal variant="fade" timeout={420}>
      <Card>
        <CardContent>
          {/* Header: month navigation. PrevMonth/NextMonth icons swap when in RTL
              so the affordance still reads "back in time / forward in time". */}
          <Stack direction="row" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <CalendarTodayRoundedIcon color="primary" />
            <Typography variant="h6" sx={{ flexGrow: 1, textTransform: 'capitalize' }}>
              {monthLabel}
            </Typography>
            <Tooltip title={t('calendar.today')}>
              <span>
                <IconButton size="small" onClick={() => setMonth(firstOfMonth(new Date()))}>
                  <TodayRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('calendar.prev')}>
              <IconButton size="small" onClick={() => setMonth(addMonths(month, -1))}>
                {isRtl ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={t('calendar.next')}>
              <IconButton size="small" onClick={() => setMonth(addMonths(month, 1))}>
                {isRtl ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          {/* The grid uses logical CSS via direction:rtl on the container so that
              column 1 renders on the right for Arabic. The DOM order stays the
              same — keeps testing + Intl.DateTimeFormat predictable. */}
          <Box
            sx={{
              direction: isRtl ? 'rtl' : 'ltr',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
            }}
          >
            {weekdayLabels.map((label) => (
              <Box
                key={label}
                sx={{
                  textAlign: 'center',
                  py: 0.5,
                  color: 'text.secondary',
                  typography: 'caption',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </Box>
            ))}
            {monthDays.map((date) => {
              const iso = toISODate(date);
              const items = itemsByDate.get(iso) || [];
              const isCurrentMonth = date.getMonth() === month.getMonth();
              const isToday = sameDay(date, today);
              return (
                <DayCell
                  key={iso}
                  date={date}
                  items={items}
                  dim={!isCurrentMonth}
                  today={isToday}
                  onClickItem={(item) => setEditDialog({ open: true, initial: item })}
                  t={t}
                  theme={theme}
                />
              );
            })}
          </Box>

          {itemsThisMonth.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              {t('calendar.emptyMonth')}
            </Typography>
          )}
          {hoursOnlyCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {t('calendar.hoursOnlyHint', { count: hoursOnlyCount })}
            </Typography>
          )}
        </CardContent>
      </Card>

      <EditScheduleDialog
        open={editDialog.open}
        initial={editDialog.initial}
        vesselId={vesselId}
        onClose={() => setEditDialog({ open: false, initial: null })}
      />
    </Reveal>
  );
}

/** ─── Day cell ─────────────────────────────────────────────────────────── */

function DayCell({ date, items, dim, today, onClickItem, t, theme }) {
  const visible = items.slice(0, 2);
  const overflow = items.length - visible.length;
  const tooltip = items.length > 0
    ? items.map((i) => `${t(`types.${i.serviceType}`, { defaultValue: i.serviceType })}`).join(' • ')
    : '';

  return (
    <Tooltip title={tooltip} placement="top" arrow disableHoverListener={!tooltip}>
      <Box
        sx={{
          minHeight: { xs: 60, sm: 80 },
          p: 0.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: today ? 'primary.main' : 'divider',
          bgcolor: dim ? 'action.hover' : 'background.paper',
          opacity: dim ? 0.55 : 1,
          transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
          '&:hover': items.length > 0 ? { boxShadow: 2, transform: 'translateY(-1px)' } : {},
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: today ? 700 : 500,
            color: today ? 'primary.main' : 'text.primary',
            display: 'block',
          }}
        >
          {date.getDate()}
        </Typography>
        <Stack gap={0.25} sx={{ mt: 0.25 }}>
          {visible.map((item) => (
            <ItemChip key={`${item.id}-${item.serviceType}`} item={item} onClick={onClickItem} t={t} />
          ))}
          {overflow > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
              +{overflow}
            </Typography>
          )}
        </Stack>
      </Box>
    </Tooltip>
  );
}

/** ─── Item chip ────────────────────────────────────────────────────────── */

const URGENCY_COLOR = {
  OVERDUE:  'error',
  DUE_SOON: 'warning',
  UPCOMING: 'success',
};

function ItemChip({ item, onClick, t }) {
  const paused = item.status === 'PAUSED';
  const snoozed = !!item.snoozedUntil;
  // Paused items lose their urgency color; snoozed items render dim with
  // strike-through so the user can see "this exists but it's quiet right now".
  const color = paused ? 'default' : URGENCY_COLOR[item.urgency] || 'default';

  return (
    <Chip
      size="small"
      color={color}
      label={t(`types.${item.serviceType}`, { defaultValue: item.serviceType })}
      onClick={() => onClick(item)}
      sx={{
        height: 18,
        fontSize: '0.65rem',
        cursor: 'pointer',
        opacity: snoozed ? 0.45 : 1,
        textDecoration: snoozed ? 'line-through' : 'none',
        '& .MuiChip-label': {
          px: 0.75,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }}
    />
  );
}

/** Date helpers moved to ./calendarMath for unit testing without rendering. */
