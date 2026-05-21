import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Button, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, MenuItem, Chip, Stack, Skeleton, Divider, IconButton,
  Tooltip, InputAdornment, useTheme, useMediaQuery, Collapse, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SpeedIcon from '@mui/icons-material/Speed';
import AnchorIcon from '@mui/icons-material/Anchor';
import toast from 'react-hot-toast';
import { vesselApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Stagger, HoverLift, Reveal } from '../../components/common/Motion';

// ── Constants ──────────────────────────────────────────────────────────────

const VESSEL_TYPES = ['Motorboat', 'Sailing Yacht', 'Motor Yacht', 'Fishing Boat',
  'PWC / Jet Ski', 'RIB', 'Catamaran', 'Houseboat', 'Other'];
const HULL_MATERIALS = ['Fiberglass', 'Aluminum', 'Steel', 'Wood', 'Composite', 'Other'];
const ENGINE_TYPES   = ['Inboard', 'Outboard', 'Stern Drive', 'Jet Drive', 'Sail', 'Electric', 'Other'];

const VESSEL_STATUSES = ['ACTIVE', 'MAINTENANCE', 'LAID_UP', 'SOLD'];

const EMPTY_FORM = {
  name: '', type: '', engineType: '', brand: '',
  model: '', year: '', length: '', hullMaterial: '', registrationNumber: '',
  status: 'ACTIVE', photoUrl: '',
};

// ── Vessel Card ────────────────────────────────────────────────────────────

