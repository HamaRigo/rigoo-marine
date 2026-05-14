import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Button, Stack, Skeleton, Alert, Card, CardContent, Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { vesselApi } from '../../services/api';
import useVesselDossier from '../../hooks/maintenance/useVesselDossier';
import EngineHoursCard from '../../components/maintenance/EngineHoursCard';
import ServiceHistoryTimeline from '../../components/maintenance/ServiceHistoryTimeline';
import ServiceScheduleList from '../../components/maintenance/ServiceScheduleList';
import AddServiceHistoryDialog from '../../components/maintenance/AddServiceHistoryDialog';
import { Reveal } from '../../components/common/Motion';

/**
 * Tabbed dossier page for one vessel. Info tab pulls the vessel-service DTO;
 * History + Schedule tabs derive from a single maintenance dossier fetch.
 * Adding a service entry refreshes both tabs through query invalidation.
 */
export default function MyVesselDetail() {
  const { id } = useParams();
  const vesselId = Number(id);
  const navigate = useNavigate();
  const { t } = useTranslation('maintenance');
  const [tab, setTab] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const { data: vessel } = useQuery({
    queryKey: ['vessel', vesselId],
    queryFn: () => vesselApi.getVesselById(vesselId),
    enabled: !!vesselId,
  });
  const dossier = useVesselDossier(vesselId);

  if (dossier.isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={260} height={48} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }
  if (dossier.error) {
    const code = dossier.error.response?.data?.errorCode;
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/vessels')}>
          {t('page.back')}
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {code ? t(`errors.${code}`, { defaultValue: dossier.error.message }) : dossier.error.message}
        </Alert>
      </Box>
    );
  }

  const d = dossier.data;

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
        <Button
          component={Link}
          to="/dashboard/vessels"
          startIcon={<ArrowBackIcon />}
          size="small"
        >
          {t('page.back')}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          {t('history.add')}
        </Button>
      </Stack>

      <Reveal variant="fade" timeout={420}>
        <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
          <DirectionsBoatIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h4">
            {t('page.title', { name: vessel?.name ?? `#${vesselId}` })}
          </Typography>
        </Stack>
      </Reveal>

      <Box sx={{ mb: 3 }}>
        <EngineHoursCard
          vesselId={vesselId}
          currentEngineHours={d.currentEngineHours}
          engineHoursUpdatedAt={d.engineHoursUpdatedAt}
          unavailable={d.engineHoursUnavailable}
        />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label={t('tabs.info')} />
        <Tab label={t('tabs.history')} />
        <Tab label={t('tabs.schedule')} />
      </Tabs>

      {tab === 0 && vessel && (
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              {[
                ['Type', vessel.type],
                ['Engine', vessel.engineType],
                ['Brand', vessel.brand],
                ['Model', vessel.model],
                ['Year', vessel.year],
                ['Length', vessel.length],
                ['Hull', vessel.hullMaterial],
                ['Reg #', vessel.registrationNumber],
              ].map(([label, value]) => (
                <Grid item xs={6} sm={4} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value || '—'}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <ServiceHistoryTimeline
          vesselId={vesselId}
          records={d.recentHistory}
        />
      )}

      {tab === 2 && (
        <ServiceScheduleList vesselId={vesselId} schedule={d.schedule} />
      )}

      <AddServiceHistoryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        vesselId={vesselId}
        suggestedHours={d.currentEngineHours ?? ''}
      />
    </Box>
  );
}
