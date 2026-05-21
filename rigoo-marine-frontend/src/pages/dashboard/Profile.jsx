import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Avatar,
  CircularProgress, ToggleButtonGroup, ToggleButton, Divider,
  FormControlLabel, Switch, Chip, Stack, InputAdornment, Collapse, IconButton,
} from '@mui/material';
import LanguageRoundedIcon    from '@mui/icons-material/LanguageRounded';
import WhatsAppIcon           from '@mui/icons-material/WhatsApp';
import PersonRoundedIcon      from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon       from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon       from '@mui/icons-material/PhoneRounded';
import LockRoundedIcon        from '@mui/icons-material/LockRounded';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import BuildRoundedIcon       from '@mui/icons-material/BuildRounded';
import VisibilityRoundedIcon  from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { authApi, vesselApi, workOrderApi } from '../../services/api';
import { useAuth }    from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Reveal } from '../../components/common/Motion';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation('dashboard');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'en');
  const [whatsappOptIn, setWhatsappOptIn] = useState(Boolean(user?.whatsappOptIn));

  useEffect(() => {
    if (user?.preferredLanguage) setPreferredLanguage(user.preferredLanguage);
    if (user) setWhatsappOptIn(Boolean(user.whatsappOptIn));
  }, [user?.preferredLanguage, user?.whatsappOptIn]);

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels', 'my'],
    queryFn:  vesselApi.getMyVessels,
    staleTime: 60_000,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['work-orders', 'my'],
    queryFn:  workOrderApi.getMyOrders,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      updateProfile(data.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      if (data.user?.preferredLanguage && data.user.preferredLanguage !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLanguage);
      }
      toast.success(t('profile.savedSuccess'));
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('profile.saveFailed'));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'));
      setFormData(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setShowPasswordSection(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('profile.passwordFailed'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      preferredLanguage,
      whatsappOptIn: String(whatsappOptIn),
    });
  };

  const handlePasswordChange = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t('profile.passwordMismatch')); return;
    }
    if (formData.newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort')); return;
    }
    passwordMutation.mutate({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const initials     = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const activeOrders = orders.filter(o =>
    ['PENDING','IN_PROGRESS','PENDING_APPROVAL','WAITING_PARTS'].includes(o.status)
  ).length;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Reveal variant="fade" timeout={360}>

        {/* ── Hero ── */}
        <Box sx={{
          background: 'linear-gradient(135deg, #0B1A2E 0%, #1a3050 100%)',
          borderRadius: 3, p: { xs: 2.5, sm: 3.5 }, mb: 3,
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{
            position: 'absolute', top: -50, right: -50,
            width: 200, height: 200, borderRadius: '50%',
            bgcolor: 'rgba(0,188,212,0.05)',
            pointerEvents: 'none',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -30, left: '30%',
            width: 120, height: 120, borderRadius: '50%',
            bgcolor: 'rgba(0,105,148,0.08)',
            pointerEvents: 'none',
          }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
            <Avatar sx={{
              width: 84, height: 84, flexShrink: 0,
              background: 'linear-gradient(135deg, #006994 0%, #00bcd4 100%)',
              border: '3px solid rgba(255,255,255,0.12)',
              fontSize: '1.75rem', fontWeight: 800, color: 'white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {initials}
            </Avatar>

            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" fontWeight={800} color="white" lineHeight={1.2} gutterBottom>
                {user.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 2 }}>
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <Chip size="small" label={user.role || 'CLIENT'}
                  sx={{ bgcolor: 'rgba(0,188,212,0.2)', color: '#00bcd4', border: '1px solid rgba(0,188,212,0.3)', fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                <Chip size="small"
                  icon={<DirectionsBoatRoundedIcon sx={{ fontSize: '0.8rem !important', color: 'rgba(255,255,255,0.45) !important' }} />}
                  label={`${vessels.length} ${t('profile.statsVessels')}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', height: 22 }} />
                {activeOrders > 0 && (
                  <Chip size="small"
                    icon={<BuildRoundedIcon sx={{ fontSize: '0.8rem !important', color: 'rgba(255,152,0,0.85) !important' }} />}
                    label={`${activeOrders} ${t('profile.statsActiveOrders')}`}
                    sx={{ bgcolor: 'rgba(255,152,0,0.14)', color: 'rgba(255,152,0,0.9)', fontSize: '0.7rem', height: 22 }} />
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* ── Personal Information ── */}
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <PersonRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={700}>{t('profile.personalInfo')}</Typography>
          </Box>
          <CardContent sx={{ p: 2.5 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={t('profile.name')} value={formData.name} required
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={t('profile.email')} type="email" value={formData.email} required
                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><EmailRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={t('profile.phone')} value={formData.phone}
                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PhoneRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
                  />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                <Button type="submit" variant="contained" disabled={updateMutation.isPending}
                  startIcon={updateMutation.isPending ? <CircularProgress size={14} /> : null}
                  sx={{ borderRadius: 2, px: 3 }}>
                  {updateMutation.isPending ? t('profile.saving') : t('profile.saveChanges')}
                </Button>
                <Button type="button" variant="outlined" color="inherit" sx={{ borderRadius: 2 }}
                  onClick={() => setFormData(f => ({ ...f, name: user.name || '', email: user.email || '', phone: user.phone || '' }))}>
                  {t('profile.reset')}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* ── Communication Preferences ── */}
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <LanguageRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={700}>{t('profile.commSection')}</Typography>
          </Box>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{t('profile.commLanguage')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('profile.commLanguageHint')}
              </Typography>
              <ToggleButtonGroup value={preferredLanguage} exclusive
                onChange={(_, v) => v && setPreferredLanguage(v)} size="small">
                <ToggleButton value="en" sx={{ px: 3, textTransform: 'none', fontWeight: 600 }}>English</ToggleButton>
                <ToggleButton value="ar" sx={{ px: 3, textTransform: 'none', fontWeight: 600 }}>العربية</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <WhatsAppIcon sx={{ color: '#25D366', fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{t('profile.whatsapp')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.whatsappHint')}{' '}
                  <Box component="strong" sx={{ color: 'text.primary' }}>
                    {user?.phone || t('profile.noPhone')}
                  </Box>
                </Typography>
              </Box>
              <Switch checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} color="primary" />
            </Stack>
          </CardContent>
        </Card>

        {/* ── Security ── */}
        <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <LockRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={700}>{t('profile.security')}</Typography>
            </Stack>
            <Button size="small" variant={showPasswordSection ? 'outlined' : 'text'} color="inherit"
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem' }}
              onClick={() => setShowPasswordSection(v => !v)}>
              {showPasswordSection ? t('profile.cancelEdit') : t('profile.editPassword')}
            </Button>
          </Box>

          {!showPasswordSection && (
            <CardContent sx={{ px: 2.5, py: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.disabled" sx={{ letterSpacing: '0.15em' }}>
                  ••••••••••••
                </Typography>
              </Stack>
            </CardContent>
          )}

          <Collapse in={showPasswordSection}>
            <CardContent sx={{ p: 2.5 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <TextField fullWidth label={t('profile.currentPassword')} value={formData.currentPassword}
                    type={showCurrentPw ? 'text' : 'password'}
                    onChange={(e) => setFormData(f => ({ ...f, currentPassword: e.target.value }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
                      endAdornment: <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrentPw(v => !v)} edge="end">
                          {showCurrentPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={t('profile.newPassword')} value={formData.newPassword}
                    type={showNewPw ? 'text' : 'password'}
                    onChange={(e) => setFormData(f => ({ ...f, newPassword: e.target.value }))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNewPw(v => !v)} edge="end">
                          {showNewPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={t('profile.confirmPassword')} type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="error" onClick={handlePasswordChange}
                    disabled={passwordMutation.isPending}
                    startIcon={passwordMutation.isPending ? <CircularProgress size={14} /> : null}
                    sx={{ borderRadius: 2, px: 3 }}>
                    {passwordMutation.isPending ? t('profile.saving') : t('profile.updatePassword')}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Collapse>
        </Card>

      </Reveal>
    </Box>
  );
}
