import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Stack, Card, CardMedia, CardContent, CardActions,
  Button, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, CircularProgress, Alert, Tabs, Tab,
  Skeleton, Divider, Avatar, LinearProgress, Badge,
} from '@mui/material';
import AddRoundedIcon          from '@mui/icons-material/AddRounded';
import EditRoundedIcon         from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon       from '@mui/icons-material/DeleteRounded';
import RefreshRoundedIcon      from '@mui/icons-material/RefreshRounded';
import VisibilityRoundedIcon   from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import CloudUploadRoundedIcon  from '@mui/icons-material/CloudUploadRounded';
import LinkedInIcon            from '@mui/icons-material/LinkedIn';
import EmailRoundedIcon        from '@mui/icons-material/EmailRounded';
import PeopleAltRoundedIcon    from '@mui/icons-material/PeopleAltRounded';
import toast from 'react-hot-toast';
import { adminApi, fileApi } from '../../services/api';
import { Reveal, Stagger } from '../../components/common/Motion';

/* ── Constants ───────────────────────────────────────────────────────────── */
const DEPARTMENTS = [
  { value: 'management',  label: 'Management',     labelAr: 'الإدارة' },
  { value: 'technical',   label: 'Technical',      labelAr: 'الفني' },
  { value: 'operations',  label: 'Operations',     labelAr: 'العمليات' },
  { value: 'sales',       label: 'Sales',          labelAr: 'المبيعات' },
  { value: 'delivery',    label: 'Delivery',       labelAr: 'التوصيل' },
  { value: 'support',     label: 'Support',        labelAr: 'الدعم' },
  { value: 'general',     label: 'General',        labelAr: 'عام' },
];

const DEPT_COLOR = {
  management:  'primary',
  technical:   'warning',
  operations:  'info',
  sales:       'success',
  delivery:    'secondary',
  support:     'default',
  general:     'default',
};

const EMPTY_FORM = {
  name: '', nameAr: '',
  role: '', roleAr: '',
  bio: '', bioAr: '',
  photoUrl: '',
  department: 'general',
  linkedinUrl: '',
  email: '',
  displayOrder: 0,
  active: true,
};

