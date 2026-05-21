import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, IconButton, Chip, Avatar, Skeleton,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, Divider, Tooltip, ToggleButtonGroup, ToggleButton,
  useTheme, useMediaQuery, Fade, Card, CardContent, Grid, Tabs, Tab,
  Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import AddRoundedIcon        from '@mui/icons-material/AddRounded';
import EditOutlinedIcon      from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon     from '@mui/icons-material/DeleteOutline';
import DirectionsBoatIcon    from '@mui/icons-material/DirectionsBoat';
import ArrowBackRoundedIcon  from '@mui/icons-material/ArrowBackRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ViewListRoundedIcon   from '@mui/icons-material/ViewListRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import FolderSpecialRoundedIcon from '@mui/icons-material/FolderSpecialRounded';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';
import GroupsIcon            from '@mui/icons-material/Groups';
import SpeedIcon             from '@mui/icons-material/Speed';
import AnchorIcon            from '@mui/icons-material/Anchor';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import TagRoundedIcon        from '@mui/icons-material/TagRounded';
import ImageRoundedIcon      from '@mui/icons-material/ImageRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { vesselApi, maintenanceApi } from '../../services/api';
import { useAuth }                   from '../../context/AuthContext';
import { HoverLift, Reveal }         from '../../components/common/Motion';
import useVesselDossier              from '../../hooks/maintenance/useVesselDossier';
import VesselOverviewTab             from '../../components/vessel/VesselOverviewTab';
import ServiceHistoryTimeline        from '../../components/maintenance/ServiceHistoryTimeline';
import ServiceScheduleList           from '../../components/maintenance/ServiceScheduleList';
import ServiceScheduleCalendar       from '../../components/maintenance/ServiceScheduleCalendar';
import AddServiceHistoryDialog       from '../../components/maintenance/AddServiceHistoryDialog';
import DocumentVault                 from '../../components/vessel/DocumentVault';
import FuelLogPanel                  from '../../components/vessel/FuelLogPanel';
import TeamRequestTracker            from '../../components/client/TeamRequestTracker';

// ── Constants ──────────────────────────────────────────────────────────────

const FLEET_W = 300;

const VESSEL_TYPES     = ['Motorboat','Sailing Yacht','Motor Yacht','Fishing Boat','PWC / Jet Ski','RIB','Catamaran','Houseboat','Other'];
const HULL_MATERIALS   = ['Fiberglass','Aluminum','Steel','Wood','Composite','Other'];
const ENGINE_TYPES     = ['Inboard','Outboard','Stern Drive','Jet Drive','Sail','Electric','Other'];
const VESSEL_STATUSES  = ['ACTIVE','MAINTENANCE','LAID_UP','SOLD'];

const EMPTY_FORM = {
  name:'', type:'', engineType:'', brand:'', model:'', year:'',
  length:'', hullMaterial:'', registrationNumber:'', status:'ACTIVE', photoUrl:'',
};

const STATUS_COLOR = { ACTIVE:'success', MAINTENANCE:'warning', LAID_UP:'default', SOLD:'error' };

// ── Fleet card (left panel) ────────────────────────────────────────────────

function FleetCard({ vessel, selected, onSelect, onEdit, onDelete }) {
  const theme = useTheme();
  const { t } = useTranslation('dashboard');

  return (
    <HoverLift lift={3}>
      <Box
        onClick={() => onSelect(vessel.id)}
        sx={{
          borderRadius: 2.5,
          border: '1.5px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          bgcolor: selected
            ? theme.palette.mode === 'dark' ? 'rgba(0,105,148,0.18)' : 'rgba(0,105,148,0.06)'
            : 'background.paper',
          p: 1.75,
          cursor: 'pointer',
          transition: 'all 180ms ease',
          boxShadow: selected ? '0 0 0 3px rgba(0,105,148,0.14)' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {selected && (
          <Box sx={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: 'linear-gradient(180deg, #006994, #00bcd4)',
            borderRadius: '3px 0 0 3px',
          }} />
        )}

        <Stack direction="row" alignItems="center" gap={1.5}>
          <Avatar
            src={vessel.photoUrl || undefined}
            sx={{
              width: 44, height: 44, borderRadius: 1.5, flexShrink: 0,
              bgcolor: selected ? 'primary.main' : 'rgba(0,105,148,0.12)',
              border: selected ? '2px solid' : '1.5px solid',
              borderColor: selected ? 'primary.main' : 'divider',
            }}
          >
            <DirectionsBoatIcon sx={{ fontSize: 22, color: selected ? 'white' : 'primary.main' }} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ color: selected ? 'primary.main' : 'text.primary' }}>
              {vessel.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {[vessel.type, vessel.year].filter(Boolean).join(' · ')}
            </Typography>
            {vessel.status && vessel.status !== 'ACTIVE' && (
              <Chip
                label={t(`vessels.status.${vessel.status}`, { defaultValue: vessel.status.replace('_', ' ') })}
                color={STATUS_COLOR[vessel.status] || 'default'}
                size="small"
                sx={{ mt: 0.5, height: 18, fontSize: '0.6rem', fontWeight: 700 }}
              />
            )}
          </Box>

          <Stack direction="row" sx={{ flexShrink: 0, opacity: 0.7 }}>
            <Tooltip title={t('vessels.editTooltip')}>
              <IconButton size="small" onClick={e => { e.stopPropagation(); onEdit(vessel); }}
                sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('vessels.deleteTooltip')}>
              <IconButton size="small" onClick={e => { e.stopPropagation(); onDelete(vessel); }}
                sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </HoverLift>
  );
}

