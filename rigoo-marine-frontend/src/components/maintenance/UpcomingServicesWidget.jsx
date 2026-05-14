import {
  Card, CardContent, Typography, Stack, Box, Button, Skeleton,
} from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UrgencyChip from './UrgencyChip';
import useUpcomingServices from '../../hooks/maintenance/useUpcomingServices';
import { Reveal } from '../common/Motion';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function UpcomingServicesWidget() {
  const { t } = useTranslation('maintenance');
  const { data, isLoading } = useUpcomingServices();

  if (isLoading) {
    return <Skeleton variant="rounded" height={180} />;
  }
  const items = data || [];

  return (
    <Reveal variant="fade" timeout={500}>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
            <EventAvailableRoundedIcon color="primary" />
            <Typography variant="h6">{t('widget.title')}</Typography>
          </Stack>
          {items.length === 0 ? (
            <Typography color="text.secondary">{t('widget.empty')}</Typography>
          ) : (
            <Stack gap={1}>
              {items.slice(0, 5).map((u, i) => (
                <Box
                  key={`${u.vesselId}-${u.serviceType}-${i}`}
                  component={Link}
                  to={`/dashboard/vessels/${u.vesselId}`}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.25, borderRadius: 1.5, textDecoration: 'none', color: 'inherit',
                    transition: 'background-color 200ms ease',
                    '&:hover': { bgcolor: 'rgba(0,105,148,0.05)' },
                  }}
                >
                  <UrgencyChip urgency={u.urgency} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t(`types.${u.serviceType}`, { defaultValue: u.serviceType })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(u.nextDueDate)}
                      {u.daysUntilDue != null && ` • ${u.daysUntilDue}d`}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
          <Button component={Link} to="/dashboard/vessels" fullWidth sx={{ mt: 1.5 }}>
            {t('widget.viewAll')}
          </Button>
        </CardContent>
      </Card>
    </Reveal>
  );
}