/* ── Photo Upload Cell ───────────────────────────────────────────────────── */
function PhotoUploadCell({ url, onUrl }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    setBusy(true);
    try {
      const data = await fileApi.upload(file, 'team');
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
        position: 'relative', borderRadius: '50%', overflow: 'hidden',
        width: 120, height: 120, cursor: 'pointer', mx: 'auto',
        border: '3px dashed', borderColor: url ? 'primary.main' : 'divider',
        transition: 'border-color .2s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Avatar
        src={url || undefined}
        sx={{ width: '100%', height: '100%', fontSize: 40 }}
      >
        {!url && <CloudUploadRoundedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />}
      </Avatar>
      {busy && (
        <Box sx={{
          position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
        }}>
          <CircularProgress size={28} sx={{ color: '#fff' }} />
        </Box>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </Box>
  );
}

/* ── Team Member Card ────────────────────────────────────────────────────── */
function MemberCard({ member, onEdit, onToggle, onDelete }) {
  const dept = DEPARTMENTS.find(d => d.value === member.department) ?? DEPARTMENTS[6];

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        opacity: member.active ? 1 : 0.65,
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
        position: 'relative',
      }}
    >
      {/* Active badge */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <Chip
          label={member.active ? 'Active' : 'Hidden'}
          color={member.active ? 'success' : 'default'}
          size="small"
        />
      </Box>

      <CardContent sx={{ textAlign: 'center', pt: 3 }}>
        <Avatar
          src={member.photoUrl || undefined}
          sx={{ width: 80, height: 80, mx: 'auto', mb: 1.5, fontSize: 28,
            bgcolor: member.active ? 'primary.main' : 'grey.400' }}
        >
          {!member.photoUrl && member.name?.[0]?.toUpperCase()}
        </Avatar>

        <Typography variant="h6" fontWeight={700} noWrap>
          {member.name}
        </Typography>
        {member.nameAr && (
          <Typography variant="body2" color="text.secondary" dir="rtl" noWrap>
            {member.nameAr}
          </Typography>
        )}

        <Chip
          label={dept.label}
          color={DEPT_COLOR[member.department] || 'default'}
          size="small"
          sx={{ mt: 0.75, mb: 1 }}
        />

        <Typography variant="body2" color="primary.main" fontWeight={600} noWrap>
          {member.role}
        </Typography>
        {member.roleAr && (
          <Typography variant="caption" color="text.secondary" dir="rtl" display="block" noWrap>
            {member.roleAr}
          </Typography>
        )}

        {member.bio && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {member.bio}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 1.5 }}>
          {member.linkedinUrl && (
            <Tooltip title="LinkedIn">
              <IconButton size="small" component="a" href={member.linkedinUrl} target="_blank" rel="noopener">
                <LinkedInIcon fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>
          )}
          {member.email && (
            <Tooltip title={member.email}>
              <IconButton size="small" component="a" href={`mailto:${member.email}`}>
                <EmailRoundedIcon fontSize="small" color="action" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardContent>

      <Divider />
      <CardActions sx={{ justifyContent: 'space-between', px: 1.5, py: 0.75 }}>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(member)}>
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={member.active ? 'Hide' : 'Show'}>
            <IconButton size="small" onClick={() => onToggle(member.id)}>
              {member.active
                ? <VisibilityOffRoundedIcon fontSize="small" />
                : <VisibilityRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(member)}>
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

/* ── Dialog Tabs ─────────────────────────────────────────────────────────── */
function MemberDialog({ open, member, onClose, onSave, isSaving }) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(member ? { ...member } : { ...EMPTY_FORM });

  const isEdit = !!member;
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = () => {
    if (!form.name?.trim()) { toast.error('Name (EN) is required'); setTab(0); return; }
    if (!form.role?.trim()) { toast.error('Role (EN) is required'); setTab(0); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {isSaving && <LinearProgress />}
      <DialogTitle>{isEdit ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Info" />
          <Tab label="Photo" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Tab 0: Info ── */}
        {tab === 0 && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Name (EN)" fullWidth required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="الاسم (AR)" fullWidth
                  value={form.nameAr}
                  onChange={e => set('nameAr', e.target.value)}
                  inputProps={{ dir: 'rtl' }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Role / Position (EN)" fullWidth required
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="المنصب (AR)" fullWidth
                  value={form.roleAr}
                  onChange={e => set('roleAr', e.target.value)}
                  inputProps={{ dir: 'rtl' }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Bio (EN)" fullWidth multiline minRows={3}
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
            />
            <TextField
              label="نبذة (AR)" fullWidth multiline minRows={3}
              value={form.bioAr}
              onChange={e => set('bioAr', e.target.value)}
              inputProps={{ dir: 'rtl' }}
            />
            <TextField
              label="LinkedIn URL" fullWidth
              value={form.linkedinUrl}
              onChange={e => set('linkedinUrl', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
            <TextField
              label="Email" fullWidth type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </Stack>
        )}

        {/* ── Tab 1: Photo ── */}
        {tab === 1 && (
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <PhotoUploadCell url={form.photoUrl} onUrl={v => set('photoUrl', v)} />
            <Typography variant="caption" color="text.secondary">
              Click the circle to upload a profile photo
            </Typography>
            <Divider flexItem />
            <TextField
              label="Or paste photo URL" fullWidth size="small"
              value={form.photoUrl}
              onChange={e => set('photoUrl', e.target.value)}
            />
            {form.photoUrl && (
              <Avatar src={form.photoUrl} sx={{ width: 80, height: 80 }} />
            )}
          </Stack>
        )}

        {/* ── Tab 2: Settings ── */}
        {tab === 2 && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={form.department}
                label="Department"
                onChange={e => set('department', e.target.value)}
              >
                {DEPARTMENTS.map(d => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label} — {d.labelAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Display Order" type="number" fullWidth
              value={form.displayOrder}
              onChange={e => set('displayOrder', Number(e.target.value))}
              helperText="Lower numbers appear first"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.active}
                  onChange={e => set('active', e.target.checked)}
                />
              }
              label="Visible on website"
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
          {isEdit ? 'Save Changes' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function TeamManagement() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-team'] });

  const [filterDept, setFilterDept] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['admin-team'],
    queryFn: adminApi.getAllTeamMembers,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createTeamMember,
    onSuccess: () => { invalidate(); toast.success('Team member added'); closeDialog(); },
    onError: () => toast.error('Failed to create member'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateTeamMember(id, data),
    onSuccess: () => { invalidate(); toast.success('Team member updated'); closeDialog(); },
    onError: () => toast.error('Failed to update member'),
  });

  const toggleMutation = useMutation({
    mutationFn: adminApi.toggleTeamMemberActive,
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update visibility'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteTeamMember,
    onSuccess: () => { invalidate(); toast.success('Member deleted'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete member'),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSave = (form) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = members.filter(m => {
    if (filterDept !== 'all' && m.department !== filterDept) return false;
    if (filterActive === 'active' && !m.active) return false;
    if (filterActive === 'hidden' && m.active) return false;
    return true;
  });

  const activeCount = members.filter(m => m.active).length;

  /* KPI strip */
  const kpi = [
    { label: 'Total Members', value: members.length, color: 'primary.main' },
    { label: 'Active / Visible', value: activeCount, color: 'success.main' },
    { label: 'Hidden', value: members.length - activeCount, color: 'text.secondary' },
    { label: 'Departments', value: new Set(members.map(m => m.department)).size, color: 'info.main' },
  ];

  return (
    <Box>
      {/* Header */}
      <Reveal variant="fadeDown">
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>Team Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage team members displayed on the website — bilingual (EN / AR)
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={invalidate}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={openAdd}
            >
              Add Member
            </Button>
          </Stack>
        </Stack>
      </Reveal>

      {/* KPI strip */}
      <Reveal variant="slideUp">
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpi.map(k => (
            <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined" sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h4" fontWeight={800} color={k.color}>
                  {isLoading ? <Skeleton width={40} sx={{ mx: 'auto' }} /> : k.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Reveal>

      {/* Filters */}
      <Reveal variant="fade">
        <Card variant="outlined" sx={{ mb: 3, px: 2, py: 1.5 }}>
          <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Department</InputLabel>
              <Select value={filterDept} label="Department" onChange={e => setFilterDept(e.target.value)}>
                <MenuItem value="all">All Departments</MenuItem>
                {DEPARTMENTS.map(d => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterActive} label="Status" onChange={e => setFilterActive(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="hidden">Hidden</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {filtered.length} of {members.length} members
            </Typography>
          </Stack>
        </Card>
      </Reveal>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load team members.</Alert>}

      {/* Loading skeleton */}
      {isLoading && (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 8 }}>
          <PeopleAltRoundedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {members.length === 0 ? 'No team members yet' : 'No members match these filters'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {members.length === 0
              ? 'Add your first team member to display them on the website'
              : 'Try changing the department or status filter'}
          </Typography>
          {members.length === 0 && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd}>
              Add First Member
            </Button>
          )}
        </Card>
      )}

      {/* Card grid */}
      {!isLoading && filtered.length > 0 && (
        <Stagger>
          <Grid container spacing={2}>
            {filtered.map(m => (
              <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <MemberCard
                  member={m}
                  onEdit={openEdit}
                  onToggle={id => toggleMutation.mutate(id)}
                  onDelete={setDeleteTarget}
                />
              </Grid>
            ))}
          </Grid>
        </Stagger>
      )}

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <MemberDialog
          open={dialogOpen}
          member={editing}
          onClose={closeDialog}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete team member?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