// ── Vessel form dialog ─────────────────────────────────────────────────────

const STATUS_DOT = { ACTIVE: '#4caf50', MAINTENANCE: '#ff9800', LAID_UP: '#9e9e9e', SOLD: '#f44336' };

function SectionLabel({ label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em', fontSize: '0.7rem', whiteSpace: 'nowrap', fontWeight: 700 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Stack>
  );
}

function VesselFormDialog({ open, initial, onClose, onSave, saving }) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgError, setImgError] = useState(false);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (open) { setForm(initial || EMPTY_FORM); setImgError(false); }
  }, [open, initial]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error(t('vessels.form.nameRequired')); return; }
    onSave(form);
  };

  const hasPhoto = form.photoUrl?.startsWith('http') && !imgError;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

      {/* ── Header ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0B1A2E 0%, #1a3050 100%)',
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2, flexShrink: 0,
          bgcolor: 'rgba(0,188,212,0.18)', border: '1.5px solid rgba(0,188,212,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DirectionsBoatIcon sx={{ color: '#00bcd4', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="white" lineHeight={1.2}>
            {isEdit ? t('vessels.form.editTitle') : t('vessels.form.addTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {isEdit ? form.name : t('vessels.form.addTitle')}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3, pt: 2.5 }}>
        <Stack spacing={0}>

          {/* ── Section: Basic Information ── */}
          <SectionLabel label={t('vessels.form.sectionBasic')} />

          {/* Vessel Name — full width */}
          <TextField
            fullWidth label={t('vessels.form.name')} value={form.name}
            onChange={set('name')} sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DirectionsBoatIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t('vessels.form.type')} value={form.type} onChange={set('type')}>
                <MenuItem value=""><em>{t('vessels.form.none')}</em></MenuItem>
                {VESSEL_TYPES.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.brand')} value={form.brand} onChange={set('brand')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.model')} value={form.model} onChange={set('model')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.year')} value={form.year} onChange={set('year')}
                type="number" inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }} />
            </Grid>
          </Grid>

          {/* ── Section: Technical Specs ── */}
          <SectionLabel label={t('vessels.form.sectionSpecs')} />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t('vessels.form.engineType')} value={form.engineType} onChange={set('engineType')}>
                <MenuItem value=""><em>{t('vessels.form.none')}</em></MenuItem>
                {ENGINE_TYPES.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t('vessels.form.hullMaterial')} value={form.hullMaterial} onChange={set('hullMaterial')}>
                <MenuItem value=""><em>{t('vessels.form.none')}</em></MenuItem>
                {HULL_MATERIALS.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.length')} value={form.length}
                onChange={set('length')} type="number" inputProps={{ min: 0 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    <StraightenRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.registration')} value={form.registrationNumber}
                onChange={set('registrationNumber')}
                InputProps={{
                  startAdornment: <InputAdornment position="start">
                    <TagRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>,
                }}
              />
            </Grid>
          </Grid>

          {/* ── Section: Status & Photo ── */}
          <SectionLabel label={t('vessels.form.sectionDetails')} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t('vessels.form.status')} value={form.status} onChange={set('status')}>
                {VESSEL_STATUSES.map(s => (
                  <MenuItem key={s} value={s}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_DOT[s], flexShrink: 0 }} />
                      <span>{t(`vessels.status.${s}`)}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('vessels.form.photoUrl')} value={form.photoUrl}
                onChange={(e) => { set('photoUrl')(e); setImgError(false); }}
                placeholder={t('vessels.form.photoUrlPlaceholder')}
                InputProps={{
                  startAdornment: <InputAdornment position="start">
                    <ImageRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>,
                }}
              />
            </Grid>

            {/* Photo preview */}
            {hasPhoto && (
              <Grid item xs={12}>
                <Box sx={{
                  borderRadius: 2, overflow: 'hidden', height: 140,
                  border: '1px solid', borderColor: 'divider', position: 'relative',
                }}>
                  <Box component="img" src={form.photoUrl} alt="preview"
                    onError={() => setImgError(true)}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Box sx={{
                    position: 'absolute', top: 8, right: 8,
                    bgcolor: 'rgba(0,0,0,0.45)', borderRadius: 1, px: 1, py: 0.25,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: 'white', fontSize: '0.68rem' }}>Preview</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
          {t('vessels.form.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}
          sx={{ borderRadius: 2, px: 3 }}>
          {isEdit ? t('vessels.form.save') : t('vessels.form.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────

function DeleteVesselDialog({ vessel, onClose, onConfirm, deleting }) {
  const { t } = useTranslation('dashboard');
  return (
    <Dialog open={!!vessel} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{t('vessels.deleteDialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('vessels.deleteDialog.confirm', { name: vessel?.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit">{t('vessels.deleteDialog.cancel')}</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={deleting}
          startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
          {t('vessels.deleteDialog.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Vessel dossier (right panel) ───────────────────────────────────────────

function VesselDossier({ vesselId, vessel, onBack }) {
  const { t: tm, i18n } = useTranslation('maintenance');
  const { t }           = useTranslation('dashboard');
  const [tab, setTab]             = useState(0);
  const [scheduleView, setScheduleView] = useState('list');
  const [addOpen, setAddOpen]     = useState(false);
  const [exporting, setExporting] = useState(false);

  const dossier = useVesselDossier(vesselId);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await maintenanceApi.downloadDossierPdf(vesselId, i18n.language || 'en');
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `vessel-${vesselId}-maintenance.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (dossier.isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={240} height={44} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={280} />
      </Box>
    );
  }

  const d = dossier.data || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Dossier header ── */}
      <Box sx={{
        px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 }, pb: 0,
        background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
        color: 'white',
        flexShrink: 0,
      }}>
        <Stack direction="row" alignItems="center" gap={1.5} mb={1.5}>
          {onBack && (
            <IconButton onClick={onBack} size="small" sx={{ color: 'rgba(255,255,255,0.8)', mr: 0.5 }}>
              <ArrowBackRoundedIcon />
            </IconButton>
          )}

          <Avatar
            src={vessel?.photoUrl || undefined}
            sx={{ width: 52, height: 52, borderRadius: 2, border: '2px solid rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.15)' }}
          >
            <DirectionsBoatIcon sx={{ fontSize: 28 }} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} color="white" noWrap>
              {vessel?.name || `Vessel #${vesselId}`}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              {vessel?.type && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{vessel.type}</Typography>}
              {vessel?.year && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>· {vessel.year}</Typography>}
              {vessel?.status && (
                <Chip
                  label={t(`vessels.status.${vessel.status}`, { defaultValue: vessel.status.replace('_', ' ') })}
                  size="small"
                  color={STATUS_COLOR[vessel.status] || 'default'}
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                />
              )}
            </Stack>
          </Box>

          <Stack direction="row" gap={1}>
            <Tooltip title={t('vessels.exportPdf')}>
              <IconButton size="small" onClick={handleExportPdf} disabled={exporting}
                sx={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                {exporting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <PictureAsPdfRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setAddOpen(true)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', textTransform: 'none',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              {t('vessels.addService')}
            </Button>
          </Stack>
        </Stack>

        {!dossier.isLoading && d.currentEngineHours != null && (
          <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
            <SpeedIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('vessels.engineHours', { hours: d.currentEngineHours?.toLocaleString() })}
            </Typography>
          </Stack>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#00bcd4', height: 3 },
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.55)', fontWeight: 500, fontSize: '0.78rem',
              textTransform: 'none', minHeight: 44, px: 2,
              '&.Mui-selected': { color: 'white', fontWeight: 700 },
            },
          }}
        >
          <Tab label={t('vessels.tabs.overview')} />
          <Tab label={t('vessels.tabs.maintenance')} />
          <Tab label={t('vessels.tabs.schedule')} />
          <Tab label={t('vessels.tabs.team')} icon={<GroupsIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
          <Tab label={t('vessels.tabs.documents')} icon={<FolderSpecialRoundedIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
          <Tab label={t('vessels.tabs.fuelLog')} icon={<LocalGasStationRoundedIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── Tab content ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>

        {tab === 0 && (
          <Fade in timeout={300}>
            <Box>
              <VesselOverviewTab vessel={vessel} vesselId={vesselId} dossier={d} />
            </Box>
          </Fade>
        )}

        {tab === 1 && (
          <Fade in timeout={300}>
            <Box>
              <ServiceHistoryTimeline vesselId={vesselId} records={d.recentHistory} />
            </Box>
          </Fade>
        )}

        {tab === 2 && (
          <Fade in timeout={300}>
            <Box>
              <Stack direction="row" justifyContent="flex-end" mb={2}>
                <ToggleButtonGroup size="small" value={scheduleView} exclusive
                  onChange={(_, v) => v && setScheduleView(v)}>
                  <ToggleButton value="list">
                    <ViewListRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('vessels.schedule.listView')}
                  </ToggleButton>
                  <ToggleButton value="calendar">
                    <CalendarMonthRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('vessels.schedule.calendarView')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              {scheduleView === 'list'
                ? <ServiceScheduleList vesselId={vesselId} schedule={d.schedule} />
                : <ServiceScheduleCalendar vesselId={vesselId} schedule={d.schedule} />}
            </Box>
          </Fade>
        )}

        {tab === 3 && <TeamRequestTracker active={tab === 3} />}
        {tab === 4 && <DocumentVault vesselId={vesselId} />}
        {tab === 5 && <FuelLogPanel vesselId={vesselId} />}
      </Box>

      <AddServiceHistoryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        vesselId={vesselId}
      />
    </Box>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyDossier({ onAdd, hasVessels }) {
  const { t } = useTranslation('dashboard');
  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', p: 6, textAlign: 'center',
    }}>
      <Box sx={{
        width: 80, height: 80, borderRadius: '50%', mb: 2.5,
        bgcolor: 'rgba(0,105,148,0.08)', border: '2px dashed',
        borderColor: 'rgba(0,105,148,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AnchorIcon sx={{ fontSize: 36, color: 'primary.light', opacity: 0.6 }} />
      </Box>
      <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
        {hasVessels ? t('vessels.selectPrompt') : t('vessels.noVesselsYet')}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 300 }}>
        {hasVessels ? t('vessels.selectHint') : t('vessels.noVesselsHint')}
      </Typography>
      {!hasVessels && (
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAdd}>
          {t('vessels.addFirst')}
        </Button>
      )}
    </Box>
  );
}

// ── VesselsPage ────────────────────────────────────────────────────────────

export default function VesselsPage() {
  const { user }       = useAuth();
  const queryClient    = useQueryClient();
  const theme          = useTheme();
  const isMobile       = useMediaQuery(theme.breakpoints.down('md'));
  const { t }          = useTranslation('dashboard');

  const [selectedId,  setSelectedId]  = useState(null);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [mobileView,  setMobileView]  = useState('list');

  const { data: vessels = [], isLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn:  vesselApi.getMyVessels,
    enabled:  !!user?.id,
  });

  const selectedVessel = vessels.find(v => v.id === selectedId) || null;

  const addMutation = useMutation({
    mutationFn: (data) => vesselApi.createVessel({ ...data, clientId: user?.id }),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['vessels'] }); setFormOpen(false); toast.success(t('vessels.toast.added')); },
    onError:    (e) => toast.error(e.response?.data?.message || t('vessels.toast.addFailed')),
  });

  const editMutation = useMutation({
    mutationFn: (data) => vesselApi.updateVessel(editTarget.id, data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['vessels'] }); setEditTarget(null); toast.success(t('vessels.toast.updated')); },
    onError:    (e) => toast.error(e.response?.data?.message || t('vessels.toast.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => vesselApi.deleteVessel(deleteTarget.id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      toast.success(t('vessels.toast.deleted'));
    },
    onError: (e) => toast.error(e.response?.data?.message || t('vessels.toast.deleteFailed')),
  });

  const handleSelect = (id) => {
    setSelectedId(id);
    if (isMobile) setMobileView('detail');
  };

  const handleBack = () => setMobileView('list');
  const handleEdit = (v) => { setEditTarget({ ...v }); };
  const handleDelete = (v) => setDeleteTarget(v);

  // ── Mobile layout ──

  if (isMobile) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {mobileView === 'list' || !selectedId ? (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0B1A2E' }}>
                {t('vessels.title')}
              </Typography>
              <Button size="small" variant="contained" startIcon={<AddRoundedIcon />}
                onClick={() => setFormOpen(true)}>
                {t('vessels.addVessel')}
              </Button>
            </Stack>
            {isLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5, borderRadius: 2.5 }} />)
              : vessels.length === 0
                ? <EmptyDossier onAdd={() => setFormOpen(true)} hasVessels={false} />
                : vessels.map(v => (
                    <Box key={v.id} sx={{ mb: 1.25 }}>
                      <FleetCard vessel={v} selected={selectedId === v.id}
                        onSelect={handleSelect} onEdit={handleEdit} onDelete={handleDelete} />
                    </Box>
                  ))
            }
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column',
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            overflow: 'hidden', bgcolor: 'background.paper', minHeight: '80vh' }}>
            <VesselDossier vesselId={selectedId} vessel={selectedVessel} onBack={handleBack} />
          </Box>
        )}

        <VesselFormDialog open={formOpen || !!editTarget} initial={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
          onSave={editTarget ? editMutation.mutate : addMutation.mutate}
          saving={addMutation.isPending || editMutation.isPending} />
        <DeleteVesselDialog vessel={deleteTarget} onClose={() => setDeleteTarget(null)}
          onConfirm={deleteMutation.mutate} deleting={deleteMutation.isPending} />
      </Box>
    );
  }

  // ── Desktop two-panel layout ──

  return (
    <Box sx={{ display: 'flex', gap: 2.5, flex: 1, minHeight: 0, alignItems: 'stretch' }}>

      {/* ── Left: Fleet panel ── */}
      <Box sx={{
        width: FLEET_W, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Box sx={{
          px: 2.5, py: 2,
          background: 'linear-gradient(135deg, #0B1A2E 0%, #1a3050 100%)',
          flexShrink: 0,
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'white', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                {t('vessels.title')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                {t('vessels.count', { count: vessels.length })}
              </Typography>
            </Box>
            <Tooltip title={t('vessels.addVessel')}>
              <IconButton size="small" onClick={() => setFormOpen(true)}
                sx={{
                  bgcolor: 'rgba(0,188,212,0.2)', color: '#00bcd4', border: '1px solid rgba(0,188,212,0.35)',
                  '&:hover': { bgcolor: 'rgba(0,188,212,0.35)' },
                }}>
                <AddRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.12)', borderRadius: 2 } }}>
          {isLoading
            ? Array(4).fill(0).map((_, i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1, borderRadius: 2.5 }} />)
            : vessels.map(v => (
                <Box key={v.id} sx={{ mb: 1 }}>
                  <FleetCard vessel={v} selected={selectedId === v.id}
                    onSelect={handleSelect} onEdit={handleEdit} onDelete={handleDelete} />
                </Box>
              ))
          }
          {!isLoading && vessels.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DirectionsBoatIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.disabled">{t('vessels.noVessels')}</Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setFormOpen(true)}>{t('vessels.addOne')}</Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Right: Dossier panel ── */}
      <Box sx={{
        flex: 1, minWidth: 0,
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '1px solid',
        borderColor: selectedId ? 'divider' : 'transparent',
        overflow: 'hidden',
        boxShadow: selectedId ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {selectedId
          ? <VesselDossier vesselId={selectedId} vessel={selectedVessel} onBack={null} />
          : <EmptyDossier onAdd={() => setFormOpen(true)} hasVessels={vessels.length > 0} />
        }
      </Box>

      <VesselFormDialog open={formOpen || !!editTarget} initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={editTarget ? editMutation.mutate : addMutation.mutate}
        saving={addMutation.isPending || editMutation.isPending} />
      <DeleteVesselDialog vessel={deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMutation.mutate} deleting={deleteMutation.isPending} />
    </Box>
  );
}
