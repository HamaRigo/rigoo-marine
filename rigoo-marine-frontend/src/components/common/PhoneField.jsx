/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  TextField, InputAdornment, Select, MenuItem, Divider, Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

// Gulf first → MENA → Global. Sorted at runtime by dialCode length so
// parseE164 always prefers the longest (most specific) match.
export const PHONE_COUNTRIES = [
  { code: 'QA', dialCode: '+974', flag: '🇶🇦', name: 'Qatar',          maxDigits: 8  },
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'UAE',             maxDigits: 9  },
  { code: 'SA', dialCode: '+966', flag: '🇸🇦', name: 'Saudi Arabia',    maxDigits: 9  },
  { code: 'KW', dialCode: '+965', flag: '🇰🇼', name: 'Kuwait',          maxDigits: 8  },
  { code: 'BH', dialCode: '+973', flag: '🇧🇭', name: 'Bahrain',         maxDigits: 8  },
  { code: 'OM', dialCode: '+968', flag: '🇴🇲', name: 'Oman',            maxDigits: 8  },
  { code: 'EG', dialCode: '+20',  flag: '🇪🇬', name: 'Egypt',           maxDigits: 10 },
  { code: 'JO', dialCode: '+962', flag: '🇯🇴', name: 'Jordan',          maxDigits: 9  },
  { code: 'LB', dialCode: '+961', flag: '🇱🇧', name: 'Lebanon',         maxDigits: 8  },
  { code: 'IQ', dialCode: '+964', flag: '🇮🇶', name: 'Iraq',            maxDigits: 10 },
  { code: 'SY', dialCode: '+963', flag: '🇸🇾', name: 'Syria',           maxDigits: 9  },
  { code: 'YE', dialCode: '+967', flag: '🇾🇪', name: 'Yemen',           maxDigits: 9  },
  { code: 'MA', dialCode: '+212', flag: '🇲🇦', name: 'Morocco',         maxDigits: 9  },
  { code: 'TN', dialCode: '+216', flag: '🇹🇳', name: 'Tunisia',         maxDigits: 8  },
  { code: 'DZ', dialCode: '+213', flag: '🇩🇿', name: 'Algeria',         maxDigits: 9  },
  { code: 'LY', dialCode: '+218', flag: '🇱🇾', name: 'Libya',           maxDigits: 9  },
  { code: 'GB', dialCode: '+44',  flag: '🇬🇧', name: 'United Kingdom',  maxDigits: 10 },
  { code: 'US', dialCode: '+1',   flag: '🇺🇸', name: 'United States',   maxDigits: 10 },
  { code: 'FR', dialCode: '+33',  flag: '🇫🇷', name: 'France',          maxDigits: 9  },
  { code: 'DE', dialCode: '+49',  flag: '🇩🇪', name: 'Germany',         maxDigits: 11 },
  { code: 'IN', dialCode: '+91',  flag: '🇮🇳', name: 'India',           maxDigits: 10 },
  { code: 'PK', dialCode: '+92',  flag: '🇵🇰', name: 'Pakistan',        maxDigits: 10 },
  { code: 'TR', dialCode: '+90',  flag: '🇹🇷', name: 'Turkey',          maxDigits: 10 },
  { code: 'PH', dialCode: '+63',  flag: '🇵🇭', name: 'Philippines',     maxDigits: 10 },
  { code: 'ID', dialCode: '+62',  flag: '🇮🇩', name: 'Indonesia',       maxDigits: 12 },
  { code: 'BD', dialCode: '+880', flag: '🇧🇩', name: 'Bangladesh',      maxDigits: 10 },
  { code: 'NP', dialCode: '+977', flag: '🇳🇵', name: 'Nepal',           maxDigits: 10 },
  { code: 'LK', dialCode: '+94',  flag: '🇱🇰', name: 'Sri Lanka',       maxDigits: 9  },
  { code: 'NG', dialCode: '+234', flag: '🇳🇬', name: 'Nigeria',         maxDigits: 10 },
];

