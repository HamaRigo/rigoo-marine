import { useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogTitle, Box, Typography, IconButton,
  Button, TextField, Chip, CircularProgress, Fade, Zoom, Stack,
  LinearProgress, Alert, useTheme, useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { teamRequestApi } from '../../services/api';

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'mechanical', emoji: '🔧', color: '#1565c0' },
  { key: 'structural', emoji: '⛵', color: '#2e7d32' },
  { key: 'electrical', emoji: '⚡', color: '#f57f17' },
  { key: 'cosmetic',   emoji: '✨', color: '#6a1b9a' },
  { key: 'renovation', emoji: '🔄', color: '#00695c' },
  { key: 'emergency',  emoji: '🆘', color: '#c62828' },
];

const SUGGESTIONS = {
  mechanical:  ["Engine won't start", 'Engine overheating', 'Oil or fuel leak', 'Strange noise from engine', 'Propeller damage'],
  structural:  ['Hull crack or damage', 'Water intrusion / flooding', 'Transom damage', 'Keel or rudder issue', 'Deck delamination'],
  electrical:  ['Navigation lights not working', 'Battery not charging', 'Bilge pump failure', 'Electrical short circuit', 'Instrument malfunction'],
  cosmetic:    ['Gelcoat chip or crack', 'Bottom paint needed', 'Teak deck restoration', 'Canvas or upholstery repair', 'Full exterior polish'],
  renovation:  ['Interior full renovation', 'Upholstery replacement', 'Electrical system upgrade', 'Custom carpentry', 'Full vessel refit'],
  emergency:   ['Taking on water now', 'Engine failure at sea', 'Grounding or collision damage', 'Fire damage', 'Structural breach'],
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILES = 5;
const MAX_MB    = 20;

const RATE_LIMIT_KEY = 'rm_team_req_ts';
const RATE_LIMIT_MS  = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

// ── Rate-limit helper (localStorage) ─────────────────────────────────────

function checkRateLimit() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - RATE_LIMIT_MS;
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length >= RATE_LIMIT_MAX) return false;
    recent.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    return true;
  } catch { return true; }
}

// ── Sub-components ────────────────────────────────────────────────────────

function StepIndicator({ step, total }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', mb: 2.5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          sx={{
            height: 4, borderRadius: 2,
            width: i === step ? 28 : 8,
            bgcolor: i <= step ? 'primary.main' : 'divider',
            transition: 'all 350ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      ))}
    </Box>
  );
}

