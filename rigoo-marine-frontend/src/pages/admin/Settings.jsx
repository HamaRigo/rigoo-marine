import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Divider,
  Switch, FormControlLabel, Alert, Tabs, Tab, IconButton, InputAdornment,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, Email as EmailIcon, Business as BusinessIcon, Security as SecurityIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CompareRoundedIcon   from '@mui/icons-material/CompareRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';

const STORAGE_KEY = 'rigoo_company_settings';

const DEFAULT_SETTINGS = {
  companyName: 'Rigoo Marine',
  companyAddress: 'Doha',
  companyCity: 'Doha',
  companyPostalCode: '',
  companyCountry: 'Qatar',
  companyPhone: '+974 709 709 17',
  companyEmail: 'rigoomarine@gmail.com',
  companyWebsite: 'www.rigoomarine.com',
  companyTaxId: '',
  companyLogo: '/brand/logo.PNG',

  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  emailFromName: 'Rigoo Marine',
  emailFromAddress: 'rigoomarine@gmail.com',
  enableEmailNotifications: true,

  invoicePrefix: 'INV',
  invoiceDefaultDueDays: '30',
  invoiceDefaultTaxRate: '0',
  invoiceTerms: 'Payment is due within 30 days of the invoice date.\nA 2% monthly late fee applies to overdue balances.\nAll amounts are in Qatari Riyal (QAR).',

  quotationPrefix: 'QUO',
  quotationValidityDays: '7',
  quotationDefaultTaxRate: '0',

  enableRegistration: true,
  requireEmailVerification: true,
  enableMaintenanceMode: false,
  sessionTimeoutMinutes: '60',
};