const DIAL_SORTED = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
const DEFAULT_CODE = 'QA';

function parseE164(value) {
  if (!value || !value.startsWith('+')) return { countryCode: DEFAULT_CODE, local: '' };
  const match = DIAL_SORTED.find(c => value.startsWith(c.dialCode));
  if (match) return { countryCode: match.code, local: value.slice(match.dialCode.length) };
  return { countryCode: DEFAULT_CODE, local: '' };
}

/**
 * Country-code selector + digit-only local number field.
 * value/onChange use E.164 strings so this is a drop-in for any phone TextField.
 * onChange fires { target: { name, value: E164 } } — compatible with handleChange patterns.
 */
export default function PhoneField({
  name,
  label,
  value = '',
  onChange,
  onBlur,
  required,
  error,
  helperText,
  disabled,
  fullWidth = true,
  margin = 'none',
  size,
  autoComplete,
}) {
  const { t } = useTranslation('common');

  const { countryCode: parsedCode, local } = parseE164(value);
  const [selectedCode, setSelectedCode] = useState(parsedCode);

  // Sync country when parent loads/resets the value to a new phone number
  useEffect(() => {
    setSelectedCode(parseE164(value).countryCode);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const country = PHONE_COUNTRIES.find(c => c.code === selectedCode) || PHONE_COUNTRIES[0];

  const emit = (dialCode, localDigits) => {
    // Emit dialCode alone when local is empty so the country selection survives a
    // parent reset to ''. The TextField's own `required` fires on the empty input value.
    onChange?.({ target: { name, value: localDigits ? `${dialCode}${localDigits}` : dialCode } });
  };

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setSelectedCode(newCode);
    const newCountry = PHONE_COUNTRIES.find(c => c.code === newCode) || PHONE_COUNTRIES[0];
    emit(newCountry.dialCode, local.slice(0, newCountry.maxDigits));
  };

  const handleLocalChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits);
    emit(country.dialCode, raw);
  };

  return (
    <TextField
      fullWidth={fullWidth}
      margin={margin}
      size={size}
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      disabled={disabled}
      value={local}
      onChange={handleLocalChange}
      onBlur={onBlur}
      autoComplete={autoComplete || 'tel-national'}
      inputProps={{
        inputMode: 'numeric',
        pattern: '[0-9]*',
        maxLength: country.maxDigits,
        dir: 'ltr',
      }}
      sx={{ '& .MuiInputBase-root': { direction: 'ltr' } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 0 }}>
            <Select
              value={selectedCode}
              onChange={handleCountryChange}
              variant="standard"
              disableUnderline
              disabled={disabled}
              inputProps={{ 'aria-label': t('phone.countryCode') }}
              renderValue={(code) => {
                const c = PHONE_COUNTRIES.find(x => x.code === code);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{c?.flag}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{c?.dialCode}</span>
                  </Box>
                );
              }}
              sx={{
                minWidth: 84,
                '& .MuiSelect-select': {
                  py: '0 !important',
                  pr: '22px !important',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiSvgIcon-root': { right: 0, fontSize: '1.1rem' },
              }}
              MenuProps={{
                PaperProps: { sx: { maxHeight: 320, width: 270 } },
              }}
            >
              {PHONE_COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code} sx={{ gap: 1.5, py: 0.75 }}>
                  <span style={{ fontSize: '1.1rem', width: 24, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ fontWeight: 600, minWidth: 46, fontSize: '0.82rem' }}>{c.dialCode}</span>
                  <span style={{ fontSize: '0.82rem', color: 'inherit', opacity: 0.7 }}>{c.name}</span>
                </MenuItem>
              ))}
            </Select>
            <Divider orientation="vertical" flexItem sx={{ mx: 1.25, my: 0.75 }} />
          </InputAdornment>
        ),
      }}
    />
  );
}