function VesselCard({ vessel, onEdit, onDelete }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const specs = [
    { label: 'Brand',    value: vessel.brand },
    { label: 'Model',    value: vessel.model },
    { label: 'Year',     value: vessel.year },
    { label: 'Length',   value: vessel.length ? `${vessel.length} ft` : null },
    { label: 'Engine',   value: vessel.engineType },
    { label: 'Hull',     value: vessel.hullMaterial },
  ].filter(s => s.value);

  return (
    <HoverLift lift={5}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderColor: 'divider',
        }}
      >
        {/* ── Hero band ── */}
        <Box
          sx={{
            background: isDark
              ? 'linear-gradient(135deg, #0a2540 0%, #003356 100%)'
              : 'linear-gradient(135deg, #006994 0%, #004263 100%)',
            px: 2.5, pt: 2.5, pb: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* decorative wave */}
          <Box sx={{
            position: 'absolute', bottom: -1, left: 0, right: 0, height: 24,
            bgcolor: 'background.paper',
            clipPath: 'ellipse(60% 100% at 50% 100%)',
          }} />

          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} mb={1}>
                <Chip
                  label={vessel.type || 'Vessel'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.18)', color: 'white',
                    fontWeight: 600, fontSize: '0.68rem',
                  }}
                />
                {vessel.status && vessel.status !== 'ACTIVE' && (
                  <Chip
                    size="small"
                    label={vessel.status.replace('_', ' ')}
                    sx={{
                      fontWeight: 600, fontSize: '0.68rem',
                      bgcolor: vessel.status === 'MAINTENANCE' ? 'rgba(255,167,38,0.85)'
                        : vessel.status === 'LAID_UP' ? 'rgba(255,255,255,0.22)'
                        : 'rgba(229,57,53,0.85)',
                      color: 'white',
                    }}
                  />
                )}
              </Stack>
              <Typography variant="h6" fontWeight={700} color="white" lineHeight={1.2} noWrap>
                {vessel.name}
              </Typography>
              {vessel.registrationNumber && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', mt: 0.4, display: 'block' }}>
                  Reg. {vessel.registrationNumber}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0, ml: 1,
              }}
            >
              {vessel.photoUrl ? (
                <Box
                  component="img"
                  src={vessel.photoUrl}
                  alt={vessel.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <DirectionsBoatIcon sx={{ color: 'white', fontSize: 26 }} />
              )}
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ flex: 1, pt: 2 }}>
          {/* Engine hours badge */}
          {vessel.currentEngineHours != null && (
            <Stack direction="row" spacing={0.75} alignItems="center" mb={1.5}>
              <SpeedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {Number(vessel.currentEngineHours).toLocaleString()} engine hrs
              </Typography>
            </Stack>
          )}

          {/* Spec grid */}
          {specs.length > 0 && (
            <Grid container spacing={1}>
              {specs.map(({ label, value }) => (
                <Grid item xs={6} key={label}>
                  <Typography variant="caption" color="text.disabled" display="block">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          )}

          {specs.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              No specs added yet.
            </Typography>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ px: 2, py: 1.25, gap: 0.5 }}>
          <Button
            component={Link}
            to={`/dashboard/vessels/${vessel.id}`}
            variant="contained"
            size="small"
            startIcon={<AnchorIcon />}
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            View Dossier
          </Button>
          <Tooltip title="Edit vessel">
            <IconButton size="small" onClick={() => onEdit(vessel)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete vessel">
            <IconButton size="small" color="error" onClick={() => onDelete(vessel)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    </HoverLift>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────

function VesselCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={110} />
      <CardContent>
        <Skeleton width="60%" height={20} sx={{ mb: 1 }} />
        <Grid container spacing={1}>
          {[1,2,3,4].map(i => (
            <Grid item xs={6} key={i}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={18} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
      <Divider />
      <CardActions sx={{ px: 2, py: 1.25 }}>
        <Skeleton variant="rounded" width={120} height={32} sx={{ flexGrow: 1 }} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </CardActions>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <Reveal variant="fade">
      <Box
        sx={{
          textAlign: 'center', py: 10,
          background: 'radial-gradient(ellipse at center, rgba(0,105,148,0.05) 0%, transparent 70%)',
          borderRadius: 4,
        }}
      >
        <Box
          sx={{
            width: 96, height: 96, borderRadius: '50%', mx: 'auto', mb: 3,
            background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,105,148,0.25)',
            animation: 'rmFloat 4s ease-in-out infinite',
          }}
        >
          <DirectionsBoatIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          No vessels yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          Add your first vessel to access maintenance dossiers, service history, and team request tracking.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{ px: 4 }}
        >
          Add My First Vessel
        </Button>
      </Box>
    </Reveal>
  );
}

// ── Vessel Form Dialog ─────────────────────────────────────────────────────

function VesselFormDialog({ open, onClose, onSubmit, initial, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [error, setError]   = useState('');
  const isEdit = !!initial?.id;

  // Sync when editing a different vessel
  useState(() => { setForm(initial ?? EMPTY_FORM); setError(''); }, [initial]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim())  return setError('Vessel name is required.');
    if (!form.type.trim())  return setError('Vessel type is required.');
    setError('');
    onSubmit(form);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
        {isEdit ? `Edit — ${initial?.name}` : 'Add New Vessel'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Collapse in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        </Collapse>

        <Grid container spacing={2}>
          {/* Row 1 */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth label="Vessel Name" value={form.name}
              onChange={set('name')} required
              placeholder="e.g. Blue Horizon"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Type" value={form.type}
              onChange={set('type')} required
            >
              {VESSEL_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Row 2 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Brand" value={form.brand}
              onChange={set('brand')} placeholder="e.g. Sunseeker, Azimut"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Model" value={form.model}
              onChange={set('model')} placeholder="e.g. Manhattan 66"
            />
          </Grid>

          {/* Row 3 */}
          <Grid item xs={6} sm={4}>
            <TextField
              fullWidth label="Year" value={form.year}
              onChange={set('year')} placeholder="e.g. 2019"
              type="number" inputProps={{ min: 1950, max: new Date().getFullYear() + 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              fullWidth label="Length" value={form.length}
              onChange={set('length')}
              InputProps={{ endAdornment: <InputAdornment position="end">ft</InputAdornment> }}
              type="number" inputProps={{ min: 1, max: 500 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Hull Material" value={form.hullMaterial}
              onChange={set('hullMaterial')}
            >
              <MenuItem value="">—</MenuItem>
              {HULL_MATERIALS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Row 4 */}
          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth label="Engine Type" value={form.engineType}
              onChange={set('engineType')}
            >
              <MenuItem value="">—</MenuItem>
              {ENGINE_TYPES.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Registration Number" value={form.registrationNumber}
              onChange={set('registrationNumber')} placeholder="e.g. QA-0001"
            />
          </Grid>

          {/* Row 5 */}
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Status" value={form.status}
              onChange={set('status')}
            >
              {VESSEL_STATUSES.map(s => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth label="Photo URL" value={form.photoUrl}
              onChange={set('photoUrl')} placeholder="https://…"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ minWidth: 110 }}
        >
          {loading ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Vessel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────

function DeleteDialog({ vessel, open, onClose, onConfirm, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Delete vessel?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Remove <strong>{vessel?.name}</strong> and all its maintenance records permanently? This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function MyVessels() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);  // vessel being edited
  const [deleteTarget, setDeleteTarget] = useState(null); // vessel being deleted

  const { data: vessels = [], isLoading } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn: vesselApi.getMyVessels,
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vessels', 'my'] });

  const createMutation = useMutation({
    mutationFn: vesselApi.create,
    onSuccess: () => { invalidate(); setFormOpen(false); toast.success('Vessel added'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to add vessel'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vesselApi.update(id, data),
    onSuccess: () => { invalidate(); setEditTarget(null); toast.success('Vessel updated'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to update vessel'),
  });

  const deleteMutation = useMutation({
    mutationFn: vesselApi.delete,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Vessel deleted'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to delete vessel'),
  });

  const handleCreate = (form) => createMutation.mutate({ ...form, clientId: user?.id });
  const handleUpdate = (form) => updateMutation.mutate({ id: editTarget.id, data: { ...form, clientId: user?.id } });
  const handleDeleteConfirm = () => deleteMutation.mutate(deleteTarget.id);

  return (
    <Box>
      {/* ── Header ── */}
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={700}>My Vessels</Typography>
            {!isLoading && vessels.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {vessels.length} vessel{vessels.length !== 1 ? 's' : ''} registered
              </Typography>
            )}
          </Box>
          {vessels.length > 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Add Vessel
            </Button>
          )}
        </Stack>
      </Reveal>

      {/* ── Skeletons ── */}
      {isLoading && (
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <VesselCardSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Empty state ── */}
      {!isLoading && vessels.length === 0 && (
        <EmptyState onAdd={() => setFormOpen(true)} />
      )}

      {/* ── Vessel grid ── */}
      {!isLoading && vessels.length > 0 && (
        <Stagger step={80}>
          <Grid container spacing={3}>
            {vessels.map(vessel => (
              <Grid item xs={12} sm={6} md={4} key={vessel.id}>
                <VesselCard
                  vessel={vessel}
                  onEdit={v => setEditTarget(v)}
                  onDelete={v => setDeleteTarget(v)}
                />
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      {/* ── Add dialog ── */}
      <VesselFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        initial={null}
        loading={createMutation.isPending}
      />

      {/* ── Edit dialog ── */}
      <VesselFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        initial={editTarget}
        loading={updateMutation.isPending}
      />

      {/* ── Delete dialog ── */}
      <DeleteDialog
        vessel={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
