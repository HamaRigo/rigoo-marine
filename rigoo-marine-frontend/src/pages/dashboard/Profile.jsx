import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Avatar,
  CircularProgress, ToggleButtonGroup, ToggleButton, Divider,
  FormControlLabel, Switch,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  // Locked to the user's stored preference, not the UI language — the two can
  // diverge (a client may browse in EN but want emails in AR while travelling).
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'en');
  const [whatsappOptIn, setWhatsappOptIn] = useState(Boolean(user?.whatsappOptIn));

  // Keep the local controls in sync if AuthContext refreshes the user (e.g.
  // post-login from a different device with a different preference).
  useEffect(() => {
    if (user?.preferredLanguage) setPreferredLanguage(user.preferredLanguage);
    if (user) setWhatsappOptIn(Boolean(user.whatsappOptIn));
  }, [user?.preferredLanguage, user?.whatsappOptIn]);

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      updateProfile(data.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      // If the user changed their preferred language, switch the UI locale to
      // match — saves them from a second click on the navbar selector. The
      // i18n.on('languageChanged') hook in i18n/index.js handles document.dir.
      if (data.user?.preferredLanguage
          && data.user.preferredLanguage !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLanguage);
      }
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      preferredLanguage,
      // Backend coerces this to a boolean via Boolean.parseBoolean; send the
      // string form to avoid surprises with JSON serializer defaults.
      whatsappOptIn: String(whatsappOptIn),
    });
  };

  const handlePasswordChange = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    passwordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Profile</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent>
              <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Typography variant="h6">{user.name}</Typography>
              <Typography color="text.secondary">{user.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role || 'CLIENT'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LanguageIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2">Communication language</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Emails and in-app reminders will be sent in this language.
                    </Typography>
                    <ToggleButtonGroup
                      value={preferredLanguage}
                      exclusive
                      onChange={(_, v) => v && setPreferredLanguage(v)}
                      size="small"
                      aria-label="preferred communication language"
                    >
                      <ToggleButton value="en">{t('language.english', 'English')}</ToggleButton>
                      <ToggleButton value="ar">{t('language.arabic', 'العربية')}</ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                      <Typography variant="subtitle2">WhatsApp reminders</Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={whatsappOptIn}
                          onChange={(e) => setWhatsappOptIn(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="caption" color="text.secondary">
                          Send maintenance reminders to my WhatsApp ({user?.phone || 'no number on file'}).
                        </Typography>
                      }
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setFormData({
                      name: user.name,
                      email: user.email,
                      phone: user.phone,
                    })}
                  >
                    Reset
                  </Button>
                </Box>
              </form>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Change Password</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                  >
                    {showPasswordChange ? 'Cancel' : 'Edit'}
                  </Button>
                </Box>

                {showPasswordChange && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={handlePasswordChange}
                        disabled={passwordMutation.isPending}
                      >
                        {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
