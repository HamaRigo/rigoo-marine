import i18n from '../i18n';

const DEFAULT_CURRENCY = 'QAR';
const DEFAULT_FALLBACK = '—';

const PRICE_FRACTION = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

function currentLocale() {
  const lng = (i18n && i18n.language) || 'en';
  if (lng.startsWith('ar')) return 'ar-QA-u-nu-latn-ca-gregory';
  return 'en-QA';
}

function dateLocale() {
  const lng = (i18n && i18n.language) || 'en';
  if (lng.startsWith('ar')) return 'ar-QA-u-ca-gregory';
  return 'en-QA';
}

export function formatPrice(
  amount,
  {
    currency = DEFAULT_CURRENCY,
    fallback = DEFAULT_FALLBACK,
    // Override to pin decimals (e.g. invoice/accounting tables want 2 always).
    minimumFractionDigits,
    maximumFractionDigits,
  } = {},
) {
  if (amount === null || amount === undefined || amount === '') return fallback;
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return fallback;
  const fraction = {
    minimumFractionDigits: minimumFractionDigits ?? PRICE_FRACTION.minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits ?? PRICE_FRACTION.maximumFractionDigits,
  };
  try {
    return new Intl.NumberFormat(currentLocale(), {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      ...fraction,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString('en', fraction)}`;
  }
}

export function formatDate(value, { style = 'medium', fallback = DEFAULT_FALLBACK } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat(dateLocale(), { dateStyle: style }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatDateTime(value, { dateStyle = 'medium', timeStyle = 'short', fallback = DEFAULT_FALLBACK } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat(dateLocale(), { dateStyle, timeStyle }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function formatPhone(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (!s.startsWith('+')) return s;
  const digits = s.slice(1).replace(/\D/g, '');
  if (digits.startsWith('974') && digits.length === 11) {
    return `+974 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  const groups = digits.match(/.{1,4}(?=(.{4})*$)/g) || [digits];
  return `+${groups.join(' ')}`;
}