export function loadCompanySettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(loadCompanySettings);
  const [tempPassword, setTempPassword] = useState('');

  // Fields synced to the Contact Info backend API
  const CONTACT_MAP = [
    { key: 'company_name', category: 'general',  field: 'companyName' },
    { key: 'email_general', category: 'email',    field: 'companyEmail' },
    { key: 'phone_primary', category: 'phone',    field: 'companyPhone' },
    { key: 'address',       category: 'location', field: 'companyAddress' },
    { key: 'city',          category: 'location', field: 'companyCity' },
    { key: 'country',       category: 'location', field: 'companyCountry' },
    { key: 'website',       category: 'general',  field: 'companyWebsite' },
  ];

  useEffect(() => {
    // Pre-populate from API if available, merge over localStorage defaults
    adminApi.getAllContactInfo().then((data) => {
      if (!Array.isArray(data) || data.length === 0) return;
      const map = Object.fromEntries(data.map((d) => [d.keyName, d.value]));
      setSettings((prev) => ({
        ...prev,
        ...(map.company_name  && { companyName:    map.company_name }),
        ...(map.email_general && { companyEmail:   map.email_general }),
        ...(map.phone_primary && { companyPhone:   map.phone_primary }),
        ...(map.address       && { companyAddress: map.address }),
        ...(map.city          && { companyCity:    map.city }),
        ...(map.country       && { companyCountry: map.country }),
        ...(map.website       && { companyWebsite: map.website }),
      }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      // 2. Sync to backend Contact Info API
      const existing = await adminApi.getAllContactInfo().catch(() => []);
      const byKey = Object.fromEntries((existing || []).map((d) => [d.keyName, d]));

      await Promise.all(
        CONTACT_MAP.map(({ key, category, field }) => {
          const value = settings[field] ?? '';
          if (byKey[key]) {
            return adminApi.updateContactInfo(byKey[key].id, { ...byKey[key], value });
          }
          return adminApi.createContactInfo({ keyName: key, value, category, displayOrder: 0, active: true });
        })
      );

      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { label: 'Company', icon: <BusinessIcon /> },
    { label: 'Email', icon: <EmailIcon /> },
    { label: 'Documents', icon: <ReceiptIcon /> },
    { label: 'Content', icon: <CompareRoundedIcon /> },
    { label: 'System', icon: <SecurityIcon /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure platform settings and preferences
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          {tabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Company Settings */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Company Information</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Company Name" value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Company Website" value={settings.companyWebsite}
                  onChange={(e) => handleChange('companyWebsite', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Phone Number" value={settings.companyPhone}
                  onChange={(e) => handleChange('companyPhone', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Email Address" value={settings.companyEmail}
                  onChange={(e) => handleChange('companyEmail', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Tax ID / VAT Number" value={settings.companyTaxId}
                  onChange={(e) => handleChange('companyTaxId', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Company Logo URL" value={settings.companyLogo}
                  onChange={(e) => handleChange('companyLogo', e.target.value)}
                  placeholder="/brand/logo.PNG" />
              </Grid>
              <Grid size={12} >
                <TextField fullWidth label="Street Address" value={settings.companyAddress}
                  onChange={(e) => handleChange('companyAddress', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Postal Code" value={settings.companyPostalCode}
                  onChange={(e) => handleChange('companyPostalCode', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="City" value={settings.companyCity}
                  onChange={(e) => handleChange('companyCity', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Country" value={settings.companyCountry}
                  onChange={(e) => handleChange('companyCountry', e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Email Settings */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>SMTP Configuration</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="SMTP Host" value={settings.smtpHost}
                  onChange={(e) => handleChange('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="SMTP Port" value={settings.smtpPort} type="number"
                  onChange={(e) => handleChange('smtpPort', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="SMTP Username" value={settings.smtpUser}
                  onChange={(e) => handleChange('smtpUser', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="SMTP Password" type="password" value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end"><SecurityIcon /></IconButton>
                      </InputAdornment>
                    ),
                  }} />
              </Grid>
              <Divider sx={{ my: 2, width: '100%' }} />
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="From Name" value={settings.emailFromName}
                  onChange={(e) => handleChange('emailFromName', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="From Email" value={settings.emailFromAddress}
                  onChange={(e) => handleChange('emailFromAddress', e.target.value)} />
              </Grid>
              <Grid size={12} >
                <FormControlLabel
                  control={<Switch checked={settings.enableEmailNotifications}
                    onChange={(e) => handleChange('enableEmailNotifications', e.target.checked)} />}
                  label="Enable Email Notifications"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Documents Settings */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Invoice Settings</Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Invoice Prefix" value={settings.invoicePrefix}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Default Due Days" type="number" value={settings.invoiceDefaultDueDays}
                  onChange={(e) => handleChange('invoiceDefaultDueDays', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Default Tax Rate (%)" type="number" value={settings.invoiceDefaultTaxRate}
                  onChange={(e) => handleChange('invoiceDefaultTaxRate', e.target.value)} />
              </Grid>
              <Grid size={12} >
                <TextField fullWidth label="Default Terms & Conditions" multiline rows={3}
                  value={settings.invoiceTerms}
                  onChange={(e) => handleChange('invoiceTerms', e.target.value)} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Quotation Settings</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Quotation Prefix" value={settings.quotationPrefix}
                  onChange={(e) => handleChange('quotationPrefix', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Validity Period (Days)" type="number" value={settings.quotationValidityDays}
                  onChange={(e) => handleChange('quotationValidityDays', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} >
                <TextField fullWidth label="Default Tax Rate (%)" type="number" value={settings.quotationDefaultTaxRate}
                  onChange={(e) => handleChange('quotationDefaultTaxRate', e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Content Management */}
      {activeTab === 3 && (
        <Grid container spacing={2}>
          {[
            {
              icon: <PeopleAltRoundedIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
              title: 'Team Members',
              desc: 'Add, edit and reorder the team members displayed on the website. Supports bilingual names and roles (EN / AR).',
              path: '/admin/content',
              btnLabel: 'Manage Team',
            },
            {
              icon: <CompareRoundedIcon sx={{ fontSize: 36, color: 'secondary.main' }} />,
              title: 'Before & After Gallery',
              desc: 'Upload before/after image pairs to showcase work quality. Filter by category, toggle published status.',
              path: '/admin/content?tab=1',
              btnLabel: 'Manage Gallery',
            },
          ].map(item => (
            <Grid key={item.title} size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ height: '100%', p: 1 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                    {item.icon}
                    <Typography variant="h6" fontWeight={700}>{item.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.desc}
                  </Typography>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => navigate(item.path)}
                  >
                    {item.btnLabel}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* System Settings */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>System Configuration</Typography>
            <Grid container spacing={3}>
              <Grid size={12} >
                <FormControlLabel
                  control={<Switch checked={settings.enableRegistration}
                    onChange={(e) => handleChange('enableRegistration', e.target.checked)} />}
                  label="Enable User Registration"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Allow new users to register accounts on the platform
                </Typography>
              </Grid>
              <Grid size={12} >
                <FormControlLabel
                  control={<Switch checked={settings.requireEmailVerification}
                    onChange={(e) => handleChange('requireEmailVerification', e.target.checked)} />}
                  label="Require Email Verification"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Users must verify their email before accessing the platform
                </Typography>
              </Grid>
              <Grid size={12} >
                <FormControlLabel
                  control={<Switch checked={settings.enableMaintenanceMode}
                    onChange={(e) => handleChange('enableMaintenanceMode', e.target.checked)} />}
                  label="Maintenance Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Temporarily disable access to the platform for maintenance
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} >
                <TextField fullWidth label="Session Timeout (minutes)" type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => handleChange('sessionTimeoutMinutes', e.target.value)} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'error.main' }}>Danger Zone</Typography>
            <Grid container spacing={3}>
              <Grid size={12} >
                <Button variant="outlined" color="error"
                  onClick={() => { localStorage.removeItem('rigoo_company_settings'); setSettings(DEFAULT_SETTINGS); toast.success('Reset to defaults'); }}>
                  Reset to Defaults
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Reset all settings to their default values
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', p: 2, borderTop: 1, borderColor: 'divider', mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading} size="large">
            {loading ? 'Saving...' : 'Save All Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
