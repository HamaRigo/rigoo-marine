import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { defaultPathForRole } from '../../utils/routes';
import PhoneField from '../../components/common/PhoneField';
import { useFormValidation } from '../../hooks/useFormValidation';
import { required, requiredPhone } from '../../utils/validators';
import { getApiError } from '../../utils/apiError';
import { consumeSessionExpiredFlag } from '../../services/interceptors';
import PageSEO from '../../components/common/PageSEO';

const RESEND_COOLDOWN_SECONDS = 60;

export default function Login() {
  const [tab, setTab] = useState('password');
  const { t } = useTranslation('auth');
  const [sessionBanner, setSessionBanner] = useState(() => consumeSessionExpiredFlag());

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 3 } }}>
      <PageSEO titleKey="login.title" descriptionKey="login.description" noIndex />
      <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
        <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: { xs: 2, sm: 3 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('login.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('login.subtitle')}
          </Typography>

          {sessionBanner && (
            <Alert severity="warning" onClose={() => setSessionBanner(false)} sx={{ mb: 3 }}>
              {t('login.sessionExpired')}
            </Alert>
          )}

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="password" label={t('otp.tabPassword')} />
            <Tab value="otp" label={t('otp.tabSms')} />
          </Tabs>

          {tab === 'password' ? <PasswordForm /> : <OtpForm />}

          <Typography align="center" sx={{ mt: 3 }}>
            {t('login.noAccount')}{' '}
            <MuiLink component={Link} to="/register" underline="hover">
              {t('login.registerCta')}
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

// ─── Password form ────────────────────────────────────────────────────────────

function PasswordForm() {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  const { t: tv } = useTranslation('validation');

  const { touch, revalidate, validateAll, fieldError } = useFormValidation({
    identifier: [required],
    password:   [required],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    revalidate(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(formData)) return;
    setLoading(true);
    try {
      const userData = await login(formData.identifier.trim(), formData.password);
      const next = searchParams.get('next');
      const safeNext = next && /^\/[^/\\]/.test(next) ? next : null;
      const target = location.state?.from?.pathname || safeNext || defaultPathForRole(userData?.role);
      navigate(target, { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError(t('login.tooManyAttempts'));
      } else if (err.response?.status === 401) {
        setError(t('login.invalidCredentials'));
      } else {
        setError(getApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label={t('login.identifier')}
          helperText={fieldError('identifier') ? tv(fieldError('identifier')) : t('login.identifierHelper')}
          name="identifier"
          type="text"
          inputMode="text"
          value={formData.identifier}
          onChange={handleChange}
          onBlur={(e) => touch('identifier', e.target.value)}
          margin="normal"
          required
          autoComplete="username"
          dir="ltr"
          error={!!fieldError('identifier')}
        />
        <TextField
          fullWidth
          label={t('login.password')}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={(e) => touch('password', e.target.value)}
          margin="normal"
          required
          autoComplete="current-password"
          error={!!fieldError('password')}
          helperText={fieldError('password') ? tv(fieldError('password')) : undefined}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <MuiLink component={Link} to="/forgot-password" underline="hover">
            {t('login.forgotPassword')}
          </MuiLink>
        </Box>
        <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </>
  );
}

// ─── SMS-code form ────────────────────────────────────────────────────────────

function OtpForm() {
  const [step, setStep] = useState('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const intervalRef = useRef(null);

  const { loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  const { t: tv } = useTranslation('validation');

  const { touch, revalidate, validateAll, fieldError, reset } = useFormValidation({
    phone: [requiredPhone],
  });

  const startCooldown = () => {
    setResendIn(RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); intervalRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!validateAll({ phone })) return;
    setLoading(true);
    try {
      await authApi.requestOtp(phone.trim());
      setStep('verify');
      startCooldown();
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) setError(t('otp.errors.invalidPhone'));
      else if (status === 429) setError(t('otp.errors.rateLimited'));
      else setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await loginWithOtp(phone.trim(), code);
      const next = searchParams.get('next');
      const safeNext = next && /^\/[^/\\]/.test(next) ? next : null;
      const target = location.state?.from?.pathname || safeNext || defaultPathForRole(userData?.role);
      navigate(target, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError(t('otp.errors.invalidCode'));
      else if (status === 400) setError(t('otp.errors.invalidPhone'));
      else setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
  };

  if (step === 'request') {
    return (
      <>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        <form onSubmit={sendCode} noValidate>
          <PhoneField
            fullWidth
            label={t('otp.phoneLabel')}
            helperText={fieldError('phone') ? tv(fieldError('phone')) : t('otp.phoneHelper')}
            name="phone"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); revalidate('phone', e.target.value); }}
            onBlur={() => touch('phone', phone)}
            margin="normal"
            required
            autoComplete="tel"
            error={!!fieldError('phone')}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
            {loading ? t('otp.sending') : t('otp.sendCode')}
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('otp.codeSentTo', { phone: maskPhone(phone) })}
      </Alert>
      <form onSubmit={verify} noValidate>
        <TextField
          fullWidth
          label={t('otp.codeLabel')}
          value={code}
          onChange={handleCodeChange}
          margin="normal"
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          type="text"
          inputProps={{ maxLength: 6, pattern: '\\d*' }}
          dir="ltr"
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || code.length < 4}
          sx={{ mt: 2 }}
        >
          {loading ? t('otp.verifying') : t('otp.verify')}
        </Button>
      </form>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <MuiLink
          component="button"
          type="button"
          onClick={() => { setStep('request'); setCode(''); setError(''); reset(); }}
          underline="hover"
          sx={{ fontSize: '0.875rem' }}
        >
          {t('otp.useDifferentPhone')}
        </MuiLink>
        {resendIn > 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('otp.resendIn', { seconds: resendIn })}
          </Typography>
        ) : (
          <MuiLink
            component="button"
            type="button"
            onClick={() => sendCode()}
            underline="hover"
            sx={{ fontSize: '0.875rem' }}
            disabled={loading}
          >
            {t('otp.resend')}
          </MuiLink>
        )}
      </Box>
    </>
  );
}

function maskPhone(raw) {
  const s = String(raw || '').trim();
  if (s.length < 6) return s;
  return s.slice(0, 4) + '****' + s.slice(-3);
}