function FilePreview({ file, onRemove }) {
  const isVideo = file.type.startsWith('video/');
  const url = URL.createObjectURL(file);
  return (
    <Box
      sx={{
        position: 'relative', borderRadius: 1, overflow: 'hidden',
        width: 80, height: 80, flexShrink: 0,
        border: '1px solid', borderColor: 'divider',
        '&:hover .remove-btn': { opacity: 1 },
      }}
    >
      {isVideo ? (
        <Box component="video" src={url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Box component="img" src={url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <IconButton
        className="remove-btn"
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute', top: 2, right: 2, opacity: 0,
          bgcolor: 'rgba(0,0,0,0.6)', color: 'white', p: 0.3,
          transition: 'opacity 200ms',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function RequestTeamDialog({ open, onClose }) {
  const { t, i18n } = useTranslation('public');
  const { user } = useAuth();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep]         = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDesc]  = useState('');
  const [location, setLocation] = useState('');
  const [files, setFiles]       = useState([]);
  const [fileError, setFileErr] = useState('');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(false);
  const [locLoading, setLocLoad]= useState(false);
  const [submitting, setSub]    = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const dropRef = useRef(null);

  const isRTL = i18n.dir() === 'rtl';

  // Reset on close
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(0); setCategory(''); setDesc(''); setLocation('');
      setFiles([]); setPhone(user?.phone || ''); setWhatsapp(false);
      setDone(false); setError('');
    }, 300);
  };

  // Category pick → pre-fill description suggestion
  const pickCategory = (key) => {
    setCategory(key);
    if (!description) setDesc(SUGGESTIONS[key]?.[0] || '');
  };

  // File handling
  const addFiles = useCallback((incoming) => {
    setFileErr('');
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) { setFileErr(`Max ${MAX_FILES} files`); break; }
      if (!ALLOWED_TYPES.includes(f.type)) { setFileErr(`"${f.name}" type not supported`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setFileErr(`"${f.name}" exceeds ${MAX_MB} MB`); continue; }
      next.push(f);
    }
    setFiles(next);
  }, [files]);

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const onDrop = (e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); };
  const onDragOver = (e) => e.preventDefault();

  // GPS location
  const getLocation = () => {
    setLocLoad(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLocLoad(false);
      },
      () => setLocLoad(false),
      { timeout: 8000 }
    );
  };

  // Validation per step
  const canNext = () => {
    if (step === 0) return category && description.trim().length >= 10;
    if (step === 1) return true;
    if (step === 2) return phone.trim().length >= 8;
    return false;
  };

  // Submit
  const submit = async () => {
    if (!checkRateLimit()) {
      setError(t('requestTeam.rateLimitError'));
      return;
    }
    setSub(true);
    setError('');
    try {
      await teamRequestApi.create({ category, description, location, phone, whatsapp, files });
      setDone(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || t('requestTeam.submitError');
      setError(msg);
    } finally {
      setSub(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      TransitionComponent={Zoom}
      transitionDuration={{ enter: 300, exit: 200 }}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {step > 0 && !done ? (
            <IconButton size="small" onClick={() => setStep(s => s - 1)} sx={{ mr: 1 }}>
              {isRTL ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
          ) : <Box sx={{ width: 32 }} />}
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
            {done ? t('requestTeam.successTitle') : t('requestTeam.title')}
          </Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        {!done && <StepIndicator step={step} total={3} />}
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>

        {/* ── Step 0: Category + Description ── */}
        <Fade in={step === 0 && !done} unmountOnExit timeout={280}>
          <Box sx={{ display: step === 0 && !done ? 'block' : 'none' }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('requestTeam.step1.hint')}
            </Typography>

            {/* Category chips */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1, mb: 3,
            }}>
              {CATEGORIES.map(({ key, emoji, color }) => (
                <Box
                  key={key}
                  onClick={() => pickCategory(key)}
                  sx={{
                    p: 1.5, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                    border: '2px solid',
                    borderColor: category === key ? color : 'divider',
                    bgcolor: category === key ? `${color}14` : 'background.paper',
                    transition: 'all 200ms ease',
                    '&:hover': { borderColor: color, bgcolor: `${color}0a` },
                  }}
                >
                  <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{emoji}</Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ color: category === key ? color : 'text.secondary', display: 'block', mt: 0.5 }}>
                    {t(`requestTeam.categories.${key}`)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Suggestion chips */}
            {category && (
              <Fade in timeout={200}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" mb={1} display="block">
                    {t('requestTeam.step1.suggestions')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {SUGGESTIONS[category].map(s => (
                      <Chip
                        key={s} label={s} size="small" variant="outlined"
                        onClick={() => setDesc(s)}
                        sx={{ cursor: 'pointer', borderRadius: 1.5,
                          ...(description === s && { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' }) }}
                      />
                    ))}
                  </Box>
                </Box>
              </Fade>
            )}

            <TextField
              fullWidth multiline rows={3} variant="outlined"
              label={t('requestTeam.step1.descLabel')}
              placeholder={t('requestTeam.step1.descPlaceholder')}
              value={description}
              onChange={e => setDesc(e.target.value)}
              helperText={`${description.length} / 500`}
              inputProps={{ maxLength: 500 }}
              sx={{ mt: 1 }}
            />
          </Box>
        </Fade>

        {/* ── Step 1: Location + Files ── */}
        <Fade in={step === 1 && !done} unmountOnExit timeout={280}>
          <Box sx={{ display: step === 1 && !done ? 'block' : 'none' }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('requestTeam.step2.hint')}
            </Typography>

            {/* Location */}
            <TextField
              fullWidth variant="outlined"
              label={t('requestTeam.step2.locationLabel')}
              placeholder={t('requestTeam.step2.locationPlaceholder')}
              value={location}
              onChange={e => setLocation(e.target.value)}
              InputProps={{
                startAdornment: <LocationOnOutlinedIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: 'geolocation' in navigator && (
                  <IconButton size="small" onClick={getLocation} disabled={locLoading} title="Use my location">
                    {locLoading ? <CircularProgress size={18} /> : <MyLocationIcon fontSize="small" />}
                  </IconButton>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            {/* Drop zone */}
            <Box
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById('rt-file-input').click()}
              sx={{
                border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                p: 3, textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 200ms, background 200ms',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t('requestTeam.step2.uploadHint')}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {t('requestTeam.step2.uploadSub', { max: MAX_FILES, mb: MAX_MB })}
              </Typography>
              <input
                id="rt-file-input"
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                style={{ display: 'none' }}
                onChange={e => { addFiles([...e.target.files]); e.target.value = ''; }}
              />
            </Box>

            {fileError && <Alert severity="warning" sx={{ mt: 1 }}>{fileError}</Alert>}

            {/* Previews */}
            {files.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                {files.map((f, i) => (
                  <FilePreview key={i} file={f} onRemove={() => removeFile(i)} />
                ))}
                <Typography variant="caption" color="text.secondary" alignSelf="center">
                  {files.length}/{MAX_FILES}
                </Typography>
              </Box>
            )}
          </Box>
        </Fade>

        {/* ── Step 2: Contact ── */}
        <Fade in={step === 2 && !done} unmountOnExit timeout={280}>
          <Box sx={{ display: step === 2 && !done ? 'block' : 'none' }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('requestTeam.step3.hint')}
            </Typography>

            <TextField
              fullWidth variant="outlined"
              label={t('requestTeam.step3.phoneLabel')}
              placeholder="+974 5X XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              disabled={!!user?.phone}
              helperText={user?.phone ? t('requestTeam.step3.phoneFromProfile') : t('requestTeam.step3.phoneHelper')}
              sx={{ mb: 2 }}
            />

            {/* WhatsApp toggle */}
            <Box
              onClick={() => setWhatsapp(w => !w)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 2, borderRadius: 2, cursor: 'pointer',
                border: '1.5px solid',
                borderColor: whatsapp ? '#25D366' : 'divider',
                bgcolor: whatsapp ? '#25D36614' : 'transparent',
                transition: 'all 200ms ease',
              }}
            >
              <WhatsAppIcon sx={{ color: whatsapp ? '#25D366' : 'text.disabled' }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {t('requestTeam.step3.whatsapp')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('requestTeam.step3.whatsappSub')}
                </Typography>
              </Box>
              <Box
                sx={{
                  ml: 'auto', width: 36, height: 20, borderRadius: 10,
                  bgcolor: whatsapp ? '#25D366' : 'action.disabledBackground',
                  position: 'relative', transition: 'background 200ms',
                }}
              >
                <Box sx={{
                  position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                  bgcolor: 'white', transition: 'left 200ms',
                  left: whatsapp ? 18 : 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {submitting && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
          </Box>
        </Fade>

        {/* ── Done ── */}
        <Fade in={done} timeout={400}>
          <Box sx={{
            display: done ? 'flex' : 'none',
            flexDirection: 'column', alignItems: 'center', py: 3, textAlign: 'center',
          }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2,
              animation: 'rmFadeUp 0.5s ease' }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {t('requestTeam.successTitle')}
            </Typography>
            <Typography color="text.secondary" mb={3}>
              {t('requestTeam.successBody')}
            </Typography>
            <Chip
              label={t('requestTeam.statusPending')}
              color="warning" variant="outlined"
              sx={{ fontWeight: 600, mb: 2 }}
            />
            <Button variant="outlined" onClick={handleClose}>
              {t('requestTeam.close')}
            </Button>
          </Box>
        </Fade>

        {/* ── Navigation ── */}
        {!done && (
          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
            {step < 2 ? (
              <Button
                variant="contained"
                disabled={!canNext()}
                onClick={() => setStep(s => s + 1)}
                endIcon={isRTL ? <ArrowBackIcon /> : <ArrowForwardIcon />}
                sx={{ px: 3 }}
              >
                {t('requestTeam.next')}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!canNext() || submitting}
                onClick={submit}
                sx={{ px: 4, bgcolor: 'primary.main' }}
              >
                {submitting ? <CircularProgress size={20} color="inherit" /> : t('requestTeam.submit')}
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
