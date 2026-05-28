/* eslint-disable react/prop-types */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Stack, Card, CardContent, CardActions,
  Button, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, CircularProgress, Alert, Tabs, Tab,
  Skeleton, Divider, LinearProgress,
} from '@mui/material';
import AddRoundedIcon           from '@mui/icons-material/AddRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded';
import PublishRoundedIcon       from '@mui/icons-material/PublishRounded';
import UnpublishedRoundedIcon   from '@mui/icons-material/UnpublishedRounded';
import CloudUploadRoundedIcon   from '@mui/icons-material/CloudUploadRounded';
import CompareRoundedIcon       from '@mui/icons-material/CompareRounded';
import VisibilityRoundedIcon    from '@mui/icons-material/VisibilityRounded';
import ImageNotSupportedRoundedIcon from '@mui/icons-material/ImageNotSupportedRounded';
import toast from 'react-hot-toast';
import { adminApi, fileApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';

/* ── Constants ──────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { value: 'detailing',     label: 'Boat Detailing' },
  { value: 'hull_cleaning', label: 'Hull Cleaning' },
  { value: 'engine_repair', label: 'Engine Repair' },
  { value: 'painting',      label: 'Painting' },
  { value: 'restoration',   label: 'Restoration' },
  { value: 'other',         label: 'Other' },
];

const CATEGORY_COLOR = {
  detailing:     'primary',
  hull_cleaning: 'info',
  engine_repair: 'warning',
  painting:      'secondary',
  restoration:   'success',
  other:         'default',
};

const EMPTY_FORM = {
  title: '', titleAr: '',
  description: '', descriptionAr: '',
  category: 'detailing',
  beforeUrl: '', afterUrl: '',
  displayOrder: 0,
  published: false,
};

/* ── Image upload cell ───────────────────────────────────────────────────── */
function ImageUploadCell({ label, url, onUrl }) {
  const fileRef  = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only (jpg, png, webp…)'); return; }
    setBusy(true);
    try {
      const data = await fileApi.upload(file, 'gallery');
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
        height: 180, cursor: 'pointer', transition: 'border-color .2s',
        '&:hover': { borderColor: url ? 'transparent' : 'primary.main' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {busy && (
        <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
          justifyContent:'center', bgcolor:'rgba(0,0,0,.45)', zIndex:2 }}>
          <CircularProgress size={32} sx={{ color:'#fff' }} />
        </Box>
      )}

      {url ? (
        <>
          <Box component="img" src={url} alt={label}
            sx={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <Box sx={{
            position:'absolute', inset:0, opacity:0, transition:'opacity .2s',
            bgcolor:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center',
            '&:hover':{ opacity:1 },
          }}>
            <Typography variant="caption" color="#fff" fontWeight={700}>
              Click to replace
            </Typography>
          </Box>
        </>
      ) : (
        <Stack alignItems="center" spacing={1}>
          <CloudUploadRoundedIcon sx={{ fontSize:36, color:'text.disabled' }} />
          <Typography variant="caption" color="text.disabled" textAlign="center">
            {label}<br/>Click to upload
          </Typography>
        </Stack>
      )}

      <Chip
        label={label}
        size="small"
        sx={{
          position:'absolute', top:8, left:8, zIndex:1,
          bgcolor: label === 'Before' ? 'rgba(25,118,210,.85)' : 'rgba(56,142,60,.85)',
          color:'#fff', fontWeight:700, fontSize:10,
        }}
      />

      <input ref={fileRef} type="file" accept="image/*"
        style={{ display:'none' }} onChange={handleFile} />
    </Box>
  );
}

/* ── Before/After preview card ───────────────────────────────────────────── */
function GalleryCard({ item, onEdit, onDelete, onToggle }) {
  const [hover, setHover] = useState(false);
  const catLabel = CATEGORIES.find(c => c.value === item.category)?.label ?? item.category;

  return (
    <Card
      variant="outlined"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        height: '100%', display:'flex', flexDirection:'column',
        borderColor: item.published ? 'success.light' : 'divider',
        transition: 'transform .2s, box-shadow .2s, border-color .25s',
        '&:hover': { transform:'translateY(-4px)', boxShadow:'0 12px 32px rgba(0,0,0,.12)' },
      }}
    >
      {/* Split Before / After preview */}
      <Box sx={{ position:'relative', height:200, overflow:'hidden', bgcolor:'grey.100', flexShrink:0 }}>
        {/* Before (left) */}
        <Box sx={{ position:'absolute', inset:0, overflow:'hidden',
          clipPath: hover ? 'inset(0 60% 0 0)' : 'inset(0 50% 0 0)',
          transition: 'clip-path .4s cubic-bezier(.4,0,.2,1)' }}>
          {item.beforeUrl
            ? <Box component="img" src={item.beforeUrl} alt="Before"
                sx={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <Box sx={{ width:'100%', height:'100%', display:'flex', alignItems:'center',
                justifyContent:'center' }}>
                <ImageNotSupportedRoundedIcon sx={{ color:'text.disabled' }} />
              </Box>}
          <Chip label="Before" size="small" sx={{
            position:'absolute', bottom:8, left:8,
            bgcolor:'rgba(25,118,210,.85)', color:'#fff', fontWeight:700, fontSize:10,
          }} />
        </Box>

        {/* After (right) */}
        <Box sx={{ position:'absolute', inset:0 }}>
          {item.afterUrl
            ? <Box component="img" src={item.afterUrl} alt="After"
                sx={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <Box sx={{ width:'100%', height:'100%', display:'flex', alignItems:'center',
                justifyContent:'center', bgcolor:'grey.200' }}>
                <ImageNotSupportedRoundedIcon sx={{ color:'text.disabled' }} />
              </Box>}
          <Chip label="After" size="small" sx={{
            position:'absolute', bottom:8, right:8,
            bgcolor:'rgba(56,142,60,.85)', color:'#fff', fontWeight:700, fontSize:10,
          }} />
        </Box>

        {/* Centre divider line */}
        <Box sx={{
          position:'absolute', top:0, bottom:0, zIndex:2,
          left: hover ? '40%' : '50%',
          transition: 'left .4s cubic-bezier(.4,0,.2,1)',
          width:2, bgcolor:'#fff', boxShadow:'0 0 6px rgba(0,0,0,.4)',
        }} />

        {/* Published / Draft badge */}
        <Chip
          label={item.published ? 'Published' : 'Draft'}
          size="small"
          color={item.published ? 'success' : 'default'}
          sx={{ position:'absolute', top:8, right:8, zIndex:3, fontWeight:700, fontSize:10 }}
        />

        {/* Order badge */}
        <Box sx={{
          position:'absolute', top:8, left:8, zIndex:3,
          bgcolor:'rgba(0,0,0,.6)', color:'#fff',
          borderRadius:1, px:.75, py:.25, fontSize:10, fontWeight:700,
          lineHeight:1.4,
        }}>
          #{item.displayOrder ?? 0}
        </Box>
      </Box>

      <CardContent sx={{ pb:'8px !important', pt:1.5, flex:1 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap mb={0.5}>
          {item.title}
        </Typography>
        {item.titleAr && (
          <Typography variant="caption" color="text.secondary" dir="rtl" display="block" noWrap mb={0.5}>
            {item.titleAr}
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Chip label={catLabel} size="small" color={CATEGORY_COLOR[item.category] ?? 'default'}
            variant="outlined" sx={{ fontSize:10 }} />
          {item.description && (
            <Chip label="Has description" size="small" variant="outlined" sx={{ fontSize:10 }} />
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ px:1.5, pb:1.5, pt:0 }}>
        <Tooltip title={item.published ? 'Unpublish' : 'Publish'}>
          <IconButton size="small" onClick={() => onToggle(item)}
            color={item.published ? 'success' : 'default'}>
            {item.published
              ? <PublishRoundedIcon fontSize="small" />
              : <UnpublishedRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => onEdit(item)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(item)}>
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box flex={1} />
        <Typography variant="caption" color="text.disabled">
          {new Date(item.updatedAt ?? item.createdAt).toLocaleDateString()}
        </Typography>
      </CardActions>
    </Card>
  );
}

/* ── Create/Edit Dialog ─────────────────────────────────────────────────── */
function GalleryDialog({ open, item, onClose, onSave, isSaving }) {
  const [form, setForm]   = useState(item ? {
    title:         item.title        ?? '',
    titleAr:       item.titleAr      ?? '',
    description:   item.description  ?? '',
    descriptionAr: item.descriptionAr?? '',
    category:      item.category     ?? 'detailing',
    beforeUrl:     item.beforeUrl    ?? '',
    afterUrl:      item.afterUrl     ?? '',
    displayOrder:  item.displayOrder ?? 0,
    published:     item.published    ?? false,
  } : { ...EMPTY_FORM });
  const [tab, setTab]     = useState(0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSave = form.title.trim() && form.beforeUrl && form.afterUrl && form.category;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx:{ borderRadius:3 } }}>
      {isSaving && <LinearProgress sx={{ borderRadius:'12px 12px 0 0' }} />}
      <DialogTitle sx={{ pb:0, fontWeight:700 }}>
        {item ? 'Edit Gallery Item' : 'New Before & After Item'}
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px:3 }}>
        <Tab label="Content" />
        <Tab label="Images" />
        <Tab label="Settings" />
      </Tabs>
      <Divider />

      <DialogContent sx={{ pt:2.5 }}>
        {/* ── Content tab ── */}
        {tab === 0 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs:12, sm:6 }}>
                <TextField
                  label="Title (English)" fullWidth required
                  value={form.title} onChange={e => set('title', e.target.value)}
                  error={!form.title.trim()}
                  helperText={!form.title.trim() ? 'Required' : ''}
                />
              </Grid>
              <Grid size={{ xs:12, sm:6 }}>
                <TextField
                  label="العنوان (عربي)" fullWidth
                  value={form.titleAr} onChange={e => set('titleAr', e.target.value)}
                  inputProps={{ dir:'rtl', style:{ textAlign:'right' } }}
                />
              </Grid>
              <Grid size={{ xs:12, sm:6 }}>
                <TextField
                  label="Description (English)" fullWidth multiline rows={3}
                  value={form.description} onChange={e => set('description', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs:12, sm:6 }}>
                <TextField
                  label="الوصف (عربي)" fullWidth multiline rows={3}
                  value={form.descriptionAr} onChange={e => set('descriptionAr', e.target.value)}
                  inputProps={{ dir:'rtl', style:{ textAlign:'right' } }}
                />
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* ── Images tab ── */}
        {tab === 1 && (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ fontSize:12 }}>
              Upload the &quot;before&quot; photo first, then the &quot;after&quot; result. Both are required.
              Supported formats: JPG, PNG, WebP.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs:12, sm:6 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.75} fontWeight={600}>
                  BEFORE IMAGE *
                </Typography>
                <ImageUploadCell
                  label="Before"
                  url={form.beforeUrl}
                  onUrl={url => set('beforeUrl', url)}
                />
                {!form.beforeUrl && (
                  <Typography variant="caption" color="error" sx={{ mt:.5, display:'block' }}>Required</Typography>
                )}
              </Grid>
              <Grid size={{ xs:12, sm:6 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.75} fontWeight={600}>
                  AFTER IMAGE *
                </Typography>
                <ImageUploadCell
                  label="After"
                  url={form.afterUrl}
                  onUrl={url => set('afterUrl', url)}
                />
                {!form.afterUrl && (
                  <Typography variant="caption" color="error" sx={{ mt:.5, display:'block' }}>Required</Typography>
                )}
              </Grid>
            </Grid>

            {/* Live split preview */}
            {(form.beforeUrl || form.afterUrl) && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                  PREVIEW (hover to compare)
                </Typography>
                <GalleryCard
                  item={{ ...form, id:-1, published:false, displayOrder:0,
                    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }}
                  onEdit={() => {}} onDelete={() => {}} onToggle={() => {}}
                />
              </Box>
            )}
          </Stack>
        )}

        {/* ── Settings tab ── */}
        {tab === 2 && (
          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={form.category} label="Category"
                onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Display Order"
              type="number"
              fullWidth
              value={form.displayOrder}
              onChange={e => set('displayOrder', parseInt(e.target.value, 10) || 0)}
              helperText="Lower number = shown first. Items with same order are sorted by date."
              inputProps={{ min: 0, max: 999 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.published}
                  onChange={e => set('published', e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {form.published ? 'Published' : 'Draft'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {form.published
                      ? 'Visible on the public website'
                      : 'Hidden from the public website'}
                  </Typography>
                </Box>
              }
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px:3, pb:2.5, gap:1 }}>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canSave || isSaving}
          onClick={() => onSave(form)}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {item ? 'Save Changes' : 'Create Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function GalleryManagement() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCat, setFilterCat]     = useState('all');
  const [filterPub, setFilterPub]     = useState('all');

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: adminApi.getAllGallery,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-gallery'] });

  const createMut = useMutation({
    mutationFn: adminApi.createGalleryItem,
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success('Item created'); },
    onError:   () => toast.error('Failed to create item'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateGalleryItem(id, data),
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditItem(null); toast.success('Item updated'); },
    onError:   () => toast.error('Failed to update item'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => adminApi.toggleGalleryPublished(id),
    onSuccess: invalidate,
    onError:   () => toast.error('Failed to update visibility'),
  });

  const deleteMut = useMutation({
    mutationFn: adminApi.deleteGalleryItem,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Item deleted'); },
    onError:   () => toast.error('Failed to delete item'),
  });

  const handleSave = (form) => {
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openEdit = (item) => { setEditItem(item); setDialogOpen(true); };
  const openNew  = ()     => { setEditItem(null); setDialogOpen(true); };

  const filtered = items.filter(i => {
    if (filterCat !== 'all' && i.category !== filterCat) return false;
    if (filterPub === 'published' && !i.published)       return false;
    if (filterPub === 'draft'     &&  i.published)       return false;
    return true;
  });

  const publishedCount = items.filter(i => i.published).length;
  const draftCount     = items.length - publishedCount;

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" useFlexGap gap={1}>
          <Stack spacing={0.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CompareRoundedIcon sx={{ color:'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>Before & After Gallery</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Manage showcase pairs visible on the public website
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={refetch} size="small">
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew}>
              New Item
            </Button>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb:2 }}>Failed to load gallery items.</Alert>}

      {/* KPI strip */}
      <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap>
        <Chip icon={<VisibilityRoundedIcon />} label={`${publishedCount} published`} color="success" variant="outlined" />
        <Chip label={`${draftCount} drafts`} variant="outlined" color="default" />
        <Chip label={`${items.length} total`} variant="outlined" />
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap alignItems="center">
        <FormControl size="small" sx={{ minWidth:160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCat} label="Category" onChange={e => setFilterCat(e.target.value)}>
            <MenuItem value="all">All categories</MenuItem>
            {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth:140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterPub} label="Status" onChange={e => setFilterPub(e.target.value)}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>
        {(filterCat !== 'all' || filterPub !== 'all') && (
          <Button size="small" onClick={() => { setFilterCat('all'); setFilterPub('all'); }}>
            Clear filters
          </Button>
        )}
        <Typography variant="body2" color="text.disabled" sx={{ ml:'auto !important' }}>
          {filtered.length} of {items.length} items
        </Typography>
      </Stack>

      {/* Grid */}
      {isLoading ? (
        <Grid container spacing={2.5}>
          {[1,2,3,4,5,6].map(n => (
            <Grid size={{ xs:12, sm:6, md:4 }} key={n}>
              <Skeleton variant="rounded" height={340} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign:'center', py:8 }}>
          <CompareRoundedIcon sx={{ fontSize:56, color:'text.disabled', mb:1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {items.length === 0 ? 'No gallery items yet' : 'No items match the filters'}
          </Typography>
          {items.length === 0 && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew} sx={{ mt:1 }}>
              Create your first item
            </Button>
          )}
        </Card>
      ) : (
        <Stagger>
          <Grid container spacing={2.5}>
            {filtered.map(item => (
              <Grid size={{ xs:12, sm:6, md:4 }} key={item.id}>
                <GalleryCard
                  item={item}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={i => toggleMut.mutate(i.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <GalleryDialog
          open
          item={editItem}
          onClose={() => { setDialogOpen(false); setEditItem(null); }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete gallery item?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            &quot;<strong>{deleteTarget?.title}</strong>&quot; will be permanently removed and
            will no longer appear on the website.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb:2, px:2.5 }}>
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
