/* eslint-disable react/prop-types */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Stack, Card, CardContent, CardActions,
  Button, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, CircularProgress, Alert, Tabs, Tab,
  Skeleton, Divider, LinearProgress, InputAdornment,
} from '@mui/material';
import AddRoundedIcon           from '@mui/icons-material/AddRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded';
import CloudUploadRoundedIcon   from '@mui/icons-material/CloudUploadRounded';
import EngineeringIcon          from '@mui/icons-material/Engineering';
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon        from '@mui/icons-material/CancelRounded';
import toast from 'react-hot-toast';
import { adminApi, fileApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';
import { formatPrice } from '../../utils/format';

/* ── Constants ───────────────────────────────────────────────────────────── */

const SERVICE_CATEGORIES = ['Mechanical', 'Structural', 'Cosmetic', 'Renovation', 'Specialized'];

const CATEGORY_COLOR = {
  Mechanical:  'warning',
  Structural:  'info',
  Cosmetic:    'secondary',
  Renovation:  'success',
  Specialized: 'primary',
};

const CATEGORY_IMAGE = {
  Mechanical:  '/services_img/posters/poster-mechanical.png',
  Structural:  '/services_img/posters/poster-structural.png',
  Cosmetic:    '/services_img/posters/poster-cosmetic.png',
  Renovation:  '/services_img/posters/poster-renovation.png',
  Specialized: '/services_img/posters/poster-specialized.png',
};

const LOCAL_POSTERS = [
  { label: 'Mechanical',  src: '/services_img/posters/poster-mechanical.png'  },
  { label: 'Structural',  src: '/services_img/posters/poster-structural.png'  },
  { label: 'Cosmetic',    src: '/services_img/posters/poster-cosmetic.png'    },
  { label: 'Renovation',  src: '/services_img/posters/poster-renovation.png'  },
  { label: 'Specialized', src: '/services_img/posters/poster-specialized.png' },
  { label: 'Overview',    src: '/services_img/posters/poster-overview.png'    },
];

const EMPTY_FORM = {
  name: '', nameAr: '',
  description: '', descriptionAr: '',
  category: '',
  price: '',
  active: true,
  imageUrl: '',
};

/* ── Image upload cell (same pattern as GalleryManagement) ───────────────── */

function ImageUploadCell({ url, onUrl }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only (jpg, png, webp…)'); return; }
    setBusy(true);
    try {
      const data = await fileApi.upload(file, 'service');
      onUrl(data.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <Box
      onClick={() => !busy && fileRef.current?.click()}
      sx={{
        position: 'relative', borderRadius: 2, overflow: 'hidden',
        border: '2px dashed', borderColor: url ? 'transparent' : 'divider',
        bgcolor: url ? 'transparent' : 'action.hover',
        height: 200, cursor: 'pointer', transition: 'border-color .2s',
        '&:hover': { borderColor: url ? 'transparent' : 'primary.main' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {busy && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', bgcolor: 'rgba(0,0,0,.45)', zIndex: 2 }}>
          <CircularProgress size={32} sx={{ color: '#fff' }} />
        </Box>
      )}

      {url ? (
        <>
          <Box component="img" src={url} alt="Service"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <Box sx={{
            position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .2s',
            bgcolor: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            '&:hover': { opacity: 1 },
          }}>
            <Typography variant="caption" color="#fff" fontWeight={700}>Click to replace</Typography>
          </Box>
        </>
      ) : (
        <Stack alignItems="center" spacing={1}>
          <CloudUploadRoundedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled" textAlign="center">
            Service image<br />Click to upload
          </Typography>
        </Stack>
      )}

      <input ref={fileRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handleFile} />
    </Box>
  );
}

/* ── Service card ────────────────────────────────────────────────────────── */

function ServiceCard({ service, onEdit, onDelete, onToggle }) {
  const catColor = CATEGORY_COLOR[service.category] ?? 'default';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderColor: service.active ? 'success.light' : 'divider',
        transition: 'transform .2s, box-shadow .2s, border-color .25s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,.12)' },
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', height: 180, overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0 }}>
        {(() => {
          const src = service.imageUrl || CATEGORY_IMAGE[service.category] || '/services_img/posters/poster-overview.png';
          return (
            <Box component="img" src={src} alt={service.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          );
        })()}

        {/* Active / Inactive badge */}
        <Chip
          label={service.active ? 'Active' : 'Inactive'}
          size="small"
          color={service.active ? 'success' : 'default'}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontWeight: 700, fontSize: 10 }}
        />

        {/* Category badge */}
        {service.category && (
          <Chip
            label={service.category}
            size="small"
            color={catColor}
            variant="filled"
            sx={{
              position: 'absolute', top: 8, left: 8, zIndex: 1,
              fontWeight: 700, fontSize: 10, opacity: 0.9,
            }}
          />
        )}
      </Box>

      <CardContent sx={{ pb: '8px !important', pt: 1.5, flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap mb={0.25}>
          {service.name}
        </Typography>
        {service.nameAr && (
          <Typography variant="caption" color="text.secondary" dir="rtl" display="block" noWrap mb={0.5}>
            {service.nameAr}
          </Typography>
        )}
        {service.description && (
          <Typography variant="caption" color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {service.description}
          </Typography>
        )}
        {service.price != null && (
          <Typography variant="body2" fontWeight={700} color="primary.main" mt={0.75}>
            {formatPrice(service.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
        <Tooltip title={service.active ? 'Deactivate' : 'Activate'}>
          <IconButton size="small" onClick={() => onToggle(service)}
            color={service.active ? 'success' : 'default'}>
            {service.active
              ? <CheckCircleRoundedIcon fontSize="small" />
              : <CancelRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => onEdit(service)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(service)}>
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box flex={1} />
        <Typography variant="caption" color="text.disabled">
          #{service.id}
        </Typography>
      </CardActions>
    </Card>
  );
}

/* ── Create / Edit dialog ─────────────────────────────────────────────────── */

function ServiceDialog({ open, item, onClose, onSave, isSaving }) {
  const [form, setForm] = useState(item ? {
    name:          item.name          ?? '',
    nameAr:        item.nameAr        ?? '',
    description:   item.description   ?? '',
    descriptionAr: item.descriptionAr ?? '',
    category:      item.category      ?? '',
    price:         item.price != null  ? String(item.price) : '',
    active:        item.active        ?? true,
    imageUrl:      item.imageUrl      ?? '',
  } : { ...EMPTY_FORM });

  const [tab, setTab] = useState(0);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSave = form.name.trim() && form.category;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      {isSaving && <LinearProgress sx={{ borderRadius: '12px 12px 0 0' }} />}
      <DialogTitle sx={{ pb: 0, fontWeight: 700 }}>
        {item ? 'Edit Service' : 'New Service'}
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="Content" />
        <Tab label="Image" />
        <Tab label="Settings" />
      </Tabs>
      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>

        {/* ── Content ── */}
        {tab === 0 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Name (English)" fullWidth required
                  value={form.name} onChange={e => set('name', e.target.value)}
                  error={!form.name.trim()}
                  helperText={!form.name.trim() ? 'Required' : ''}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="الاسم (عربي)" fullWidth
                  value={form.nameAr} onChange={e => set('nameAr', e.target.value)}
                  inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Description (English)" fullWidth multiline rows={4}
                  value={form.description} onChange={e => set('description', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="الوصف (عربي)" fullWidth multiline rows={4}
                  value={form.descriptionAr} onChange={e => set('descriptionAr', e.target.value)}
                  inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                />
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* ── Image ── */}
        {tab === 1 && (
          <Stack spacing={2.5}>
            <Typography variant="subtitle2" fontWeight={700}>Preset posters</Typography>
            <Grid container spacing={1.5}>
              {LOCAL_POSTERS.map((p) => {
                const selected = form.imageUrl === p.src;
                return (
                  <Grid size={{ xs: 6, sm: 4 }} key={p.label}>
                    <Box
                      onClick={() => set('imageUrl', p.src)}
                      sx={{
                        position: 'relative', borderRadius: 2, overflow: 'hidden',
                        cursor: 'pointer', height: 110,
                        border: '2px solid',
                        borderColor: selected ? 'primary.main' : 'transparent',
                        boxShadow: selected ? '0 0 0 3px rgba(25,118,210,.25)' : 'none',
                        transition: 'border-color .2s, box-shadow .2s, transform .15s',
                        '&:hover': { transform: 'scale(1.03)' },
                      }}
                    >
                      <Box component="img" src={p.src} alt={p.label}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <Box sx={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        bgcolor: 'rgba(0,0,0,.55)', py: 0.5, px: 1,
                      }}>
                        <Typography variant="caption" color="#fff" fontWeight={600}>{p.label}</Typography>
                      </Box>
                      {selected && (
                        <CheckCircleRoundedIcon sx={{
                          position: 'absolute', top: 6, right: 6, fontSize: 20,
                          color: 'primary.main', bgcolor: '#fff', borderRadius: '50%',
                        }} />
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Divider>or upload a custom image</Divider>

            <ImageUploadCell
              url={LOCAL_POSTERS.some(p => p.src === form.imageUrl) ? '' : form.imageUrl}
              onUrl={url => set('imageUrl', url)}
            />
            {form.imageUrl && (
              <Button
                size="small" color="error" variant="outlined"
                onClick={() => set('imageUrl', '')}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear image
              </Button>
            )}
          </Stack>
        )}

        {/* ── Settings ── */}
        {tab === 2 && (
          <Stack spacing={2.5}>
            <FormControl fullWidth required error={!form.category}>
              <InputLabel>Category</InputLabel>
              <Select value={form.category} label="Category"
                onChange={e => set('category', e.target.value)}>
                {SERVICE_CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
              {!form.category && (
                <Typography variant="caption" color="error" sx={{ mt: .5, ml: 1.75 }}>Required</Typography>
              )}
            </FormControl>

            <TextField
              label="Price"
              type="number"
              fullWidth
              value={form.price}
              onChange={e => set('price', e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">QAR</InputAdornment>,
              }}
              helperText="Leave empty if price varies or is quoted on request."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={e => set('active', e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {form.active ? 'Active' : 'Inactive'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {form.active
                      ? 'Visible and bookable on the platform'
                      : 'Hidden from clients'}
                  </Typography>
                </Box>
              }
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canSave || isSaving}
          onClick={() => onSave({
            ...form,
            price: form.price !== '' ? parseFloat(form.price) : null,
          })}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {item ? 'Save Changes' : 'Create Service'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function ServiceManagement() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCat, setFilterCat]     = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  const { data: rawPages = {}, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'services'],
    queryFn:  () => adminApi.searchServices({ size: 200 }),
  });

  const items = rawPages?.content ?? (Array.isArray(rawPages) ? rawPages : []);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'services'] });

  const createMut = useMutation({
    mutationFn: adminApi.createService,
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success('Service created'); },
    onError:   () => toast.error('Failed to create service'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateService(id, data),
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditItem(null); toast.success('Service updated'); },
    onError:   () => toast.error('Failed to update service'),
  });

  const toggleMut = useMutation({
    mutationFn: (svc) => adminApi.updateService(svc.id, { ...svc, active: !svc.active }),
    onSuccess: invalidate,
    onError:   () => toast.error('Failed to update status'),
  });

  const deleteMut = useMutation({
    mutationFn: adminApi.deleteService,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Service deleted'); },
    onError:   () => toast.error('Failed to delete service'),
  });

  const handleSave = (form) => {
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openEdit = (svc) => { setEditItem(svc); setDialogOpen(true); };
  const openNew  = ()    => { setEditItem(null); setDialogOpen(true); };

  const filtered = items.filter(s => {
    if (filterCat !== 'all' && s.category !== filterCat) return false;
    if (filterActive === 'active'   && !s.active) return false;
    if (filterActive === 'inactive' &&  s.active) return false;
    return true;
  });

  const activeCount   = items.filter(s => s.active).length;
  const inactiveCount = items.length - activeCount;
  const isSaving      = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" useFlexGap gap={1}>
          <Stack spacing={0.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EngineeringIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>Services</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Manage services offered to clients
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={refetch} size="small">
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew}>
              New Service
            </Button>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load services.</Alert>}

      {/* KPI strip */}
      <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap>
        <Chip icon={<CheckCircleRoundedIcon />} label={`${activeCount} active`} color="success" variant="outlined" />
        <Chip label={`${inactiveCount} inactive`} variant="outlined" color="default" />
        <Chip label={`${items.length} total`} variant="outlined" />
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCat} label="Category" onChange={e => setFilterCat(e.target.value)}>
            <MenuItem value="all">All categories</MenuItem>
            {SERVICE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterActive} label="Status" onChange={e => setFilterActive(e.target.value)}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        {(filterCat !== 'all' || filterActive !== 'all') && (
          <Button size="small" onClick={() => { setFilterCat('all'); setFilterActive('all'); }}>
            Clear filters
          </Button>
        )}
        <Typography variant="body2" color="text.disabled" sx={{ ml: 'auto !important' }}>
          {filtered.length} of {items.length} services
        </Typography>
      </Stack>

      {/* Grid */}
      {isLoading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={n}>
              <Skeleton variant="rounded" height={320} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 8 }}>
          <EngineeringIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {items.length === 0 ? 'No services yet' : 'No services match the filters'}
          </Typography>
          {items.length === 0 && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew} sx={{ mt: 1 }}>
              Create your first service
            </Button>
          )}
        </Card>
      ) : (
        <Stagger>
          <Grid container spacing={2.5}>
            {filtered.map(svc => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={svc.id}>
                <ServiceCard
                  service={svc}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={s => toggleMut.mutate(s)}
                />
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <ServiceDialog
          open
          item={editItem}
          onClose={() => { setDialogOpen(false); setEditItem(null); }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete service?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            &quot;<strong>{deleteTarget?.name}</strong>&quot; will be permanently removed.
            Existing work orders referencing this service are not affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate(deleteTarget.id)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
