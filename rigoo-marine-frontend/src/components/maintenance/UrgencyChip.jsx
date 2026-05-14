import { Chip } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { useTranslation } from 'react-i18next';

const URGENCY_STYLES = {
  OVERDUE:  { color: 'error',   Icon: WarningAmberRoundedIcon },
  DUE_SOON: { color: 'warning', Icon: ScheduleRoundedIcon },
  UPCOMING: { color: 'success', Icon: EventAvailableRoundedIcon },
};

export default function UrgencyChip({ urgency, size = 'small' }) {
  const { t } = useTranslation('maintenance');
  if (!urgency) return null;
  const { color, Icon } = URGENCY_STYLES[urgency] || URGENCY_STYLES.UPCOMING;
  return (
    <Chip
      size={size}
      color={color}
      icon={<Icon />}
      label={t(`schedule.status.${urgency.toLowerCase()}`)}
      sx={{ fontWeight: 600 }}
    />
  );
}
