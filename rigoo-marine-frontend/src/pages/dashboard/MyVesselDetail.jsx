import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Button, Stack, Skeleton, Alert, Card, CardContent, Grid,
  ToggleButtonGroup, ToggleButton, Chip, Avatar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AddIcon from '@mui/icons-material/Add';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { vesselApi, maintenanceApi } from '../../services/api';
import useVesselDossier from '../../hooks/maintenance/useVesselDossier';
import EngineHoursCard from '../../components/maintenance/EngineHoursCard';
import ServiceHistoryTimeline from '../../components/maintenance/ServiceHistoryTimeline';
import ServiceScheduleList from '../../components/maintenance/ServiceScheduleList';
import ServiceScheduleCalendar from '../../components/maintenance/ServiceScheduleCalendar';
import AddServiceHistoryDialog from '../../components/maintenance/AddServiceHistoryDialog';
import DocumentVault from '../../components/vessel/DocumentVault';
import FuelLogPanel from '../../components/vessel/FuelLogPanel';
import { Reveal } from '../../components/common/Motion';
import TeamRequestTracker from '../../components/client/TeamRequestTracker';
import GroupsIcon from '@mui/icons-material/Groups';
import FolderSpecialRoundedIcon from '@mui/icons-material/FolderSpecialRounded';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';

/**
 * Tabbed dossier page for one vessel. Info tab pulls the vessel-service DTO;
 * History + Schedule tabs derive from a single maintenance dossier fetch.
 * Adding a service entry refreshes both tabs through query invalidation.
 */
export default function MyVesselDetail() {
  const { id } = useParams();
  const vesselId = Number(id);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('maintenance');
  const [tab, setTab] = useState(0);
  const [scheduleView, setScheduleView] = useState('list');
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * Triggers a browser save of the maintenance dossier PDF. The backend ships
   * the binary with Content-Disposition: attachment, but we still create the
   * blob URL + temporary anchor because some browsers ignore the header on
   * Ajax responses. Filename matches the server-side default but stays
   * controlled here so the locale param is reflected in what the user sees.
   */
  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await maintenanceApi.downloadDossierPdf(vesselId, i18n.language || 'en');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vessel-${vesselId}-maintenance.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const code = err.response?.data?.errorCode;
      toast.error(code ? t(`errors.${code}`, { defaultValue: err.message }) : err.message);
    } finally {
      setExporting(false);
    }
  };

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
          variant="outlined"
          startIcon={<PictureAsPdfRoundedIcon />}
          onClick={handleExportPdf}
          disabled={exporting}
        >
          {t('pdf.export')}
        </Button>
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
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label={t('tabs.info')} />
        <Tab label={t('tabs.history')} />
        <Tab label={t('tabs.schedule')} />
        <Tab
          label={t('tabs.teamRequests')}
          icon={<GroupsIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minHeight: 48 }}
        />
        <Tab
          label="Documents"
          icon={<FolderSpecialRoundedIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minHeight: 48 }}
        />
        <Tab
          label="Fuel Log"
          icon={<LocalGasStationRoundedIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minHeight: 48 }}
        />
      </Tabs>

      {tab === 0 && vessel && (
        <Card>
          <CardContent>
            {/* Status + photo row */}
            <Stack direction="row" alignItems="center" spacing={2} mb={2.5}>
              {vessel.photoUrl ? (
                <Avatar
                  src={vessel.photoUrl}
                  alt={vessel.name}
                  sx={{ width: 64, height: 64, borderRadius: 2 }}
                />
              ) : (
                <Avatar sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'primary.main' }}>
                  <DirectionsBoatIcon />
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{vessel.name}</Typography>
                {vessel.status && (
                  <Chip
                    size="small"
                    label={vessel.status.replace('_', ' ')}
                    color={
                      vessel.status === 'ACTIVE' ? 'success'
                      : vessel.status === 'MAINTENANCE' ? 'warning'
                      : vessel.status === 'LAID_UP' ? 'default'
                      : 'error'
                    }
                    sx={{ mt: 0.5, fontWeight: 600, fontSize: '0.68rem' }}
                  />
                )}
              </Box>
            </Stack>

            <Grid container spacing={2}>
              {[
                ['Type', vessel.type],
                ['Engine', vessel.engineType],
                ['Brand', vessel.brand],
                ['Model', vessel.model],
                ['Year', vessel.year],
                ['Length', vessel.length ? `${vessel.length} ft` : null],
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
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={1.5}>
            <ToggleButtonGroup
              size="small"
              value={scheduleView}
              exclusive
              onChange={(_, v) => v && setScheduleView(v)}
              aria-label="schedule view mode"
            >
              <ToggleButton value="list" aria-label={t('schedule.view.list')}>
                <ViewListRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t('schedule.view.list')}
              </ToggleButton>
              <ToggleButton value="calendar" aria-label={t('schedule.view.calendar')}>
                <CalendarMonthRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t('schedule.view.calendar')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          {scheduleView === 'list'
            ? <ServiceScheduleList vesselId={vesselId} schedule={d.schedule} />
            : <ServiceScheduleCalendar vesselId={vesselId} schedule={d.schedule} />}
        </Box>
      )}

      {tab === 3 && (
        <TeamRequestTracker active={tab === 3} />
      )}

      {tab === 4 && (
        <DocumentVault vesselId={vesselId} />
      )}

      {tab === 5 && (
        <FuelLogPanel vesselId={vesselId} />
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
