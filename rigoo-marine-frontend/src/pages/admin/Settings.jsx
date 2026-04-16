import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Divider,
  Switch, FormControlLabel, Alert, Tabs, Tab, IconButton, InputAdornment
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon, Email as EmailIcon, Business as BusinessIcon, Security as SecurityIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Company Settings
    companyName: 'Rigoo Marine AB',
    companyAddress: '123 Harbor Street',
    companyCity: 'Stockholm',
    companyPostalCode: '456 78',
    companyCountry: 'Sweden',
    companyPhone: '+46 8 123 456',
    companyEmail: 'info@rigoomarine.com',
    companyWebsite: 'www.rigoomarine.com',
    companyTaxId: 'SE123456789001',
    companyLogo: '',

    // Email Settings
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    emailFromName: 'Rigoo Marine',
    emailFromAddress: 'noreply@rigoomarine.com',
    enableEmailNotifications: true,

    // Invoice Settings
    invoicePrefix: 'INV',
    invoiceDefaultDueDays: '30',
    invoiceDefaultTaxRate: '25',
    invoiceTerms: 'Payment is due within 30 days. Late payments may incur additional fees.',

    // Quotation Settings
    quotationPrefix: 'QUO',
    quotationValidityDays: '14',
    quotationDefaultTaxRate: '25',

    // System Settings
    enableRegistration: true,
    requireEmailVerification: true,
    enableMaintenanceMode: false,
    sessionTimeoutMinutes: '60',
  });

  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    // TODO: Fetch settings from API
    // fetch('/api/admin/settings')
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Call API to save settings
      // await adminApi.updateSettings(settings);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
      toast.success('Settings saved successfully');
    } catch (error) {
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
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Changes to settings may require a system restart to take effect.
      </Alert>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          {tabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Company Settings Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Company Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Website"
                  value={settings.companyWebsite}
                  onChange={(e) => handleChange('companyWebsite', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={settings.companyPhone}
                  onChange={(e) => handleChange('companyPhone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={settings.companyEmail}
                  onChange={(e) => handleChange('companyEmail', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tax ID / VAT Number"
                  value={settings.companyTaxId}
                  onChange={(e) => handleChange('companyTaxId', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Logo URL"
                  value={settings.companyLogo}
                  onChange={(e) => handleChange('companyLogo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={settings.companyAddress}
                  onChange={(e) => handleChange('companyAddress', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={settings.companyPostalCode}
                  onChange={(e) => handleChange('companyPostalCode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={settings.companyCity}
                  onChange={(e) => handleChange('companyCity', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Country"
                  value={settings.companyCountry}
                  onChange={(e) => handleChange('companyCountry', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Email Settings Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              SMTP Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SMTP Host"
                  value={settings.smtpHost}
                  onChange={(e) => handleChange('smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SMTP Port"
                  value={settings.smtpPort}
                  onChange={(e) => handleChange('smtpPort', e.target.value)}
                  type="number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={settings.smtpUser}
                  onChange={(e) => handleChange('smtpUser', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SMTP Password"
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end">
                          <SecurityIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Divider sx={{ my: 2, width: '100%' }} />
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  value={settings.emailFromName}
                  onChange={(e) => handleChange('emailFromName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  value={settings.emailFromAddress}
                  onChange={(e) => handleChange('emailFromAddress', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => handleChange('enableEmailNotifications', e.target.checked)}
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Documents Settings Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Invoice Settings
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Invoice Prefix"
                  value={settings.invoicePrefix}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Default Due Days"
                  type="number"
                  value={settings.invoiceDefaultDueDays}
                  onChange={(e) => handleChange('invoiceDefaultDueDays', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Default Tax Rate (%)"
                  type="number"
                  value={settings.invoiceDefaultTaxRate}
                  onChange={(e) => handleChange('invoiceDefaultTaxRate', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Default Terms & Conditions"
                  multiline
                  rows={3}
                  value={settings.invoiceTerms}
                  onChange={(e) => handleChange('invoiceTerms', e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Quotation Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Quotation Prefix"
                  value={settings.quotationPrefix}
                  onChange={(e) => handleChange('quotationPrefix', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Validity Period (Days)"
                  type="number"
                  value={settings.quotationValidityDays}
                  onChange={(e) => handleChange('quotationValidityDays', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Default Tax Rate (%)"
                  type="number"
                  value={settings.quotationDefaultTaxRate}
                  onChange={(e) => handleChange('quotationDefaultTaxRate', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* System Settings Tab */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              System Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableRegistration}
                      onChange={(e) => handleChange('enableRegistration', e.target.checked)}
                    />
                  }
                  label="Enable User Registration"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Allow new users to register accounts on the platform
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireEmailVerification}
                      onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                    />
                  }
                  label="Require Email Verification"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Users must verify their email before accessing the platform
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableMaintenanceMode}
                      onChange={(e) => handleChange('enableMaintenanceMode', e.target.checked)}
                    />
                  }
                  label="Maintenance Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Temporarily disable access to the platform for maintenance
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => handleChange('sessionTimeoutMinutes', e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'error.main' }}>
              Danger Zone
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Button variant="outlined" color="error">
                  Clear Cache
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Clear all cached data and temporary files
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" color="error">
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

      {/* Save Button (Sticky Bottom) */}
      <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', p: 2, borderTop: 1, borderColor: 'divider', mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            size="large"
          >
            {loading ? 'Saving...' : 'Save All Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
