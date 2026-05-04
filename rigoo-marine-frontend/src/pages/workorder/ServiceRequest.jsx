import { useState, useMemo } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button, MenuItem,
  Stack, Alert, CircularProgress, Chip,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { vesselApi, workOrderApi, fileApi } from '../../services/api';
import UnverifiedEmailBanner from '../../components/common/UnverifiedEmailBanner';

const CATEGORY_KEYS = [
  'ENGINE', 'ELECTRICAL', 'HULL', 'PROPULSION',
  'NAVIGATION', 'PLUMBING', 'SAFETY', 'MAINTENANCE', 'OTHER',
];

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = /^(image\/.+|video\/mp4)$/;

export default function ServiceRequest() {
  const { user, isTechnician } = useAuth();
  const { t } = useTranslation('workorder');
  const navigate = useNavigate();

  const tech = isTechnician();
  const submittedByRole = tech ? 'TECHNICIAN' : 'CLIENT';
  const emailVerified = user?.emailVerified !== false;

  const [vesselId, setVesselId] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [gpsState, setGpsState] = useState({ loading: false, error: null });
  const [category, setCategory] = useState('');
  const [categoryOther, setCategoryOther] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); // [{ file, uploadedUrl?, uploading, error? }]

  const vesselsQuery = useQuery({
    queryKey: tech ? ['vessels', 'all'] : ['vessels', 'my', user?.id],
    queryFn: () => (tech ? vesselApi.getAll() : vesselApi.getMyVessels(user.id)),
    enabled: !!user?.id,
  });

  const selectedVessel = useMemo(
    () => (vesselsQuery.data || []).find((v) => v.id === Number(vesselId)),
    [vesselsQuery.data, vesselId],
  );

  const handleUseGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsState({ loading: false, error: t('serviceRequest.location.gpsUnsupported') });
      return;
    }
    setGpsState({ loading: true, error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsState({ loading: false, error: null });
      },
      () => setGpsState({ loading: false, error: t('serviceRequest.location.gpsDenied') }),
      { timeout: 10000 },
    );
  };

  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length + incoming.length > MAX_FILES) {
      toast.error(t('serviceRequest.media.tooMany'));
      return;
    }
    const accepted = [];
    for (const f of incoming) {
      if (f.size > MAX_BYTES) {
        toast.error(t('serviceRequest.media.tooLarge', { name: f.name }));
        continue;
      }
      if (!ACCEPTED_TYPES.test(f.type)) {
        toast.error(t('serviceRequest.media.wrongType', { name: f.name }));
        continue;
      }
      accepted.push({ file: f, uploading: true });
    }
    if (!accepted.length) return;

    setFiles((prev) => [...prev, ...accepted]);

    accepted.forEach(async (entry) => {
      try {
        const result = await fileApi.upload(entry.file, 'work-order');
        setFiles((prev) =>
          prev.map((p) =>
            p.file === entry.file ? { ...p, uploading: false, uploadedUrl: result.url } : p,
          ),
        );
      } catch {
        setFiles((prev) => prev.filter((p) => p.file !== entry.file));
        toast.error(t('serviceRequest.errors.submitFailed'));
      }
    });
  };

  const removeFile = (entry) => {
    setFiles((prev) => prev.filter((p) => p !== entry));
  };

  const submitMutation = useMutation({
    mutationFn: workOrderApi.submitServiceRequest,
    onSuccess: () => {
      toast.success(t('serviceRequest.success'));
      navigate(tech ? '/technician' : '/dashboard/orders');
    },
    onError: (err) => {
      if (err.response?.status === 429) {
        toast.error(t('serviceRequest.errors.rateLimit'));
      } else {
        toast.error(err.response?.data?.message || t('serviceRequest.errors.submitFailed'));
      }
    },
  });

  const isUploading = files.some((f) => f.uploading);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vesselId) return toast.error(t('serviceRequest.errors.noVessel'));
    if (!locationText.trim()) return toast.error(t('serviceRequest.errors.noLocation'));
    if (!category) return toast.error(t('serviceRequest.errors.noCategory'));
    if (!description.trim()) return toast.error(t('serviceRequest.errors.noDescription'));

    const payload = {
      clientId: selectedVessel?.clientId,
      vesselId: Number(vesselId),
      submittedByRole,
      description: description.trim(),
      locationText: locationText.trim(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      phone: phone.trim() || null,
      issueCategory: category,
      issueCategoryOther: category === 'OTHER' ? categoryOther.trim() : null,
      mediaUrls: files.map((f) => f.uploadedUrl).filter(Boolean),
    };
    submitMutation.mutate(payload);
  };

  const vessels = vesselsQuery.data || [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <UnverifiedEmailBanner />
      <Paper elevation={3} sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('serviceRequest.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('serviceRequest.subtitle')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {vesselsQuery.isLoading ? (
              <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={24} /></Box>
            ) : vesselsQuery.isError ? (
              <Alert severity="error">{t('serviceRequest.errors.loadVessels')}</Alert>
            ) : vessels.length === 0 ? (
              <Alert
                severity="info"
                action={
                  !tech ? (
                    <Button component={RouterLink} to="/dashboard/vessels" size="small">
                      {t('serviceRequest.vessel.addFirst')}
                    </Button>
                  ) : null
                }
              >
                {t('serviceRequest.vessel.noVessels')}
              </Alert>
            ) : (
              <TextField
                select
                required
                label={t('serviceRequest.vessel.label')}
                value={vesselId}
                onChange={(e) => setVesselId(e.target.value)}
                helperText={tech ? t('serviceRequest.vessel.techHint') : ''}
              >
                {vessels.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}{v.brand ? ` — ${v.brand}` : ''}{tech ? ` (#${v.clientId})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label={t('serviceRequest.phone.label')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText={t('serviceRequest.phone.helper')}
              inputProps={{ maxLength: 50 }}
            />

            <Box>
              <TextField
                fullWidth
                required
                label={t('serviceRequest.location.label')}
                placeholder={t('serviceRequest.location.placeholder')}
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                inputProps={{ maxLength: 500 }}
              />
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  startIcon={<MyLocationIcon />}
                  onClick={handleUseGps}
                  disabled={gpsState.loading}
                >
                  {gpsState.loading ? t('serviceRequest.location.gpsLoading') : t('serviceRequest.location.useGps')}
                </Button>
                {coords && (
                  <Chip
                    label={t('serviceRequest.location.gpsCaptured', { lat: coords.latitude, lng: coords.longitude })}
                    onDelete={() => setCoords(null)}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {gpsState.error && <Typography variant="caption" color="error">{gpsState.error}</Typography>}
              </Box>
            </Box>

            <TextField
              select
              required
              label={t('serviceRequest.category.label')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_KEYS.map((key) => (
                <MenuItem key={key} value={key}>
                  {t(`serviceRequest.category.options.${key}`)}
                </MenuItem>
              ))}
            </TextField>

            {category === 'OTHER' && (
              <TextField
                label={t('serviceRequest.category.otherLabel')}
                placeholder={t('serviceRequest.category.otherPlaceholder')}
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                inputProps={{ maxLength: 255 }}
              />
            )}

            <TextField
              required
              multiline
              minRows={4}
              label={t('serviceRequest.description.label')}
              placeholder={t('serviceRequest.description.placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>{t('serviceRequest.media.label')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('serviceRequest.media.constraints')}</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {files.map((entry, idx) => (
                  <Chip
                    key={`${entry.file.name}-${idx}`}
                    label={entry.uploading ? `${entry.file.name} • ${t('serviceRequest.media.uploading')}` : entry.file.name}
                    onDelete={() => removeFile(entry)}
                    deleteIcon={<CloseIcon />}
                    variant={entry.uploading ? 'outlined' : 'filled'}
                  />
                ))}
                {files.length < MAX_FILES && (
                  <Button component="label" startIcon={<CloudUploadIcon />} variant="outlined" size="small">
                    {t('serviceRequest.media.addFiles')}
                    <input
                      hidden
                      type="file"
                      multiple
                      accept="image/*,video/mp4"
                      onChange={handleFiles}
                    />
                  </Button>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
              <Button onClick={() => navigate(-1)} disabled={submitMutation.isPending}>
                {t('serviceRequest.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitMutation.isPending || isUploading || vessels.length === 0 || !emailVerified}
              >
                {submitMutation.isPending ? t('serviceRequest.submitting') : t('serviceRequest.submit')}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
