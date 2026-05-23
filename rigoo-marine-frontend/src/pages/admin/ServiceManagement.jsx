/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, fileApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import { formatPrice } from '../../utils/format';

const SERVICE_CATEGORIES = ['Mechanical', 'Structural', 'Finishing', 'Renovation', 'Specialized'];
const EMPTY = { name: '', category: '', description: '', price: '', active: true, imageUrl: '' };

// ── Service form dialog (create + edit) ──────────────────────────────────────

function ServiceFormDialog({ open, service, onClose }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const isEdit = !!service;

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (open) {
      setError('');
      setUploading(false);
      if (service) {
        setForm({
          name: service.name || '',
          category: service.category || '',
          description: service.description || '',
          price: service.price != null ? String(service.price) : '',
          active: service.active ?? true,
          imageUrl: service.imageUrl || '',
        });
        setPreview(service.imageUrl || '');
      } else {
        setForm(EMPTY);
        setPreview('');
      }
    }
  }, [open, service?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await fileApi.upload(file, 'service');
      setForm(f => ({ ...f, imageUrl: url }));
      setPreview(url);
    } catch {
      setError(t('services.form.uploadError'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        price: form.price !== '' ? parseFloat(form.price) : null,
      };
      return isEdit
        ? adminApi.updateService(service.id, payload)
        : adminApi.createService(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      onClose();
    },
    onError: () => setError(t('services.form.errorFallback')),
  });

  const canSubmit = form.name.trim() && form.category && !uploading && !mutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? t('services.form.titleEdit') : t('services.form.titleCreate')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label={t('services.columns.name')}
            value={form.name}
            onChange={set('name')}
            required
            fullWidth
            autoFocus
          />

          <FormControl fullWidth required>
            <InputLabel>{t('services.columns.category')}</InputLabel>
            <Select value={form.category} onChange={set('category')} label={t('services.columns.category')}>
              {SERVICE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('services.form.description')}
            value={form.description}
            onChange={set('description')}
            fullWidth
            multiline
            rows={3}
          />

          <TextField
            label={t('services.columns.price')}
            value={form.price}
            onChange={set('price')}
            fullWidth
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            InputProps={{
              startAdornment: <InputAdornment position="start">QAR</InputAdornment>,
            }}
          />

          <FormControlLabel
            control={
              <Switch checked={form.active} onChange={setCheck('active')} color="success" />
            }
            label={t('services.columns.active')}
          />

          {/* Photo upload */}
          <Box>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                size="small"
              >
                {uploading ? t('services.form.uploading') : t('services.form.uploadPhoto')}
              </Button>
              {preview && (
                <Box
                  component="img"
                  src={preview}
                  alt="preview"
                  sx={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>
          {t('users.form.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          {mutation.isPending
            ? t('users.form.submitting')
            : isEdit ? t('users.form.saveEdit') : t('users.form.saveCreate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({ open, service, onClose }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  useEffect(() => { if (open) setError(''); }, [open]);

  const mutation = useMutation({
    mutationFn: () => adminApi.deleteService(service.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      onClose();
    },
    onError: () => setError(t('services.deleteError')),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('services.deleteTitle')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <DialogContentText>
          {t('services.deleteConfirm', { name: service?.name })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>
          {t('users.form.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t('users.form.submitting') : t('services.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ServiceManagement() {
  const { t } = useTranslation('admin');
  const [formTarget, setFormTarget] = useState(null); // null = closed; undefined = create; object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const columns = [
    {
      id: 'imageUrl',
      label: '',
      render: (r) =>
        r.imageUrl ? (
          <Box
            component="img"
            src={r.imageUrl}
            alt={r.name}
            sx={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 1, display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              height: 40, width: 40, borderRadius: 1,
              bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🔧
          </Box>
        ),
    },
    { id: 'id', label: t('services.columns.id') },
    { id: 'name', label: t('services.columns.name') },
    { id: 'category', label: t('services.columns.category'), render: (r) => r.category || '—' },
    {
      id: 'price',
      label: t('services.columns.price'),
      render: (r) => formatPrice(r.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      id: 'active',
      label: t('services.columns.active'),
      render: (r) => (
        <Chip
          size="small"
          label={r.active ? t('users.yes') : t('users.no')}
          color={r.active ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">{t('services.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormTarget(undefined)}
        >
          {t('services.form.titleCreate')}
        </Button>
      </Stack>

      <FilterableTable
        queryKey={['admin', 'services']}
        fetchPage={adminApi.searchServices}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="name,asc"
        filters={[
          {
            id: 'active',
            label: t('filters.status'),
            options: [
              { value: 'true', label: t('filters.active') },
              { value: 'false', label: t('filters.inactive') },
            ],
          },
          {
            id: 'category',
            label: t('services.columns.category'),
            options: SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })),
          },
        ]}
        renderActions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('services.edit')}>
              <IconButton size="small" onClick={() => setFormTarget(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('services.delete')}>
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <ServiceFormDialog
        open={formTarget !== null}
        service={formTarget}
        onClose={() => setFormTarget(null)}
      />

      <DeleteDialog
        open={!!deleteTarget}
        service={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
