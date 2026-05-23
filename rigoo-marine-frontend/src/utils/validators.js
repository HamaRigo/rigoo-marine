/**
 * Field-level validators. Each returns an i18n key (string) on failure or null on success.
 * Translate in components via: const { t: tv } = useTranslation('validation');
 * Usage: tv(fieldError('name'))
 */

export const required = (value) => {
  if (value === null || value === undefined || value === '') return 'required';
  return String(value).trim() ? null : 'required';
};

export const email = (value) => {
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())
    ? null
    : 'email.invalid';
};

export const nameMin = (value) => {
  if (!value) return null;
  return String(value).trim().length >= 2 ? null : 'name.min';
};

export const passwordMin = (value) => {
  if (!value) return null;
  return String(value).length >= 8 ? null : 'password.min';
};

/**
 * Cross-field validator: confirms value matches allValues[otherField].
 * Must be called via validateAll(values) or touch/revalidate with allValues passed.
 */
export const passwordMatch = (otherField) => (value, allValues) => {
  if (!value) return null;
  return value === (allValues?.[otherField] ?? '') ? null : 'password.mismatch';
};

/**
 * Required phone: local digits must be present (value = E.164 from PhoneField).
 * Catches both empty string and dial-code-only (e.g. "+974" with no local digits).
 */
export const requiredPhone = (value) => {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 0) return 'required';
  if (!(value || '').startsWith('+') || digits.length < 8) return 'phone.tooShort';
  return null;
};

/**
 * Optional phone: silent when nothing typed, error only if incomplete local number begun.
 * digits <= 4 means user only selected a country code — don't penalise that.
 */
export const optionalPhone = (value) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return null;
  if (!value.startsWith('+') || digits.length < 8) return 'phone.tooShort';
  return null;
};

export const messageMin = (value) => {
  if (!value) return null;
  return String(value).trim().length >= 10 ? null : 'message.min';
};

/** Run validators in order and return the first error key, or null. */
export const compose = (...fns) => (value, allValues) => {
  for (const fn of fns) {
    const err = fn(value, allValues);
    if (err) return err;
  }
  return null;
};
